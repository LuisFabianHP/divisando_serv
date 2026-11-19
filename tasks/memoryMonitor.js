const cron = require('node-cron');
const v8 = require('v8');
const { taskLogger } = require('@utils/logger');

const CRON_SCHEDULE = process.env.MEMORY_MONITOR_CRON || '*/5 * * * *'; // Cada 5 minutos

let memoryMonitorTask = null;

/**
 * Monitorea el uso de memoria heap contra el límite real de V8 y genera alertas si es necesario
 */
function monitorMemory() {
  const usage = process.memoryUsage();
  const heapLimit = v8.getHeapStatistics().heap_size_limit;
  const heapUsedMB = (usage.heapUsed / 1024 / 1024).toFixed(2);
  const heapLimitMB = (heapLimit / 1024 / 1024).toFixed(2);
  const rssMB = (usage.rss / 1024 / 1024).toFixed(2);
  const externalMB = (usage.external / 1024 / 1024).toFixed(2);

  const heapUsagePercent = ((usage.heapUsed / heapLimit) * 100).toFixed(2);

  taskLogger.info(`[Memory Monitor] Heap: ${heapUsedMB}MB/${heapLimitMB}MB límite (${heapUsagePercent}%) | RSS: ${rssMB}MB | External: ${externalMB}MB`);

  // Alerta si el uso de heap supera el 80%
  if (heapUsagePercent > 80) {
    taskLogger.warn(`⚠️  ALERTA: Uso de heap memory alto (${heapUsagePercent}%). Considere optimización o escalar recursos.`);
  }

  // Alerta crítica si supera el 90%
  if (heapUsagePercent > 90) {
    taskLogger.error(`🚨 CRÍTICO: Uso de heap memory muy alto (${heapUsagePercent}%). Riesgo de agotamiento de memoria.`);
  }
}

// Programar el cron job
function scheduleMemoryMonitor() {
  if (memoryMonitorTask) {
    memoryMonitorTask.stop();
  }

  memoryMonitorTask = cron.schedule(CRON_SCHEDULE, monitorMemory);
  return memoryMonitorTask;
}

function stopMemoryMonitor() {
  if (memoryMonitorTask) {
    memoryMonitorTask.stop();
    if (typeof memoryMonitorTask.destroy === 'function') {
      memoryMonitorTask.destroy();
    }
    memoryMonitorTask = null;
  }
}

// Exportar para ejecutar manualmente si es necesario
module.exports = {
  monitorMemory,
  scheduleMemoryMonitor,
  stopMemoryMonitor,
};
