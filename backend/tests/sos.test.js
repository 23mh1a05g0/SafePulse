const express = require('express');
const request = require('supertest');
const sosRoutes = require('../routes/sos');

jest.mock('../models/SOS', () => ({
  findById: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock('../services/notification_service', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
  sendPushNotification: jest.fn().mockResolvedValue(true)
}));

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.userId = 'mock_user_id';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/sos', sosRoutes);

describe('SOS Routes', () => {
  const User = require('../models/User');
  const SOS = require('../models/SOS');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/sos/start - missing location', async () => {
    const res = await request(app).post('/api/sos/start').send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/sos/start - user not found', async () => {
    User.findById.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/sos/start').send({ lat: 10, lng: 10 });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/sos/cancel - sos not found', async () => {
    SOS.findById.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/sos/cancel').send({ sosId: '123' });
    expect(res.statusCode).toBe(404);
  });
  
  it('POST /api/sos/respond - sos not found', async () => {
    SOS.findById.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/sos/respond').send({ sosId: '123' });
    expect(res.statusCode).toBe(404);
  });
});
