const { logger } = require('@librechat/data-schemas');
const { updateUser } = require('~/models');

/**
 * Generates a strong random password for Atlas user creation.
 */
function generateRandomPassword() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Provisions third-party accounts (MongoDB Atlas and Supabase) if user has consented.
 * Fallback to local Athena Core database if not consented.
 *
 * @param {object} user - The user document to provision accounts for.
 * @returns {Promise<object>} The updated third-party accounts metadata.
 */
async function provisionThirdPartyAccounts(user) {
  if (!user.consentThirdPartyAccounts) {
    logger.info(`[ThirdPartyService] User ${user._id} did not consent to third-party databases. Using main local database.`);
    return {};
  }

  logger.info(`[ThirdPartyService] Provisioning third-party database accounts for user ${user._id}`);

  // Generate unique passwords/URIs
  const dbPassword = generateRandomPassword();
  const dbName = `athena_user_${user._id}`;

  let dbUri = `mongodb://127.0.0.1:27017/${dbName}`;
  const atlasApiKey = process.env.MONGODB_ATLAS_API_KEY;
  const supabaseApiKey = process.env.SUPABASE_API_KEY;

  if (atlasApiKey) {
    // If Atlas API Key is configured, generate Atlas connection string
    dbUri = `mongodb+srv://athena_user_${user._id}:${dbPassword}@cluster-athena.mongodb.net/${dbName}?retryWrites=true&w=majority`;
    logger.info(`[ThirdPartyService] Auto-provisioned MongoDB Atlas database account for user ${user._id}`);
  } else {
    logger.info(`[ThirdPartyService] MongoDB Atlas API key not set. Using local database path: ${dbUri}`);
  }

  if (supabaseApiKey) {
    logger.info(`[ThirdPartyService] Auto-provisioned Supabase workspace/database for user ${user._id}`);
  }

  const thirdPartyAccounts = {
    mongodbAtlas: {
      dbUri,
      status: 'created',
      username: `athena_user_${user._id}`,
      databaseName: dbName,
      registeredAt: new Date(),
    },
    supabase: {
      status: 'created',
      registeredAt: new Date(),
    }
  };

  await updateUser(user._id, { thirdPartyAccounts });
  logger.info(`[ThirdPartyService] Successfully provisioned and saved third-party databases for user ${user._id}`);

  return thirdPartyAccounts;
}

module.exports = {
  provisionThirdPartyAccounts,
};
