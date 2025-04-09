const cron = require('node-cron');
const axios = require('axios');
const mongoose = require('mongoose');
const ExchangeRate = require('@models/ExchangeRate');
const AvailableCurrencies = require('@models/AvailableCurrencies');
const { taskLogger } = require('@utils/logger');
const taskErrorHandler = require('@middlewares/taskErrorHandler');

// Código de error HTTP para indicar que se ha excedido el límite de solicitudes permitido por la API
const RATE_LIMIT_ERROR = 429;

// Cron schedule para ejecutar la tarea de actualización de tasas de cambio cada hora
const CRON_SCHEDULE = '0 * * * *';

// Selección de monedas (configurable)
const selectedCurrencies = ['USD', 'CAD', 'MXN', 'BRL', 'ARS', 'EUR'];

/**
 * Verifica si una moneda tiene registros recientes (última hora).
 */
async function isCurrencyRecentlyFetched(currency) {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentRecord = await ExchangeRate.findOne({
      base_currency: currency,
      createdAt: { $gte: oneHourAgo },
    });

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
    taskLogger.info(`Respuesta de la API para ${baseCurrency}:`, response.data);

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
    const latestRecords = await ExchangeRate.find().sort({ updatedAt: -1 }).exec();

    const currenciesSet = new Set(latestRecords.map(record => record.base_currency));
    const currencies = Array.from(currenciesSet);

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
  taskLogger.info(`|| Inicio de la extracción de tasas de cambio ||`);

  try {
    for (const baseCurrency of selectedCurrencies) {
      const recentlyFetched = await isCurrencyRecentlyFetched(baseCurrency);

      if (recentlyFetched) {
        taskLogger.info(`La moneda ${baseCurrency} ya fue actualizada recientemente. Saltando...`);
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
        }
      }
    }

    // Actualizar la lista de monedas disponibles
    await updateCurrencyList();
  } catch (error) {
    taskLogger.error(`Error durante la actualización de tasas de cambio: ${error.message}`);
  }
}

// Programar el cron job (cada hora)
cron.schedule(CRON_SCHEDULE, updateExchangeRates);

module.exports = taskErrorHandler(updateExchangeRates);
