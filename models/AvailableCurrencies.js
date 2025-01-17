const mongoose = require('mongoose');

const availableCurrenciesSchema = new mongoose.Schema(
  {
    currencies: [String],
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'availableCurrencies' }
);

// Verificar si ya existe el modelo antes de crearlo
module.exports = mongoose.models.AvailableCurrencies || mongoose.model('AvailableCurrencies', availableCurrenciesSchema);
