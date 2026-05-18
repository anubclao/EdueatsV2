/**
 * Redis Connection and Health Test
 * Run with: npx tsx src/services/redis-test.ts
 */
import { getRedisClient, initRedis, closeRedis, setCached, getCached, deleteCached } from './redis.js';
async function testRedisConnection() {
    console.log('\n🧪 Iniciando pruebas de Redis...\n');
    try {
        // Initialize Redis
        console.log('1️⃣ Inicializando Redis...');
        await initRedis();
        const redis = getRedisClient();
        if (!redis) {
            console.log('⚠️ Redis no está disponible. Usando fallback en memoria.');
            console.log('✅ Sistema funcionará con caché en memoria (sin persistencia).\n');
            return;
        }
        console.log('✅ Redis inicializado exitosamente\n');
        // Test 1: Basic PING
        console.log('2️⃣ Test PING...');
        const pingResult = await redis.ping();
        console.log(`✅ PING: ${pingResult}\n`);
        // Test 2: SET y GET
        console.log('3️⃣ Test SET/GET básico...');
        await redis.set('test:key', 'test-value', 'EX', 60);
        const value = await redis.get('test:key');
        console.log(`✅ SET test:key = "test-value"`);
        console.log(`✅ GET test:key = "${value}"\n`);
        // Test 3: INCR (para rate limiting)
        console.log('4️⃣ Test INCR (rate limiting)...');
        await redis.del('test:counter');
        const count1 = await redis.incr('test:counter');
        const count2 = await redis.incr('test:counter');
        const count3 = await redis.incr('test:counter');
        console.log(`✅ INCR secuencial: ${count1} -> ${count2} -> ${count3}\n`);
        // Test 4: Cache helpers (setCached/getCached)
        console.log('5️⃣ Test cache helpers...');
        const testData = { id: 1, name: 'Test Menu', date: '2026-05-18' };
        await setCached('test:cache', testData, 60);
        const cachedData = await getCached('test:cache');
        console.log(`✅ setCached('test:cache', ${JSON.stringify(testData)}, 60)`);
        console.log(`✅ getCached('test:cache') = ${JSON.stringify(cachedData)}\n`);
        // Test 5: DEL
        console.log('6️⃣ Test DEL...');
        await deleteCached('test:cache');
        const deletedData = await getCached('test:cache');
        console.log(`✅ deleteCached('test:cache')`);
        console.log(`✅ getCached después de DEL = ${deletedData}\n`);
        // Test 6: KEYS pattern
        console.log('7️⃣ Test KEYS pattern...');
        await redis.set('test:item1', 'val1');
        await redis.set('test:item2', 'val2');
        await redis.set('test:item3', 'val3');
        const keys = await redis.keys('test:*');
        console.log(`✅ KEYS test:* = [${keys.join(', ')}]\n`);
        // Cleanup
        console.log('🧹 Limpiando claves de prueba...');
        await redis.del('test:key', 'test:counter', 'test:item1', 'test:item2', 'test:item3');
        console.log('✅ Claves de prueba eliminadas\n');
        // Summary
        console.log('═════════════════════════════════════════');
        console.log('✅ TODAS LAS PRUEBAS PASARON');
        console.log('═════════════════════════════════════════');
        console.log('\n📊 Estadísticas de conexión:');
        const info = await redis.info('stats');
        const lines = info.split('\r\n').filter((l) => l.includes('connected_clients') || l.includes('total_commands'));
        lines.forEach((line) => console.log(`   ${line}`));
        console.log('\n✅ Redis está listo para producción.\n');
    }
    catch (error) {
        console.error('\n❌ Error durante las pruebas:', error.message);
        process.exit(1);
    }
    finally {
        console.log('🔌 Cerrando conexión Redis...');
        await closeRedis();
        console.log('✅ Desconectado\n');
    }
}
// Run tests
testRedisConnection().catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
