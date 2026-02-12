const express = require('express');
const {
	getExchangeRates,
	getComparisonData,
	getAvailableCurrencies,
	triggerExchangeRatesRefresh,
} = require('@controllers/exchangeController');
const validateJWT = require('@middlewares/validateJWT');
const router = express.Router();


// Nueva ruta para obtener monedas disponibles (protegido con JWT)
router.get('/currencies', validateJWT, getAvailableCurrencies);

// Trigger manual de actualización de tasas (protegido con JWT)
router.post('/refresh', validateJWT, triggerExchangeRatesRefresh);

// Endpoint para comparar monedas (protegido con JWT)
router.get('/compare', validateJWT, getComparisonData);

// Ruta para obtener las tasas de cambio (protegido con JWT)
router.get('/:currency', validateJWT, getExchangeRates);

module.exports = router;
