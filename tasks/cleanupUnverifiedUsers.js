const cron = require('node-cron');
const User = require('@models/User');
const { taskLogger } = require('@utils/logger');
const taskErrorHandler = require('@middlewares/taskErrorHandler');

// Cron schedule para ejecutar la limpieza 1 vez al día a las 3 AM
const CRON_SCHEDULE = '0 3 * * *';

// Tiempo en minutos antes de considerar una cuenta no verificada como abandonada
const EXPIRATION_MINUTES = 5;

// Límite máximo de usuarios a eliminar por ejecución (para no abusar del free tier)
const MAX_DELETE_BATCH = 100;

let cleanupTask = null;

/**
 * Limpia usuarios no verificados que tengan más de X minutos de antigüedad
 */
const cleanupUnverifiedUsers = async () => {
    try {
        taskLogger.info('|| Inicio de limpieza de usuarios no verificados ||');

        // Calcular tiempo de expiración (5 minutos atrás desde ahora)
        const expirationTime = new Date(Date.now() - EXPIRATION_MINUTES * 60 * 1000);

        // Buscar usuarios no verificados y antiguos (limitados a MAX_DELETE_BATCH)
        const usersToDelete = await User.find({
            isVerified: false,
            provider: 'local', // Solo usuarios locales, no OAuth
            createdAt: { $lt: expirationTime }
        })
        .limit(MAX_DELETE_BATCH)
        .select('_id email createdAt');

        if (usersToDelete.length === 0) {
            taskLogger.info('No hay usuarios no verificados para eliminar.');
            return;
        }

        // Extraer IDs para eliminar
        const userIds = usersToDelete.map(user => user._id);

        // Eliminar usuarios en batch
        const result = await User.deleteMany({
            _id: { $in: userIds }
        });

        taskLogger.info(`✅ ${result.deletedCount} usuarios no verificados eliminados exitosamente.`);
        
        // Log detallado de usuarios eliminados (solo en desarrollo)
        if (process.env.NODE_ENV === 'development' && result.deletedCount > 0) {
            usersToDelete.forEach(user => {
                const ageMinutes = Math.floor((Date.now() - user.createdAt) / 60000);
                taskLogger.info(`  - Email: ${user.email}, Antigüedad: ${ageMinutes} minutos`);
            });
        }

        // Advertencia si alcanzamos el límite (puede haber más usuarios pendientes)
        if (result.deletedCount === MAX_DELETE_BATCH) {
            taskLogger.warn(`⚠️ Se alcanzó el límite de ${MAX_DELETE_BATCH} eliminaciones. Puede haber más usuarios pendientes.`);
        }

    } catch (error) {
        taskLogger.error(`Error en limpieza de usuarios no verificados: ${error.message}`, { stack: error.stack });
        taskErrorHandler(error, 'cleanupUnverifiedUsers');
    }
};

/**
 * Programa la tarea de limpieza con cron
 */
const scheduleCleanup = () => {
    taskLogger.info(`📅 Limpieza de usuarios no verificados programada: ${CRON_SCHEDULE} (diario a las 3 AM)`);
    if (cleanupTask) {
        cleanupTask.stop();
    }

    cleanupTask = cron.schedule(CRON_SCHEDULE, async () => {
        await cleanupUnverifiedUsers();
    });
    return cleanupTask;
};

const stopCleanup = () => {
    if (cleanupTask) {
        cleanupTask.stop();
        cleanupTask.destroy();
        cleanupTask = null;
    }
};

// Exportar función para ejecución manual y programada
module.exports = {
    scheduleCleanup,
    stopCleanup,
    cleanupUnverifiedUsers,
};
