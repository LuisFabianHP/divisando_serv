// Configurar aliases de módulos ANTES de cualquier require
require('module-alias/register');

const { connectDB, closeDB } = require('../config/database');
const User = require('../models/User');
const { cleanupUnverifiedUsers } = require('../tasks/cleanupUnverifiedUsers');

// Configurar modo test
process.env.NODE_ENV = 'test';

/**
 * Test manual para la función de limpieza de usuarios no verificados
 */
const testCleanup = async () => {
    try {
        console.log('\n🧪 Iniciando prueba de limpieza de usuarios no verificados...\n');

        // Conectar a base de datos en memoria
        await connectDB();
        console.log('✅ Conectado a base de datos en memoria\n');

        // Limpiar datos previos
        await User.deleteMany({});

        // Crear usuarios de prueba con diferentes antigüedades
        const now = Date.now();

        // 1. Usuario verificado (NO debe eliminarse)
        const verifiedUser = await User.create({
            username: 'verified_user',
            email: 'verified@test.com',
            password: 'password123',
            provider: 'local',
            isVerified: true,
            createdAt: new Date(now - 10 * 60 * 1000) // 10 minutos atrás
        });

        // 2. Usuario no verificado reciente (NO debe eliminarse, < 5 min)
        const recentUnverified = await User.create({
            username: 'recent_unverified',
            email: 'recent@test.com',
            password: 'password123',
            provider: 'local',
            isVerified: false,
            createdAt: new Date(now - 3 * 60 * 1000) // 3 minutos atrás
        });

        // 3. Usuario no verificado antiguo (DEBE eliminarse, > 5 min)
        const oldUnverified1 = await User.create({
            username: 'old_unverified_1',
            email: 'old1@test.com',
            password: 'password123',
            provider: 'local',
            isVerified: false,
            createdAt: new Date(now - 6 * 60 * 1000) // 6 minutos atrás
        });

        // 4. Otro usuario no verificado antiguo (DEBE eliminarse)
        const oldUnverified2 = await User.create({
            username: 'old_unverified_2',
            email: 'old2@test.com',
            password: 'password123',
            provider: 'local',
            isVerified: false,
            createdAt: new Date(now - 10 * 60 * 1000) // 10 minutos atrás
        });

        // 5. Usuario OAuth no verificado antiguo (NO debe eliminarse, solo locales)
        const oauthUnverified = await User.create({
            username: 'oauth_user',
            email: 'oauth@test.com',
            provider: 'google',
            providerId: '12345',
            isVerified: false,
            createdAt: new Date(now - 10 * 60 * 1000) // 10 minutos atrás
        });

        console.log('📝 Usuarios creados:');
        console.log('  1. Usuario verificado (10 min antigüedad) - NO debe eliminarse');
        console.log('  2. Usuario no verificado reciente (3 min) - NO debe eliminarse');
        console.log('  3. Usuario no verificado antiguo (6 min) - DEBE eliminarse');
        console.log('  4. Usuario no verificado antiguo (10 min) - DEBE eliminarse');
        console.log('  5. Usuario OAuth no verificado (10 min) - NO debe eliminarse\n');

        const beforeCount = await User.countDocuments();
        console.log(`📊 Total de usuarios antes de limpieza: ${beforeCount}\n`);

        // Ejecutar limpieza
        console.log('🧹 Ejecutando limpieza...\n');
        await cleanupUnverifiedUsers();

        // Verificar resultados
        const afterCount = await User.countDocuments();
        console.log(`\n📊 Total de usuarios después de limpieza: ${afterCount}\n`);

        // Verificar usuarios específicos
        const stillExists = {
            verified: await User.findById(verifiedUser._id),
            recent: await User.findById(recentUnverified._id),
            old1: await User.findById(oldUnverified1._id),
            old2: await User.findById(oldUnverified2._id),
            oauth: await User.findById(oauthUnverified._id)
        };

        console.log('🔍 Verificación de resultados:');
        console.log(`  ✅ Usuario verificado: ${stillExists.verified ? 'EXISTE' : 'ELIMINADO'} ${stillExists.verified ? '✓' : '✗'}`);
        console.log(`  ✅ Usuario reciente no verificado: ${stillExists.recent ? 'EXISTE' : 'ELIMINADO'} ${stillExists.recent ? '✓' : '✗'}`);
        console.log(`  ❌ Usuario antiguo no verificado 1: ${stillExists.old1 ? 'EXISTE' : 'ELIMINADO'} ${!stillExists.old1 ? '✓' : '✗'}`);
        console.log(`  ❌ Usuario antiguo no verificado 2: ${stillExists.old2 ? 'EXISTE' : 'ELIMINADO'} ${!stillExists.old2 ? '✓' : '✗'}`);
        console.log(`  ✅ Usuario OAuth no verificado: ${stillExists.oauth ? 'EXISTE' : 'ELIMINADO'} ${stillExists.oauth ? '✓' : '✗'}\n`);

        // Validar que los resultados son correctos
        const success = 
            stillExists.verified !== null &&
            stillExists.recent !== null &&
            stillExists.old1 === null &&
            stillExists.old2 === null &&
            stillExists.oauth !== null;

        if (success) {
            console.log('✅ ¡PRUEBA EXITOSA! La limpieza funciona correctamente.\n');
        } else {
            console.log('❌ PRUEBA FALLIDA. Algunos usuarios no se eliminaron/mantuvieron correctamente.\n');
        }

        // Cerrar conexión
        await closeDB();
        console.log('🔌 Desconectado de base de datos\n');

        process.exit(success ? 0 : 1);

    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
        console.error(error.stack);
        await closeDB();
        process.exit(1);
    }
};

// Ejecutar prueba
testCleanup();
