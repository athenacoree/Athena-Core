const mongoose = require('mongoose');
const { createModels, tenantStorage } = require('@librechat/data-schemas');
const { connectDb } = require('./connect');

// createModels MUST run before requiring indexSync.
// indexSync.js captures mongoose.models.Message and mongoose.models.Conversation
// at module load time. If those models are not registered first, all MeiliSearch
// sync operations will silently fail on every startup.
createModels(mongoose);

// Implement dynamic user-specific database connection routing via Proxy
const userSpecificCollections = ['Conversation', 'ChatProject', 'Config', 'Balance'];

const originalModelMethod = mongoose.model.bind(mongoose);
mongoose.model = function (name, schema, collection) {
  if (userSpecificCollections.includes(name)) {
    const store = tenantStorage.getStore();
    const conn = store?.customConnection;
    if (conn) {
      return conn.model(name, schema, collection);
    }
  }
  return originalModelMethod(name, schema, collection);
};

const originalModels = mongoose.models;
Object.defineProperty(mongoose, 'models', {
  get() {
    return new Proxy(originalModels, {
      get(target, prop) {
        if (userSpecificCollections.includes(prop)) {
          const store = tenantStorage.getStore();
          const conn = store?.customConnection;
          if (conn && conn.models && conn.models[prop]) {
            return conn.models[prop];
          }
        }
        return Reflect.get(target, prop);
      }
    });
  },
  configurable: true,
  enumerable: true
});

const indexSync = require('./indexSync');

module.exports = { connectDb, indexSync };
