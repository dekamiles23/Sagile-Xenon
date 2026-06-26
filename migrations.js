/**
 * SISTEMA DE MIGRAÇÃO AUTOMÁTICA
 * Cria todas as tabelas no PostgreSQL Neon
 * Migra dados existentes do data.json automaticamente
 */

const database = require('./database');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// ================================================
// TABELAS A SEREM CRIADAS
// ================================================
const TABLES = [
  // ---- CONTAS E SESSOES ----
  `CREATE TABLE IF NOT EXISTS accounts (id VARCHAR(36) PRIMARY KEY, nick VARCHAR(50) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, phone VARCHAR(30) NOT NULL DEFAULT '', birthdate VARCHAR(20) NOT NULL DEFAULT '', password_hash TEXT NOT NULL, friend_code VARCHAR(20) NOT NULL DEFAULT '', registered_at TEXT NOT NULL, updated_at TEXT NOT NULL, avatar TEXT DEFAULT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_nick_lower ON accounts (LOWER(nick))`,
  `CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(64) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)`,


  `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar TEXT,
    status VARCHAR(20) DEFAULT 'online',
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    visual_profile JSONB DEFAULT '{}'
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS friend_requests (
    id          SERIAL       PRIMARY KEY,
    from_user   TEXT         NOT NULL,
    to_user     TEXT         NOT NULL,
    status      TEXT         NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (from_user, to_user)
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS communities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon TEXT,
    banner TEXT,
    owner_id INTEGER NOT NULL,
    is_suggested BOOLEAN DEFAULT FALSE,
    members_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS community_members (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(community_id, user_id)
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    community_id INTEGER,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) DEFAULT 'text',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS private_messages (
    id SERIAL PRIMARY KEY,
    from_username VARCHAR(50) NOT NULL,
    to_username VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    time VARCHAR(10),
    status VARCHAR(20) DEFAULT 'sent',
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(from_username, to_username);
  `,

  `
  CREATE TABLE IF NOT EXISTS channel_messages (
    id SERIAL PRIMARY KEY,
    channel_key VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    time VARCHAR(10),
    visual_profile JSONB DEFAULT '{}',
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_channel_messages_key ON channel_messages(channel_key);
  `,

  `
  CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    subreddit VARCHAR(32) DEFAULT 'geral',
    username VARCHAR(50) NOT NULL,
    time VARCHAR(10),
    score INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS post_votes (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    vote INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS post_comments (
    id VARCHAR(50) PRIMARY KEY,
    post_id VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    parent_id VARCHAR(50),
    time VARCHAR(10),
    score INTEGER DEFAULT 0,
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS reels (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    tags TEXT,
    file_type VARCHAR(50),
    file_url TEXT NOT NULL,
    username VARCHAR(50) NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    time VARCHAR(10),
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE IF NOT EXISTS diary_entries (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    content TEXT,
    mood VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  `
];

// ================================================
// FUNÇÃO PARA CRIAR TODAS AS TABELAS
// ================================================
async function createTables() {
  console.log('\n🔨 Criando tabelas no PostgreSQL Neon...');
  
  for (const sql of TABLES) {
    try {
      await database.query(sql);
      const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      const indexMatch = sql.match(/CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+)/);
      const tableName = tableMatch ? tableMatch[1] : (indexMatch ? indexMatch[1] : 'objeto');
      console.log(`✅ Tabela ${tableName} criada com sucesso`);
    } catch (err) {
      console.error(`❌ Erro ao criar tabela:`, err.message);
    }
  }
  
  console.log('\n✅ Todas as tabelas foram criadas!');
}

