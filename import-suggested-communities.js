/**
 * Script para importar comunidades sugeridas de um arquivo JSON
 * Uso: node import-suggested-communities.js
 * 
 * Este script importa comunidades sugeridas de suggested-communities-export.json
 * para o banco de dados atual.
 */

require('dotenv').config();
const database = require('./database');
const fs = require('fs');
const path = require('path');

async function importSuggestedCommunities() {
  try {
    console.log('🔧 Importando comunidades sugeridas do arquivo JSON...\n');

    const importFile = path.join(__dirname, 'suggested-communities-export.json');

    if (!fs.existsSync(importFile)) {
      console.log('⚠️ Arquivo suggested-communities-export.json não encontrado');
      console.log('💡 Execute node export-suggested-communities.js primeiro para criar o arquivo');
      process.exit(0);
    }

    const data = fs.readFileSync(importFile, 'utf8');
    const communities = JSON.parse(data);

    console.log(`📋 Encontradas ${communities.length} comunidades no arquivo`);

    let imported = 0;
    let skipped = 0;

    for (const comm of communities) {
      try {
        // Verificar se a comunidade já existe
        const existing = await database.query(
          'SELECT id FROM communities WHERE name = $1',
          [comm.name]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  Comunidade "${comm.name}" já existe, pulando...`);
          skipped++;
          continue;
        }

        // Inserir comunidade
        await database.query(
          `INSERT INTO communities (name, description, icon, banner, owner_id, is_suggested, members_count, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            comm.name,
            comm.description,
            comm.icon,
            comm.banner,
            comm.ownerId,
            true,
            comm.members || 0,
            comm.createdAt || new Date().toISOString()
          ]
        );
        console.log(`✅ Comunidade "${comm.name}" importada`);
        imported++;
      } catch (err) {
        console.error(`❌ Erro ao importar comunidade "${comm.name}":`, err.message);
      }
    }

    console.log(`\n✅ Importação concluída!`);
    console.log(`📋 Importadas: ${imported}`);
    console.log(`📋 Puladas: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao importar comunidades:', err.message);
    process.exit(1);
  }
}

importSuggestedCommunities();
