/**
 * Script para corrigir a tabela communities
 * Altera id de INTEGER para VARCHAR e owner_id de INTEGER para VARCHAR
 */

require('dotenv').config();
const database = require('./database');

async function fixCommunitiesTable() {
  try {
    console.log('🔧 Iniciando correção da tabela communities...');

    // Verificar se a coluna id é INTEGER
    const columnCheck = await database.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'communities' AND column_name = 'id'
    `);

    if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'integer') {
      console.log('🔧 [MIGRATION] Alterando coluna id de INTEGER para VARCHAR...');
      
      // Criar nova coluna temporária
      await database.query('ALTER TABLE communities ADD COLUMN IF NOT EXISTS id_new VARCHAR(50)');
      
      // Copiar dados convertendo para string
      await database.query('UPDATE communities SET id_new = id::text');
      
      // Drop da constraint primary key
      try {
        await database.query('ALTER TABLE communities DROP CONSTRAINT communities_pkey');
      } catch (e) {
        console.log('ℹ️ [MIGRATION] Não foi possível dropar a constraint (pode não existir)');
      }
      
      // Drop da coluna antiga
      await database.query('ALTER TABLE communities DROP COLUMN id');
      
      // Renomear a nova coluna
      await database.query('ALTER TABLE communities RENAME COLUMN id_new TO id');
      
      // Recriar a primary key
      await database.query('ALTER TABLE communities ADD PRIMARY KEY (id)');
      
      console.log('✅ [MIGRATION] Coluna id alterada para VARCHAR com sucesso');
    } else {
      console.log('ℹ️ [MIGRATION] Coluna id já é VARCHAR ou não existe');
    }

    // Alterar coluna owner_id de INTEGER para VARCHAR se necessário
    const ownerCheck = await database.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'communities' AND column_name = 'owner_id'
    `);

    if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].data_type === 'integer') {
      console.log('🔧 [MIGRATION] Alterando coluna owner_id de INTEGER para VARCHAR...');
      await database.query('ALTER TABLE communities ALTER COLUMN owner_id TYPE VARCHAR(50) USING owner_id::text');
      console.log('✅ [MIGRATION] Coluna owner_id alterada para VARCHAR com sucesso');
    } else {
      console.log('ℹ️ [MIGRATION] Coluna owner_id já é VARCHAR ou não existe');
    }

    // Alterar coluna community_id em community_members de INTEGER para VARCHAR se necessário
    const commMemberCheck = await database.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'community_members' AND column_name = 'community_id'
    `);

    if (commMemberCheck.rows.length > 0 && commMemberCheck.rows[0].data_type === 'integer') {
      console.log('🔧 [MIGRATION] Alterando coluna community_id em community_members de INTEGER para VARCHAR...');
      await database.query('ALTER TABLE community_members ALTER COLUMN community_id TYPE VARCHAR(50) USING community_id::text');
      console.log('✅ [MIGRATION] Coluna community_id alterada para VARCHAR com sucesso');
    } else {
      console.log('ℹ️ [MIGRATION] Coluna community_id já é VARCHAR ou não existe');
    }

    console.log('✅ Correção da tabela communities concluída com sucesso!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Erro na correção da tabela communities:', err.message);
    console.error('❌ Stack trace:', err.stack);
    process.exit(1);
  }
}

fixCommunitiesTable();
