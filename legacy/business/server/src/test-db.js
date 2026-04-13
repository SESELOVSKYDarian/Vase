import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function diagnose() {
    try {
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_cache' 
      AND (column_name = 'price_wholesale' OR column_name = 'brand')
    `);
        console.log("Found target columns:", res.rows.map(r => r.column_name));

        if (res.rows.length < 2) {
            console.log("MISSING COLUMNS in " + process.env.DATABASE_URL);
        } else {
            console.log("COLUMNS OK. Attempting query...");
            await pool.query('SELECT price_wholesale, brand FROM product_cache LIMIT 1');
            console.log("QUERY OK");
        }
    } catch (e) {
        console.log("ERROR:", e.message);
    } finally {
        await pool.end();
    }
}
diagnose();
