const axios = require('axios');
const { logger } = require('@librechat/data-schemas');

/**
 * Registers a unique digital identity for the agent using KeyID.ai.
 *
 * @param {string} userId - The user ID associated with this agent identity.
 * @returns {Promise<object>} The registered agent identity metadata.
 */
async function registerAgentIdentity(userId) {
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const agentEmail = `agent_${userId}_${randomSuffix}@keyid.ai`;

  const identity = {
    email: agentEmail,
    keyIdToken: `keyid_token_${Math.random().toString(36).substring(2, 15)}`,
    externalServicesRegistered: [],
    status: 'active',
    registeredAt: new Date(),
  };

  const keyidApiKey = process.env.KEYID_API_KEY;
  if (keyidApiKey) {
    try {
      logger.info(`[KeyIDService] Registering digital identity for agent ${agentEmail} on external KeyID API`);
      const response = await axios.post(
        'https://api.keyid.ai/v1/register',
        {
          userId,
          email: agentEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${keyidApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      if (response.data && response.data.token) {
        identity.keyIdToken = response.data.token;
        identity.status = 'registered';
      }
    } catch (error) {
      logger.error(`[KeyIDService] KeyID external API registration failed: ${error.message}. Using simulated active status.`);
    }
  } else {
    logger.info(`[KeyIDService] KeyID API Key not set. Auto-provisioned simulated agent digital identity: ${agentEmail}`);
  }

  return identity;
}

module.exports = {
  registerAgentIdentity,
};
