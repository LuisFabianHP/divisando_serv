const jwt = require('jsonwebtoken');
const { apiLogger } = require('@utils/logger');
const { errorResponse } = require('@utils/apiResponse');

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
        return res.status(401).json(errorResponse('token_requerido'));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        const validationError = {
            taskName: 'validateJWT',
            status: 403,
            message: 'Error validando token JWT.',
            route: req.originalUrl
        };

        if (err.name === 'JsonWebTokenError') {
            validationError.code = 'token_invalido';
        } else if (err.name === 'TokenExpiredError') {
            validationError.code = 'token_expirado';
        } else {
            validationError.code = 'error_validacion_token';
        }

        apiLogger.error(validationError);
        return res.status(403).json(errorResponse(validationError.code));
    }
};

module.exports = validateJWT;
