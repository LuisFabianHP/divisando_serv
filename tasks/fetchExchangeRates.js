const cron = require('node-cron');
const axios = require('axios');
const ExchangeRate = require('@models/ExchangeRate');
const AvailableCurrencies = require('@models/AvailableCurrencies');
const { taskLogger } = require('@utils/logger');
const taskErrorHandler = require('@middlewares/taskErrorHandler');

// Código de error HTTP para indicar que se ha excedido el límite de solicitudes permitido por la API
const RATE_LIMIT_ERROR = 429;

// Cron schedule para ejecutar la tarea de actualización de tasas de cambio
const CRON_SCHEDULE = process.env.EXCHANGE_RATE_CRON || '0 * * * *';

const parseCurrencyList = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};


const SAFE_DEFAULT_CURRENCIES = ['USD', 'MXN', 'EUR', 'CAD'];
const DEFAULT_CURRENCIES = parseCurrencyList(process.env.EXCHANGE_RATE_CURRENCIES);

// Advertencia en log si la configuración es riesgosa
if (DEFAULT_CURRENCIES.length > 10) {
  taskLogger.warn('EXCHANGE_RATE_CURRENCIES tiene más de 10 monedas. Esto puede exceder el límite de tu plan ExchangeRate-API.');
}
if (process.env.EXCHANGE_RATE_CRON && /\*\//.test(process.env.EXCHANGE_RATE_CRON) && process.env.EXCHANGE_RATE_CRON.includes('1')) {
  taskLogger.warn('EXCHANGE_RATE_CRON está configurado para ejecutarse cada minuto. Esto puede causar bloqueos por límite de la API.');
}
if (Number(process.env.EXCHANGE_RATE_RECENT_HOURS) < 1) {
  taskLogger.warn('EXCHANGE_RATE_RECENT_HOURS es menor a 1. Esto puede causar sobreconsultas y bloqueos por límite de la API.');
}

const getCurrenciesFromDb = async () => {
  const result = await AvailableCurrencies.findOne({}).lean();
  return Array.isArray(result?.currencies) ? result.currencies : [];
};

const getSelectedCurrencies = async () => {
  if (DEFAULT_CURRENCIES.includes('ALL')) {
    const dbList = await getCurrenciesFromDb();
    if (dbList.length > 0) {
      return dbList;
    }

    taskLogger.warn('EXCHANGE_RATE_CURRENCIES=ALL sin datos en DB. Usando defaults seguros.');
    return SAFE_DEFAULT_CURRENCIES;
  }

  return DEFAULT_CURRENCIES.length > 0 ? DEFAULT_CURRENCIES : SAFE_DEFAULT_CURRENCIES;
};

const RECENT_HOURS = Number(process.env.EXCHANGE_RATE_RECENT_HOURS || '1');

let exchangeRatesRunning = false;
let exchangeRatesTask = null;


/**
 * Verifica si una moneda tiene registros recientes (hoy).
 * Compara la fecha completa, no solo la hora.
 */
async function isCurrencyRecentlyFetched(currency) {
  try {
    const recentWindowHours = Number.isFinite(RECENT_HOURS) && RECENT_HOURS > 0 ? RECENT_HOURS : 1;
    const since = new Date();
    since.setHours(since.getHours() - recentWindowHours);

    const recentRecord = await ExchangeRate.findOne({
      base_currency: currency,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 }).select('_id createdAt').lean();

    if (recentRecord) {
      taskLogger.info(`La moneda ${currency} ya fue actualizada recientemente.`);
      return true;
    }

    taskLogger.info(`No hay registros recientes para ${currency}.`);
    return false;
  } catch (error) {
    taskLogger.error(`Error al verificar registros recientes para ${currency}: ${error.message}`);
    return false;
  }
}

/**
 * Maneja errores de la API.
 */
