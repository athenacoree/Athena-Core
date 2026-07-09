const express = require('express');
const router = express.Router();
const GitHubService = require('~/server/services/GitHubService');
const { requireJwtAuth } = require('~/server/middleware');
const { updateUser, getUserById } = require('~/models');
const { logger } = require('@librechat/data-schemas');

router.use(requireJwtAuth);

/**
 * Get user's GitHub repositories
 */
router.get('/repos', async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not linked' });
    }
    const repos = await GitHubService.getRepositories(user.githubAccessToken);
    res.json(repos);
  } catch (error) {
    logger.error('[GitHub Routes] Error fetching repos:', error);
    res.status(500).json({ message: 'Error fetching repositories' });
  }
});

/**
 * Set active GitHub repository
 */
router.post('/active-repo', async (req, res) => {
  try {
    const { repoFullName } = req.body;
    await updateUser(req.user.id, { githubActiveRepo: repoFullName });
    res.json({ message: 'Active repository updated' });
  } catch (error) {
    logger.error('[GitHub Routes] Error updating active repo:', error);
    res.status(500).json({ message: 'Error updating active repository' });
  }
});

/**
 * Push code to GitHub
 */
router.post('/push', async (req, res) => {
  try {
    const { path, content, message, branch } = req.body;
    const user = await getUserById(req.user.id);

    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not linked' });
    }
    if (!user.githubActiveRepo) {
      return res.status(400).json({ message: 'No active repository selected' });
    }

    const result = await GitHubService.pushFile(
      user.githubAccessToken,
      user.githubActiveRepo,
      path,
      content,
      message,
      branch
    );

    res.json({ message: 'Successfully pushed to GitHub', result });
  } catch (error) {
    logger.error('[GitHub Routes] Error pushing to GitHub:', error);
    res.status(500).json({ message: 'Error pushing to GitHub' });
  }
});

/**
 * List files in active GitHub repository
 */
router.get('/files', async (req, res) => {
  try {
    const { path, branch } = req.query;
    const user = await getUserById(req.user.id);

    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not linked' });
    }
    if (!user.githubActiveRepo) {
      return res.status(400).json({ message: 'No active repository selected' });
    }

    const files = await GitHubService.listFiles(
      user.githubAccessToken,
      user.githubActiveRepo,
      path,
      branch
    );

    res.json(files);
  } catch (error) {
    logger.error('[GitHub Routes] Error listing files:', error);
    res.status(500).json({ message: 'Error listing files' });
  }
});

/**
 * Get file content from active GitHub repository
 */
router.get('/file-content', async (req, res) => {
  try {
    const { path, branch } = req.query;
    const user = await getUserById(req.user.id);

    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not linked' });
    }
    if (!user.githubActiveRepo) {
      return res.status(400).json({ message: 'No active repository selected' });
    }

    const content = await GitHubService.getFileContent(
      user.githubAccessToken,
      user.githubActiveRepo,
      path,
      branch
    );

    res.json({ content });
  } catch (error) {
    logger.error('[GitHub Routes] Error getting file content:', error);
    res.status(500).json({ message: 'Error getting file content' });
  }
});

module.exports = router;
