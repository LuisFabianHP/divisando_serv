const createGracefulShutdown = ({
  serverRef,
  stopJobs,
  clearMemoryLog,
  rateLimiterStore,
  closeLoggers,
  closeDB,
}) => {
  return (signal) => {
    console.log(`🛑 ${signal}: Cerrando servidor y tareas...`);

    // Detener cron jobs
    stopJobs();

    // Limpiar logging agresivo si existe
    clearMemoryLog();

    // Limpiar rate limiter store (detiene setInterval y limpia Map)
    if (rateLimiterStore && rateLimiterStore.shutdown) {
      console.log('🧹 Cerrando rate limiter store...');
      rateLimiterStore.shutdown();
    }

    const server = serverRef.current;
    if (server) {
      server.close(async () => {
        // Cerrar loggers (limpia file handles de Winston)
        console.log('🧹 Cerrando loggers...');
        await closeLoggers();
        await closeDB();
        process.exit(0);
      });
    } else {
      closeLoggers().then(() => closeDB()).finally(() => process.exit(0));
    }
  };
};

module.exports = { createGracefulShutdown };
