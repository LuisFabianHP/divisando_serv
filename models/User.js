const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Esquema del usuario
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
            required: true,
        },
        email: { 
            type: String, 
            unique: true, 
            required: true,
            lowercase: true, // Normalizar emails
            match: [/^\S+@\S+\.\S+$/, 'Email inválido'] // Validación básica
        },
        password: {
            type: String,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        provider: {
            type: String,
            enum: ['local', 'google', 'facebook'], // Soporte para terceros
            default: 'local',
        },
        providerId: {
            type: String, // ID del usuario en Google, Facebook, etc.
        },
        refreshToken: { 
            type: String 
        },
        isVerified: { 
            type: Boolean, 
            default: false 
        } 
    },
    {
        collection: 'User', // Nombre de la colección en MongoDB
        timestamps: true, // Añade createdAt y updatedAt
    }
);

// Middleware para encriptar la contraseña antes de guardarla
userSchema.pre('save', function (next) {
    if (!this.isModified('password')) return next();
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
    next();
});

// Método para comparar contraseñas
userSchema.methods.matchPassword = function (enteredPassword) {
    return bcrypt.compareSync(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);