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
    timestamps: true // Agrega campos createdAt y updatedAt automáticamente
  }
);

// Índice TTL y compuesto para retención e histórico
const ttlSeconds = parseInt(process.env.MONGO_TTL_SECONDS || '604800', 10); // 7 días por defecto
exchangeRateSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds });
exchangeRateSchema.index({ base_currency: 1, createdAt: 1 });

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
