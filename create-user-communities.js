/**
 * Script para criar as comunidades FNAF e Como Treinar Seu Dragão
 * Uso: node create-user-communities.js
 */

require('dotenv').config();
const database = require('./database');

async function createUserCommunities() {
  try {
    console.log('🔧 Criando comunidades FNAF e Como Treinar Seu Dragão...\n');

    // Comunidade FNAF
    await database.query(
      `INSERT INTO communities (name, description, icon, banner, owner_id, is_suggested, members_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'FNAF',
        'Comunidade dedicada aos fãs de Five Nights at Freddy\'s',
        'https://via.placeholder.com/150/FF0000/FFFFFF?text=FNAF',
        'https://via.placeholder.com/1200x400/FF0000/FFFFFF?text=Five+Nights+at+Freddy%27s',
        1,
        true,
        0,
        new Date().toISOString()
      ]
    );
    console.log('✅ Comunidade FNAF criada');

    // Comunidade Como Treinar Seu Dragão
    await database.query(
      `INSERT INTO communities (name, description, icon, banner, owner_id, is_suggested, members_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'Como Treinar Seu Dragão',
        'Comunidade dedicada aos fãs de Como Treinar Seu Dragão',
        'https://via.placeholder.com/150/00FF00/FFFFFF?text=Dragão',
        'https://via.placeholder.com/1200x400/00FF00/FFFFFF?text=Como+Treinar+Seu+Dragão',
        1,
        true,
        0,
        new Date().toISOString()
      ]
    );
    console.log('✅ Comunidade Como Treinar Seu Dragão criada');

    console.log('\n✅ Comunidades criadas com sucesso!');
    console.log('💡 Reinicie o servidor para carregar as novas comunidades sugeridas');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao criar comunidades:', err.message);
    process.exit(1);
  }
}

createUserCommunities();
