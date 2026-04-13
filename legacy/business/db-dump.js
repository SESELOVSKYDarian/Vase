const pg = require('pg');
const fs = require('fs');
const path = require('path');

// Try to load from server/.env
const envPath = path.join(__dirname, 'server', '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
        const [key, value] = line.split('=');
        if (key === 'DATABASE_URL') process.env.DATABASE_URL = value.trim();
    }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function dump() {
    try {
        console.log('--- TENANTS ---');
        const tenants = await pool.query('SELECT * FROM tenants');
        console.table(tenants.rows);

        console.log('--- DOMAINS ---');
        const domains = await pool.query('SELECT * FROM tenant_domains');
        console.table(domains.rows);

        console.log('--- PRODUCTS (sample) ---');
        const products = await pool.query('SELECT id, name, tenant_id FROM product_cache LIMIT 5');
        console.table(products.rows);

    } catch (err) {
        console.error('Dump failed:', err.message);
    } finally {
        await pool.end();
    }
}

dump();
