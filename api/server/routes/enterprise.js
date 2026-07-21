const express = require('express');
const { enterpriseRouter } = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

// Enforce JWT authentication on all B2B enterprise endpoints
router.use(requireJwtAuth);

// Mount the typescript-based enterprise router
router.use('/', enterpriseRouter);

module.exports = router;
