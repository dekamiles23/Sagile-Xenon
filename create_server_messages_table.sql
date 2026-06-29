-- ================================================
-- Tabela para armazenar mensagens de canais de servidor
-- ================================================

CREATE TABLE IF NOT EXISTS server_messages (
  id TEXT PRIMARY KEY,
  server_id TEXT,
  channel TEXT NOT NULL DEFAULT 'geral',
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  avatar TEXT,
  type TEXT NOT NULL DEFAULT 'text',
  media TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_server_messages_server_channel ON server_messages(server_id, channel);
CREATE INDEX IF NOT EXISTS idx_server_messages_created_at ON server_messages(created_at DESC);

-- Habilitar RLS (Row Level Security) - opcional, depende da política de segurança
ALTER TABLE server_messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (ajustar conforme necessário)
CREATE POLICY "Allow public read access" ON server_messages
  FOR SELECT
  USING (true);

-- Política para permitir inserção pública (ajustar conforme necessário)
CREATE POLICY "Allow public insert" ON server_messages
  FOR INSERT
  WITH CHECK (true);
