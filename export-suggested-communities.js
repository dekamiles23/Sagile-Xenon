/**
 * Script para exportar comunidades sugeridas do banco de dados atual
 * Uso: node export-suggested-communities.js
 * 
 * Este script exporta as comunidades sugeridas para um arquivo JSON
 * que pode ser importado em outro banco de dados.
 */

require('dotenv').config();
const database = require('./database');
const fs = require('fs');
const path = require('path');

async function exportSuggestedCommunities() {
  try {
    console.log('🔧 Exportando comunidades sugeridas do banco de dados...\n');

    // Buscar comunidades sugeridas
    const result = await database.query(
      `SELECT id, name, description, icon, banner, owner_id, is_suggested, members_count, created_at
       FROM communities WHERE is_suggested = TRUE ORDER BY created_at DESC`
    );

    if (result.rows.length === 0) {
      console.log('⚠️ Nenhuma comunidade sugerida encontrada no banco de dados');
      process.exit(0);
    }

    console.log(`📋 Encontradas ${result.rows.length} comunidades sugeridas`);

    // Converter para formato JSON
    const communities = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      banner: row.banner,
      ownerId: row.owner_id,
      isSuggested: row.is_suggested,
      members: row.members_count || 0,
      createdAt: row.created_at
    }));

    // Salvar em arquivo JSON
    const exportFile = path.join(__dirname, 'suggested-communities-export.json');
    fs.writeFileSync(exportFile, JSON.stringify(communities, null, 2), 'utf8');

    console.log(`✅ Exportado para: ${exportFile}`);
    console.log(`📋 Total de comunidades: ${communities.length}`);

    communities.forEach((comm, index) => {
      console.log(`   ${index + 1}. ${comm.name} (ID: ${comm.id})`);
    });

    console.log('\n💡 Para importar em outro banco de dados, use o script import-suggested-communities.js');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao exportar comunidades:', err.message);
    process.exit(1);
  }
}

exportSuggestedCommunities();
