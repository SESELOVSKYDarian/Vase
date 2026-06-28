import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkPages() {
    try {
        console.log("=== PAGE DATA DIAGNOSTICS ===");

        const pages = await pool.query('SELECT * FROM pages');
        console.log("Pages found:", pages.rowCount);
        pages.rows.forEach(p => console.log(` - ID: ${p.id}, Slug: ${p.slug}, Tenant: ${p.tenant_id}`));

        const sections = await pool.query('SELECT page_id, state, count(*) FROM page_sections GROUP BY page_id, state');
        console.log("\nSections summary:");
        sections.rows.forEach(s => console.log(` - Page ID: ${s.page_id}, State: ${s.state}, Count: ${s.count}`));

        const homePageId = pages.rows.find(p => p.slug === 'home')?.id;
        if (homePageId) {
            console.log(`\nDetailed sections for HomePage (${homePageId}):`);
            const details = await pool.query('SELECT type, enabled, state, props FROM page_sections WHERE page_id = $1 ORDER BY state, sort_order', [homePageId]);
            details.rows.forEach(d => {
                console.log(` [${d.state}] ${d.type} (Enabled: ${d.enabled}) - Props: ${JSON.stringify(d.props).substring(0, 50)}...`);
            });
        }

    } catch (err) {
        console.error("Diagnostics error:", err);
    } finally {
        await pool.end();
    }
}

checkPages();
