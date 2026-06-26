const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  console.log('\nProcessando: ' + filePath);

  // Ler o arquivo como latin1 (byte a byte)
  const rawLatin1 = fs.readFileSync(filePath, 'latin1');

  // Reinterpretar os bytes como UTF-8
  const buf = Buffer.from(rawLatin1, 'latin1');
  const fixedUtf8 = buf.toString('utf8');

  // Se gerou caracteres de substituição, o arquivo já estava correto em UTF-8
  if (fixedUtf8.includes('\uFFFD')) {
    console.log('  -> Arquivo ja esta em UTF-8 correto, nenhuma alteracao necessaria.');
    return 0;
  }

  // Ler novamente como UTF-8 para comparar
  const originalUtf8 = fs.readFileSync(filePath, 'utf8');

  if (originalUtf8 === fixedUtf8) {
    console.log('  -> Nenhuma diferenca encontrada, arquivo ja correto.');
    return 0;
  }

  // Contar quantos chars mudaram (aproximacao)
  let changed = 0;
  for (let i = 0; i < Math.min(originalUtf8.length, fixedUtf8.length); i++) {
    if (originalUtf8[i] !== fixedUtf8[i]) changed++;
  }

  fs.writeFileSync(filePath, fixedUtf8, 'utf8');
  console.log('  -> Corrigido! ~' + changed + ' posicoes de caracteres alteradas.');
  return changed;
}

const baseDir = 'c:\\Users\\Pichau\\Documents\\PROJETO ZX\\sagile-xenon';

const files = [
  'public\\index.html',
  'public\\script.js',
];

let total = 0;
for (const f of files) {
  const full = path.join(baseDir, f);
  if (fs.existsSync(full)) {
    total += fixFile(full);
  } else {
    console.log('\nNao encontrado: ' + full);
  }
}

console.log('\n=== Concluido. Total de posicoes alteradas: ' + total + ' ===');
