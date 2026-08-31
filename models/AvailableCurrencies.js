const mongoose = require('mongoose');

const currentRateSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  rates: [{
    currency: { type: String, required: true },
    value: { type: Number, required: true },
  }],
  updatedAt: { type: Date, required: true },
}, { _id: false });

const availableCurrenciesSchema = new mongoose.Schema(
  {
    currencies: [String],
    updatedAt: { type: Date, default: Date.now },
    currentRates: {
      type: Map,
      of: currentRateSchema,
      default: () => new Map(),
    },
  },
  { collection: 'availableCurrencies' }
);

// Verificar si ya existe el modelo antes de crearlo
module.exports = mongoose.models.AvailableCurrencies || mongoose.model('AvailableCurrencies', availableCurrenciesSchema);
