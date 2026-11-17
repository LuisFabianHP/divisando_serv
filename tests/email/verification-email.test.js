const mockCreate = jest.fn();

const loadEmailService = () => {
  jest.resetModules();
  jest.doMock('mailgun.js', () => class {
    client() {
      return { messages: { create: mockCreate } };
    }
  });
  return require('../../services/emailService');
};

describe('sendVerificationEmail', () => {
  beforeEach(() => {
    mockCreate.mockReset().mockResolvedValue({});
    process.env.MAILGUN_API_KEY = 'key-test';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    delete process.env.MAIL_REPLY_TO;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('desactiva tracking y omite Reply-To cuando MAIL_REPLY_TO no está definido', async () => {
    const { sendVerificationEmail } = loadEmailService();

    await sendVerificationEmail('user@example.com', '123456');

    const options = mockCreate.mock.calls[0][1];
    expect(options['o:tracking']).toBe('no');
    expect(options.subject).toBe('Tu código de verificación de Divisando');
    expect(options).not.toHaveProperty('h:Reply-To');
  });

  it('envía Reply-To y el código en texto y HTML cuando MAIL_REPLY_TO está definido', async () => {
    process.env.MAIL_REPLY_TO = 'soporte@example.com';
    const { sendVerificationEmail } = loadEmailService();

    await sendVerificationEmail('user@example.com', '123456');

    const options = mockCreate.mock.calls[0][1];
    expect(options['h:Reply-To']).toBe('soporte@example.com');
    expect(options.text).toContain('123456');
    expect(options.html).toContain('123456');
  });
});
