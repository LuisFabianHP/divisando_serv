const cron = require('node-cron');
const axios = require('axios');
const ExchangeRate = require('../models/ExchangeRate');
const { taskLogger } = require('../utils/logger');
const taskErrorHandler = require('../middlewares/taskErrorHandler');

// Selección de monedas (configurable)
const selectedCurrencies = ['USD', 'CAD', 'MXN', 'BRL', 'ARS', 'EUR'];

/**
 * Verifica si una moneda tiene registros recientes (última hora).
 */
async function isCurrencyRecentlyFetched(currency) {
  try {
    // Obtener el registro más reciente para la moneda
    const recentRecord = await ExchangeRate.findOne({ base_currency: currency })
      .sort({ createdAt: -1 }) // Ordenar por el más reciente
      .exec();

    if (!recentRecord) {
      taskLogger.error(`No hay registros en la base de datos para ${currency}.`);
      return false;
    }

    const currentDate = new Date();
    const recordDate = new Date(recentRecord.createdAt);

    // Comparar fechas (sin hora)
    const currentDateOnly = currentDate.toISOString().split('T')[0];
    const recordDateOnly = recordDate.toISOString().split('T')[0];

    if (currentDateOnly !== recordDateOnly) {
      taskLogger.info(`La fecha de ${currency} (${recordDateOnly}) no coincide con la fecha actual (${currentDateOnly}).`);
      return false;
    }

    // Comparar horas (redondeando al inicio de la hora)
    const currentHour = currentDate.getHours();
    const recordHour = recordDate.getHours();

    if (currentHour <= recordHour) {
      taskLogger.info(`La hora actual (${currentHour}) aún no supera la última hora registrada (${recordHour}) para ${currency}.`);
      return true;
    }

    taskLogger.info(`La hora actual (${currentHour}) supera la última hora registrada (${recordHour}) para ${currency}.`);
    return false;
  } catch (error) {
    taskLogger.error(`Error al verificar registros recientes para ${currency}:`, error.message);
    return true;
  }
}


/**
 * Obtiene tasas de cambio de una moneda base y las guarda en MongoDB.
 */
async function fetchExchangeRatesForCurrency(baseCurrency) {
  try {
    taskLogger.info(`Obteniendo tasas de cambio para ${baseCurrency}...`);

    const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
    const API_URL = process.env.EXCHANGE_RATE_API_URL;

    // Validar que la URL de la API y la clave estén configuradas
    if (!API_KEY || !API_URL) {
      taskLogger.error('La URL de la API o la clave de la API no están configuradas. Verifica las variables de entorno.');
      return;
    }

    const response = await axios.get(`${API_URL}${API_KEY}/latest/${baseCurrency}`);

    const rates = Object.entries(response.data.conversion_rates).map(([currency, value]) => ({
      currency,
      value,
    }));

    await ExchangeRate.create({
      base_currency: baseCurrency,
      rates,
      date: new Date(response.data.time_last_update_utc),
    });
    
    taskLogger.info(`Tasas de cambio para ${baseCurrency} guardadas exitosamente.`);
  } catch (error) {
    taskLogger.error(`Error al obtener o guardar tasas de cambio para ${baseCurrency}:`, error.message);
  }
}

/**
 * Cron job para actualizar tasas de cambio.
 */
async function updateExchangeRates() {

  const currentDate = new Date();

  taskLogger.info(`|| Inicio de la extracción de tasas de cambio ||`);
  
  for (const currency of selectedCurrencies) {
    const recentlyFetched = await isCurrencyRecentlyFetched(currency);

    if (recentlyFetched) {
      taskLogger.info(`Se omitió la carga para ${currency} porque ya tiene registros recientes.`);
      continue;
    } 

    await fetchExchangeRatesForCurrency(currency);
  }
}

// Programar el cron job (cada hora)
cron.schedule('0 * * * *', updateExchangeRates);

module.exports = taskErrorHandler(updateExchangeRates);
