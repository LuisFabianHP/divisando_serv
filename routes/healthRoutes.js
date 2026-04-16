const express = require('express');
const router = express.Router();
const validateApiKey = require('@middlewares/validateApiKey');
const { getConnectionStatus } = require('@config/database');

// Endpoint para verificar el estado de la API
// Health checks should be public to support uptime monitoring.
router.get('/health', async (req, res) => {
    try {
        const dbStatus = await getConnectionStatus();
        const isHealthy = dbStatus.readyState === 1 && !dbStatus.circuitBreakerOpen;
        const statusCode = isHealthy ? 200 : 503;

        res.status(statusCode).json({
            status: isHealthy ? 'ok' : 'degraded',
            message: isHealthy
                ? 'API en funcionamiento'
                : 'Servicio temporalmente no disponible. Intenta nuevamente más tarde.',
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            message: 'Servicio temporalmente no disponible. Intenta nuevamente más tarde.',
        });
    }
});

// Endpoint para verificar el estado de MongoDB
router.get('/health/database', validateApiKey, async (req, res) => {
    try {
        const dbStatus = await getConnectionStatus();
        
        const isHealthy = dbStatus.readyState === 1 && !dbStatus.circuitBreakerOpen;
        const statusCode = isHealthy ? 200 : 503;
        
        res.status(statusCode).json({
            status: isHealthy ? "healthy" : "unhealthy",
            database: {
                connected: dbStatus.readyState === 1,
                host: dbStatus.host,
                latency: dbStatus.ping ? `${dbStatus.ping}ms` : 'N/A',
                circuitBreaker: dbStatus.circuitBreakerOpen ? 'OPEN' : 'CLOSED',
                consecutiveFailures: dbStatus.consecutiveFailures
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: "error",
            message: "Servicio temporalmente no disponible. Intenta nuevamente más tarde.",
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
