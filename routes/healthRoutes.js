const express = require('express');
const router = express.Router();
const validateJWT = require('@middlewares/validateJWT');

// Endpoint para verificar el estado de la API
router.get('/health', validateJWT, (req, res) => {
    res.status(200).json({ status: "ok", message: "API en funcionamiento" });
});

module.exports = router;
