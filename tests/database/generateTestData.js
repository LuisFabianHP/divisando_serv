const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const ExchangeRate = require('../../models/ExchangeRate');

let mongoServer;

// Lista global de monedas
const currencies = ['USD', 'EUR', 'MXN', 'BRL', 'CAD', 'ARS'];

// Función para generar tasas de cambio aleatorias
const generateRandomRates = (baseCurrency) => {
    return currencies
        .filter(curr => curr !== baseCurrency)
        .map(curr => ({ currency: curr, value: (Math.random() * (25 - 15) + 15).toFixed(4) }));
};

// Función para iniciar la base de datos en memoria (solo si no está activa)
const startTestDatabase = async () => {
    if (!mongoServer) {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        await mongoose.connect(uri);

        console.log('Base de datos en memoria creada para pruebas.');
    }
};

// Función para insertar datos de prueba
const insertTestData = async () => {
    const testRecords = [];

    // Generar registros para varias fechas
    for (let daysAgo = 0; daysAgo < 4; daysAgo++) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        currencies.forEach(baseCurrency => {
            testRecords.push({
                base_currency: baseCurrency,
                rates: generateRandomRates(baseCurrency),
                updatedAt: date,
            });
        });
    }

    await ExchangeRate.insertMany(testRecords);
    console.log('Datos de prueba insertados:', testRecords.length);
};

// Función para limpiar los datos de prueba
const clearTestData = async () => {
    await ExchangeRate.deleteMany({});
    console.log('Datos de prueba eliminados.');
};

// Función para cerrar la base de datos de prueba
const closeTestDatabase = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
    console.log('Base de datos en memoria cerrada.');
};

module.exports = { startTestDatabase, insertTestData, clearTestData, closeTestDatabase };
