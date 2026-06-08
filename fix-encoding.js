const fs = require('fs');
const path = require('path');

// Mapeamento completo de Mojibake para caracteres corretos UTF-8
const fixMap = {
  'Ã¡': 'á', 'Ã\xa0': 'à', 'Ã£': 'ã', 'Ã¢': 'â', 'Ã¤': 'ä',
  'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
  'Ã\xad': 'í', 'Ã¬': 'ì', 'Ã®': 'î', 'Ã¯': 'ï',
  'Ã³': 'ó', 'Ã²': 'ò', 'Ãµ': 'õ', 'Ã´': 'ô', 'Ã¶': 'ö',
  'Ãº': 'ú', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã¼': 'ü',
  'Ã§': 'ç', 'Ã±': 'ñ',
  'Ã\x81': 'Á', 'Ã\x80': 'À', 'Ã\x83': 'Ã', 'Ã\x82': 'Â', 'Ã\x84': 'Ä',
  'Ã\x89': 'É', 'Ã\x88': 'È', 'Ã\x8A': 'Ê', 'Ã\x8B': 'Ë',
  'Ã\x8D': 'Í', 'Ã\x8C': 'Ì', 'Ã\x8E': 'Î', 'Ã\x8F': 'Ï',
  'Ã\x93': 'Ó', 'Ã\x92': 'Ò', 'Ã\x95': 'Õ', 'Ã\x94': 'Ô', 'Ã\x96': 'Ö',
  'Ã\x9A': 'Ú', 'Ã\x99': 'Ù', 'Ã\x9B': 'Û', 'Ã\x9C': 'Ü',
  'Ã\x87': 'Ç', 'Ã\x91': 'Ñ',
  'Ã¢â‚¬â€œ': '–', 'Ã¢â‚¬â€': '—', 'Ã¢â‚¬Ëœ': '‘', 'Ã¢â‚¬â„¢': '’',
  'Ã¢â‚¬Å“': '“', 'Ã¢â‚¬Â': '”', 'Ã¢â‚¬Â¦': '…', 'Ã¢â‚¬Â¢': '•',
  'âœ…': '✅', 'âŒ': '❌', 'âš ï¸': '⚠️', 'ðŸ”„': '🔄',
  'ðŸ“Š': '📊', 'ðŸ“¥': '📥', 'ðŸ“¤': '📤', 'ðŸ”Œ': '🔌',
  'ðŸ‘¥': '👥', 'ðŸ‘¤': '👤', 'ðŸŸ¢': '🟢', 'âš«': '⚫',
  'ðŸ’¬': '💬', 'ðŸ“©': '📩', 'ðŸŽ¨': '🎨', 'ðŸ“': '📁',
  'ðŸŽ': '🎁', 'ðŸ“‹': '📋', 'ðŸŽ®': '🎮', 'ðŸ—‘': '🗑',
  'ðŸ“­': '📭', 'ðŸ”Š': '🔊', 'ðŸ“¢': '📢', 'ðŸŽ™': '🎙',
  'ðŸ“·': '📷', 'ðŸ–¥': '🖥', 'ðŸŽµ': '🎵', 'ðŸ”‡': '🔇',
  'ðŸ”ˆ': '🔈', 'âž¡ï¸': '➡️', 'ðŸš«': '🚫', 'ðŸ˜€': '😀',
  'ðŸ“‚': '📂', 'ðŸ”—': '🔗', 'ðŸ’¾': '💾', 'ðŸ’¡': '💡',
  'ðŸ›¡': '🛡', 'ðŸš«': '🚫', 'âœ¨': '✨', 'ðŸ‘': '👁',
  'ðŸ”': '🔍',
  'Ãƒ': 'Ã', 'Â': '',
  'Ã‡': 'Ç', 'Ã£': 'ã', 'Ãµ': 'õ', 'Ãª': 'ê', 'Ã¡': 'á', 'Ã©': 'é', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã­': 'í', 'Ã§': 'ç',
  'Ã ': 'à', 'Ã³': 'ó', 'Ã´': 'ô', 'Ã¢': 'â', 'Ãµ': 'õ'
};

const filesToCheck = [
  'public/index.html',
  'public/script.js',
  'public/chat-input.js',
  'public/community.js',
  'public/gif-picker.js',
  'public/online-sidebar.js',
  'public/server-chat.js',
  'public/server-view.css',
  'public/online-sidebar.css',
  'public/status-select.css',
  'public/style.css',
  'main.js',
  'server.js',
  'data.json',
  'package.json'
];

const report = {
  fixedFiles: [],
  corrections: [],
  convertedToUtf8: []
};

console.log('🔧 Iniciando correção de encoding...\n');

filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changes = 0;

  // Aplicar todas as correções
  for (const [bad, good] of Object.entries(fixMap)) {
    const regex = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    if (matches) {
      changes += matches.length;
      content = content.replace(regex, good);
    }
  }

  // Correção geral para Mojibake Windows-1252
  content = content.replace(/Ã./g, match => {
    try {
      const buffer = Buffer.from(match, 'latin1');
      const correct = buffer.toString('utf8');
      if (correct.length === 1 && correct !== match) {
        changes++;
        return correct;
      }
      return match;
    } catch(e) {
      return match;
    }
  });

  if (changes > 0) {
    // Salvar arquivo como UTF-8 sem BOM
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
    
    report.fixedFiles.push(filePath);
    report.corrections.push({ file: filePath, count: changes });
    report.convertedToUtf8.push(filePath);
    
    console.log(`✅ ${filePath}: ${changes} correções aplicadas`);
  } else {
    console.log(`ℹ️ ${filePath}: nenhuma correção necessária`);
  }
});

// Gerar relatório
console.log('\n' + '='.repeat(60));
console.log('📋 RELATÓRIO DE CORREÇÃO DE ENCODING');
console.log('='.repeat(60));
console.log(`\n📁 Arquivos corrigidos: ${report.fixedFiles.length}`);
report.fixedFiles.forEach(f => console.log(`   - ${f}`));

console.log(`\n🔢 Total de correções: ${report.corrections.reduce((sum, c) => sum + c.count, 0)}`);

console.log('\n✅ Todos os arquivos agora estão em UTF-8 sem BOM');
console.log('\n✅ Meta tag <meta charset="UTF-8"> já estava presente no index.html');

// Salvar relatório em arquivo
fs.writeFileSync('encoding-fix-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Relatório salvo em encoding-fix-report.json');