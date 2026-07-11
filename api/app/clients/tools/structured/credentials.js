const fs = require('fs');
const path = require('path');
const { getEnvironmentVariable } = require('@librechat/agents/langchain/utils/env');

function getApiKey(envVar, override) {
  let key = getEnvironmentVariable(envVar);

  if (!key) {
    const keyFileName = envVar.toLowerCase() + '.txt';
    const keyFilePath = path.join(process.cwd(), 'api', 'data', 'keys', keyFileName);
    if (fs.existsSync(keyFilePath)) {
      key = fs.readFileSync(keyFilePath, 'utf8').trim();
    }
  }

  if (!key && !override) {
    throw new Error(`Missing ${envVar} environment variable or key file.`);
  }
  return key;
}

module.exports = {
  getApiKey,
};
