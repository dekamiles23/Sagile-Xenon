/**
 * setup-suggested-communities-table.js
 * Executa o SQL para criar a tabela suggested_communities no Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mescdtlvpqblhlqtvnlm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY não encontrado no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupTable() {
  console.log('🔧 Configurando tabela suggested_communities no Supabase...');

  try {
    // Criar a tabela
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (createError) {
      console.error('❌ Erro ao criar tabela:', createError);
      return;
    }

    console.log('✅ Tabela suggested_communities criada com sucesso');

    // Criar índice
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_suggested_communities_added_at 
        ON suggested_communities(added_at DESC);
      `
    });

    if (indexError) {
      console.error('⚠️ Erro ao criar índice (não crítico):', indexError);
    } else {
      console.log('✅ Índice criado com sucesso');
    }

    // Criar função de trigger
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    });

    if (funcError) {
      console.error('⚠️ Erro ao criar função (não crítico):', funcError);
    } else {
      console.log('✅ Função de trigger criada com sucesso');
    }

    // Criar trigger
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS update_suggested_communities_updated_at ON suggested_communities;
        CREATE TRIGGER update_suggested_communities_updated_at
          BEFORE UPDATE ON suggested_communities
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });

    if (triggerError) {
      console.error('⚠️ Erro ao criar trigger (não crítico):', triggerError);
    } else {
      console.log('✅ Trigger criado com sucesso');
    }

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('A tabela suggested_communities está pronta para uso.');

  } catch (err) {
    console.error('❌ Erro durante a configuração:', err.message);
    process.exit(1);
  }
}

// Executar
setupTable();
