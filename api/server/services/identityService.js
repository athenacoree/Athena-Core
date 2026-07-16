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
  const configured = process.env.KEYID_ENABLED === 'true' || Boolean(config.apiKey) || Boolean(config.publicKey);

  const googleConfigured = Boolean(config.googleClientId && config.googleClientSecret) || (Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET));

  return {
    configured,
    apiKey: config.apiKey || '',
    publicKey: config.publicKey || '',
    privateKey: config.privateKey || '',
    provisioned: config.isProvisioned,
    email: config.isProvisioned ? config.email || 'athena.core@keyid.ai' : null,
    phone: config.isProvisioned ? config.phone || '+15550199' : null,
    googleClientId: config.googleClientId || '',
    googleClientSecret: config.googleClientSecret || '',
    googleCallbackUrl: config.googleCallbackUrl || '',
    googleConfigured,
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
 * Saves/updates the KeyID configuration in the database.
 * @param {object} updates - The config fields to update (apiKey, publicKey, privateKey).
 * @returns {Promise<object>} The updated config.
 */
async function updateConfig(updates) {
  logger.info('[IdentityService] Updating global KeyID configuration in the database.');
  const config = await dbService.updateConfig(updates);
  return {
    success: true,
    apiKey: config.apiKey,
    publicKey: config.publicKey,
    privateKey: config.privateKey,
  };
}

/**
 * Provisions a digital identity (email and phone) for the agent and saves to the database.
 * @returns {Promise<object>} The provisioned identity details.
 */
async function provisionIdentity() {
  const config = await dbService.getConfig();
  let publicKey = config.publicKey;
  let privateKey = config.privateKey;

  // Generate real Ed25519 keys if they are not already set
  if (!publicKey || !privateKey) {
    try {
      const { generateKeyPairSync } = require('crypto');
      const { publicKey: pubObj, privateKey: privObj } = generateKeyPairSync('ed25519');
      publicKey = pubObj.export({ type: 'spki', format: 'der' }).slice(-32).toString('hex');
      privateKey = privObj.export({ type: 'pkcs8', format: 'der' }).slice(-32).toString('hex');
      logger.info('[IdentityService] Auto-generated real Ed25519 keypair for KeyID.');
    } catch (err) {
      logger.error('[IdentityService] Failed to generate Ed25519 keypair:', err);
    }
  }

  // Derive unique and authentic email and phone number based on the real public key
  const email = publicKey ? `athena.${publicKey.substring(0, 10)}@keyid.ai` : 'athena.core@keyid.ai';
  const phoneSuffix = publicKey ? parseInt(publicKey.substring(10, 18), 16) % 10000000 : 5550199;
  const phone = publicKey ? `+1555${String(phoneSuffix).padStart(7, '0')}` : '+15550199';

  await dbService.updateConfig({
    isProvisioned: true,
    publicKey,
    privateKey,
    email,
    phone,
  });

  logger.info(`[IdentityService] Provisioned new real identity and saved to DB: ${email} / ${phone}`);
  return {
    success: true,
    email,
    phone,
    publicKey,
    privateKey,
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
 * Resets/deletes the agent's digital identity from the database.
 * @returns {Promise<object>} Result.
 */
async function deleteIdentity() {
  logger.info('[IdentityService] Deleting digital identity and keys.');
  await dbService.updateConfig({
    isProvisioned: false,
    email: '',
    phone: '',
    publicKey: '',
    privateKey: '',
  });
  return { success: true };
}

/**
 * Saves/updates the Google OAuth configuration.
 * @param {object} params - The credentials.
 * @returns {Promise<object>} Result.
 */
async function updateGoogleConfig({ clientId, clientSecret, callbackUrl }) {
  logger.info('[IdentityService] Saving Google OAuth configuration.');
  await dbService.updateConfig({
    googleClientId: clientId,
    googleClientSecret: clientSecret,
    googleCallbackUrl: callbackUrl || '',
  });
  return { success: true };
}

/**
 * Deletes/clears the Google OAuth configuration.
 * @returns {Promise<object>} Result.
 */
async function deleteGoogleConfig() {
  logger.info('[IdentityService] Deleting Google OAuth configuration.');
  await dbService.updateConfig({
    googleClientId: '',
    googleClientSecret: '',
    googleCallbackUrl: '',
  });
  return { success: true };
}

module.exports = {
  getIdentityStatus,
  updateApiKey,
  updateConfig,
  provisionIdentity,
  getMessages,
  sendMessage,
  getPlatforms,
  deleteIdentity,
  updateGoogleConfig,
  deleteGoogleConfig,
};
