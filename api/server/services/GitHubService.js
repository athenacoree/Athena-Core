const axios = require('axios');
const { logger } = require('@librechat/data-schemas');

/**
 * GitHub Service to interact with GitHub API
 */
class GitHubService {
  /**
   * Get all repositories for the authenticated user
   * @param {string} accessToken
   * @returns {Promise<Array>}
   */
  async getRepositories(accessToken) {
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          per_page: 100,
          sort: 'updated',
        },
      });
      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        private: repo.private,
      }));
    } catch (error) {
      logger.error('[GitHubService] Error fetching repositories:', error.message);
      throw error;
    }
  }

  /**
   * Push changes to a repository
   * @param {string} accessToken
   * @param {string} fullName - repository full name (owner/repo)
   * @param {string} path - file path
   * @param {string} content - file content
   * @param {string} message - commit message
   * @param {string} [branch='main']
   * @returns {Promise<Object>}
   */
  async pushFile(accessToken, fullName, path, content, message, branch = 'main') {
    try {
      // 1. Get the current file (if it exists) to get its SHA
      let sha;
      try {
        const fileResponse = await axios.get(`https://api.github.com/repos/${fullName}/contents/${path}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          params: { ref: branch },
        });
        sha = fileResponse.data.sha;
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          throw error;
        }
        // File doesn't exist, which is fine
      }

      // 2. Create or update the file
      const response = await axios.put(`https://api.github.com/repos/${fullName}/contents/${path}`, {
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.data;
    } catch (error) {
      logger.error('[GitHubService] Error pushing file:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * List files in a repository path
   * @param {string} accessToken
   * @param {string} fullName
   * @param {string} [path='']
   * @param {string} [branch='main']
   * @returns {Promise<Array>}
   */
  async listFiles(accessToken, fullName, path = '', branch = 'main') {
    try {
      const response = await axios.get(`https://api.github.com/repos/${fullName}/contents/${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: { ref: branch },
      });

      if (Array.isArray(response.data)) {
        return response.data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          sha: item.sha,
          size: item.size,
          download_url: item.download_url,
        }));
      }
      return [response.data];
    } catch (error) {
      logger.error('[GitHubService] Error listing files:', error.message);
      throw error;
    }
  }

  /**
   * Get file content from repository
   * @param {string} accessToken
   * @param {string} fullName
   * @param {string} path
   * @param {string} [branch='main']
   * @returns {Promise<string>}
   */
  async getFileContent(accessToken, fullName, path, branch = 'main') {
    try {
      const response = await axios.get(`https://api.github.com/repos/${fullName}/contents/${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: { ref: branch },
      });

      if (response.data.content) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      throw new Error('File content not found');
    } catch (error) {
      logger.error('[GitHubService] Error getting file content:', error.message);
      throw error;
    }
  }
}

module.exports = new GitHubService();
