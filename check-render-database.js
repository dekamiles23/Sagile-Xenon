/**
 * Script para verificar dados no banco de dados do Render
 * Uso: node check-render-database.js
 * 
 * NOTA: Este script usa a DATABASE_URL do Render se estiver configurada no .env
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkRenderDatabase() {
  try {
    // URL do banco de dados do Render fornecida pelo usuário (URL completa)
    const renderDbUrl = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://sagile_xenon_banco_de_dados_user:0PFknAargPtNcNv9Ds59rlMTPFSvzbs7@dpg-d8qiifm7r5hc73f04300-a.oregon-postgres.render.com/sagile_xenon_banco_de_dados';

    console.log('🔧 Conectando ao banco de dados do Render...\n');

    const pool = new Pool({
      connectionString: renderDbUrl,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    console.log('✅ Conectado ao banco de dados do Render');

    // Verificar tabela communities
    console.log('\n📋 Tabela COMMUNITIES (Render):');
    const communitiesResult = await client.query(
      `SELECT id, name, description, icon, banner, is_suggested, created_at 
       FROM communities ORDER BY created_at DESC LIMIT 10`
    );
    
    if (communitiesResult.rows.length === 0) {
      console.log('   ⚠️ Nenhuma comunidade encontrada no Render');
    } else {
      console.log(`   ✅ Encontradas ${communitiesResult.rows.length} comunidades:`);
      communitiesResult.rows.forEach((row, index) => {
        const suggested = row.is_suggested ? '✅ Sugerida' : '❌ Normal';
        console.log(`   ${index + 1}. ID: ${row.id} | Nome: ${row.name} | ${suggested} | Ícone: ${row.icon}`);
      });
    }

    // Verificar comunidades sugeridas
    console.log('\n📋 Comunidades Sugeridas (is_suggested = TRUE) no Render:');
    const suggestedResult = await client.query(
      `SELECT id, name, description, icon, banner, created_at 
       FROM communities WHERE is_suggested = TRUE ORDER BY created_at DESC`
    );
    
    if (suggestedResult.rows.length === 0) {
      console.log('   ⚠️ Nenhuma comunidade sugerida encontrada no Render');
    } else {
      console.log(`   ✅ Encontradas ${suggestedResult.rows.length} comunidades sugeridas:`);
      suggestedResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id} | Nome: ${row.name} | Ícone: ${row.icon}`);
      });
    }

    // Verificar tabela reels
    console.log('\n📋 Tabela REELS (Render):');
    const reelsResult = await client.query(
      `SELECT id, title, description, file_url, username, created_at 
       FROM reels ORDER BY created_at DESC LIMIT 10`
    );
    
    if (reelsResult.rows.length === 0) {
      console.log('   ⚠️ Nenhum short/reel encontrado no Render');
    } else {
      console.log(`   ✅ Encontrados ${reelsResult.rows.length} shorts/reels:`);
      reelsResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id} | Título: ${row.title} | URL: ${row.file_url} | Usuário: ${row.username}`);
      });
    }

    await client.release();
    await pool.end();

    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao verificar banco de dados do Render:', err.message);
    process.exit(1);
  }
}

checkRenderDatabase();
