/**
 * Script para sincronizar shorts do Supabase Storage para o banco de dados Neon
 * Uso: node sync-shorts-from-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const database = require('./database');

const supabase = createClient(
  'https://mescdtlvpqblhlqtvnlm.supabase.co',
  'sb_secret_GEsYmczQKJip2Ejvj7N06A_WFHHjXRq'
);

const SUPABASE_BUCKET = 'Xenon';

async function syncShortsFromSupabase() {
  try {
    console.log('🔧 Sincronizando shorts do Supabase Storage para Neon...\n');

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

    console.log(`📋 Encontrados ${files.length} arquivos no Supabase Storage`);

    // Filtrar apenas arquivos de shorts (começam com 'short_')
    const shortFiles = files.filter(f => f.name.startsWith('short_'));
    console.log(`📋 ${shortFiles.length} arquivos são shorts`);

    // Verificar quais shorts já estão no banco de dados
    const existingShorts = await database.query(
      `SELECT id FROM reels WHERE id IN (${shortFiles.map(f => `'${f.name.split('_')[1]}'`).join(',')})`
    );
    const existingIds = new Set(existingShorts.rows.map(r => r.id));

    console.log(`📋 ${existingIds.size} shorts já estão no banco de dados`);

    // Inserir shorts que não estão no banco
    let inserted = 0;
    for (const file of shortFiles) {
      const shortId = file.name.split('_')[1];
      
      if (existingIds.has(shortId)) {
        console.log(`⏭️  Short ${shortId} já existe no banco, pulando...`);
        continue;
      }

      const publicUrl = `https://mescdtlvpqblhlqtvnlm.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET}/${file.name}`;
      
      try {
        await database.query(
          `INSERT INTO reels (id, title, description, file_type, file_url, username, views, likes, timestamp, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            shortId,
            'Short do Supabase',
            'Short sincronizado do Supabase Storage',
            file.name.endsWith('.png') ? 'image/png' : 'image/jpeg',
            publicUrl,
            'Miles Deka',
            0,
            0,
            Date.now(),
            new Date().toISOString()
          ]
        );
        console.log(`✅ Short ${shortId} inserido no banco de dados`);
        inserted++;
      } catch (err) {
        console.error(`❌ Erro ao inserir short ${shortId}:`, err.message);
      }
    }

    console.log(`\n✅ Sincronização concluída! ${inserted} shorts novos inseridos no banco de dados`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao sincronizar shorts:', err.message);
    process.exit(1);
  }
}

syncShortsFromSupabase();
