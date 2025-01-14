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

module.exports = { getExchangeRates };
