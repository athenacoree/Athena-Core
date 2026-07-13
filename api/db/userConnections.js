const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');

// Cache to hold custom mongoose connection per database URI
const userConnections = new Map();

// Fast in-memory cache to store user DB URI resolutions and avoid redundant DB lookups on every request
const userDbUriCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute TTL

/**
 * Resolves or creates a dedicated Mongoose connection for a user if they consented to a custom database.
 *
 * @param {string} userId - The ID of the authenticated user.
 * @returns {Promise<mongoose.Connection|null>} The Mongoose connection instance, or null if using the main DB.
 */
async function resolveUserConnection(userId) {
  if (!userId) {
    return null;
  }

  const now = Date.now();
  const cachedEntry = userDbUriCache.get(userId);

  if (cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL)) {
    if (!cachedEntry.dbUri) {
      return null;
    }
    const cachedConn = userConnections.get(cachedEntry.dbUri);
    if (cachedConn && cachedConn.readyState === 1) {
      return cachedConn;
    }
  }

  try {
    const User = mongoose.model('User');
    const user = await User.findById(userId).lean();

    if (!user || !user.consentThirdPartyAccounts) {
      userDbUriCache.set(userId, { dbUri: null, timestamp: now });
      return null;
    }

    const dbUri = user.thirdPartyAccounts?.mongodbAtlas?.dbUri;
    if (!dbUri) {
      userDbUriCache.set(userId, { dbUri: null, timestamp: now });
      return null;
    }

    userDbUriCache.set(userId, { dbUri, timestamp: now });

    // Return cached connection if available and connected
    if (userConnections.has(dbUri)) {
      const cachedConn = userConnections.get(dbUri);
      if (cachedConn.readyState === 1) {
        return cachedConn;
      }
      // If connection exists but is disconnected, clear it from cache to reconnect
      if (cachedConn.readyState !== 2) { // 2 is connecting
        try {
          await cachedConn.close();
        } catch (e) {
          // ignore
        }
        userConnections.delete(dbUri);
      }
    }

    logger.info(`[userConnections] Connecting to custom user database for userId ${userId}`);

    // Create new dedicated connection to the user's custom MongoDB
    const conn = mongoose.createConnection(dbUri, {
      bufferCommands: false,
    });

    // Compile all existing schemas on this connection so they are fully available
    for (const modelName of Object.keys(mongoose.models)) {
      const originalModel = mongoose.models[modelName];
      conn.model(modelName, originalModel.schema);
    }

    userConnections.set(dbUri, conn);
    return conn;
  } catch (err) {
    logger.error(`[userConnections] Failed to resolve connection for user ${userId}:`, err);
    return null;
  }
}

module.exports = {
  resolveUserConnection,
  userConnections,
};
