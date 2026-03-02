const mongoose = require('mongoose');

const rateChangeAlertSchema = new mongoose.Schema(
  {
    baseCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    targetCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    previousRate: {
      type: Number,
      required: true,
    },
    currentRate: {
      type: Number,
      required: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
    direction: {
      type: String,
      enum: ['up', 'dw'],
      required: true,
    },
    sourceUpdatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'rateChangeAlerts',
    timestamps: true,
  }
);

const ttlSeconds = parseInt(process.env.RATE_ALERT_TTL_SECONDS || String(60 * 60 * 24 * 30), 10);
rateChangeAlertSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds });
rateChangeAlertSchema.index({ baseCurrency: 1, targetCurrency: 1, createdAt: -1 });

module.exports = mongoose.model('RateChangeAlert', rateChangeAlertSchema);
