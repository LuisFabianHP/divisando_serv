const { connectDB, closeDB } = require('../../config/database');
const mongoose = require('mongoose');
const ExchangeRate = require('../../models/ExchangeRate');
const AvailableCurrencies = require('../../models/AvailableCurrencies');

// Defaults for tests that load app.js
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.API_KEY = process.env.API_KEY || 'test-api-key';
process.env.API_CROS_DOMAINS = process.env.API_CROS_DOMAINS || 'http://localhost';

// Conectar a la base de datos antes de todas las pruebas
beforeAll(async () => {
  await connectDB();
});

// Insertar datos antes de cada prueba
beforeEach(async () => {

  await AvailableCurrencies.insertMany([
    { currency: 'USD', updatedAt: new Date() },
    { currency: 'CAD', updatedAt: new Date() },
    { currency: 'MXN', updatedAt: new Date() },
    { currency: 'BRL', updatedAt: new Date() },
    { currency: 'ARS', updatedAt: new Date() },
    { currency: 'EUR', updatedAt: new Date() },
  ]);

  // Insertar registros necesarios para la comparaci├│n
  await ExchangeRate.insertMany([
    {
      base_currency: 'USD',
      rates: [{ currency: 'MXN', value: 20.6688 }],
      createdAt: '2025-01-22T20:24:55.539+00:00',
      updatedAt: '2025-01-22T20:24:55.539+00:00',
    },
    {
      base_currency: 'USD',
      rates: [{ currency: 'MXN', value: 19.7894 }],
      createdAt: '2025-01-22T18:24:55.539+00:00',
      updatedAt: '2025-01-22T18:24:55.539+00:00',
    },
  ]);
});

// Limpiar colecciones después de cada prueba
afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany(); // Borra todos los documentos de la colecci├│n
  }
});

// Cerrar la conexión después de todas las pruebas
afterAll(async () => {
  await closeDB();
});

