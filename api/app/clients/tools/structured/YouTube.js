const { Tool } = require('@librechat/agents/langchain/tools');
const { getApiKey } = require('./credentials');

const youtubeJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'The search query for YouTube videos.',
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
    }
  },
  required: ['query'],
};

class YouTubeTool extends Tool {
  static lc_name() {
    return 'youtube';
  }

  static get jsonSchema() {
    return youtubeJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);
    this.name = 'youtube';
    this.description = 'Busca videos en YouTube.';
    this.schema = youtubeJsonSchema;
    this.userId = fields.userId;
    this.envVarApiKey = 'YOUTUBE_API_KEY';
    this.override = fields.override ?? false;

    try {
      this.fallbackApiKey = fields[this.envVarApiKey] ?? getApiKey(this.envVarApiKey, true);
    } catch (e) {
      this.fallbackApiKey = null;
    }
  }

  async _call(input) {
    const { query, max_results = 5, user_api_key } = input;

    let apiKey = user_api_key || this.fallbackApiKey;

    if (!apiKey) {
       return JSON.stringify({ error: 'No se encontró API Key de YouTube. Por favor configúrala en el servidor.' });
    }

    const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(query)}&part=snippet&type=video&maxResults=${max_results}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const results = (data.items || []).map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        channelTitle: item.snippet.channelTitle,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));

      return JSON.stringify(results);
    } catch (error) {
      return JSON.stringify({ error: `Error al buscar en YouTube: ${error.message}` });
    }
  }
}

module.exports = YouTubeTool;
