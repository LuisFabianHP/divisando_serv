const ExchangeRate = require('@models/ExchangeRate');
const AvailableCurrencies = require('@models/AvailableCurrencies');
const { apiLogger } = require('@utils/logger');
const updateExchangeRates = require('@tasks/fetchExchangeRates');

/**
 * Función auxiliar para validar parámetros de consulta
 */
const validateCurrencies = (baseCurrency, targetCurrency) => {
  if (!baseCurrency || !targetCurrency) {
    const error = new Error('Se requieren baseCurrency y targetCurrency como parámetros.');
    error.status = 400;
    throw error;
  }
  return { base: baseCurrency.toUpperCase(), target: targetCurrency.toUpperCase() };
};

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
      throw error;
    }

    const baseCurrency = currency.toUpperCase();
    const exchangeRate = await ExchangeRate.findOne({ base_currency: baseCurrency }).sort({ updatedAt: -1 }).exec();

    // Validar si se encontró un registro
    if (!exchangeRate) {
      const error = new Error(`No se encontraron tasas de cambio para ${baseCurrency}.`);
      error.status = 404;
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
    const { base, target } = validateCurrencies(req.query.baseCurrency, req.query.targetCurrency);
    // Obtener el registro más reciente
    const baseData = await ExchangeRate.findOne({ base_currency: base }).sort({ updatedAt: -1 }).exec();

    if (!baseData) {
      const error = new Error(`No se encontraron datos para la moneda base: ${base}`);
      error.status = 404;
      throw error;
    }

    // Buscar la tasa de la moneda de destino en la entrada más reciente
    const currentRateEntry = baseData.rates.find(rate => rate.currency === target);
    if (!currentRateEntry) {
      const error = new Error(`No se encontraron datos para la moneda destino: ${target}`);
      error.status = 404;
      throw error;
    }

    const currentRate = currentRateEntry.value;
    // Buscar el valor anterior más antiguo que sea diferente al actual
    const previousRateDoc = await ExchangeRate.findOne({
      base_currency: base,
      updatedAt: { $lt: baseData.updatedAt },
      "rates.currency": target,
      "rates.value": { $ne: currentRate }
    }).sort({ updatedAt: -1 }).exec();

    const previousRate = previousRateDoc?.rates.find(rate => rate.currency === target)?.value || null;
    
    // Asignar un status según el rate sí sube o baja
    const status = previousRate ? (currentRate > previousRate ? 'up' : 'dw') : 'no-data';

    apiLogger.info(`Comparación realizada: ${base} a ${target}. Estado: ${status}`);

    return res.status(200).json({
      baseCurrency: base,
      targetCurrency: target,
      currentRate,
      previousRate,
      updatedAt: baseData.updatedAt,
      status,
    });
  } catch (error) {
    apiLogger.error(`Error en getComparisonData: ${error.message}`);
    next(error);
  }
};

/**
 * Controlador para obtener la lista de monedas disponibles.
 */
const getAvailableCurrencies = async (req, res, next) => {
  try {
    const result = await AvailableCurrencies.findOne({});
    if (!result) {
      const error = new Error('No hay monedas disponibles en este momento.');
      error.status = 404;
      throw error;
    }

    res.status(200).json({
      currencies: result.currencies,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    apiLogger.error(`Error en getAvailableCurrencies: ${error.message}`);
    next(error);
  }
};

/**
 * Trigger manual exchange-rate refresh.
 * Runs asynchronously to avoid blocking the request.
 */
const triggerExchangeRatesRefresh = async (req, res, next) => {
  try {
    updateExchangeRates().catch((error) => {
      apiLogger.error(`Error en ejecución manual de tasas: ${error.message}`);
    });

    return res.status(202).json({
      success: true,
      message: 'Actualización de tasas iniciada. Verifica logs para el progreso.',
    });
  } catch (error) {
    apiLogger.error(`Error en triggerExchangeRatesRefresh: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getExchangeRates,
  getComparisonData,
  getAvailableCurrencies,
  triggerExchangeRatesRefresh,
};
