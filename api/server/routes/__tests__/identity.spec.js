const express = require('express');
const request = require('supertest');

// Mock identityService and messengerService
jest.mock('~/server/services/identityService', () => ({
  getIdentityStatus: jest.fn(),
  updateApiKey: jest.fn(),
  provisionIdentity: jest.fn(),
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  getPlatforms: jest.fn(),
}));

jest.mock('~/server/middleware/requireJwtAuth', () => (req, res, next) => next());

describe('Identity Routes', () => {
  let app;
  let testUserRole = 'USER';
  const identityService = require('~/server/services/identityService');

  beforeAll(() => {
    const identityRouter = require('../identity');

    app = express();
    app.use(express.json());

    // Inject user with dynamic role
    app.use((req, res, next) => {
      req.user = { id: 'test-user-123', role: testUserRole };
      next();
    });

    app.use('/api/identity', identityRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testUserRole = 'ADMIN'; // Default to admin for most tests
  });

  describe('Authorization', () => {
    it('should reject non-admin users with 403', async () => {
      testUserRole = 'USER';
      const response = await request(app).get('/api/identity/status');
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Acceso denegado. Solo administradores.' });
    });
  });

  describe('GET /status', () => {
    it('should return identity status for admin', async () => {
      const mockStatus = { configured: true, provisioned: false, email: null, phone: null };
      identityService.getIdentityStatus.mockResolvedValue(mockStatus);

      const response = await request(app).get('/api/identity/status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
      expect(identityService.getIdentityStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /config', () => {
    it('should save the KeyID API key for admin', async () => {
      const mockResult = { success: true, apiKey: 'new-key-123' };
      identityService.updateApiKey.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/identity/config')
        .send({ apiKey: 'new-key-123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(identityService.updateApiKey).toHaveBeenCalledWith('new-key-123');
    });

    it('should return 400 when missing apiKey parameter', async () => {
      const response = await request(app)
        .post('/api/identity/config')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required field: apiKey' });
      expect(identityService.updateApiKey).not.toHaveBeenCalled();
    });
  });

  describe('POST /provision', () => {
    it('should provision digital identity for admin', async () => {
      const mockResult = { success: true, email: 'athena.core@keyid.ai', phone: '+15550199' };
      identityService.provisionIdentity.mockResolvedValue(mockResult);

      const response = await request(app).post('/api/identity/provision');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(identityService.provisionIdentity).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /messages', () => {
    it('should retrieve received and sent messages for admin', async () => {
      const mockMessages = { received: [], sent: [] };
      identityService.getMessages.mockResolvedValue(mockMessages);

      const response = await request(app).get('/api/identity/messages');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
      expect(identityService.getMessages).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /send', () => {
    it('should send a message via specified platform', async () => {
      const mockSent = { success: true, message: 'Message sent successfully' };
      identityService.sendMessage.mockResolvedValue(mockSent);

      const response = await request(app)
        .post('/api/identity/send')
        .send({ platform: 'WhatsApp', to: '+15550100', content: 'Hello!' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSent);
      expect(identityService.sendMessage).toHaveBeenCalledWith('WhatsApp', '+15550100', 'Hello!');
    });

    it('should return 400 when missing parameters', async () => {
      const response = await request(app)
        .post('/api/identity/send')
        .send({ platform: 'WhatsApp', to: '+15550100' }); // missing content

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required body fields: platform, to, content' });
      expect(identityService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('GET /platforms', () => {
    it('should list available platforms', async () => {
      const mockPlatforms = ['WhatsApp', 'Telegram', 'Instagram'];
      identityService.getPlatforms.mockResolvedValue(mockPlatforms);

      const response = await request(app).get('/api/identity/platforms');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPlatforms);
      expect(identityService.getPlatforms).toHaveBeenCalledTimes(1);
    });
  });
});
