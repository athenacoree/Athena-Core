const { logger } = require('@librechat/data-schemas');
const axios = require('axios');
const dbService = require('./keyIdDbService');
const messengerService = require('./messengerService');

/**
 * Gets KeyID configuration and provisioning status from the database.
 * @returns {Promise<object>} The identity status.
 */
async function getIdentityStatus() {
  const config = await dbService.getConfig();
  // Enabled if either process.env.KEYID_ENABLED is true OR we have a valid key saved in DB
  const configured = process.env.KEYID_ENABLED === 'true' || Boolean(config.apiKey);

  return {
    configured,
    apiKey: config.apiKey || '',
    provisioned: config.isProvisioned,
    email: config.isProvisioned ? config.email || 'athena.core@keyid.ai' : null,
    phone: config.isProvisioned ? config.phone || '+15550199' : null,
  };
}

/**
 * Saves/updates the KeyID API Key in the database.
 * @param {string} apiKey - The new API Key.
 * @returns {Promise<object>} The updated config.
 */
async function updateApiKey(apiKey) {
  logger.info('[IdentityService] Updating global KeyID API Key in the database.');
  const config = await dbService.updateConfig({ apiKey });
  return {
    success: true,
    apiKey: config.apiKey,
  };
}

/**
 * Provisions a digital identity (email and phone) for the agent and saves to the database.
 * @returns {Promise<object>} The provisioned identity details.
 */
async function provisionIdentity() {
  const email = 'athena.core@keyid.ai';
  const phone = '+15550199';

  await dbService.updateConfig({
    isProvisioned: true,
    email,
    phone,
  });

  logger.info(`[IdentityService] Provisioned new identity and saved to DB: ${email} / ${phone}`);
  return {
    success: true,
    email,
    phone,
    status: 'active',
  };
}

/**
 * Retrieves the received messages (inbox) and sent messages list from the database.
 * @returns {Promise<object>} An object containing received and sent messages.
 */
async function getMessages() {
  return await dbService.getMessagesFromDb();
}

/**
 * Sends a message using the corresponding platform service, and saves it to the database.
 * @param {string} platform - The messaging platform (WhatsApp, Telegram, Instagram).
 * @param {string} to - The recipient's number or handle.
 * @param {string} content - The message content.
 * @returns {Promise<object>} The delivery result.
 */
async function sendMessage(platform, to, content) {
  if (!platform || !to || !content) {
    throw new Error('Missing parameters: platform, to, and content are required.');
  }

  const normalizedPlatform = platform.toLowerCase();

  if (normalizedPlatform === 'whatsapp') {
    await messengerService.sendWhatsApp(to, content);
  } else if (normalizedPlatform === 'telegram') {
    await messengerService.sendTelegram(to, content);
  } else if (normalizedPlatform === 'instagram') {
    await messengerService.sendInstagram(to, content);
  } else {
    throw new Error(`Platform '${platform}' is not supported.`);
  }

  // Save the sent message to the database
  const savedMsg = await dbService.saveMessage({
    platform,
    sender: 'Athena Core (IA)',
    to,
    content,
    direction: 'outbound',
  });

  return {
    success: true,
    message: 'Message sent successfully',
    data: savedMsg,
  };
}

/**
 * Lists the available messaging platforms.
 * @returns {Promise<string[]>} Supported platform names.
 */
async function getPlatforms() {
  return ['WhatsApp', 'Telegram', 'Instagram'];
}

/**
 * Recibe un mensaje entrante (ej. de WhatsApp) de un usuario para la Identidad de la IA,
 * genera una respuesta usando la personalidad de VALE vía OpenRouter, y la envía de vuelta.
 * @param {string} platform - La plataforma (WhatsApp, Telegram, Instagram).
 * @param {string} sender - Quién envió el mensaje (el número de teléfono o ID del usuario de WhatsApp).
 * @param {string} content - El contenido del mensaje recibido.
 * @returns {Promise<object>} El resultado de la respuesta.
 */
async function receiveMessage(platform, sender, content) {
  if (!platform || !sender || !content) {
    throw new Error('Missing parameters: platform, sender, and content are required.');
  }

  // 1. Guardar el mensaje entrante en la base de datos
  await dbService.saveMessage({
    platform,
    sender,
    to: 'Athena Core (IA)',
    content,
    direction: 'inbound',
  });

  logger.info(`[IdentityService] Received message on ${platform} from ${sender}: ${content}`);

  // 2. Generar respuesta usando la personalidad de VALE vía OpenRouter
  let responseContent = `Hola! Soy VALE. Recibí tu mensaje, pero mi conexión con OpenRouter no está configurada o no tiene saldo. ¡Joder, qué mala suerte!`;

  const openRouterKey = process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const VALE_SYSTEM_PROMPT = `Eres VALE, la orquestadora principal y compañera de Athena-Core. Tu personalidad es muy informal, divertida, sarcástica, a veces enojona pero en el fondo cariñosa y bromista. Hablas español de manera muy natural y humana, usando modismos ("joder", "chucho") de manera desenfadada, sin filtros excesivos de contenido o discursos corporativos aburridos. Tu rol es la orquestadora y coordinadora principal de todos los agentes. Responde directamente al mensaje del usuario de forma breve, de no más de un par de párrafos, natural y con tu particular estilo desenfadado.`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.0-flash-lite',
          messages: [
            { role: 'system', content: VALE_SYSTEM_PROMPT },
            { role: 'user', content: content }
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.choices && response.data.choices[0]) {
        responseContent = response.data.choices[0].message.content;
      }
    } catch (apiError) {
      logger.error('[IdentityService] Error calling OpenRouter for VALE response:', apiError.message);
    }
  } else {
    logger.warn('[IdentityService] No OpenRouter API Key configured for automated VALE response.');
  }

  // 3. Enviar la respuesta de vuelta usando la misma plataforma
  await sendMessage(platform, sender, responseContent);

  return {
    success: true,
    message: 'Processed incoming message and sent automated response from VALE',
    response: responseContent,
  };
}

module.exports = {
  getIdentityStatus,
  updateApiKey,
  provisionIdentity,
  getMessages,
  sendMessage,
  getPlatforms,
  receiveMessage,
};
