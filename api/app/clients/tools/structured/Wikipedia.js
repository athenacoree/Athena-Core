const { Tool } = require('@librechat/agents/langchain/tools');

const wikipediaJsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'The search query or article title to search for on Spanish Wikipedia.',
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
    this.description = 'Searches Wikipedia for articles and retrieves summaries using the Spanish Wikipedia API (without requiring an API key). Useful for getting background information, history, and facts about a wide variety of topics.';
    this.schema = wikipediaJsonSchema;
  }

  async _call(input) {
    const { query } = input;

    try {
      // Step 1: Search Wikipedia for matches
      const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&origin=*`;

      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'AthenaCore/1.0 (https://github.com/athenacoree/Athena-Core; support@keyid.ai)',
        },
      });

      if (!searchResponse.ok) {
        throw new Error(`Search request failed with status ${searchResponse.status}`);
      }

      const searchJson = await searchResponse.json();
      const results = searchJson?.query?.search || [];

      if (results.length === 0) {
        return `No se encontraron resultados en Wikipedia en español para: "${query}".`;
      }

      // Step 2: Fetch summaries for the top 3 results using Spanish REST API
      const summaries = [];
      const topResults = results.slice(0, 3);

      for (const result of topResults) {
        const title = result.title;
        const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          title.replace(/ /g, '_')
        )}`;

        try {
          const summaryResponse = await fetch(summaryUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'AthenaCore/1.0 (https://github.com/athenacoree/Athena-Core; support@keyid.ai)',
            },
          });

          if (summaryResponse.ok) {
            const summaryJson = await summaryResponse.json();
            summaries.push({
              title: summaryJson.title,
              extract: summaryJson.extract,
              url: summaryJson.content_urls?.desktop?.page || `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
            });
          } else {
            // Fallback to search snippet if REST API summary fails
            summaries.push({
              title,
              extract: result.snippet.replace(/<span class="searchmatch">/g, '').replace(/<\/span>/g, ''),
              url: `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
            });
          }
        } catch (e) {
          summaries.push({
            title,
            extract: result.snippet.replace(/<span class="searchmatch">/g, '').replace(/<\/span>/g, ''),
            url: `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
          });
        }
      }

      let output = `Resultados de Wikipedia en español para "${query}":\n\n`;
      summaries.forEach((s, i) => {
        output += `${i + 1}. **${s.title}**\n${s.extract}\nLeer más: ${s.url}\n\n`;
      });

      return output;
    } catch (error) {
      throw new Error(`Failed to query Wikipedia: ${error.message}`);
    }
  }
}

module.exports = WikipediaTool;
