const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async (retries = 5, delay = 3000) => {
  try {
    const mongoUri = process.env.NODE_ENV === 'test'
      ? await startInMemoryMongo()
      : process.env.MONGO_URI;

    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error al conectar a la base de datos: ${error.message}`);
  
    retries -= 1;

    if (retries > 0) {
      console.log(`Reintentando conexión en ${delay / 1000} segundos... (Intentos restantes: ${retries})`);
      // Esperar antes de reintentar
      await new Promise((res) => setTimeout(res, delay));
      return connectDB(retries, delay); // Reintentar
    }

    // Si se agotan los intentos, registrar y detener el servidor
    console.error('No se pudo conectar a la base de datos después de múltiples intentos.');
    process.exit(1); // Detener la aplicación en un error crítico

  }
};

const startInMemoryMongo = async () => {
  mongoServer = await MongoMemoryServer.create();
  return mongoServer.getUri();
};

// Cerrar la conexión y el servidor en memoria después de las pruebas
const closeDB = async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany(); // Limpia los documentos sin eliminar las colecciones
  }

  await mongoose.connection.close();

  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = { connectDB, closeDB };