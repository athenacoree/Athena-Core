const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { BufferJSON, initAuthCreds, default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { initializeClient } = require('~/server/services/Endpoints/agents');
const { getMessages } = require('~/models');

// Helper to serialize/deserialize buffers for MongoDB storage
const serialize = (obj) => {
  return JSON.parse(JSON.stringify(obj, BufferJSON.replacer));
};

const deserialize = (obj) => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj), BufferJSON.reviver);
};

// Custom MongoDB authentication state helper for Baileys
const useMongoAuthState = async (adminUserId) => {
  const WhatsAppSession = mongoose.models.WhatsAppSession;
  let session = await WhatsAppSession.findOne({ adminUserId });

  if (!session) {
    session = await WhatsAppSession.create({
      adminUserId,
      authData: {
        creds: serialize(initAuthCreds()),
        keys: {}
      }
    });
  }

  const creds = deserialize(session.authData?.creds) || initAuthCreds();
  const keysStore = session.authData?.keys || {};

  const saveCreds = async () => {
    const WhatsAppSessionModel = mongoose.models.WhatsAppSession;
    await WhatsAppSessionModel.updateOne(
      { adminUserId },
      { $set: { 'authData.creds': serialize(creds) } }
    );
  };

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data = {};
          for (const id of ids) {
            const val = keysStore[`${type}-${id}`];
            if (val) {
              data[id] = deserialize(val);
            }
          }
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) {
                keysStore[key] = serialize(value);
              } else {
                delete keysStore[key];
              }
            }
          }
          const WhatsAppSessionModel = mongoose.models.WhatsAppSession;
          await WhatsAppSessionModel.updateOne(
            { adminUserId },
            { $set: { 'authData.keys': keysStore } }
          );
        }
      }
    },
    saveCreds
  };
};

class WhatsAppServiceClass {
  constructor() {
    this.client = null;
    this.state = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'qr'
    this.qrCode = null;
    this.adminUserId = null;
    this.agentId = null;
    this.linkedNumber = null;
  }

  // Automatically start and restore previous active sessions on system boot
  async start() {
    try {
      const WhatsAppSession = mongoose.models.WhatsAppSession;
      if (!WhatsAppSession) {
        logger.warn('[WhatsAppService] WhatsAppSession model not registered yet');
        return;
      }

      const activeSession = await WhatsAppSession.findOne({});
      if (activeSession && activeSession.authData?.creds) {
        logger.info(`[WhatsAppService] Found active WhatsApp session for admin: ${activeSession.adminUserId}. Reconnecting...`);
        this.adminUserId = activeSession.adminUserId;
        this.agentId = activeSession.agentId;
        await this.connect();
      } else {
        logger.info('[WhatsAppService] No active WhatsApp sessions found to restore on boot.');
      }
    } catch (err) {
      logger.error('[WhatsAppService] Error during auto-start reconnect:', err);
    }
  }

  // Connect/Initialize the WhatsApp client
  async connect() {
    if (!this.adminUserId) {
      throw new Error('Admin User ID context is required to establish a WhatsApp session');
    }

    this.state = 'connecting';
    this.qrCode = null;

    try {
      const { state, saveCreds } = await useMongoAuthState(this.adminUserId);

      this.client = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['LibreChat', 'Chrome', '1.0.0']
      });

      this.client.ev.on('creds.update', saveCreds);

      this.client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.state = 'qr';
          try {
            this.qrCode = await QRCode.toDataURL(qr);
            logger.info('[WhatsAppService] New WhatsApp QR Code generated and saved to memory');
          } catch (qrErr) {
            logger.error('[WhatsAppService] Error rendering QR Code to base64:', qrErr);
          }
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          logger.warn(`[WhatsAppService] Connection closed. Reason: ${lastDisconnect?.error?.message}. Reconnecting: ${shouldReconnect}`);

          this.state = 'disconnected';
          this.qrCode = null;

