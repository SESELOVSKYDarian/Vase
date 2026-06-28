import { pool } from './src/db.js';

async function logSchema() {
    try {
        const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);
        console.log("=== TABLES ===");
        for (const t of tables.rows) {
            console.log(t.table_name);
            const cols = await pool.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = $1
            `, [t.table_name]);
            cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
logSchema();
