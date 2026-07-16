const mongoose = require('mongoose');

const KeyIDConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  apiKey: { type: String, default: '' },
  publicKey: { type: String, default: '' },
  privateKey: { type: String, default: '' },
  isProvisioned: { type: Boolean, default: false },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

const KeyIDMessageSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  sender: { type: String },
  to: { type: String },
  content: { type: String, required: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  timestamp: { type: Date, default: Date.now },
});

const KeyIDConfig = mongoose.models.KeyIDConfig || mongoose.model('KeyIDConfig', KeyIDConfigSchema);
const KeyIDMessage =
  mongoose.models.KeyIDMessage || mongoose.model('KeyIDMessage', KeyIDMessageSchema);

/**
 * Gets the global KeyID configuration, creating it if it doesn't exist.
 */
async function getConfig() {
  try {
    let config = await KeyIDConfig.findOne({ key: 'global' });
    if (!config) {
      config = await KeyIDConfig.create({
        key: 'global',
        apiKey: process.env.KEYID_API_KEY || '',
        publicKey: '',
        privateKey: '',
        isProvisioned: false,
        email: '',
        phone: '',
      });
    }
    return config;
  } catch (error) {
    console.error('[KeyIDDbService] getConfig error:', error);
    return {
      apiKey: process.env.KEYID_API_KEY || '',
      publicKey: '',
      privateKey: '',
      isProvisioned: false,
      email: '',
      phone: '',
    };
  }
}

/**
 * Updates the global configuration.
 */
async function updateConfig(updates) {
  try {
    return await KeyIDConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, upsert: true },
    );
  } catch (error) {
    console.error('[KeyIDDbService] updateConfig error:', error);
    throw error;
  }
}

/**
 * Saves a message (received/sent) to the database.
 */
async function saveMessage({ platform, sender, to, content, direction }) {
  try {
    return await KeyIDMessage.create({
      platform,
      sender,
      to,
      content,
      direction,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[KeyIDDbService] saveMessage error:', error);
    throw error;
  }
}

/**
 * Retrieves all messages from the database, grouped by direction.
 */
async function getMessagesFromDb() {
  try {
    const messages = await KeyIDMessage.find().sort({ timestamp: -1 });

    // Seed some mock received messages if database is empty on first load
    if (messages.length === 0) {
      const mockReceived = [
        {
          platform: 'Email',
          sender: 'verification@services.com',
          content: 'Tu código de verificación para registrarte en el servicio es 843920.',
          direction: 'inbound',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          platform: 'SMS',
          sender: '+15550100',
          content: 'Hola! Athena Core ha sido configurada correctamente en tu cuenta de WhatsApp.',
          direction: 'inbound',
          timestamp: new Date(Date.now() - 1800000),
        },
        {
          platform: 'Email',
          sender: 'no-reply@instagram.com',
          content: 'Bienvenido a Instagram! Tu cuenta @athena_core ha sido activada.',
          direction: 'inbound',
          timestamp: new Date(Date.now() - 600000),
        },
      ];

      const mockSent = [
        {
          platform: 'WhatsApp',
          to: '+15550111',
          content: 'Hola, este es un mensaje de prueba desde la Identidad de la IA.',
          direction: 'outbound',
          timestamp: new Date(Date.now() - 7200000),
        },
      ];

      // Save mock messages to DB
      for (const m of [...mockReceived, ...mockSent]) {
        await KeyIDMessage.create(m);
      }

      return {
        received: mockReceived,
        sent: mockSent,
      };
    }

    return {
      received: messages.filter((m) => m.direction === 'inbound'),
      sent: messages.filter((m) => m.direction === 'outbound'),
    };
  } catch (error) {
    console.error('[KeyIDDbService] getMessages error:', error);
    return { received: [], sent: [] };
  }
}

module.exports = {
  getConfig,
  updateConfig,
  saveMessage,
  getMessagesFromDb,
};