          if (shouldReconnect) {
            await this.connect();
          } else {
            await this.logout();
          }
        } else if (connection === 'open') {
          this.state = 'connected';
          this.qrCode = null;
          this.linkedNumber = this.client.user.id.split(':')[0];
          logger.info(`[WhatsAppService] WhatsApp successfully connected! Linked number: ${this.linkedNumber}`);
        }
      });

      this.client.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
          for (const msg of m.messages) {
            if (!msg.key.fromMe && !msg.key.remoteJid.includes('@g.us')) {
              await this.handleIncomingMessage(msg);
            }
          }
        }
      });
    } catch (err) {
      this.state = 'disconnected';
      logger.error('[WhatsAppService] Failed to construct WhatsApp connection:', err);
    }
  }

  // Reset/Clear WhatsApp session from database and disconnect the current client
  async reset() {
    logger.info(`[WhatsAppService] Resetting WhatsApp session for admin user ${this.adminUserId}`);
    try {
      if (this.client) {
        try {
          await this.client.logout();
        } catch (e) {
          // ignore close errors on force reset
        }
        this.client = null;
      }

      if (this.adminUserId) {
        const WhatsAppSession = mongoose.models.WhatsAppSession;
        await WhatsAppSession.deleteOne({ adminUserId: this.adminUserId });
      }

      this.state = 'disconnected';
      this.qrCode = null;
      this.linkedNumber = null;
      logger.info('[WhatsAppService] WhatsApp session reset completed successfully.');
    } catch (err) {
      logger.error('[WhatsAppService] Error during WhatsApp session reset:', err);
      throw err;
    }
  }

  // Logout current session completely
  async logout() {
    await this.reset();
  }

  // Track interactions and register JID list in database
  async registerInteraction(jid, pushName, conversationId = null) {
    try {
      const WhatsAppSession = mongoose.models.WhatsAppSession;
      const session = await WhatsAppSession.findOne({ adminUserId: this.adminUserId });
      if (!session) return;

      const interactions = session.interactions || [];
      const index = interactions.findIndex((i) => i.jid === jid);

      if (index === -1) {
        interactions.push({
          jid,
          pushName,
          conversationId,
          lastInteraction: new Date()
        });
      } else {
        interactions[index].pushName = pushName || interactions[index].pushName;
        interactions[index].lastInteraction = new Date();
        if (conversationId) {
          interactions[index].conversationId = conversationId;
        }
      }

      await WhatsAppSession.updateOne(
        { adminUserId: this.adminUserId },
        { $set: { interactions } }
      );
    } catch (err) {
      logger.error('[WhatsAppService] Error registering JID interaction:', err);
    }
  }

  // Process and route incoming messages using LibreChat's Agent pipeline
  async handleIncomingMessage(msg) {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!text) return;

    const senderJid = msg.key.remoteJid;
    const senderName = msg.pushName || senderJid.split('@')[0];

    logger.info(`[WhatsAppService] Incoming message from JID: ${senderJid} (${senderName}): "${text}"`);

    try {
      const WhatsAppSession = mongoose.models.WhatsAppSession;
      const session = await WhatsAppSession.findOne({ adminUserId: this.adminUserId });
      if (!session) {
        logger.warn('[WhatsAppService] No active configuration session found to process incoming WhatsApp message.');
        return;
      }

      const agentId = session.agentId || this.agentId;
      if (!agentId) {
        logger.warn('[WhatsAppService] No AI Agent configured for WhatsApp interactions. Ignoring message.');
        return;
      }

      // Map sender's JID to a dedicated conversationId
      let conversationId = null;
      const interactions = session.interactions || [];
      const found = interactions.find((i) => i.jid === senderJid);
      if (found && found.conversationId) {
        conversationId = found.conversationId;
      } else {
        conversationId = crypto.randomUUID();
        await this.registerInteraction(senderJid, senderName, conversationId);
      }

      // Retrieve last parent message ID for context continuation
      let parentMessageId = '00000000-0000-0000-0000-000000000000';
      try {
        const lastMessages = await getMessages({ conversationId });
        if (lastMessages && lastMessages.length > 0) {
          parentMessageId = lastMessages[lastMessages.length - 1].messageId;
        }
      } catch (e) {
        // use default zero uuid
      }

      // Setup mock express request & response
      const req = {
        user: { id: this.adminUserId.toString() },
        body: {
          text,
          conversationId,
          parentMessageId,
          endpointOption: {
            endpoint: 'agents',
            agent_id: agentId
          }
        }
      };

      // Initialize Agent Client
      const result = await initializeClient({
        req,
        res: { write: () => {}, end: () => {} },
        endpointOption: {
          endpoint: 'agents',
          agent_id: agentId
        }
      });

      const client = result.client;

      // Execute prompt against Agent Client
      // Note: LibreChat's AgentClient internally saves userMessage and responseMessage
      // automatically within its execution pipeline. Doing it manually here would cause duplications.
      const response = await client.sendMessage(text, {
        user: this.adminUserId.toString(),
        conversationId,
        parentMessageId,
        userMCPAuthMap: result.userMCPAuthMap
      });

      // Send the response back to the user via WhatsApp
      await this.client.sendMessage(senderJid, { text: response.text });
      logger.info(`[WhatsAppService] Response successfully sent to JID: ${senderJid}`);
    } catch (err) {
      logger.error(`[WhatsAppService] Error executing AI Agent turn for WhatsApp JID ${senderJid}:`, err);
    }
  }
}

const WhatsAppService = new WhatsAppServiceClass();

module.exports = {
  WhatsAppService
};
