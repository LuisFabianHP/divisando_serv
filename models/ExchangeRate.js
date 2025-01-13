// models/ExchangeRate.js
const mongoose = require('mongoose');

// Subesquema para las tasas de cambio
const rateSchema = new mongoose.Schema({
  currency: { type: String, required: true }, // Código de la moneda (ej. USD, EUR)
  value: { type: Number, required: true },   // Tasa de cambio
});

// Esquema principal para las tasas de cambio
const exchangeRateSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now, // Fecha de la tasa de cambio
    },
    base_currency: {
      type: String,
      required: true, // Moneda base (ej. USD)
    },
    rates: [rateSchema], // Lista de tasas de cambio con otras monedas
  },
  {
    collection: 'exchangeRates', // Nombre de la colección en MongoDB
  }
);

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
