const ExchangeRate = require('../models/ExchangeRate');

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

    // Convertir a mayúsculas para evitar inconsistencias
    const baseCurrency = currency.toUpperCase();

    // Consultar MongoDB para la moneda base
    const exchangeRate = await ExchangeRate.findOne({ base_currency: baseCurrency })
      .sort({ updatedAt: -1 }) // Obtener el registro más reciente
      .exec();

    // Validar si se encontró un registro
    if (!exchangeRate) {
      const error = new Error(`No se encontraron tasas de cambio para ${baseCurrency}.`);
      error.status = 404;
      error.userMessage = error.message;
      throw error;
    }

    // Enviar los datos al cliente
    return res.status(200).json({
      base_currency: exchangeRate.base_currency,
      rates: exchangeRate.rates,
      last_updated: exchangeRate.updatedAt,
    });
  } catch (error) { 
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

    // Convertir a mayúsculas para evitar inconsistencias
    const baseCurrencyUpper = baseCurrency.toUpperCase();
    const targetCurrencyUpper = targetCurrency.toUpperCase();

    // Obtener datos de la moneda base
    const baseData = await ExchangeRate.findOne({ base_currency: baseCurrencyUpper })
      .sort({ updatedAt: -1 })
      .exec();

    if (!baseData) {
      const error = new Error(`No se encontraron datos para la moneda base: ${baseCurrencyUpper}`);
      error.status = 404;
      error.userMessage = error.message;
      throw error;
    }

    // Obtener el último valor de la moneda destino
    const currentRate = baseData.rates.get(targetCurrencyUpper);
    if (!currentRate) {
      const error = new Error(`No se encontraron datos para la moneda destino: ${targetCurrencyUpper}`);
      error.status = 404;
      error.userMessage = error.message;
      throw error;
    }

    // Obtener un valor anterior para comparación
    const previousRateDoc = await ExchangeRate.findOne({
      base_currency: baseCurrencyUpper,
      updatedAt: { $lt: baseData.updatedAt },
    })
      .sort({ updatedAt: -1 })
      .exec();

    const previousRate = previousRateDoc?.rates.get(targetCurrencyUpper) || null;

    // Determinar estado ("up" o "dw")
    const status = previousRate
      ? currentRate > previousRate
        ? 'up'
        : 'dw'
      : 'no-data';

    // Log exitoso
    apiLogger.info(`Comparación exitosa: ${baseCurrencyUpper} a ${targetCurrencyUpper}. Estado: ${status}`);

    // Responder al cliente
    res.status(200).json({
      baseCurrency: baseCurrencyUpper,
      targetCurrency: targetCurrencyUpper,
      currentRate,
      previousRate,
      status,
    });
  } catch (error) {
    next(error); // Pasar el error al middleware de manejo de errores
  }
};


module.exports = { getExchangeRates, getComparisonData  };
