require('dotenv').config();
const mongoose = require('mongoose');
const User = require('@models/User'); // Asegúrate de que la ruta sea correcta

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Modelo de Usuario', () => {
  it('Debería guardar un usuario con Refresh Token', async () => {
    const user = new User({
      username: 'test_user',
      email: 'test@example.com',
      password: 'password123',
      refreshToken: 'test_refresh_token_123',
    });

    const savedUser = await user.save();
    expect(savedUser.username).toBe('test_user');
    expect(savedUser.refreshToken).toBe('test_refresh_token_123');
  });

  it('Debería encriptar la contraseña antes de guardarla', async () => {
    const user = new User({
      username: 'secure_user',
      email: 'secure@example.com',
      password: 'securePassword',
    });

    const savedUser = await user.save();
    expect(savedUser.password).not.toBe('securePassword'); // Contraseña debe estar encriptada
  });

  it('Debería comparar contraseñas correctamente', async () => {
    const user = new User({
      username: 'compare_user',
      email: 'compare@example.com',
      password: 'comparePassword',
    });

    await user.save();
    const isMatch = await user.matchPassword('comparePassword');
    expect(isMatch).toBe(true);
  });
});
