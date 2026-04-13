import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function diagnose() {
    try {
        console.log("=== DB DIAGNOSTICS ===");
        console.log("DATABASE_URL:", process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));

        // Check current database and user
        const whoami = await pool.query('SELECT current_database(), current_user, current_schemas(true)');
        console.log("Connected as:", whoami.rows[0]);

        // Check for tables named product_cache in ALL schemas
        const tables = await pool.query(`
      SELECT table_schema, table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'product_cache'
    `);
        console.log("\nFound tables/views named 'product_cache':");
        tables.rows.forEach(t => console.log(` - ${t.table_schema}.${t.table_name} (${t.table_type})`));

        // For each found table, list columns
        for (const t of tables.rows) {
            const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
      `, [t.table_schema, t.table_name]);
            console.log(`\nColumns in ${t.table_schema}.${t.table_name}:`);
            cols.rows.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));
        }

        // Attempt the problematic query
        console.log("\nAttempting problematic query: SELECT price_wholesale, brand FROM product_cache LIMIT 1");
        try {
            const test = await pool.query('SELECT price_wholesale, brand FROM product_cache LIMIT 1');
            console.log("Query SUCCESS!");
        } catch (e) {
            console.error("Query FAILED:", e.message);
        }

    } catch (err) {
        console.error("Diagnostics error:", err);
    } finally {
        await pool.end();
    }
}

diagnose();
