/**
 * Script para verificar duplicatas na tabela communities
 */

require('dotenv').config();
const database = require('./database');

async function checkDuplicates() {
  try {
    console.log('🔍 Verificando duplicatas na tabela communities...');

    // Verificar duplicatas por ID
    const idDuplicates = await database.query(`
      SELECT id, COUNT(*) as count
      FROM communities
      GROUP BY id
      HAVING COUNT(*) > 1
    `);

    if (idDuplicates.rows.length > 0) {
      console.log('⚠️ Encontradas duplicatas por ID:', idDuplicates.rows);
    } else {
      console.log('✅ Nenhuma duplicata por ID encontrada');
    }

    // Verificar duplicatas por nome
    const nameDuplicates = await database.query(`
      SELECT name, COUNT(*) as count
      FROM communities
      GROUP BY name
      HAVING COUNT(*) > 1
    `);

    if (nameDuplicates.rows.length > 0) {
      console.log('⚠️ Encontradas duplicatas por nome:', nameDuplicates.rows);
    } else {
      console.log('✅ Nenhuma duplicata por nome encontrada');
    }

    // Listar todas as comunidades sugeridas
    const suggestedCommunities = await database.query(`
      SELECT id, name, is_suggested FROM communities WHERE is_suggested = TRUE
    `);

    console.log('📋 Total de comunidades sugeridas:', suggestedCommunities.rows.length);
    console.log('📋 Lista de comunidades sugeridas:');
    suggestedCommunities.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Nome: ${row.name}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao verificar duplicatas:', err.message);
    console.error('❌ Stack trace:', err.stack);
    process.exit(1);
  }
}

checkDuplicates();
