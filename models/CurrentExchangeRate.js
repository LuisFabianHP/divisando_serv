const mongoose = require('mongoose');

const currentRateSchema = new mongoose.Schema({
  currency: { type: String, required: true },
  value: { type: Number, required: true },
}, { _id: false });

const currentExchangeRateSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    base_currency: { type: String, required: true, unique: true },
    rates: [currentRateSchema],
  },
  {
    collection: 'currentExchangeRates',
    timestamps: true,
  }
);

module.exports = mongoose.models.CurrentExchangeRate
  || mongoose.model('CurrentExchangeRate', currentExchangeRateSchema);