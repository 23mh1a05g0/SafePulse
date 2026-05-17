const express = require('express');
const request = require('supertest');
const authRoutes = require('../routes/auth');

// Mock User model to prevent DB calls
jest.mock('../models/User', () => {
  const mockUser = function(data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  };
  mockUser.findOne = jest.fn();
  mockUser.findByIdAndUpdate = jest.fn();
  mockUser.findById = jest.fn();
  return mockUser;
});

// Mock OTP model
jest.mock('../models/OTP', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn()
}));

// Mock Email Service
jest.mock('../services/email_service', () => ({
  sendEmailOTP: jest.fn()
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  signToken: jest.fn(() => 'mock_token'),
  requireAuth: (req, res, next) => {
    req.userId = 'mock_user_id';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes (Coverage for error paths)', () => {
  const User = require('../models/User');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/auth/send-otp - fails without phone', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/send-email-otp - fails without email', async () => {
    const res = await request(app).post('/api/auth/send-email-otp').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/verify-otp - creates new user if not found', async () => {
    const OTP = require('../models/OTP');
    OTP.findOne.mockResolvedValueOnce({ _id: 'otp_id', identifier: '123', otp: '123456', expiresAt: new Date(Date.now() + 10000) });
    User.findOne.mockResolvedValueOnce(null);
    
    const res = await request(app).post('/api/auth/verify-otp').send({ phone: '123', otp: '123456' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('SafePulse User');
  });

  it('POST /api/auth/update-status - succeeds with valid token', async () => {
    User.findByIdAndUpdate.mockResolvedValueOnce({ _id: 'mock_user_id' });
    const res = await request(app).post('/api/auth/update-status').send({ location: { lat: 10, lng: 10 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PATCH /api/auth/update-name - fails if name too short', async () => {
    const res = await request(app).patch('/api/auth/update-name').send({ name: 'A' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/auth/me - returns user if found', async () => {
    User.findById.mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce({ _id: 'mock_user_id', name: 'Test User' })
    });
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/auth/emergency-contacts - updates contacts', async () => {
    User.findByIdAndUpdate.mockResolvedValueOnce(true);
    const res = await request(app).post('/api/auth/emergency-contacts').send({ contacts: [] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
