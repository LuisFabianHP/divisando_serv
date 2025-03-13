const mongoose = require('mongoose');
const ExchangeRate = require('../../models/ExchangeRate');
const { startTestDatabase, insertTestData } = require('./generateTestData');

(async () => {
    if (mongoose.connection.readyState === 0) {
        await startTestDatabase(); // Asegura que la base virtual está activa
    }

    // Insertar datos de prueba si la base está vacía
    const recordCount = await ExchangeRate.countDocuments();
    if (recordCount > 0) {
        await clearTestData();  // Asegura que la base virtual está activa
    }

    await insertTestData(); // Asegura que la base virtual tenga datos
})();