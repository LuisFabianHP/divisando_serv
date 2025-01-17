const ExchangeRate = require('../models/ExchangeRate');
const { apiLogger } = require('../utils/logger');

/**
 * Controlador para obtener tasas de cambio de una moneda específica.
 */
const getExchangeRates = async (req, res, next) => {
  try {
    const { currency } = req.params;

    // Validar que la moneda esté presente
    if (!currency) {
      const error = new Error('Se requiere un parámetro de moneda.');
      error.status = 400;
      error.userMessage = error.message;
      throw error;
    }

    const baseCurrency = currency.toUpperCase();
    const exchangeRate = await ExchangeRate.findOne({ base_currency: baseCurrency })
      .sort({ updatedAt: -1 })
      .exec();

    // Validar si se encontró un registro
    if (!exchangeRate) {
      const error = new Error(`No se encontraron tasas de cambio para ${baseCurrency}.`);
      error.status = 404;
      error.userMessage = error.message;
      throw error;
    }

    apiLogger.info(`Tasas de cambio obtenidas para: ${baseCurrency}`);
    return res.status(200).json({
      base_currency: exchangeRate.base_currency,
      rates: exchangeRate.rates,
      last_updated: exchangeRate.updatedAt,
    });
  } catch (error) {
    apiLogger.error(`Error en getExchangeRates: ${error.message}`);
    next(error);
  }
};

/**
 * Controlador para comparar dos monedas.
 */
const getComparisonData = async (req, res, next) => {
  try {
    const { baseCurrency, targetCurrency } = req.query;

    // Validar parámetros
    if (!baseCurrency || !targetCurrency) {
      const error = new Error('Se requieren baseCurrency y targetCurrency como parámetros.');
      error.status = 400;
      error.userMessage = error.message;
      throw error;
    }

    const baseCurrencyUpper = baseCurrency.toUpperCase();
    const targetCurrencyUpper = targetCurrency.toUpperCase();

    const baseData = await ExchangeRate.findOne({ base_currency: baseCurrencyUpper })
      .sort({ updatedAt: -1 })
      .exec();

    if (!baseData) {
      const error = new Error(`No se encontraron datos para la moneda base: ${baseCurrencyUpper}`);
      error.status = 404;
      error.userMessage = error.message;
      throw error;
    }

    const currentRateEntry = baseData.rates.find(rate => rate.currency === targetCurrencyUpper);
    if (!currentRateEntry) {
      const error = new Error(`No se encontraron datos para la moneda destino: ${targetCurrencyUpper}`);
      error.status = 404;
      error.userMessage = error.message;
      throw error;
    }

    const currentRate = currentRateEntry.value;

    const previousRateDoc = await ExchangeRate.findOne({
      base_currency: baseCurrencyUpper,
      updatedAt: { $lt: baseData.updatedAt },
    })
      .sort({ updatedAt: -1 })
      .exec();

    const previousRateEntry = previousRateDoc?.rates.find(rate => rate.currency === targetCurrencyUpper);
    const previousRate = previousRateEntry?.value || null;

    const status = previousRate
      ? currentRate > previousRate
        ? 'up'
        : 'dw'
      : 'no-data';

    apiLogger.info(`Comparación realizada: ${baseCurrencyUpper} a ${targetCurrencyUpper}. Estado: ${status}`);

    return res.status(200).json({
      baseCurrency: baseCurrencyUpper,
      targetCurrency: targetCurrencyUpper,
      currentRate,
      previousRate,
      status,
    });
  } catch (error) {
    apiLogger.error(`Error en getComparisonData: ${error.message}`);
    next(error);
  }
};

module.exports = { getExchangeRates, getComparisonData };
