-- ================================================
-- CRIAR TABELA DE COMUNIDADES SUGERIDAS
-- Execute este SQL no painel SQL do Supabase:
-- https://supabase.com/dashboard/project/mescdtlvpqblhlqtvnlm/sql
-- ================================================

-- Tabela para comunidades sugeridas globalmente
CREATE TABLE IF NOT EXISTS suggested_communities (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  banner_url text,
  icon_url text,
  members integer DEFAULT 1,
  added_by text NOT NULL,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_suggested_communities_added_at ON suggested_communities(added_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_suggested_communities_updated_at ON suggested_communities;
CREATE TRIGGER update_suggested_communities_updated_at
  BEFORE UPDATE ON suggested_communities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security) - opcional, descomente se precisar
-- ALTER TABLE suggested_communities ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (opcional)
-- CREATE POLICY "Public read access" ON suggested_communities
--   FOR SELECT USING (true);

-- Política para permitir inserção pública (opcional)
-- CREATE POLICY "Public insert access" ON suggested_communities
--   FOR INSERT WITH CHECK (true);

-- Política para permitir deletar público (opcional)
-- CREATE POLICY "Public delete access" ON suggested_communities
--   FOR DELETE USING (true);
