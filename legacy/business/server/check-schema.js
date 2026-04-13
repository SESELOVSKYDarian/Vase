import dotenv from 'dotenv';
dotenv.config();
import { pool } from './src/db.js';

async function checkSchema() {
    try {
        // Check product_cache columns
        const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'product_cache'
      ORDER BY ordinal_position
    `);

        console.log('=== product_cache columns ===');
        result.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Check if category_id exists
        const hasCategoryId = result.rows.some(r => r.column_name === 'category_id');
        console.log(`\nHas category_id: ${hasCategoryId}`);

        if (!hasCategoryId) {
            console.log('\n=== Adding category_id column ===');
            await pool.query(`
        ALTER TABLE product_cache 
        ADD COLUMN category_id INTEGER REFERENCES categories(id)
      `);
            console.log('✅ category_id column added');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkSchema();
