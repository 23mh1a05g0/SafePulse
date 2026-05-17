const express = require('express');
const router = express.Router();
const User = require('../models/User');
const OTP = require('../models/OTP');
const twilio = require('twilio');
const { signToken, requireAuth } = require('../middleware/auth');
const emailService = require('../services/email_service');

const accountSid  = process.env.TWILIO_ACCOUNT_SID;
const authToken   = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client =
  accountSid && accountSid.startsWith('AC') && authToken
    ? twilio(accountSid, authToken)
    : null;


router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

  try {
    // Save OTP to temporary model
    await OTP.findOneAndUpdate(
      { identifier: phone },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    if (client && twilioPhone) {
      await client.messages.create({
        body: `Your SafePulse verification code is: ${otp}. Valid for 10 minutes.`,
        from: twilioPhone,
        to: phone,
      });
      console.log(`[AUTH] OTP sent to ${phone}`);
    } else {
      console.warn(`[AUTH] DEV MODE — OTP for ${phone}: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('[AUTH] send-otp error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000);

  try {
    await OTP.findOneAndUpdate(
      { identifier: email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    const sent = await emailService.sendEmailOTP(email, otp);
    if (!sent) return res.status(500).json({ success: false, error: 'Failed to send verification email' });

    console.log(`[AUTH] ✅ OTP sent to ${email}: ${otp}`);
    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('[AUTH] send-email-otp error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { phone, email, otp } = req.body;
  const identifier = email || phone;

  if (!identifier || !otp) {
    return res.status(400).json({ success: false, error: 'Identifier and OTP are required' });
  }

  try {
    // 1. Verify OTP
    const otpRecord = await OTP.findOne({ identifier, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // 2. Check expiry
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, error: 'OTP has expired' });
    }

    // 3. Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    // 4. Find or Create User (Auto Register)
    let user = await User.findOne(email ? { email } : { phone });
    
    if (!user) {
      console.log(`[AUTH] Creating new user for ${identifier}`);
      user = new User({
        email: email || undefined,
        phone: phone || undefined,
        name: 'SafePulse User',
        loginType: email ? 'email' : 'phone'
      });
      await user.save();
    }

    const token = signToken(user._id.toString());

    console.log(`[AUTH] Login successful: ${user._id}`);
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        loginType: user.loginType,
        emergencyContacts: user.emergencyContacts,
      },
    });
  } catch (error) {
    console.error('[AUTH] verify-otp error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/update-status', requireAuth, async (req, res) => {
  const { location, batteryLevel, isDriving, currentSpeed, fcmToken } = req.body;
  const userId = req.userId;

  try {
    const update = {
      lastSeen: new Date(),
    };

    if (location) {
      update.location = location;
      // Keep the GeoJSON Point in sync so MongoDB $near queries work
      update.locationPoint = {
        type: 'Point',
        coordinates: [location.lng, location.lat], // MongoDB: [lng, lat] order
      };
    }
    if (batteryLevel !== undefined) update.batteryLevel = batteryLevel;
    if (isDriving     !== undefined) update.isDriving   = isDriving;
    if (currentSpeed  !== undefined) update.currentSpeed = currentSpeed;
    if (fcmToken)                    update.fcmToken    = fcmToken;

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true });
  } catch (error) {
    console.error('[AUTH] update-status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


router.patch('/update-name', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Name too short' });
  }
  try {
    await User.findByIdAndUpdate(req.userId, { name: name.trim() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-otp -otpExpiry -fcmToken');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post('/emergency-contacts', requireAuth, async (req, res) => {
  const { contacts } = req.body; // [{name, phone, relation}]
  try {
    await User.findByIdAndUpdate(req.userId, { emergencyContacts: contacts });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
