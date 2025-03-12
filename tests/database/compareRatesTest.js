const ExchangeRate = require('../../models/ExchangeRate');
const { startTestDatabase, insertTestData } = require('./generateTestData');

const compareLatestWithHistorical = async (baseCurrency, targetCurrency) => {
    try {
        baseCurrency = baseCurrency.toUpperCase();
        targetCurrency = targetCurrency.toUpperCase();

        // Obtener el último registro
        const latestRecord = await ExchangeRate.findOne({ base_currency: baseCurrency })
            .sort({ updatedAt: -1 })
            .exec();

        if (!latestRecord) {
            return { error: `No se encontraron datos para ${baseCurrency}.` };
        }

        const currentRateEntry = latestRecord.rates.find(rate => rate.currency === targetCurrency);
        if (!currentRateEntry) {
            return { error: `No se encontró la tasa de ${targetCurrency} en ${baseCurrency}.` };
        }

        const currentRate = currentRateEntry.value;

        // Buscar en el historial la primera tasa distinta
        const previousRecords = await ExchangeRate.find({
            base_currency: baseCurrency,
            updatedAt: { $lt: latestRecord.updatedAt },
        }).sort({ updatedAt: -1 }).exec();

        let previousRate = null;
        for (const record of previousRecords) {
            const previousRateEntry = record.rates.find(rate => rate.currency === targetCurrency);
            if (previousRateEntry && previousRateEntry.value !== currentRate) {
                previousRate = previousRateEntry.value;
                break;
            }
        }

        // Determinar estado ("up", "dw" o "no-data")
        const status = previousRate
            ? currentRate > previousRate
                ? 'up'
                : 'dw'
            : 'no-data';

        return {
            baseCurrency,
            targetCurrency,
            currentRate,
            previousRate,
            status,
        };

    } catch (error) {
        console.error('Error en la comparación:', error);
        return { error: 'Error al realizar la comparación.' };
    }
};

module.exports = compareLatestWithHistorical;

(async () => {
    await startTestDatabase(); // Asegura que la base virtual está activa
    await insertTestData(); // Asegura que la base virtual tenga datos
    const result = await compareLatestWithHistorical('USD', 'MXN');
    console.log('Resultado de la comparación:', result);
})();