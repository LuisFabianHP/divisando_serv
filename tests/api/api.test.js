require('dotenv').config();
require('../setups/setupApiTests');
const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const ExchangeRate = require('../../models/ExchangeRate');

// Forzar User-Agent permitido para pruebas predecibles
process.env.API_ALLOWED_USER_AGENTS = 'MiAplicacionMovil/1.0';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const testToken = jwt.sign({ id: 'test-user', role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('Pruebas de la API', () => {

  test('Debe devolver monedas disponibles', async () => {
    const response = await request(app)
      .get('/exchange/currencies')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'MiAplicacionMovil/1.0')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('currencies');
  });

  test('Debe comparar monedas USD y MXN', async () => {
    const response = await request(app)
      .get('/exchange/compare?baseCurrency=USD&targetCurrency=MXN')
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'MiAplicacionMovil/1.0')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('baseCurrency', 'USD');
    expect(response.body).toHaveProperty('targetCurrency', 'MXN');
    expect(response.body).toHaveProperty('status'); // 'up' o 'dw'
  });

  test('Debe devolver 204 cuando no hay cambios en compare incremental', async () => {
    const latest = await ExchangeRate.findOne({ base_currency: 'USD' }).sort({ updatedAt: -1 }).lean();
    const latestRate = latest.rates.find((rate) => rate.currency === 'MXN').value;
    const latestUpdatedAt = new Date(latest.updatedAt).toISOString();

    const response = await request(app)
      .get('/exchange/compare')
      .query({
        baseCurrency: 'USD',
        targetCurrency: 'MXN',
        knownUpdatedAt: latestUpdatedAt,
        knownCurrentRate: latestRate,
      })
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'MiAplicacionMovil/1.0')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(204);
    expect(response.headers['x-poll-interval-minutes']).toBeDefined();
    expect(response.text).toBe('');
  });

  test('Debe devolver 200 con payload cuando hay cambios en compare incremental', async () => {
    const latest = await ExchangeRate.findOne({ base_currency: 'USD' }).sort({ updatedAt: -1 }).lean();
    const latestUpdatedAt = new Date(latest.updatedAt).toISOString();

    const response = await request(app)
      .get('/exchange/compare')
      .query({
        baseCurrency: 'USD',
        targetCurrency: 'MXN',
        knownUpdatedAt: latestUpdatedAt,
        knownCurrentRate: 0,
      })
      .set('x-api-key', process.env.API_KEY)
      .set('User-Agent', 'MiAplicacionMovil/1.0')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('hasChanges', true);
    expect(response.body).toHaveProperty('pollIntervalMinutes');
    expect(response.body).toHaveProperty('baseCurrency', 'USD');
    expect(response.body).toHaveProperty('targetCurrency', 'MXN');
  });
});