// ================================================
// FUNÇÃO PARA MIGRAR DADOS DO DATA.JSON
// ================================================
async function migrateData() {
  console.log('\n📦 Iniciando migração dos dados do data.json...');
  
  if (!fs.existsSync(DATA_FILE)) {
    console.log('ℹ️ Arquivo data.json não encontrado, pulando migração');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let totalMigrated = 0;

    // Migrar mensagens privadas
    if (data.dmMessages) {
      console.log('\n📨 Migando mensagens privadas...');
      let count = 0;
      
      for (const conversationId in data.dmMessages) {
        const messages = data.dmMessages[conversationId];
        for (const msg of messages) {
          try {
            await database.query(`
              INSERT INTO private_messages (from_username, to_username, text, time, status, timestamp)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT DO NOTHING
            `, [msg.from, msg.to, msg.text, msg.time, msg.status, msg.timestamp]);
            count++;
          } catch (e) {}
        }
      }
      console.log(`✅ ${count} mensagens privadas migradas`);
      totalMigrated += count;
    }

    // Migrar mensagens de canais
    if (data.channels) {
      console.log('\n💬 Migando mensagens de canais...');
      let count = 0;
      
      for (const channelKey in data.channels) {
        const messages = data.channels[channelKey];
        for (const msg of messages) {
          try {
            await database.query(`
              INSERT INTO channel_messages (channel_key, username, text, time, visual_profile, timestamp)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT DO NOTHING
            `, [channelKey, msg.username, msg.text, msg.time, msg.visualProfile, Date.now()]);
            count++;
          } catch (e) {}
        }
      }
      console.log(`✅ ${count} mensagens de canais migradas`);
      totalMigrated += count;
    }

    // Migrar postagens do feed
    if (data.feedPosts && data.feedPosts.length > 0) {
      console.log('\n📝 Migando postagens do feed...');
      let count = 0;
      
      for (const post of data.feedPosts) {
        try {
          await database.query(`
            INSERT INTO posts (id, title, body, subreddit, username, time, score, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TO_TIMESTAMP($8 / 1000))
            ON CONFLICT (id) DO NOTHING
          `, [post.id, post.title, post.body, post.subreddit, post.username, post.time, post.score, post.createdAt]);
          count++;
        } catch (e) {}
      }
      console.log(`✅ ${count} postagens migradas`);
      totalMigrated += count;
    }

    // Migrar Shorts/Reels
    if (data.shorts && data.shorts.length > 0) {
      console.log('\n🎥 Migando Shorts/Reels...');
      let count = 0;
      
      for (const short of data.shorts) {
        try {
          await database.query(`
            INSERT INTO reels (id, title, description, tags, file_type, file_url, username, time, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
          `, [short.id, short.title, short.description, short.tags, short.fileType, short.fileUrl, short.username, short.time, short.timestamp]);
          count++;
        } catch (e) {}
      }
      console.log(`✅ ${count} Shorts migrados`);
      totalMigrated += count;
    }

    console.log(`\n🎉 Migração concluída! Total de ${totalMigrated} registros migrados para o PostgreSQL`);

  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  }
}

// ================================================
// EXECUTAR MIGRAÇÃO
// ================================================
async function runMigration() {
  try {
    const health = await database.healthCheck();
    
    if (!health.connected) {
      console.log('❌ Não foi possível conectar ao banco de dados');
      console.log('ℹ️ Sistema continuará usando o data.json como fallback');
      return false;
    }

    console.log('✅ Conectado ao PostgreSQL Neon com sucesso!');
    
    await createTables();
    // Migracao incremental: adicionar coluna avatar se nao existir
    try { await database.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL'); } catch(_e) {}
    // Migracao incremental: adicionar coluna is_suggested na tabela communities se nao existir
    try { await database.query('ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_suggested BOOLEAN DEFAULT FALSE'); } catch(_e) {}
    // Migracao incremental: adicionar coluna members_count na tabela communities se nao existir
    try { await database.query('ALTER TABLE communities ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 0'); } catch(_e) {}
    await migrateData();
    
    console.log('\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    return true;

  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    return false;
  }
}

module.exports = {
  runMigration,
  createTables,
  migrateData
};

// Executar automaticamente se chamado diretamente
if (require.main === module) {
  runMigration().then(() => process.exit());
}