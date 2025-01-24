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
    },
    {
        collection: 'User', // Nombre de la colección en MongoDB
        timestamps: true, // Añade createdAt y updatedAt
    }
);

// Middleware para encriptar la contraseña antes de guardarla
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar contraseñas
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
