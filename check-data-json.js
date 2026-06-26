/**
 * Script para verificar comunidades no arquivo data.json local
 * Uso: node check-data-json.js
 */

const fs = require('fs');
const path = require('path');

async function checkDataJson() {
  try {
    console.log('🔧 Verificando arquivo data.json local...\n');

    const dataFile = path.join(__dirname, 'data.json');

    if (!fs.existsSync(dataFile)) {
      console.log('⚠️ Arquivo data.json não encontrado');
      process.exit(0);
    }

    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    console.log('📋 Estrutura do data.json:');
    console.log('   Chaves:', Object.keys(data));

    // Verificar comunidades
    if (data.communities) {
      console.log(`\n📋 Comunidades no data.json (${data.communities.length} total):`);
      data.communities.forEach((comm, index) => {
        const suggested = comm.isSuggested ? '✅ Sugerida' : '❌ Normal';
        console.log(`   ${index + 1}. ${comm.name} | ${suggested}`);
      });

      // Filtrar comunidades sugeridas
      const suggested = data.communities.filter(c => c.isSuggested);
      console.log(`\n📋 Comunidades Sugeridas no data.json (${suggested.length} total):`);
      suggested.forEach((comm, index) => {
        console.log(`   ${index + 1}. ${comm.name}`);
      });
    }

    // Verificar shorts
    if (data.shorts) {
      console.log(`\n📋 Shorts no data.json (${data.shorts.length} total):`);
      data.shorts.forEach((short, index) => {
        console.log(`   ${index + 1}. ${short.title} | ${short.file_url}`);
      });
    }

    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao verificar data.json:', err.message);
    process.exit(1);
  }
}

checkDataJson();
