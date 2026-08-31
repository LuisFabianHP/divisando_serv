const ExchangeRate = require('@models/ExchangeRate');
const CurrentExchangeRate = require('@models/CurrentExchangeRate');
const AvailableCurrencies = require('@models/AvailableCurrencies');
const RateChangeAlert = require('@models/RateChangeAlert');
const { apiLogger } = require('@utils/logger');
const { updateExchangeRates } = require('@tasks/fetchExchangeRates');

const EMPTY_COLLECTION_USER_MESSAGE =
  'No hay tasas de cambio disponibles en este momento. Se inicio una sincronizacion automatica; intenta nuevamente en unos minutos.';
const STALE_MINUTES_THRESHOLD = Number(process.env.EXCHANGE_RATE_STALE_MINUTES || '180');

let exchangeRatesWasEmpty = false;
let exchangeRatesRecoveryInProgress = false;
let exchangeRatesStaleRefreshInProgress = false;

const getCurrentExchangeRate = async (baseCurrency) => {
  const currentRate = await CurrentExchangeRate.findOne({ base_currency: baseCurrency }).lean();
  if (currentRate) {
    return currentRate;
  }

  const currentRates = await AvailableCurrencies.findOne({})
    .select('currentRates')
    .lean();
  const legacyRate = currentRates?.currentRates?.[baseCurrency];
  if (!legacyRate) {
    return null;
  }

  await CurrentExchangeRate.findOneAndUpdate(
    { base_currency: baseCurrency },
    {
      $set: {
        date: legacyRate.date,
        rates: legacyRate.rates,
      },
    },
    { upsert: true, timestamps: false }
  );

  return {
    base_currency: baseCurrency,
    ...legacyRate,
  };
};

const restoreCurrentExchangeRatesFromHistory = async () => {
  const latestRates = await ExchangeRate.aggregate([
    { $sort: { base_currency: 1, updatedAt: -1 } },
    {
      $group: {
        _id: '$base_currency',
        date: { $first: '$date' },
        rates: { $first: '$rates' },
        createdAt: { $first: '$createdAt' },
        updatedAt: { $first: '$updatedAt' },
      },
    },
  ]);

  if (latestRates.length === 0) {
    return false;
  }

  await CurrentExchangeRate.bulkWrite(
    latestRates.map((rate) => ({
      updateOne: {
        filter: { base_currency: rate._id },
        update: {
          $set: {
            base_currency: rate._id,
            date: rate.date,
            rates: rate.rates,
            createdAt: rate.createdAt,
            updatedAt: rate.updatedAt,
          },
        },
        upsert: true,
        timestamps: false,
      },
    }))
  );

  apiLogger.info(`Tasas vigentes restauradas desde historial: ${latestRates.length} monedas base.`);
  return true;
};

const triggerStaleRefreshIfNeeded = async () => {
  const latestRate = await CurrentExchangeRate.findOne({}).sort({ updatedAt: -1 }).select('updatedAt').lean();
  if (!latestRate?.updatedAt) {
    return;
  }

  const ageMs = Date.now() - new Date(latestRate.updatedAt).getTime();
  const staleMs = STALE_MINUTES_THRESHOLD * 60 * 1000;
  const isStale = Number.isFinite(staleMs) && staleMs > 0 && ageMs > staleMs;

  if (!isStale || exchangeRatesStaleRefreshInProgress) {
    return;
  }

  exchangeRatesStaleRefreshInProgress = true;
  apiLogger.warn(
    `Ultima actualizacion de tasas con antiguedad de ${Math.round(ageMs / 60000)} min. Se ejecutara sincronizacion automatica.`
  );

  updateExchangeRates()
    .catch((error) => {
      apiLogger.error(`Error al actualizar exchangeRates por stale fallback: ${error.message}`);
    })
    .finally(() => {
      exchangeRatesStaleRefreshInProgress = false;
    });
};

