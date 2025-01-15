const express = require('express');
const { getExchangeRates, getComparisonData } = require('../controllers/exchangeController');
const router = express.Router();

// Ruta para obtener las tasas de cambio
//router.get('/:currency', getExchangeRates);

// Endpoint para comparar monedas
router.get('/compare', getComparisonData);

module.exports = router;
