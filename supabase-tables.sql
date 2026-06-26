-- ================================================
-- TABELAS DO SUPABASE PARA DIÁRIO E MÁQUINA DE ESCREVER
-- ================================================

-- Execute este SQL no SQL Editor do Supabase para criar as tabelas

-- ================================================
-- TABELA FRIENDSHIPS (Amizades)
-- ================================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view friendships" ON friendships;
CREATE POLICY "Anyone can view friendships" ON friendships FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert friendships" ON friendships;
CREATE POLICY "Anyone can insert friendships" ON friendships FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete friendships" ON friendships;
CREATE POLICY "Anyone can delete friendships" ON friendships FOR DELETE USING (true);

-- ================================================
-- TABELA DM_MESSAGES (Mensagens Privadas)
-- ================================================
CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  type TEXT DEFAULT 'text',
  media TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_from_to ON dm_messages(from_user, to_user);
CREATE INDEX IF NOT EXISTS idx_dm_messages_to_from ON dm_messages(to_user, from_user);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at ON dm_messages(created_at ASC);

ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view dm_messages" ON dm_messages;
CREATE POLICY "Anyone can view dm_messages" ON dm_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert dm_messages" ON dm_messages;
CREATE POLICY "Anyone can insert dm_messages" ON dm_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete dm_messages" ON dm_messages;
CREATE POLICY "Anyone can delete dm_messages" ON dm_messages FOR DELETE USING (true);


CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  category TEXT DEFAULT 'pessoal',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_updated_at ON diary_entries(updated_at DESC);

-- ================================================
-- TABELA TYPEWRITER_SAVES (Máquina de Escrever)
-- ================================================
CREATE TABLE IF NOT EXISTS typewriter_saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  save_count INTEGER NOT NULL,
  time TEXT NOT NULL,
  status TEXT DEFAULT 'Salvo!',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_typewriter_saves_user_id ON typewriter_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_typewriter_saves_created_at ON typewriter_saves(created_at DESC);

-- ================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY)
-- ================================================

-- Habilitar RLS
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE typewriter_saves ENABLE ROW LEVEL SECURITY;

-- Políticas para diary_entries
DROP POLICY IF EXISTS "Users can view their own diary entries" ON diary_entries;
CREATE POLICY "Users can view their own diary entries"
  ON diary_entries FOR SELECT
  USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert their own diary entries" ON diary_entries;
CREATE POLICY "Users can insert their own diary entries"
  ON diary_entries FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can update their own diary entries" ON diary_entries;
CREATE POLICY "Users can update their own diary entries"
  ON diary_entries FOR UPDATE
  USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can delete their own diary entries" ON diary_entries;
CREATE POLICY "Users can delete their own diary entries"
  ON diary_entries FOR DELETE
  USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

-- Políticas para typewriter_saves
DROP POLICY IF EXISTS "Users can view their own typewriter saves" ON typewriter_saves;
CREATE POLICY "Users can view their own typewriter saves"
  ON typewriter_saves FOR SELECT
  USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can insert their own typewriter saves" ON typewriter_saves;
CREATE POLICY "Users can insert their own typewriter saves"
  ON typewriter_saves FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

-- ================================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABELA COMMUNITIES (Comunidades)
-- ================================================
CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  created_by TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_communities_updated_at ON communities(updated_at DESC);

-- ================================================
-- TABELA SERVERS (Servidores)
-- ================================================
CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  owner TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner);
CREATE INDEX IF NOT EXISTS idx_servers_updated_at ON servers(updated_at DESC);

-- ================================================
-- TABELA SERVER_CHANNELS (Canais de Servidor)
-- ================================================
CREATE TABLE IF NOT EXISTS server_channels (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_server_channels_server_id ON server_channels(server_id);

-- ================================================
-- POLÍTICAS DE SEGURANÇA PARA COMUNIDADES
-- ================================================
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view communities" ON communities;
CREATE POLICY "Anyone can view communities"
  ON communities FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert communities" ON communities;
CREATE POLICY "Anyone can insert communities"
  ON communities FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update communities" ON communities;
CREATE POLICY "Anyone can update communities"
  ON communities FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete communities" ON communities;
CREATE POLICY "Anyone can delete communities"
  ON communities FOR DELETE
  USING (true);

-- ================================================
-- POLÍTICAS DE SEGURANÇA PARA SERVIDORES
-- ================================================
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view servers" ON servers;
CREATE POLICY "Anyone can view servers"
  ON servers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert servers" ON servers;
CREATE POLICY "Anyone can insert servers"
  ON servers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update servers" ON servers;
CREATE POLICY "Anyone can update servers"
  ON servers FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete servers" ON servers;
CREATE POLICY "Anyone can delete servers"
  ON servers FOR DELETE
  USING (true);

-- ================================================
-- POLÍTICAS DE SEGURANÇA PARA CANAIS
-- ================================================
ALTER TABLE server_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view server channels" ON server_channels;
CREATE POLICY "Anyone can view server channels"
  ON server_channels FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert server channels" ON server_channels;
CREATE POLICY "Anyone can insert server channels"
  ON server_channels FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update server channels" ON server_channels;
CREATE POLICY "Anyone can update server channels"
  ON server_channels FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete server channels" ON server_channels;
CREATE POLICY "Anyone can delete server channels"
  ON server_channels FOR DELETE
  USING (true);

-- ================================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- ================================================
DROP TRIGGER IF EXISTS update_communities_updated_at ON communities;
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_servers_updated_at ON servers;
CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON servers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABELA SHORTS (Shorts/Reels)
-- ================================================
CREATE TABLE IF NOT EXISTS shorts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image',
  username TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_shorts_username ON shorts(username);
CREATE INDEX IF NOT EXISTS idx_shorts_created_at ON shorts(created_at DESC);

-- ================================================
-- POLÍTICAS DE SEGURANÇA PARA SHORTS
-- ================================================
ALTER TABLE shorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view shorts" ON shorts;
CREATE POLICY "Anyone can view shorts" ON shorts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert shorts" ON shorts;
CREATE POLICY "Anyone can insert shorts" ON shorts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update shorts" ON shorts;
CREATE POLICY "Anyone can update shorts" ON shorts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete shorts" ON shorts;
CREATE POLICY "Anyone can delete shorts" ON shorts FOR DELETE USING (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_shorts_updated_at ON shorts;
CREATE TRIGGER update_shorts_updated_at
  BEFORE UPDATE ON shorts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ================================================
-- MIGRAÇÃO: Normalizar usernames para minúsculas na tabela friendships
-- Execute este bloco UMA VEZ para corrigir registros existentes com maiúsculas
-- ================================================

-- Atualiza registros existentes para lowercase
UPDATE friendships SET user_a = LOWER(user_a), user_b = LOWER(user_b);

-- Remove duplicatas que possam ter surgido após normalização
-- (mantém o registro mais antigo)
DELETE FROM friendships a USING friendships b
WHERE a.id > b.id
  AND a.user_a = b.user_a
  AND a.user_b = b.user_b;

-- Adiciona política de UPDATE caso não exista
DROP POLICY IF EXISTS "Anyone can update friendships" ON friendships;
CREATE POLICY "Anyone can update friendships" ON friendships FOR UPDATE USING (true);
