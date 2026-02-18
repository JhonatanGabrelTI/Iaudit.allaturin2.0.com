const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Checking database connection...');
        const client = await pool.connect();
        console.log('Connected!');

        console.log('Checking configuracoes_cobranca...');
        const resConfig = await client.query('SELECT * FROM configuracoes_cobranca');
        console.log('Result:', resConfig.rows);
        console.log('Configs found:', resConfig.rows.length);

        if (resConfig.rows.length > 0) {
            console.log('First config ID:', resConfig.rows[0].id);
        } else {
            console.log('WARNING: No configuration found!');
        }

        console.log('Checking boletos table schema...');
        const resSchema = await client.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'boletos';
        `);
        console.log('Boletos columns:', resSchema.rows);

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
