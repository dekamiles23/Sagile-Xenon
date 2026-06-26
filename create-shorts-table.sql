-- ================================================
-- TABELA SHORTS (Shorts/Reels)
-- Execute este SQL separadamente no Supabase
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

-- Habilitar RLS
ALTER TABLE shorts ENABLE ROW LEVEL SECURITY;

-- Políticas
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
