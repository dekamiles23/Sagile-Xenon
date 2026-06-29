require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mescdtlvpqblhlqtvnlm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY não definida no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSuggestedCommunities() {
  try {
    console.log('🔧 Verificando tabela suggested_communities no Supabase...\n');

    const { data, error } = await supabase
      .from('suggested_communities')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar comunidades sugeridas:', error);
      console.error('   Código:', error.code);
      console.error('   Mensagem:', error.message);
      console.error('   Detalhes:', error.details);
      
      if (error.code === '42P01') {
        console.log('\n⚠️ A tabela suggested_communities NÃO EXISTE no banco de dados.');
        console.log('   Execute o SQL em create-suggested-communities-table.sql para criá-la.');
      } else if (error.code === '42501') {
        console.log('\n⚠️ Permissão negada (RLS pode estar bloqueando).');
        console.log('   Verifique as políticas RLS da tabela.');
      }
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('✅ Tabela existe, mas está vazia (0 comunidades sugeridas)');
    } else {
      console.log(`✅ Encontradas ${data.length} comunidades sugeridas:\n`);
      data.forEach((community, index) => {
        console.log(`${index + 1}. ID: ${community.id}`);
        console.log(`   Nome: ${community.name}`);
        console.log(`   Descrição: ${community.description || 'N/A'}`);
        console.log(`   Banner: ${community.banner_url ? 'Sim' : 'Não'}`);
        console.log(`   Icon: ${community.icon_url ? 'Sim' : 'Não'}`);
        console.log(`   Membros: ${community.members || 1}`);
        console.log(`   Adicionado por: ${community.added_by}`);
        console.log(`   Adicionado em: ${community.added_at}`);
        console.log('');
      });
    }

  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
  }
}

checkSuggestedCommunities();