function handleApiError(error, baseCurrency) {
  if (error.response && error.response.status === RATE_LIMIT_ERROR) {
    taskLogger.warn(
      `Error 429: Demasiadas solicitudes. Se ha alcanzado el límite de peticiones permitido por la API.`
    );
    throw { status: RATE_LIMIT_ERROR, message: 'Demasiadas solicitudes' };
  } else {
    taskLogger.error(`Error inesperado al procesar ${baseCurrency}: ${error.message}`, {
      stack: error.stack,
    });
    console.error(`Error inesperado al procesar ${baseCurrency}. Consulta los logs para más detalles.`);
    throw error;
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

    if (!API_KEY || !API_URL) {
      taskLogger.error('La URL de la API o la clave de la API no están configuradas.');
      return;
    }

    const response = await axios.get(`${API_URL}${API_KEY}/latest/${baseCurrency}`);
    const rateCount = Object.keys(response.data?.conversion_rates || {}).length;
    taskLogger.info(`Respuesta de la API para ${baseCurrency}: ${rateCount} tasas.`);

    const rates = Object.entries(response.data.conversion_rates).map(([currency, value]) => ({
      currency,
      value,
    }));

    await ExchangeRate.create({
      base_currency: baseCurrency,
      rates,
      date: new Date(response.data.time_last_update_utc),
    });

    taskLogger.info(
      `Tasas de cambio para ${baseCurrency} guardadas exitosamente. Total de tasas: ${rates.length}.`
    );
  } catch (error) {
    handleApiError(error, baseCurrency);
  }
}

/**
 * Actualiza la lista de monedas disponibles.
 */
async function updateCurrencyList() {
  try {
    const currencies = await ExchangeRate.distinct('base_currency');

    await AvailableCurrencies.updateOne(
      {},
      { $set: { currencies } },
      { upsert: true }
    );

    taskLogger.info('Lista de monedas disponibles actualizada exitosamente.');
  } catch (error) {
    taskLogger.error(`Error al actualizar la lista de monedas disponibles: ${error.message}`);
  }
}

/**
 * Cron job para actualizar tasas de cambio.
 */
async function updateExchangeRates() {
  if (exchangeRatesRunning) {
    taskLogger.warn('La actualización de tasas ya está en ejecución. Saltando nueva ejecución.');
    return;
  }

  exchangeRatesRunning = true;
  taskLogger.info(`|| Inicio de la extracción de tasas de cambio ||`);

  try {
    const selectedCurrencies = await getSelectedCurrencies();

    for (const baseCurrency of selectedCurrencies) {
      const recentlyFetched = await isCurrencyRecentlyFetched(baseCurrency);

      if (recentlyFetched) {
        taskLogger.info('Saltando...');
        continue;
      }

      try {
        await fetchExchangeRatesForCurrency(baseCurrency);
      } catch (error) {
        if (error.status === RATE_LIMIT_ERROR) {
          taskLogger.warn(`Error 429 detectado. El proceso de extracción se detubo debido al límite de peticiones.`);
          return; // Detener todo el proceso inmediatamente
        } else {
          taskLogger.error(`Error inesperado al procesar ${baseCurrency}: ${error.message}`);
          console.error(`Error inesperado al procesar ${baseCurrency}. Consulta los logs para más detalles.`);
        }
      }
    }

    // Actualizar la lista de monedas disponibles
    await updateCurrencyList();
  } catch (error) {
    taskLogger.error(`Error durante la actualización de tasas de cambio: ${error.message}`);
    console.error('Error durante la actualización de tasas de cambio. Consulta los logs para más detalles.');
  } finally {
    exchangeRatesRunning = false;
  }
}

const runExchangeRates = taskErrorHandler(updateExchangeRates);

// Programar el cron job (cada hora)
const scheduleExchangeRates = () => {
  if (exchangeRatesTask) {
    exchangeRatesTask.stop();
  }

  exchangeRatesTask = cron.schedule(CRON_SCHEDULE, runExchangeRates);
  return exchangeRatesTask;
};

const stopExchangeRates = () => {
  if (exchangeRatesTask) {
    exchangeRatesTask.stop();
    if (typeof exchangeRatesTask.destroy === 'function') {
      exchangeRatesTask.destroy();
    }
    exchangeRatesTask = null;
  }
};

module.exports = {
  updateExchangeRates: runExchangeRates,
  scheduleExchangeRates,
  stopExchangeRates,
};
