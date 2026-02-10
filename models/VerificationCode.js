const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  type: { type: String, enum: ['account_verification', 'password_reset'], required: true },
  attempts: { type: Number, default: 0 }, // Contador de intentos fallidos
  maxAttempts: { type: Number, default: 5 }, // Máximo de intentos permitidos
  isBlocked: { type: Boolean, default: false } // Bloqueo por exceder intentos
},
{
    collection: 'VerificationCode', // Nombre de la colección en MongoDB
    timestamps: true, // Añade createdAt y updatedAt
});

// Índice para eliminar automáticamente los códigos expirados
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
