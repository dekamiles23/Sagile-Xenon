/**
 * Script para verificar se há comunidades salvas no data.json
 * Uso: node check-data-json-communities.js
 */

const fs = require('fs');
const path = require('path');

async function checkDataJsonCommunities() {
  try {
    console.log('🔧 Verificando comunidades no data.json...\n');

    const dataFile = path.join(__dirname, 'data.json');

    if (!fs.existsSync(dataFile)) {
      console.log('⚠️ Arquivo data.json não encontrado');
      process.exit(0);
    }

    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    console.log('📋 Estrutura do data.json:');
    console.log('   Chaves:', Object.keys(data));

    // Verificar se há comunidades no data.json
    if (data.communities) {
      console.log(`\n📋 Comunidades no data.json (${data.communities.length} total):`);
      data.communities.forEach((comm, index) => {
        const suggested = comm.isSuggested ? '✅ Sugerida' : '❌ Normal';
        console.log(`   ${index + 1}. ${comm.name} | ${suggested} | ID: ${comm.id}`);
      });
    } else {
      console.log('\n⚠️ Nenhuma comunidade encontrada no data.json');
    }

    // Verificar se há comunidades sugeridas no data.json
    if (data.suggestedCommunities) {
      console.log(`\n📋 Comunidades Sugeridas no data.json (${data.suggestedCommunities.length} total):`);
      data.suggestedCommunities.forEach((comm, index) => {
        console.log(`   ${index + 1}. ${comm.name} | ID: ${comm.id}`);
      });
    } else {
      console.log('\n⚠️ Nenhuma comunidade sugerida encontrada no data.json');
    }

    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao verificar data.json:', err.message);
    process.exit(1);
  }
}

checkDataJsonCommunities();
