describe('AuthController loginWithGoogle audience validation', () => {
  const mockUser = {
    id: 'user-1',
    refreshToken: '',
    save: jest.fn().mockResolvedValue(true),
  };

  const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const loadController = async ({ audiences, payload, existingUser = null }) => {
    jest.resetModules();

    process.env.GOOGLE_CLIENT_ID = audiences.googleClientId || '';
    process.env.GOOGLE_WEB_CLIENT_ID = audiences.googleWebClientId || '';
    process.env.GOOGLE_ANDROID_CLIENT_ID = audiences.googleAndroidClientId || '';
    process.env.GOOGLE_IOS_CLIENT_ID = audiences.googleIosClientId || '';
    process.env.GOOGLE_CLIENT_IDS = audiences.googleClientIds || '';
    process.env.JWT_EXPIRES_IN = '7d';

    jest.doMock('@models/User', () => ({
      findOne: jest.fn().mockResolvedValue(existingUser),
      create: jest.fn().mockResolvedValue({ ...mockUser }),
    }));

    jest.doMock('@models/VerificationCode', () => ({}));

    jest.doMock('@utils/refreshToken', () => ({
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token-test'),
      validateRefreshToken: jest.fn(),
    }));

    jest.doMock('@services/emailService.js', () => ({
      sendVerificationEmail: jest.fn(),
      sendPasswordChangedEmail: jest.fn(),
    }));

    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => payload,
    });

    const OAuth2Client = jest.fn().mockImplementation(() => ({ verifyIdToken }));

    jest.doMock('google-auth-library', () => ({ OAuth2Client }));

    jest.doMock('@utils/logger', () => ({
      apiLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }));

    const controller = require('@controllers/authController');
    return { controller, OAuth2Client, verifyIdToken };
  };

  test('returns 200 when token aud matches configured audiences', async () => {
    const { controller } = await loadController({
      audiences: {
        googleClientId: 'web-client-id.apps.googleusercontent.com',
      },
      payload: {
        sub: 'google-123',
        email: 'user@test.com',
        name: 'User Test',
        aud: 'web-client-id.apps.googleusercontent.com',
      },
    });

    const req = { body: { idToken: 'token' } };
    const res = createRes();

    await controller.loginWithGoogle(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
  });

  test('returns 200 when token azp matches configured audiences', async () => {
    const { controller } = await loadController({
      audiences: {
        googleClientId: 'web-client-id.apps.googleusercontent.com',
        googleAndroidClientId: 'android-client-id.apps.googleusercontent.com',
      },
      payload: {
        sub: 'google-456',
        email: 'user2@test.com',
        name: 'User Two',
        aud: 'web-client-id.apps.googleusercontent.com',
        azp: 'android-client-id.apps.googleusercontent.com',
      },
    });

    const req = { body: { idToken: 'token' } };
    const res = createRes();

    await controller.loginWithGoogle(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 401 when neither aud nor azp match configured audiences', async () => {
    const { controller } = await loadController({
      audiences: {
        googleClientId: 'different-client.apps.googleusercontent.com',
      },
      payload: {
        sub: 'google-789',
        email: 'user3@test.com',
        name: 'User Three',
        aud: 'web-client-id.apps.googleusercontent.com',
        azp: 'android-client-id.apps.googleusercontent.com',
      },
    });

    const req = { body: { idToken: 'token' } };
    const res = createRes();

    await controller.loginWithGoogle(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token de Google inválido.' });
  });
});
