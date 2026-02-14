const cron = require('node-cron');
const { taskLogger } = require('@utils/logger');

const CRON_SCHEDULE = process.env.GC_CRON || '*/30 * * * *'; // Cada 30 minutos

let garbageCollectorTask = null;

/**
 * Fuerza garbage collection manual si está disponible
 * Requiere ejecutar Node con --expose-gc
 */
function forceGarbageCollection() {
  if (global.gc) {
    const beforeMem = process.memoryUsage().heapUsed;
    global.gc();
    const afterMem = process.memoryUsage().heapUsed;
    const freedMB = ((beforeMem - afterMem) / 1024 / 1024).toFixed(2);
    
    taskLogger.info(`[GC] Garbage collection ejecutado. Memoria liberada: ${freedMB}MB`);
  } else {
    taskLogger.warn('[GC] Garbage collection no disponible. Ejecute Node con --expose-gc para habilitarlo.');
  }
}

// Programar el cron job
function scheduleGarbageCollector() {
  if (garbageCollectorTask) {
    garbageCollectorTask.stop();
  }

  garbageCollectorTask = cron.schedule(CRON_SCHEDULE, forceGarbageCollection);
  return garbageCollectorTask;
}

function stopGarbageCollector() {
  if (garbageCollectorTask) {
    garbageCollectorTask.stop();
    if (typeof garbageCollectorTask.destroy === 'function') {
      garbageCollectorTask.destroy();
    }
    garbageCollectorTask = null;
  }
}

// Exportar para ejecutar manualmente si es necesario
module.exports = {
  forceGarbageCollection,
  scheduleGarbageCollector,
  stopGarbageCollector,
};
