// --- SETUP Y CONFIGURACIÓN GLOBAL ---
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

// Timeout extendido para operaciones async con base de datos
jest.setTimeout(30000);

// --- SOFT DELETE FLOW ---
describe('Soft Delete Flow', () => {
  const softDeleteUser = {
    username: 'softdeleteuser',
    email: 'softdeleteuser@example.com',
    password: 'SoftDelete123!'
  };
  let accessToken;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: softDeleteUser.email });
    await request(app)
      .post('/auth/register')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .send(softDeleteUser);
    // Verificar usuario (simular verificación directa)
    const user = await User.findOne({ email: softDeleteUser.email });
    user.isVerified = true;
    await user.save();
    // Login para obtener access token
    const loginRes = await request(app)
      .post('/auth/login')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .send({ email: softDeleteUser.email, password: softDeleteUser.password });
    accessToken = loginRes.body.refreshToken;
  });

  afterAll(async () => {
    await User.deleteOne({ email: softDeleteUser.email });
    await closeDB();
  });

  test('debe cancelar la cuenta correctamente', async () => {
    const res = await request(app)
      .delete('/auth/account')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: softDeleteUser.password });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/cancelada/i);
    // Verificar en base de datos
    const user = await User.findOne({ email: softDeleteUser.email });
    expect(user.status).toBe('deleted');
    expect(user.deletedAt).not.toBeNull();
  });

  test('no permite login después de soft delete', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .send({ email: softDeleteUser.email, password: softDeleteUser.password });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/cancelada/i);
  });
});

// --- RESTO DE PRUEBAS DE INTEGRACIÓN ---
const runId = Date.now();
const accountUser = {
  username: `newuser_${runId}`,
  email: `newuser_${runId}@test.com`,
  password: 'SecureP@ss1',
};
const resetUser = {
  username: `resetuser_${runId}`,
  email: `reset_${runId}@test.com`,
  password: 'oldpass',
};

describe('Auth integration (account verification, password reset, login)', () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $in: [accountUser.email, resetUser.email] } });
    await VerificationCode.deleteMany({ email: { $in: [accountUser.email, resetUser.email] } });
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
        .send(accountUser);

      expect(res.statusCode).toBe(200);
      expect(res.body.userId).toBeDefined();

      const user = await User.findById(res.body.userId);
      expect(user).toBeTruthy();
      expect(user.isVerified).toBe(false);

      const codeDoc = await VerificationCode.findOne({ userId: user._id, type: 'account_verification' });
      expect(codeDoc).toBeTruthy();
    });

    test('verification for account_verification returns refreshToken and marks user verified', async () => {
      const user = await User.findOne({ email: accountUser.email });
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
      const user = await User.findOne({ email: accountUser.email });
      expect(user.isVerified).toBe(true);

      const res = await request(app)
        .post('/auth/login')
        .set('x-api-key', process.env.API_KEY)
        .set('User-Agent', 'DivisandoApp/1.0')
        .send({ email: accountUser.email, password: accountUser.password });

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
        .send({ email: accountUser.email, password: 'WrongPassword123' });

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
      const user = await User.create(resetUser);

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
      const user = await User.findOne({ email: resetUser.email });
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
      const user = await User.findOne({ email: resetUser.email });
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

  afterAll(() => {
    const rateLimiter = require('../../middlewares/rateLimiter');
    if (rateLimiter?.store?.shutdown) {
      rateLimiter.store.shutdown();
    }
  });
});

// --- PROFILE FLOW ---
describe('Profile Flow', () => {
  const profileUser = {
    username: 'profileuser',
    email: 'profileuser@example.com',
    password: 'Profile123!'
  };
  let accessToken;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: profileUser.email });

    // Registrar y verificar usuario
    await request(app)
      .post('/auth/register')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .send(profileUser);

    const user = await User.findOne({ email: profileUser.email });
    user.isVerified = true;
    await user.save();

    // Login para obtener accessToken
    const loginRes = await request(app)
      .post('/auth/login')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .send({ email: profileUser.email, password: profileUser.password });

    accessToken = loginRes.body.refreshToken;
  });

  afterAll(async () => {
    await User.deleteMany({ email: profileUser.email });
    await closeDB();
  });

  test('GET /auth/profile returns user data', async () => {
    const res = await request(app)
      .get('/auth/profile')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({
      username: profileUser.username,
      email: profileUser.email,
    });
    expect(res.body.user).toHaveProperty('isVerified', true);
    expect(res.body.user).toHaveProperty('status', 'active');
  });

  test('GET /auth/profile returns 401 without token', async () => {
    const res = await request(app)
      .get('/auth/profile')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0');

    expect(res.statusCode).toBe(401);
  });

  test('PUT /auth/profile updates username', async () => {
    const res = await request(app)
      .put('/auth/profile')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'profileupdated' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('profileupdated');
  });

  test('PUT /auth/profile rejects username too short', async () => {
    const res = await request(app)
      .put('/auth/profile')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'ab' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('PUT /auth/profile rejects invalid email', async () => {
    const res = await request(app)
      .put('/auth/profile')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('PUT /auth/profile returns 400 with no fields', async () => {
    const res = await request(app)
      .put('/auth/profile')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'DivisandoApp/1.0')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
