const express = require('express');
const { getExchangeRates, getComparisonData, getAvailableCurrencies } = require('../controllers/exchangeController');
const router = express.Router();

// Endpoint para comparar monedas
router.get('/compare', getComparisonData);

// Nueva ruta para obtener monedas disponibles
router.get('/currencies', getAvailableCurrencies);

// Ruta para obtener las tasas de cambio
router.get('/:currency', getExchangeRates);

module.exports = router;
