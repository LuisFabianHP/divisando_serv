const cron = require('node-cron');
const axios = require('axios');
const ExchangeRate = require('../models/ExchangeRate');

const fetchExchangeRates = async () => {
  try {
    // URL de la API de terceros
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
    const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

    // Solicitud a la API
    const response = await axios.get(url);
    const { base_code, conversion_rates, time_last_update_utc } = response.data;

    if (!base_code || !conversion_rates) {
      console.error('Datos inválidos recibidos de la API.');
      return;
    }

    // Formatear datos para MongoDB
    const rates = Object.entries(conversion_rates).map(([currency, value]) => ({
      currency,
      value,
    }));

    // Crear o actualizar el documento en MongoDB
    const existingRate = await ExchangeRate.findOne({ base_currency: base_code });
    if (existingRate) {
      existingRate.rates = rates;
      existingRate.date = new Date(time_last_update_utc);
      await existingRate.save();
    } else {
      await ExchangeRate.create({
        base_currency: base_code,
        rates,
        date: new Date(time_last_update_utc),
      });
    }

    console.log('Tasas de cambio actualizadas correctamente.');
  } catch (error) {
    console.error('Error al obtener las tasas de cambio:', error.message);
  }
};

// Programar el cron job (por ejemplo, cada hora)
cron.schedule('0 * * * *', fetchExchangeRates);

module.exports = fetchExchangeRates;
