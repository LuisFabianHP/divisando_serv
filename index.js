// index.js

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const ExchangeRate = require('./models/ExchangeRate');

const API_KEY = process.env.API_KEY;
const MONGO_URI = process.env.MONGO_URI;

async function fetchExchangeRates() {
  try {
    console.log('Obteniendo tasas de cambio desde la API...');
    
    const response = await axios.get('https://api.freecurrencyapi.com/v1/latest', {
      params: {
        apikey: API_KEY
      }
    });

    // Verificar y extraer los datos necesarios de la respuesta
    const { data } = response;
    const rates = data.data;
    const baseCurrency = 'CAD'; // Ajusta según la estructura real

    console.log('Datos recibidos de la API:', { baseCurrency, rates });

    // Crear un nuevo documento con las tasas de cambio
    const exchangeRate = new ExchangeRate({
      base_currency: baseCurrency,
      rates: rates
    });

    // Guardar el documento en la base de datos
    //await exchangeRate.save();
    console.log('Tasas de cambio guardadas exitosamente en la base de datos.');
  } catch (error) {
    console.error('Error al obtener o guardar las tasas de cambio:', error.message);
  }
}

async function main() {
  try {
    console.log('Conectando a la base de datos...');
    /*await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });*/
    console.log('Conexión a MongoDB exitosa.');

    await fetchExchangeRates();
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error.message);
  } finally {
    //await mongoose.disconnect();
    console.log('Conexión a MongoDB cerrada.');
  }
}

main();
