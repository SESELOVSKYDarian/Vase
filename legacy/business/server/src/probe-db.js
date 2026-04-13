import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        console.log("Checking database connection to:", process.env.DATABASE_URL.split('@')[1]);

        const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_cache';
    `);

        console.log("Columns in product_cache:");
        columns.rows.forEach(col => {
            console.log(` - ${col.column_name} (${col.data_type})`);
        });

        const hasWholesale = columns.rows.some(c => c.column_name === 'price_wholesale');
        const hasBrand = columns.rows.some(c => c.column_name === 'brand');

        if (!hasWholesale || !hasBrand) {
            console.log("Missing columns detected. Applying fix...");
            await pool.query(`
        ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS price_wholesale numeric(12,2) NOT NULL DEFAULT 0;
        ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS brand text;
      `);
            console.log("Fix applied.");
        } else {
            console.log("All columns present.");
        }

    } catch (err) {
        console.error("Database check failed:", err.message);
    } finally {
        await pool.end();
    }
}

check();
