const { Tool } = require('@librechat/agents/langchain/tools');

const wikipediaJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'The topic to search for on Wikipedia.',
    },
  },
  required: ['query'],
};

class WikipediaTool extends Tool {
  static lc_name() {
    return 'wikipedia';
  }

  static get jsonSchema() {
    return wikipediaJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);
    this.name = 'wikipedia';
    this.description = 'Busca información en Wikipedia sobre un tema específico.';
    this.schema = wikipediaJsonSchema;
  }

  async _call(input) {
    const { query } = input;
    const lang = 'es';
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      query.replace(/ /g, '_'),
    )}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LibreChat (https://github.com/danny-avila/LibreChat)',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return JSON.stringify({ error: 'No se encontró el artículo en Wikipedia.' });
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const result = {
        title: data.title,
        extract: data.extract,
        thumbnail: data.originalimage?.source || data.thumbnail?.source,
        content_urls: data.content_urls?.desktop?.page,
        description: data.description,
      };

      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({ error: `Error al buscar en Wikipedia: ${error.message}` });
    }
  }
}

module.exports = WikipediaTool;
