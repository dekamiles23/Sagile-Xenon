/**
 * Script para marcar comunidades como sugeridas
 * Uso: node update-suggested-communities.js
 */

require('dotenv').config();
const database = require('./database');

async function updateSuggestedCommunities() {
  try {
    console.log('🔧 Verificando comunidades no banco...\n');

    // Listar todas as comunidades existentes
    const allCommunities = await database.query(
      'SELECT id, name, is_suggested FROM communities ORDER BY id'
    );

    if (allCommunities.rows.length === 0) {
      console.log('⚠️ Nenhuma comunidade encontrada. Criando comunidades de exemplo...\n');

      // Criar comunidades de exemplo
      const exampleCommunities = [
        {
          name: 'Comunidade Oficial',
          description: 'Comunidade oficial do Sagile Xenon',
          icon: 'https://via.placeholder.com/150',
          banner: 'https://via.placeholder.com/400x200',
          owner_id: 1,
          is_suggested: true,
          members_count: 100
        },
        {
          name: 'Gamers BR',
          description: 'Comunidade para gamers brasileiros',
          icon: 'https://via.placeholder.com/150',
          banner: 'https://via.placeholder.com/400x200',
          owner_id: 1,
          is_suggested: true,
          members_count: 50
        },
        {
          name: 'Dev Talk',
          description: 'Discussões sobre desenvolvimento',
          icon: 'https://via.placeholder.com/150',
          banner: 'https://via.placeholder.com/400x200',
          owner_id: 1,
          is_suggested: true,
          members_count: 75
        }
      ];

      for (const comm of exampleCommunities) {
        await database.query(
          `INSERT INTO communities (name, description, icon, banner, owner_id, is_suggested, members_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [comm.name, comm.description, comm.icon, comm.banner, comm.owner_id, comm.is_suggested, comm.members_count]
        );
        console.log(`✅ Criada: ${comm.name}`);
      }

      console.log('\n📋 Comunidades de exemplo criadas com sucesso!');
    } else {
      console.log(`📋 Encontradas ${allCommunities.rows.length} comunidades:\n`);
      allCommunities.rows.forEach(row => {
        const status = row.is_suggested ? '✅ Sugerida' : '❌ Normal';
        console.log(`   ID: ${row.id} | ${row.name} | ${status}`);
      });

      // Marcar todas as comunidades como sugeridas
      console.log('\n🔧 Marcando todas as comunidades como sugeridas...\n');
      await database.query('UPDATE communities SET is_suggested = TRUE');
      console.log('✅ Todas as comunidades marcadas como sugeridas!');
    }

    // Listar comunidades sugeridas
    const suggested = await database.query(
      'SELECT id, name, is_suggested FROM communities WHERE is_suggested = TRUE'
    );

    console.log(`\n📋 Total de comunidades sugeridas: ${suggested.rows.length}`);
    suggested.rows.forEach(row => {
      console.log(`   ID: ${row.id} | Nome: ${row.name}`);
    });

    console.log('\n✅ Script concluído!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao executar script:', err.message);
    process.exit(1);
  }
}

updateSuggestedCommunities();
