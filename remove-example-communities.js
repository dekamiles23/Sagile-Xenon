/**
 * Script para remover comunidades de exemplo (Dev Talk, Gamers BR, Comunidade Oficial)
 * Uso: node remove-example-communities.js
 */

require('dotenv').config();
const database = require('./database');

async function removeExampleCommunities() {
  try {
    console.log('🔧 Removendo comunidades de exemplo...\n');

    // Remover comunidades de exemplo por nome
    const exampleCommunities = ['Dev Talk', 'Gamers BR', 'Comunidade Oficial'];

    for (const name of exampleCommunities) {
      try {
        const result = await database.query(
          'DELETE FROM communities WHERE name = $1 RETURNING id',
          [name]
        );

        if (result.rows.length > 0) {
          console.log(`✅ Comunidade "${name}" removida (ID: ${result.rows[0].id})`);
        } else {
          console.log(`⚠️ Comunidade "${name}" não encontrada`);
        }
      } catch (err) {
        console.error(`❌ Erro ao remover comunidade "${name}":`, err.message);
      }
    }

    console.log('\n✅ Remoção concluída!');
    console.log('💡 Reinicie o servidor para carregar as comunidades atualizadas');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao remover comunidades:', err.message);
    process.exit(1);
  }
}

removeExampleCommunities();
