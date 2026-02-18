const { apiLogger } = require('@utils/logger');

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    // Validar si la clave está presente
    if (!apiKey) {
        const error = new Error('Clave API faltante. Acceso denegado.');
        error.status = 401;
        error.taskName = 'validateApiKey';

        // Registrar en logs como advertencia (no error crítico)
        apiLogger.warn('Clave API faltante - acceso denegado', {
            route: req.originalUrl,
        });

        return next(error);
    }

    // Verificar si coincide con la clave esperada
    if (apiKey !== process.env.API_KEY) {
        const error = new Error('Clave API inválida. Acceso denegado.');
        error.status = 403;
        error.taskName = 'validateApiKey';

        // Registrar en logs como advertencia (no error crítico)
        apiLogger.warn('Clave API inválida - acceso denegado', {
            route: req.originalUrl,
        });

        return next(error);
    }

    // Si la clave es válida, continuar con la solicitud
    next();
};

module.exports = validateApiKey;
