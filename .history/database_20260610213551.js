/**
 * Conexão com banco de dados PostgreSQL Neon
 * Segurança: NUNCA exponha essa conexão no frontend
 * Apenas o backend Node.js tem acesso a esse arquivo
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requerido para conexão com Neon
  },
  max: 20, // Máximo de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar conexão ao iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco PostgreSQL:', err.message);
    return;
  }
  console.log('✅ Conectado com sucesso ao banco PostgreSQL Neon!');
  release();
});

// Função para executar queries (segura contra SQL Injection)
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`📊 Query executada em ${duration}ms: ${text.substring(0, 60)}...`);
  return res;
}

// Função para verificar saúde da conexão
async function healthCheck() {
  try {
    const result = await query('SELECT NOW() as server_time');
    return {
      status: 'ok',
      database: 'PostgreSQL Neon',
      serverTime: result.rows[0].server_time,
      connected: true
    };
  } catch (err) {
    return {
      status: 'error',
      database: 'PostgreSQL Neon',
      error: err.message,
      connected: false
    };
  }
}

// Exportar funções
module.exports = {
  pool,
  query,
  healthCheck
};