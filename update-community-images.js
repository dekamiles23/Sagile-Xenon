/**
 * Script para atualizar as comunidades FNAF e Como Treinar Seu Dragão
 * Removendo imagens placeholder que não estão funcionando
 * Uso: node update-community-images.js
 */

require('dotenv').config();
const database = require('./database');

async function updateCommunityImages() {
  try {
    console.log('🔧 Atualizando imagens das comunidades...\n');

    // Atualizar FNAF
    await database.query(
      `UPDATE communities SET icon = '', banner = '' WHERE name = $1`,
      ['FNAF']
    );
    console.log('✅ Comunidade FNAF atualizada (imagens removidas)');

    // Atualizar Como Treinar Seu Dragão
    await database.query(
      `UPDATE communities SET icon = '', banner = '' WHERE name = $1`,
      ['Como Treinar Seu Dragão']
    );
    console.log('✅ Comunidade Como Treinar Seu Dragão atualizada (imagens removidas)');

    console.log('\n✅ Atualização concluída!');
    console.log('💡 Reinicie o servidor para carregar as comunidades atualizadas');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao atualizar comunidades:', err.message);
    process.exit(1);
  }
}

updateCommunityImages();