const ensureExchangeRatesAvailable = async () => {
  let hasAnyRate = await CurrentExchangeRate.exists({});
  if (!hasAnyRate) {
    hasAnyRate = await restoreCurrentExchangeRatesFromHistory();
  }

  if (hasAnyRate) {
    await triggerStaleRefreshIfNeeded();

    if (exchangeRatesWasEmpty) {
      exchangeRatesWasEmpty = false;
      apiLogger.warn('exchangeRates restablecida correctamente. El servicio de tasas vuelve a estar disponible.');
    }
    return true;
  }

  exchangeRatesWasEmpty = true;
  if (!exchangeRatesRecoveryInProgress) {
    exchangeRatesRecoveryInProgress = true;
    apiLogger.error('Coleccion exchangeRates vacia. Se disparara actualizacion automatica de tasas.');

    updateExchangeRates()
      .then(async () => {
        const recovered = await CurrentExchangeRate.exists({});
        if (recovered) {
          exchangeRatesWasEmpty = false;
          apiLogger.warn('exchangeRates restablecida correctamente despues de la sincronizacion automatica.');
        } else {
          apiLogger.warn('Sincronizacion automatica completada, pero exchangeRates sigue vacia.');
        }
      })
      .catch((error) => {
        apiLogger.error(`Error al actualizar exchangeRates desde fallback automatico: ${error.message}`);
      })
      .finally(() => {
        exchangeRatesRecoveryInProgress = false;
      });
  }

  return false;
};

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
    const hasRates = await ensureExchangeRatesAvailable();
    if (!hasRates) {
      const error = new Error('exchangeRates vacia al consultar getExchangeRates.');
      error.status = 503;
      error.userMessage = EMPTY_COLLECTION_USER_MESSAGE;
      throw error;
    }

    const { currency } = req.params;

    // Validar que la moneda esté presente
    if (!currency) {
      const error = new Error('Se requiere un parámetro de moneda.');
      error.status = 400;
      throw error;
    }

    const baseCurrency = currency.toUpperCase();
    const exchangeRate = await getCurrentExchangeRate(baseCurrency);

    // Validar si se encontró un registro
    if (!exchangeRate) {
      const error = new Error(`No se encontraron tasas de cambio para ${baseCurrency}.`);
      error.status = 404;
      error.userMessage = `No hay datos para la moneda base: ${baseCurrency}.`;
      throw error;
    }

    apiLogger.info(`Tasas de cambio obtenidas para: ${baseCurrency}`);
    return res.status(200).json({
      base_currency: baseCurrency,
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
    const hasRates = await ensureExchangeRatesAvailable();
    if (!hasRates) {
      const error = new Error('exchangeRates vacia al consultar getComparisonData.');
      error.status = 503;
      error.userMessage = EMPTY_COLLECTION_USER_MESSAGE;
      throw error;
    }

    const { base, target } = validateCurrencies(req.query.baseCurrency, req.query.targetCurrency);
    const knownUpdatedAt = req.query.knownUpdatedAt;
    const knownCurrentRate = Number(req.query.knownCurrentRate);
    const pollIntervalMinutes = Number(process.env.APP_RATE_POLL_INTERVAL_MINUTES || '30');

    // Obtener el registro más reciente
    const baseData = await getCurrentExchangeRate(base);

    if (!baseData) {
      const error = new Error(`No se encontraron datos para la moneda base: ${base}`);
      error.status = 404;
      error.userMessage = `No hay datos de tasa para la moneda base ${base}.`;
      throw error;
    }

    // Buscar la tasa de la moneda de destino en la entrada más reciente
    const currentRateEntry = baseData.rates.find(rate => rate.currency === target);
    if (!currentRateEntry) {
      const error = new Error(`No se encontraron datos para la moneda destino: ${target}`);
      error.status = 404;
      error.userMessage = `No hay datos de tasa para la moneda destino ${target}.`;
      throw error;
    }

    const currentRate = currentRateEntry.value;

    if (knownUpdatedAt && Number.isFinite(knownCurrentRate)) {
      const knownUpdatedAtMs = Date.parse(knownUpdatedAt);
      const latestUpdatedAtMs = Date.parse(baseData.updatedAt?.toISOString?.() || baseData.updatedAt);

      if (Number.isFinite(knownUpdatedAtMs) && Number.isFinite(latestUpdatedAtMs)) {
        const sameTimestamp = knownUpdatedAtMs === latestUpdatedAtMs;
        const sameRate = knownCurrentRate === currentRate;

        if (sameTimestamp && sameRate) {
          return res.status(204).set('X-Poll-Interval-Minutes', String(pollIntervalMinutes)).end();
        }
      }
    }

    // Buscar el último valor anterior registrado para el mismo par.
    // No filtramos por diferencia para poder mostrar comparación incluso si no hubo cambio.
    const previousRateDoc = await ExchangeRate.findOne({
      base_currency: base,
      updatedAt: { $lt: baseData.updatedAt },
      "rates.currency": target,
    }).sort({ updatedAt: -1 }).exec();

    const previousRate = previousRateDoc?.rates.find(rate => rate.currency === target)?.value || null;

    // Asignar estado de tendencia con soporte para sin-cambio y sin-datos.
    let status = 'no-data';
    if (previousRate !== null) {
      if (currentRate > previousRate) {
        status = 'up';
      } else if (currentRate < previousRate) {
        status = 'dw';
      } else {
        status = 'eq';
      }
    }

    apiLogger.info(`Comparación realizada: ${base} a ${target}. Estado: ${status}`);

    return res.status(200).json({
      baseCurrency: base,
      targetCurrency: target,
      currentRate,
      previousRate,
      updatedAt: baseData.updatedAt,
      status,
      hasChanges: true,
      pollIntervalMinutes,
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
    const hasRates = await ensureExchangeRatesAvailable();
    if (!hasRates) {
      const error = new Error('exchangeRates vacia al consultar getAvailableCurrencies.');
      error.status = 503;
      error.userMessage = EMPTY_COLLECTION_USER_MESSAGE;
      throw error;
    }

    const result = await AvailableCurrencies.findOne({});
    if (!result) {
      const error = new Error('No hay monedas disponibles en este momento.');
      error.status = 404;
      error.userMessage = 'No hay monedas disponibles temporalmente. Se esta recargando la lista.';
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

const buildSyntheticRateChangeAlert = async (base, target) => {
  const latestBaseDoc = await getCurrentExchangeRate(base);
  if (!latestBaseDoc) {
    return null;
  }

  const currentRateEntry = latestBaseDoc.rates?.find((rate) => rate.currency === target);
  if (!currentRateEntry) {
    return null;
  }

  const previousBaseDoc = await ExchangeRate.findOne({
    base_currency: base,
    updatedAt: { $lt: latestBaseDoc.updatedAt },
    'rates.currency': target,
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!previousBaseDoc) {
    return null;
  }

  const previousRateEntry = previousBaseDoc.rates?.find((rate) => rate.currency === target);
  if (!previousRateEntry || previousRateEntry.value === 0) {
    return null;
  }

  const previousRate = Number(previousRateEntry.value);
  const currentRate = Number(currentRateEntry.value);
  const diff = currentRate - previousRate;
  const changePercent = (diff / previousRate) * 100;

  return {
    baseCurrency: base,
    targetCurrency: target,
    previousRate,
    currentRate,
    changePercent,
    direction: diff >= 0 ? 'up' : 'dw',
    sourceUpdatedAt: latestBaseDoc.updatedAt,
    createdAt: latestBaseDoc.updatedAt,
    updatedAt: latestBaseDoc.updatedAt,
    synthetic: true,
  };
};

/**
 * Obtiene alertas recientes de cambio para un par base/target.
 */
const getRateChangeAlerts = async (req, res, next) => {
  try {
    const hasRates = await ensureExchangeRatesAvailable();
    if (!hasRates) {
      const error = new Error('exchangeRates vacia al consultar getRateChangeAlerts.');
      error.status = 503;
      error.userMessage = EMPTY_COLLECTION_USER_MESSAGE;
      throw error;
    }

    const { base, target } = validateCurrencies(req.query.baseCurrency, req.query.targetCurrency);
    const rawMinChangePercent = Number(req.query.minChangePercent || '0');
    const minChangePercent = Number.isFinite(rawMinChangePercent) ? Math.abs(rawMinChangePercent) : 0;
    const rawLimit = Number(req.query.limit || '20');
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

    const query = {
      baseCurrency: base,
      targetCurrency: target,
    };

    if (minChangePercent > 0) {
      query.$expr = {
        $gte: [{ $abs: '$changePercent' }, minChangePercent],
      };
    }

    let alerts = [];
    try {
      alerts = await RateChangeAlert.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (alertsError) {
      apiLogger.warn(`Fallo consulta rateChangeAlerts, usando fallback: ${alertsError.message}`);
    }

    if (!alerts.length) {
      const syntheticAlert = await buildSyntheticRateChangeAlert(base, target);
      if (syntheticAlert) {
        if (minChangePercent <= 0 || Math.abs(syntheticAlert.changePercent) >= minChangePercent) {
          alerts = [syntheticAlert];
        }
      }
    }

    const latest = alerts[0] || null;

    return res.status(200).json({
      success: true,
      baseCurrency: base,
      targetCurrency: target,
      alert: Boolean(latest),
      latest,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    apiLogger.error(`Error en getRateChangeAlerts: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getExchangeRates,
  getComparisonData,
  getAvailableCurrencies,
  triggerExchangeRatesRefresh,
  getRateChangeAlerts,
};
