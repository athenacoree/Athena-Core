const { Tool } = require('@librechat/agents/langchain/tools');
const { getApiKey } = require('./credentials');

const googleImageSearchJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'The search query for images.',
    },
    max_results: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
      default: 5,
      description: 'Maximum number of results to return.',
    },
    user_api_key: {
      type: 'string',
      description: 'Optional API key provided by the user.',
    },
    user_cx: {
      type: 'string',
      description: 'Optional CX ID provided by the user.',
    }
  },
  required: ['query'],
};

class GoogleImageSearchTool extends Tool {
  static lc_name() {
    return 'google_image_search';
  }

  static get jsonSchema() {
    return googleImageSearchJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);
    this.name = 'google_image_search';
    this.description = 'Busca imágenes en Google.';
    this.schema = googleImageSearchJsonSchema;
    this.envVarApiKey = 'GOOGLE_IMAGE_SEARCH_API_KEY';
    this.envVarCx = 'GOOGLE_IMAGE_SEARCH_CX';
    this.override = fields.override ?? false;

    try {
      this.fallbackApiKey = fields[this.envVarApiKey] ?? getApiKey(this.envVarApiKey, true);
      this.fallbackCx = fields[this.envVarCx] ?? getApiKey(this.envVarCx, true);
    } catch (e) {
      this.fallbackApiKey = null;
      this.fallbackCx = null;
    }
  }

  async _call(input) {
    const { query, max_results = 5, user_api_key, user_cx } = input;

    let apiKey = user_api_key || this.fallbackApiKey;
    let cx = user_cx || this.fallbackCx;

    if (!apiKey || !cx) {
       return JSON.stringify({ error: 'Falta configuración de Google Image Search (API Key o CX). Por favor configúrala en Ajustes o en el servidor.' });
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${
      cx
    }&q=${encodeURIComponent(query)}&searchType=image&num=${max_results}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const results = (data.items || []).map((item) => ({
        title: item.title,
        link: item.link,
        displayLink: item.displayLink,
        snippet: item.snippet,
        thumbnail: item.image?.thumbnailLink,
        contextLink: item.image?.contextLink,
      }));

      return JSON.stringify(results);
    } catch (error) {
      return JSON.stringify({ error: `Error al buscar imágenes en Google: ${error.message}` });
    }
  }
}

module.exports = GoogleImageSearchTool;
