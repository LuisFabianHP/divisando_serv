const moduleAlias = require('module-alias');
const pkg = require('../../package.json');
moduleAlias.addAliases(pkg._moduleAliases || {});
process.env.NODE_ENV = 'test';
process.env.API_KEY = process.env.API_KEY || 'test-api-key';
process.env.API_ALLOWED_USER_AGENTS = 'DivisandoApp/1.0';
process.env.API_CROS_DOMAINS = process.env.API_CROS_DOMAINS || 'http://localhost';

const request = require('supertest');
// Mock emailService BEFORE importing app so controllers don't call real external services
jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue()
}));
const app = require('../../app');
const { connectDB, closeDB } = require('@config/database');
const User = require('@models/User');
const VerificationCode = require('@models/VerificationCode');

describe('Auth integration (account verification, password reset, login)', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  describe('Account Verification Flow', () => {
    test('register -> creates user and sends verification code', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ username: 'newuser', email: 'newuser@test.com', password: 'SecureP@ss1' });

      expect(res.statusCode).toBe(200);
      expect(res.body.userId).toBeDefined();

      const user = await User.findById(res.body.userId);
      expect(user).toBeTruthy();
      expect(user.isVerified).toBe(false);

      const codeDoc = await VerificationCode.findOne({ userId: user._id, type: 'account_verification' });
      expect(codeDoc).toBeTruthy();
    });

    test('verification for account_verification returns refreshToken and marks user verified', async () => {
      const user = await User.findOne({ email: 'newuser@test.com' });
      const codeDoc = await VerificationCode.findOne({ userId: user._id, type: 'account_verification' });
      expect(codeDoc).toBeTruthy();

      const res = await request(app)
        .post('/auth/code/verification')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ code: codeDoc.code, userId: user.id });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();

      // Code should be deleted after verification
      const deleted = await VerificationCode.findOne({ userId: user._id, code: codeDoc.code });
      expect(deleted).toBeNull();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isVerified).toBe(true);
      expect(updatedUser.refreshToken).toBe(res.body.refreshToken);
    });
  });

  describe('Login Flow', () => {
    test('login with correct credentials returns refreshToken', async () => {
      // Use verified user from previous test
      const user = await User.findOne({ email: 'newuser@test.com' });
      expect(user.isVerified).toBe(true);

      const res = await request(app)
        .post('/auth/login')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ email: 'newuser@test.com', password: 'SecureP@ss1' });

      expect(res.statusCode).toBe(200);
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.refreshToken).toBe(res.body.refreshToken);
    });

    test('login with incorrect password fails', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ email: 'newuser@test.com', password: 'WrongPassword123' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('login with non-existent user fails', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ email: 'nonexistent@test.com', password: 'SomePassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Password Reset Flow', () => {
    test('forgot password -> generates code and returns userId', async () => {
      const user = await User.create({ username: 'resetuser', email: 'reset@test.com', password: 'oldpass' });

      const res = await request(app)
        .post('/auth/password/forgot')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ email: user.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.userId).toBeDefined();

      const codeDoc = await VerificationCode.findOne({ userId: user._id, type: 'password_reset' });
      expect(codeDoc).toBeTruthy();
    });

    test('verification for password_reset returns success and keeps code for reset', async () => {
      const user = await User.findOne({ email: 'reset@test.com' });
      const codeDoc = await VerificationCode.findOne({ userId: user._id, type: 'password_reset' });
      expect(codeDoc).toBeTruthy();

      const res = await request(app)
        .post('/auth/code/verification')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ code: codeDoc.code, userId: user.id });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.userId).toBe(user.id);

      // The code should still exist until resetPassword consumes it
      const stillExists = await VerificationCode.findOne({ userId: user._id, code: codeDoc.code, type: 'password_reset' });
      expect(stillExists).toBeTruthy();
    });

    test('reset password consumes code and updates password', async () => {
      const user = await User.findOne({ email: 'reset@test.com' });
      const codeDoc = await VerificationCode.findOne({ userId: user._id, type: 'password_reset' });

      const res = await request(app)
        .post('/auth/password/reset')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ email: user.email, code: codeDoc.code, newPassword: 'newStrongP@ss1' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Code must be deleted after reset
      const deleted = await VerificationCode.findOne({ userId: user._id, code: codeDoc.code });
      expect(deleted).toBeNull();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.matchPassword('newStrongP@ss1')).toBe(true);
    });
  });
});
