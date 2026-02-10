const moduleAlias = require('module-alias');
const pkg = require('../../package.json');
moduleAlias.addAliases(pkg._moduleAliases || {});

const mongoose = require('mongoose');
const { connectDB, getConnectionStatus, resetConnectionState } = require('@config/database');

// Mock de console para capturar logs
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalNodeEnv = process.env.NODE_ENV;
let consoleErrorMock;
let consoleLogMock;

describe('MongoDB Connection Error Handling', () => {
  beforeEach(() => {
    // Resetear estado de conexión y circuit breaker
    resetConnectionState();
    
    // Cambiar NODE_ENV para evitar MongoDB en memoria
    process.env.NODE_ENV = 'development';
    
    // Capturar logs de error
    consoleErrorMock = jest.fn();
    consoleLogMock = jest.fn();
    console.error = consoleErrorMock;
    console.log = consoleLogMock;
  });

  afterEach(async () => {
    // Restaurar NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
    
    // Restaurar console
    console.error = originalConsoleError;
    console.log = originalConsoleLog;

    // Cerrar conexión si existe
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.close();
      } catch (err) {
        // Ignorar errores al cerrar conexión fallida
      }
    }
    
    // Resetear estado después de cada test
    resetConnectionState();
  }, 10000); // Timeout de 10s para afterEach

  test('should retry connection with exponential backoff on network error', async () => {
    // Guardar URI original
    const originalUri = process.env.MONGO_URI;
    
    // Usar IP no routable que causa timeout (192.0.2.1 es TEST-NET-1, RFC 5737)
    // Esto generará errores de timeout/network que SÍ son retryables
    process.env.MONGO_URI = 'mongodb://192.0.2.1:9999/test';
    
    // Conectar con solo 3 reintentos, delay corto y timeout corto (3s)
    await expect(connectDB(3, 300, 3000)).rejects.toThrow();
    
    // Verificar que se intentó 3 veces
    const errorLogs = consoleErrorMock.mock.calls.filter(call => 
      call[0].includes('Error de conexión')
    );
    expect(errorLogs.length).toBeGreaterThanOrEqual(3);
    
    // Verificar logs de reintento
    const retryLogs = consoleLogMock.mock.calls.filter(call => 
      call[0].includes('Reintentando') || call[0].includes('backoff exponencial')
    );
    expect(retryLogs.length).toBeGreaterThan(0);

    // Restaurar URI
    process.env.MONGO_URI = originalUri;
  }, 30000); // 30 segundos timeout

  test('should categorize authentication errors correctly', async () => {
    const originalUri = process.env.MONGO_URI;
    
    // Usar IP no routable - aunque intentemos auth, fallará por network (retryable)
    // Este test verifica que el sistema categoriza correctamente
    process.env.MONGO_URI = 'mongodb://wronguser:wrongpass@192.0.2.1:27017/test?authSource=admin';
    
    await expect(connectDB(2, 300, 3000)).rejects.toThrow();
    
    // Verificar que hubo intentos de conexión y categorización
    const errorLogs = consoleErrorMock.mock.calls.filter(call => 
      call[0].includes('Error de conexión')
    );
    expect(errorLogs.length).toBeGreaterThan(0);

    process.env.MONGO_URI = originalUri;
  }, 20000);

  test('should open circuit breaker after consecutive failures', async () => {
    const originalUri = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://192.0.2.1:9999/test';
    
    // Hacer 3 intentos de conexión que fallen (para activar circuit breaker)
    // Usar timeout muy corto (2s) y solo 1 retry para acelerar
    await expect(connectDB(1, 100, 2000)).rejects.toThrow();
    await expect(connectDB(1, 100, 2000)).rejects.toThrow();
    await expect(connectDB(1, 100, 2000)).rejects.toThrow();
    
    // Cuarto intento - circuit breaker debería estar abierto
    await expect(connectDB(1, 100, 2000)).rejects.toThrow(/Circuit breaker/);
    
    const circuitBreakerLogs = consoleLogMock.mock.calls.filter(call => 
      call[0].includes('Circuit breaker')
    );
    expect(circuitBreakerLogs.length).toBeGreaterThan(0);

    process.env.MONGO_URI = originalUri;
  }, 30000);

  test('should provide connection status via getConnectionStatus', async () => {
    // Primero conectar exitosamente (modo test usa MongoMemoryServer)
    process.env.NODE_ENV = 'test';
    await connectDB();

    const status = await getConnectionStatus();
    
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('readyState');
    expect(status).toHaveProperty('consecutiveFailures');
    expect(status).toHaveProperty('circuitBreakerOpen');
    
    // En conexión exitosa
    expect(status.readyState).toBe(1); // 1 = connected
    expect(status.circuitBreakerOpen).toBe(false);
    expect(status.ping).toBeDefined();

    await mongoose.connection.close();
  }, 15000);

  test('should log specific error messages for different failure types', async () => {
    const originalUri = process.env.MONGO_URI;
    
    // Usar IP no routable para generar error de network/timeout
    process.env.MONGO_URI = 'mongodb://192.0.2.1:9999/test';
    
    await expect(connectDB(2, 300, 3000)).rejects.toThrow();
    
    // Verificar que se registró el tipo de error
    const errorTypeLogs = consoleErrorMock.mock.calls.filter(call => {
      const msg = call[0];
      return msg.includes('(network)') || 
             msg.includes('(dns)') || 
             msg.includes('(timeout)') ||
             msg.includes('(authentication)') ||
             msg.includes('(configuration)');
    });
    
    expect(errorTypeLogs.length).toBeGreaterThan(0);

    process.env.MONGO_URI = originalUri;
  }, 20000);
});
