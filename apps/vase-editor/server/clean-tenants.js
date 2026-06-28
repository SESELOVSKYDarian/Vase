import { pool } from './src/db.js';

async function cleanDatabase() {
    console.log('--- INICIANDO LIMPIEZA TOTAL DE BASE DE DATOS (PROYECTO TEFLON) ---');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Al usar TRUNCATE con CASCADE, PostgreSQL vaciará las tablas de tenants, users
        // y de forma automática todas las tablas que dependan de ellas (orders, order_items, product_cache, etc.)
        // sin que nos molesten los errores de llaves foráneas.
        console.log('Vaciando tablas tenants, users y todas sus dependencias en cascada...');

        await client.query(`
            TRUNCATE TABLE tenants, users CASCADE;
        `);

        await client.query('COMMIT');
        console.log('✅ Tablas vaciadas correctamente.');
        console.log('--- LIMPIEZA TOTAL COMPLETADA CON ÉXITO ---');
        console.log('Ahora la base de datos está completamente vacía (sin tenants ni usuarios).');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error durante la limpieza:', e);
    } finally {
        client.release();
        pool.end();
    }
}

cleanDatabase();
