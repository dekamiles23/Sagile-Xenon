const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Testando com DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro:', err.message);
  } else {
    console.log('✅ Conectado!', res.rows[0]);
  }
  pool.end();
});