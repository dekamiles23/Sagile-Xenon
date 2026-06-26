/**
 * Script para verificar arquivos no Supabase Storage
 * Uso: node check-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mescdtlvpqblhlqtvnlm.supabase.co',
  'sb_secret_GEsYmczQKJip2Ejvj7N06A_WFHHjXRq'
);

const SUPABASE_BUCKET = 'Xenon';

async function checkSupabaseStorage() {
  try {
    console.log('🔧 Verificando arquivos no Supabase Storage...\n');

    // Listar todos os arquivos no bucket
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Erro ao listar buckets:', error.message);
      process.exit(1);
    }

    console.log(`📋 Buckets encontrados: ${data.map(b => b.name).join(', ')}`);

    // Verificar se o bucket Xenon existe
    const xenonBucket = data.find(b => b.name === SUPABASE_BUCKET);
    if (!xenonBucket) {
      console.log(`⚠️ Bucket ${SUPABASE_BUCKET} não encontrado`);
      process.exit(0);
    }

    console.log(`\n📋 Arquivos no bucket ${SUPABASE_BUCKET}:`);

    // Listar arquivos no bucket Xenon
    const { data: files, error: filesError } = await supabase.storage.from(SUPABASE_BUCKET).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'asc' }
    });

    if (filesError) {
      console.error('❌ Erro ao listar arquivos:', filesError.message);
      process.exit(1);
    }

    if (files.length === 0) {
      console.log('   ⚠️ Nenhum arquivo encontrado no bucket');
    } else {
      console.log(`   ✅ Encontrados ${files.length} arquivos:`);
      files.forEach((file, index) => {
        console.log(`   ${index + 1}. Nome: ${file.name} | Tamanho: ${file.metadata?.size || 'N/A'} bytes | Tipo: ${file.metadata?.mimetype || 'N/A'}`);
      });
    }

    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao verificar Supabase Storage:', err.message);
    process.exit(1);
  }
}

checkSupabaseStorage();
