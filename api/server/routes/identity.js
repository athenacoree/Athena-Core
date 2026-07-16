const express = require('express');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const isAdmin = require('~/server/middleware/adminAuth');
const identityService = require('~/server/services/identityService');
const { logger } = require('@librechat/data-schemas');

const router = express.Router();

// Apply middleware to all identity routes for safety
router.use(requireJwtAuth);
router.use(isAdmin);

/**
 * GET /api/identity/status
 * Ver si KeyID está configurado y el estado de la identidad
 */
router.get('/status', async (req, res) => {
  try {
    const status = await identityService.getIdentityStatus();
    res.status(200).json(status);
  } catch (error) {
    logger.error('[identity/status] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/identity/config
 * Guardar/actualizar la API Key y llaves en la base de datos
 */
router.post('/config', async (req, res) => {
  try {
    const { apiKey, publicKey, privateKey } = req.body;
    if (apiKey === undefined && publicKey === undefined && privateKey === undefined) {
      return res.status(400).json({ error: 'Missing required field: apiKey' });
    }
    const result = await identityService.updateConfig({ apiKey, publicKey, privateKey });
    res.status(200).json(result);
  } catch (error) {
    logger.error('[identity/config] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/identity/provision
 * Crear correo y teléfono para el agente
 */
router.post('/provision', async (req, res) => {
  try {
    const result = await identityService.provisionIdentity();
    res.status(200).json(result);
  } catch (error) {
    logger.error('[identity/provision] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/identity/messages
 * Leer correos/SMS recibidos y enviados
 */
router.get('/messages', async (req, res) => {
  try {
    const messages = await identityService.getMessages();
    res.status(200).json(messages);
  } catch (error) {
    logger.error('[identity/messages] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/identity/send
 * Enviar mensaje por WhatsApp, Telegram, Instagram
 */
router.post('/send', async (req, res) => {
  try {
    const { platform, to, content } = req.body;
    if (!platform || !to || !content) {
      return res.status(400).json({ error: 'Missing required body fields: platform, to, content' });
    }
    const result = await identityService.sendMessage(platform, to, content);
    res.status(200).json(result);
  } catch (error) {
    logger.error('[identity/send] Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * GET /api/identity/platforms
 * Lista de plataformas disponibles
 */
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await identityService.getPlatforms();
    res.status(200).json(platforms);
  } catch (error) {
    logger.error('[identity/platforms] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
