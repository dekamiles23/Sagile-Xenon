const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro de conexão:', err.message);
  } else {
    console.log('✅ Conexão bem-sucedida!', res.rows[0]);
  }
  pool.end();
});