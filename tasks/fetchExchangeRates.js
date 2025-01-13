const cron = require('node-cron');
const axios = require('axios');
const ExchangeRate = require('../models/ExchangeRate');

// Selección de monedas (configurable)
const selectedCurrencies = ['USD', 'CAD', 'MXN', 'BRL', 'ARS', 'EUR'];

/**
 * Verifica si una moneda tiene registros recientes (última hora).
 */
async function isCurrencyRecentlyFetched(currency) {
  try {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000); // Hace 1 hora

    const recentRecord = await ExchangeRate.findOne({
      base_currency: currency,
      date: { $gte: oneHourAgo },
    });

    return !!recentRecord; // Devuelve true si existe un registro reciente
  } catch (error) {
    console.error(`Error al verificar registros recientes para ${currency}:`, error.message);
    return false;
  }
}

/**
 * Obtiene tasas de cambio de una moneda base y las guarda en MongoDB.
 */
async function fetchExchangeRatesForCurrency(baseCurrency) {
  try {
    console.log(`Obteniendo tasas de cambio para ${baseCurrency}...`);

    const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
    const API_URL = process.env.EXCHANGE_RATE_API_URL;

    // Validar que la URL de la API y la clave estén configuradas
    if (!API_KEY || !API_URL) {
      throw new Error('La URL de la API o la clave de la API no están configuradas. Verifica las variables de entorno.');
    }

    const response = await axios.get(`${API_URL}${API_KEY}/latest/${baseCurrency}`);

    const rates = Object.entries(response.data.conversion_rates).map(([currency, value]) => ({
      currency,
      value,
    }));

    console.log(`Tasas de cambio recibidas para ${baseCurrency}:`, rates);

    const existingRate = await ExchangeRate.findOne({ base_currency: baseCurrency });

    if (existingRate) {
      existingRate.rates = rates;
      existingRate.date = new Date(response.data.time_last_update_utc);
      await existingRate.save();
    } else {
      await ExchangeRate.create({
        base_currency: baseCurrency,
        rates,
        date: new Date(response.data.time_last_update_utc),
      });
    }

    console.log(`Tasas de cambio para ${baseCurrency} guardadas exitosamente.`);
  } catch (error) {
    console.error(`Error al obtener o guardar tasas de cambio para ${baseCurrency}:`, error.message);
  }
}

/**
 * Cron job para actualizar tasas de cambio.
 */
async function updateExchangeRates() {
  for (const currency of selectedCurrencies) {
    const recentlyFetched = await isCurrencyRecentlyFetched(currency);

    if (recentlyFetched) {
      console.log(`Se omitió la carga de ${currency} porque ya tiene registros recientes.`);
      continue;
    }

    await fetchExchangeRatesForCurrency(currency);
  }
}

// Programar el cron job (cada hora)
cron.schedule('0 * * * *', updateExchangeRates);

module.exports = updateExchangeRates;
