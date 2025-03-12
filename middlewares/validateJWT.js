const jwt = require('jsonwebtoken');
const { apiLogger } = require('@utils/logger');

/**
 * Middleware para validar el token JWT.
 */
const validateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // Validar si el header de autorización existe y está bien formado
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = {
            taskName: 'validateJWT',
            status: 401,
            message: 'Acceso denegado. Token no proporcionado o mal formateado.',
            route: req.originalUrl
        };
        apiLogger.warn(error);
        return res.status(401).json({ error: error.message });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        let errorResponse = {
            taskName: 'validateJWT',
            status: 403,
            message: 'Algo salió mal. Por favor, intenta nuevamente.',
            route: req.originalUrl
        };

        if (err.name === 'JsonWebTokenError') {
            errorResponse.message = 'Token inválido.';
        } else if (err.name === 'TokenExpiredError') {
            errorResponse.message = 'Token expirado.';
        }

        apiLogger.error(errorResponse);
        return res.status(403).json({ error: errorResponse.message });
    }
};

module.exports = validateJWT;
