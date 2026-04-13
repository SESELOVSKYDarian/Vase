import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../server/.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const tenants = await pool.query('select id, name from tenants');
        console.log('Tenants in DB:', tenants.rows);

        const settings = await pool.query('select tenant_id from tenant_settings');
        console.log('Settings for tenants:', settings.rows);

    } catch (err) {
        console.error('DB Check failed:', err);
    } finally {
        await pool.end();
    }
}

check();
