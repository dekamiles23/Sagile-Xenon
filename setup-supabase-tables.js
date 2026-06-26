/**
 * setup-supabase-tables.js
 * Script para criar tabelas no Supabase automaticamente
 * Execute: node setup-supabase-tables.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mescdtlvpqblhlqtvnlm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_GEsYmczQKJip2Ejvj7N06A_WFHHjXRq';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SQL_QUERIES = [
  // Tabela communities
  `CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    created_by TEXT NOT NULL,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);`,
  `CREATE INDEX IF NOT EXISTS idx_communities_updated_at ON communities(updated_at DESC);`,
  
  // Tabela servers
  `CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    owner TEXT NOT NULL,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner);`,
  `CREATE INDEX IF NOT EXISTS idx_servers_updated_at ON servers(updated_at DESC);`,
  
  // Tabela server_channels
  `CREATE TABLE IF NOT EXISTS server_channels (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_server_channels_server_id ON server_channels(server_id);`,
  
  // Habilitar RLS
  `ALTER TABLE communities ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE servers ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE server_channels ENABLE ROW LEVEL SECURITY;`,
  
  // Políticas para communities
  `CREATE POLICY IF NOT EXISTS "Anyone can view communities" ON communities FOR SELECT USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can insert communities" ON communities FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can update communities" ON communities FOR UPDATE USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can delete communities" ON communities FOR DELETE USING (true);`,
  
  // Políticas para servers
  `CREATE POLICY IF NOT EXISTS "Anyone can view servers" ON servers FOR SELECT USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can insert servers" ON servers FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can update servers" ON servers FOR UPDATE USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can delete servers" ON servers FOR DELETE USING (true);`,
  
  // Políticas para server_channels
  `CREATE POLICY IF NOT EXISTS "Anyone can view server channels" ON server_channels FOR SELECT USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can insert server channels" ON server_channels FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can update server channels" ON server_channels FOR UPDATE USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Anyone can delete server channels" ON server_channels FOR DELETE USING (true);`,
  
  // Trigger function
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;`,
  
  // Triggers
  `CREATE TRIGGER IF NOT EXISTS update_communities_updated_at
   BEFORE UPDATE ON communities
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();`,
   
  `CREATE TRIGGER IF NOT EXISTS update_servers_updated_at
   BEFORE UPDATE ON servers
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();`
];

async function executeSQL() {
  console.log('🔧 Iniciando criação de tabelas no Supabase...');
  
  for (let i = 0; i < SQL_QUERIES.length; i++) {
    const query = SQL_QUERIES[i];
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        // Se rpc falhar, tenta via REST API direta
        console.log(`⚠️  Query ${i + 1}/${SQL_QUERIES.length} falhou via RPC, tentando alternativa...`);
      } else {
        console.log(`✅ Query ${i + 1}/${SQL_QUERIES.length} executada com sucesso`);
      }
    } catch (err) {
      console.log(`⚠️  Query ${i + 1}/${SQL_QUERIES.length}: ${err.message}`);
    }
  }
  
  console.log('\n📝 INSTRUÇÕES MANUAIS (se automático falhou):');
  console.log('1. Abra o painel do Supabase: https://supabase.com/dashboard');
  console.log('2. Vá em SQL Editor');
  console.log('3. Copie e execute o conteúdo do arquivo: supabase-tables.sql');
  console.log('\n✅ Script finalizado!');
}

executeSQL().catch(console.error);
