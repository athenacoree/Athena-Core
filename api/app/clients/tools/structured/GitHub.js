const { Tool } = require('@librechat/agents/langchain/tools');
const GitHubService = require('~/server/services/GitHubService');
const { getUserById } = require('~/models');

const githubJsonSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['list_files', 'read_file', 'push_file'],
      description: 'The action to perform on the repository.',
    },
    path: {
      type: 'string',
      description: 'The file path in the repository.',
    },
    content: {
      type: 'string',
      description: 'The file content (required for push_file).',
    },
    message: {
      type: 'string',
      description: 'The commit message (required for push_file).',
    },
    branch: {
      type: 'string',
      description: 'The branch name. Defaults to main.',
    },
  },
  required: ['action'],
};

class GitHubTool extends Tool {
  static lc_name() {
    return 'github';
  }

  static get jsonSchema() {
    return githubJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);
    this.name = 'github';
    this.description = 'Interact with GitHub repositories. You can list files, read file contents, and push changes (create or update files) to the user\'s active repository.';
    this.schema = githubJsonSchema;
    this.userId = fields.userId;
  }

  async _call(input) {
    const { action, path = '', content, message, branch = 'main' } = input;
    const user = await getUserById(this.userId);

    if (!user.githubAccessToken) {
      return 'Error: GitHub account not linked. Please link your GitHub account in settings.';
    }
    if (!user.githubActiveRepo) {
      return 'Error: No active repository selected. Please select an active repository in settings.';
    }

    try {
      switch (action) {
        case 'list_files': {
          const files = await GitHubService.listFiles(user.githubAccessToken, user.githubActiveRepo, path, branch);
          return JSON.stringify(files, null, 2);
        }
        case 'read_file': {
          if (!path) return 'Error: Path is required for read_file';
          const content = await GitHubService.getFileContent(user.githubAccessToken, user.githubActiveRepo, path, branch);
          return content;
        }
        case 'push_file': {
          if (!path) return 'Error: Path is required for push_file';
          if (!content) return 'Error: Content is required for push_file';
          if (!message) return 'Error: Commit message is required for push_file';
          const result = await GitHubService.pushFile(user.githubAccessToken, user.githubActiveRepo, path, content, message, branch);
          return `Successfully pushed to ${user.githubActiveRepo}/${path} on branch ${branch}. Result: ${result.commit.html_url}`;
        }
        default:
          return `Error: Unknown action ${action}`;
      }
    } catch (error) {
      return `Error performing ${action}: ${error.response?.data?.message || error.message}`;
    }
  }
}

module.exports = GitHubTool;
