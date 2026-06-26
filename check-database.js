/**
 * Script para verificar dados no Neon database
 * Uso: node check-database.js
 */

require('dotenv').config();
const database = require('./database');

async function checkDatabase() {
  try {
    console.log('🔧 Verificando dados no banco de dados Neon...\n');

    // Verificar tabela reels (shorts)
    console.log('📋 Tabela REELS (Shorts/Reels):');
    const reelsResult = await database.query(
      `SELECT id, title, description, file_url, username, created_at 
       FROM reels ORDER BY created_at DESC LIMIT 10`
    );
    
    if (reelsResult.rows.length === 0) {
      console.log('   ⚠️ Nenhum short/reel encontrado na tabela reels');
    } else {
      console.log(`   ✅ Encontrados ${reelsResult.rows.length} shorts/reels:`);
      reelsResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id} | Título: ${row.title} | URL: ${row.file_url} | Usuário: ${row.username}`);
      });
    }

    console.log('\n📋 Tabela COMMUNITIES (Comunidades):');
    const communitiesResult = await database.query(
      `SELECT id, name, description, icon, banner, is_suggested, created_at 
       FROM communities ORDER BY created_at DESC LIMIT 10`
    );
    
    if (communitiesResult.rows.length === 0) {
      console.log('   ⚠️ Nenhuma comunidade encontrada na tabela communities');
    } else {
      console.log(`   ✅ Encontradas ${communitiesResult.rows.length} comunidades:`);
      communitiesResult.rows.forEach((row, index) => {
        const suggested = row.is_suggested ? '✅ Sugerida' : '❌ Normal';
        console.log(`   ${index + 1}. ID: ${row.id} | Nome: ${row.name} | ${suggested} | Ícone: ${row.icon}`);
      });
    }

    console.log('\n📋 Comunidades Sugeridas (is_suggested = TRUE):');
    const suggestedResult = await database.query(
      `SELECT id, name, description, icon, banner, created_at 
       FROM communities WHERE is_suggested = TRUE ORDER BY created_at DESC`
    );
    
    if (suggestedResult.rows.length === 0) {
      console.log('   ⚠️ Nenhuma comunidade sugerida encontrada');
    } else {
      console.log(`   ✅ Encontradas ${suggestedResult.rows.length} comunidades sugeridas:`);
      suggestedResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id} | Nome: ${row.name} | Ícone: ${row.icon}`);
      });
    }

    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao verificar banco de dados:', err.message);
    process.exit(1);
  }
}

checkDatabase();
