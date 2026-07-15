const { logger } = require('@librechat/data-schemas');
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

module.exports = {
  getIdentityStatus,
  updateApiKey,
  provisionIdentity,
  getMessages,
  sendMessage,
  getPlatforms,
};
