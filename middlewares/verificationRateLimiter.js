const rateLimit = require('express-rate-limit');
const { apiLogger } = require('@utils/logger');

/**
 * Rate limiter específico para endpoints de verificación de código
 * Limita intentos de verificación a 5 por minuto por IP
 */
const verificationCodeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // Máximo 5 intentos por minuto
  message: {
    error: 'Demasiados intentos de verificación. Espera 1 minuto antes de reintentar.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    // Combinar IP con email/userId para limitar por usuario específico
    const identifier = req.body.email || req.body.userId || 'unknown';
    return `verify:${ip}:${identifier}`;
  },
  handler: (req, res) => {
    const resetTime = typeof req.rateLimit.resetTime === 'number' 
      ? req.rateLimit.resetTime 
      : (req.rateLimit.resetTime?.getTime?.() || Date.now() + 60000);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000) || 60;
    
    apiLogger.warn('Límite de intentos de verificación excedido', {
      ip: req.headers['x-forwarded-for'] || req.ip,
      identifier: req.body.email || req.body.userId,
      route: req.originalUrl
    });

    res.set('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Demasiados intentos de verificación.',
      retryAfter: retryAfter,
      message: `Espera ${retryAfter} segundos antes de reintentar.`
    });
  }
});

/**
 * Rate limiter para solicitudes de códigos de recuperación
 * Limita a 3 solicitudes por 5 minutos por IP/email
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // Máximo 3 solicitudes cada 5 minutos
  message: {
    error: 'Demasiadas solicitudes de recuperación. Espera 5 minutos antes de reintentar.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    const email = req.body.email || 'unknown';
    return `forgot:${ip}:${email}`;
  },
  handler: (req, res) => {
    const resetTime = typeof req.rateLimit.resetTime === 'number' 
      ? req.rateLimit.resetTime 
      : (req.rateLimit.resetTime?.getTime?.() || Date.now() + 300000);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000) || 300;
    
    apiLogger.warn('Límite de solicitudes de recuperación excedido', {
      ip: req.headers['x-forwarded-for'] || req.ip,
      email: req.body.email,
      route: req.originalUrl
    });

    res.set('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Demasiadas solicitudes de recuperación de contraseña.',
      retryAfter: retryAfter,
      message: `Espera ${Math.ceil(retryAfter / 60)} minutos antes de reintentar.`
    });
  }
});

/**
 * Rate limiter para reenvío de códigos de verificación
 * Limita a 3 reenvíos por 10 minutos
 */
const resendCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 3, // Máximo 3 reenvíos cada 10 minutos
  message: {
    error: 'Demasiadas solicitudes de reenvío. Espera 10 minutos antes de reintentar.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    const identifier = req.body.email || req.body.userId || 'unknown';
    return `resend:${ip}:${identifier}`;
  },
  handler: (req, res) => {
    const resetTime = typeof req.rateLimit.resetTime === 'number' 
      ? req.rateLimit.resetTime 
      : (req.rateLimit.resetTime?.getTime?.() || Date.now() + 600000);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000) || 600;
    
    apiLogger.warn('Límite de reenvíos de código excedido', {
      ip: req.headers['x-forwarded-for'] || req.ip,
      identifier: req.body.email || req.body.userId,
      route: req.originalUrl
    });

    res.set('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Demasiadas solicitudes de reenvío de código.',
      retryAfter: retryAfter,
      message: `Espera ${Math.ceil(retryAfter / 60)} minutos antes de reintentar.`
    });
  }
});

module.exports = {
  verificationCodeLimiter,
  forgotPasswordLimiter,
  resendCodeLimiter
};
