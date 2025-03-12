const mongoose = require('mongoose');
const ExchangeRate = require('../../models/ExchangeRate');
const { startTestDatabase, insertTestData } = require('./generateTestData');

const countRecordsTest = async () => {
    try {
        if (mongoose.connection.readyState === 0) {
            await startTestDatabase();
        }

        // Insertar datos de prueba si la base está vacía
        const recordCount = await ExchangeRate.countDocuments();
        if (recordCount === 0) {
            console.log('No hay registros, insertando datos de prueba...');
            await insertTestData();
        }

        const records = await ExchangeRate.find();
        console.log('Registros en la base de datos de pruebas:', records.length);

    } catch (error) {
        console.error('Error al obtener registros:', error.message);
    }
};

// Ejecutar la prueba solo si se llama directamente
if (require.main === module) {
    countRecordsTest();
}

module.exports = countRecordsTest;
