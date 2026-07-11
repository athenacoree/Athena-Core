const manifest = require('./manifest');

// Structured Tools
const DALLE3 = require('./structured/DALLE3');
const FluxAPI = require('./structured/FluxAPI');
const OpenWeather = require('./structured/OpenWeather');
const StructuredWolfram = require('./structured/Wolfram');
const StructuredACS = require('./structured/AzureAISearch');
const StructuredSD = require('./structured/StableDiffusion');
const GitHub = require('./structured/GitHub');
const GoogleSearchAPI = require('./structured/GoogleSearch');
const TraversaalSearch = require('./structured/TraversaalSearch');
const createOpenAIImageTools = require('./structured/OpenAIImageTools');
const TavilySearchResults = require('./structured/TavilySearchResults');
const createGeminiImageTool = require('./structured/GeminiImageGen');
const WikipediaTool = require('./structured/Wikipedia');
const YouTubeTool = require('./structured/YouTube');
const GoogleImageSearchTool = require('./structured/GoogleImageSearch');

module.exports = {
  ...manifest,
  // Structured Tools
  DALLE3,
  FluxAPI,
  OpenWeather,
  StructuredSD,
  StructuredACS,
  GoogleSearchAPI,
  GitHub,
  TraversaalSearch,
  StructuredWolfram,
  TavilySearchResults,
  createOpenAIImageTools,
  createGeminiImageTool,
  WikipediaTool,
  YouTubeTool,
  GoogleImageSearchTool,
};
