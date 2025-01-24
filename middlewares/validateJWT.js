const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT.
 */
const validateJWT = (req, res, next) => {
    const token = req.headers['authorization']; // Token en el encabezado Authorization

    if (!token) {
        return res.status(401).json({
            error: 'Acceso denegado. Token no proporcionado.',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Guardar los datos del token en req.user
        next();
    } catch (err) {
        return res.status(403).json({
            error: 'Token inválido o expirado.',
        });
    }
};

module.exports = validateJWT;
