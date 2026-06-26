#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Mapa de double-encoding: sequencia corrompida -> caractere correto
// Origem: arquivo UTF-8 lido como latin1/windows-1252 e re-salvo, ou vice-versa
const FIXES = [
  // === LETRAS ACENTUADAS PORTUGUESAS ===
  ['\u00c3\u00a3', '\u00e3'], // ã
  ['\u00c3\u00a2', '\u00e2'], // â
  ['\u00c3\u00a1', '\u00e1'], // á
  ['\u00c3\u00a0', '\u00e0'], // à
  ['\u00c3\u00a4', '\u00e4'], // ä
  ['\u00c3\u00a7', '\u00e7'], // ç
  ['\u00c3\u00a9', '\u00e9'], // é
  ['\u00c3\u00aa', '\u00ea'], // ê
  ['\u00c3\u00a8', '\u00e8'], // è
  ['\u00c3\u00ad', '\u00ed'], // í
  ['\u00c3\u00ae', '\u00ee'], // î
  ['\u00c3\u00b3', '\u00f3'], // ó
  ['\u00c3\u00b4', '\u00f4'], // ô
  ['\u00c3\u00b5', '\u00f5'], // õ
  ['\u00c3\u00ba', '\u00fa'], // ú
  ['\u00c3\u00bb', '\u00fb'], // û
  ['\u00c3\u00b1', '\u00f1'], // ñ
  ['\u00c3\u00af', '\u00ef'], // ï
  ['\u00c3\u00bc', '\u00fc'], // ü
  ['\u00c3\u00bd', '\u00fd'], // ý
  ['\u00c3\u00b6', '\u00f6'], // ö
  ['\u00c3\u00b8', '\u00f8'], // ø
  ['\u00c3\u00a6', '\u00e6'], // æ
  ['\u00c3\u00a5', '\u00e5'], // å
  ['\u00c3\u00ab', '\u00eb'], // ë

  // Maiúsculas
  ['\u00c3\u0080', '\u00c0'], // À
  ['\u00c3\u0082', '\u00c2'], // Â
  ['\u00c3\u0083', '\u00c3'], // Ã
  ['\u00c3\u0087', '\u00c7'], // Ç
  ['\u00c3\u0089', '\u00c9'], // É
  ['\u00c3\u008a', '\u00ca'], // Ê
  ['\u00c3\u008c', '\u00cc'], // Ì
  ['\u00c3\u008d', '\u00cd'], // Í
  ['\u00c3\u0093', '\u00d3'], // Ó
  ['\u00c3\u0094', '\u00d4'], // Ô
  ['\u00c3\u0095', '\u00d5'], // Õ
  ['\u00c3\u009a', '\u00da'], // Ú
  ['\u00c3\u009c', '\u00dc'], // Ü
  ['\u00c3\u0097', '\u00d7'], // ×

  // === PONTUAÇÃO E SÍMBOLOS ===
  ['\u00c3\u00a3o', '\u00e3o'],   // ão (precisa vir antes do ã simples)
  ['\u00e2\u0080\u0099', '\u2019'], // '
  ['\u00e2\u0080\u0098', '\u2018'], // '
  ['\u00e2\u0080\u009c', '\u201c'], // "
  ['\u00e2\u0080\u009d', '\u201d'], // "
  ['\u00e2\u0080\u00a2', '\u2022'], // •
  ['\u00e2\u0080\u0093', '\u2013'], // –
  ['\u00e2\u0080\u0094', '\u2014'], // —
  ['\u00e2\u0080\u00a6', '\u2026'], // …
  ['\u00e2\u0098\u0085', '\u2605'], // ★
  ['\u00e2\u0098\u0086', '\u2606'], // ☆
  ['\u00e2\u009d\u00a4', '\u2764'], // ❤
  ['\u00e2\u009c\u0094', '\u2714'], // ✔
  ['\u00e2\u009c\u0097', '\u2717'], // ✗
  ['\u00e2\u0086\u0091', '\u2191'], // ↑
  ['\u00e2\u0086\u0093', '\u2193'], // ↓
  ['\u00e2\u0086\u0090', '\u2190'], // ←
  ['\u00e2\u0086\u0092', '\u2192'], // →

  ['\u00c2\u00ab', '\u00ab'], // «
  ['\u00c2\u00bb', '\u00bb'], // »
  ['\u00c2\u00b7', '\u00b7'], // ·
  ['\u00c2\u00b0', '\u00b0'], // °
  ['\u00c2\u00b2', '\u00b2'], // ²
  ['\u00c2\u00b3', '\u00b3'], // ³
  ['\u00c2\u00bd', '\u00bd'], // ½
  ['\u00c2\u00bc', '\u00bc'], // ¼
  ['\u00c2\u00be', '\u00be'], // ¾
  ['\u00c2\u00a3', '\u00a3'], // £
  ['\u00c2\u00a5', '\u00a5'], // ¥
  ['\u00c2\u00a9', '\u00a9'], // ©
  ['\u00c2\u00ae', '\u00ae'], // ®
  ['\u00c2\u00b1', '\u00b1'], // ±
  ['\u00c2\u00b5', '\u00b5'], // µ
  ['\u00c2\u00bf', '\u00bf'], // ¿
  ['\u00c2\u00a1', '\u00a1'], // ¡
  ['\u00c2\u00a0', '\u00a0'], // NBSP

  // === EMOJIS CORROMPIDOS (4-byte UTF-8 sequencias quebradas) ===
  // Padrão: F0 9F xx xx lido como latin1 vira 3-4 chars corrompidos
  // Detectamos pelo padrão \u00f0\u009f (= bytes F0 9F em latin1)
  ['\u00f0\u009f\u0098\u0080', '\ud83d\ude00'], // 😀
  ['\u00f0\u009f\u0098\u008a', '\ud83d\ude0a'], // 😊
  ['\u00f0\u009f\u0098\u008d', '\ud83d\ude0d'], // 😍
  ['\u00f0\u009f\u0099\u008f', '\ud83d\ude4f'], // 🙏
  ['\u00f0\u009f\u0094\u0094', '\ud83d\udd14'], // 🔔
  ['\u00f0\u009f\u0092\u00ac', '\ud83d\udcac'], // 💬
  ['\u00f0\u009f\u0092\u00a5', '\ud83d\udca5'], // 💥
  ['\u00f0\u009f\u008e\u0089', '\ud83c\udf89'], // 🎉
  ['\u00f0\u009f\u009a\u0080', '\ud83d\ude80'], // 🚀
  ['\u00f0\u009f\u0093\u009d', '\ud83d\udcdd'], // 📝
  ['\u00f0\u009f\u0093\u00a2', '\ud83d\udce2'], // 📢
  ['\u00f0\u009f\u0094\u008d', '\ud83d\udd0d'], // 🔍
  ['\u00f0\u009f\u008c\u0090', '\ud83c\udf10'], // 🌐
  ['\u00f0\u009f\u008c\u009f', '\ud83c\udf1f'], // 🌟
  ['\u00f0\u009f\u0092\u00ab', '\ud83d\udcab'], // 💫
  ['\u00f0\u009f\u0097\u0091', '\ud83d\uddd1'], // 🗑
  ['\u00f0\u009f\u0086\u0095', '\ud83c\udd95'], // 🆕
  ['\u00f0\u009f\u0094\u0097', '\ud83d\udd17'], // 🔗
  ['\u00f0\u009f\u008f\u0086', '\ud83c\udfc6'], // 🏆
  ['\u00f0\u009f\u0092\u008e', '\ud83d\udc8e'], // 💎
  ['\u00f0\u009f\u0091\u008d', '\ud83d\udc4d'], // 👍
  ['\u00f0\u009f\u0091\u008e', '\ud83d\udc4e'], // 👎
  ['\u00f0\u009f\u0091\u0091', '\ud83d\udc51'], // 👑
  ['\u00f0\u009f\u0092\u00a1', '\ud83d\udca1'], // 💡
  ['\u00f0\u009f\u0093\u00b7', '\ud83d\udcf7'], // 📷
  ['\u00f0\u009f\u0094\u009a', '\ud83d\udd1a'], // 🔚
  ['\u00f0\u009f\u0094\u009b', '\ud83d\udd1b'], // 🔛
  ['\u00f0\u009f\u0094\u009c', '\ud83d\udd1c'], // 🔜
  ['\u00f0\u009f\u0094\u009d', '\ud83d\udd1d'], // 🔝
  ['\u00f0\u009f\u0094\u009e', '\ud83d\udd1e'], // 🔞
  ['\u00f0\u009f\u0094\u0084', '\ud83d\udd04'], // 🔄
  ['\u00f0\u009f\u0094\u0085', '\ud83d\udd05'], // 🔅
  ['\u00f0\u009f\u0094\u0086', '\ud83d\udd06'], // 🔆
  ['\u00f0\u009f\u0094\u0088', '\ud83d\udd08'], // 🔈
  ['\u00f0\u009f\u0094\u0089', '\ud83d\udd09'], // 🔉
  ['\u00f0\u009f\u0094\u008a', '\ud83d\udd0a'], // 🔊
  ['\u00f0\u009f\u0094\u008b', '\ud83d\udd0b'], // 🔋
  ['\u00f0\u009f\u0094\u008c', '\ud83d\udd0c'], // 🔌
  ['\u00f0\u009f\u0093\u00b1', '\ud83d\udcf1'], // 📱
  ['\u00f0\u009f\u0093\u00b2', '\ud83d\udcf2'], // 📲
  ['\u00f0\u009f\u0092\u00be', '\ud83d\udcbe'], // 💾
  ['\u00f0\u009f\u0092\u00bf', '\ud83d\udcbf'], // 💿
  ['\u00f0\u009f\u0093\u0080', '\ud83d\udcc0'], // 📀
  ['\u00f0\u009f\u0093\u00b0', '\ud83d\udcf0'], // 📰
  ['\u00f0\u009f\u0093\u00bc', '\ud83d\udcfc'], // 📼
  ['\u00f0\u009f\u0093\u00bd', '\ud83d\udcfd'], // 📽
  ['\u00f0\u009f\u0093\u00be', '\ud83d\udcfe'], // 📾
  ['\u00f0\u009f\u0093\u00bf', '\ud83d\udcff'], // 📿
  ['\u00f0\u009f\u0091\u00a4', '\ud83d\udc64'], // 👤
  ['\u00f0\u009f\u0091\u00a5', '\ud83d\udc65'], // 👥
  ['\u00f0\u009f\u0091\u00b6', '\ud83d\udc76'], // 👶
  ['\u00f0\u009f\u0091\u00a7', '\ud83d\udc67'], // 👧
  ['\u00f0\u009f\u0091\u00a8', '\ud83d\udc68'], // 👨
  ['\u00f0\u009f\u0091\u00a9', '\ud83d\udc69'], // 👩
  ['\u00f0\u009f\u0091\u00b4', '\ud83d\udc74'], // 👴
  ['\u00f0\u009f\u0091\u00b5', '\ud83d\udc75'], // 👵
  ['\u00f0\u009f\u0092\u0080', '\ud83d\udc80'], // 💀
  ['\u00f0\u009f\u0098\u00b4', '\ud83d\ude34'], // 😴
  ['\u00f0\u009f\u0098\u00a0', '\ud83d\ude20'], // 😠
  ['\u00f0\u009f\u0098\u00a1', '\ud83d\ude21'], // 😡
  ['\u00f0\u009f\u0098\u00a2', '\ud83d\ude22'], // 😢
  ['\u00f0\u009f\u0098\u00b1', '\ud83d\ude31'], // 😱
  ['\u00f0\u009f\u0098\u00b0', '\ud83d\ude30'], // 😰
  ['\u00f0\u009f\u0093\u00a3', '\ud83d\udce3'], // 📣
  ['\u00f0\u009f\u008e\u00ae', '\ud83c\udfae'], // 🎮
  ['\u00f0\u009f\u008e\u00b5', '\ud83c\udfb5'], // 🎵
  ['\u00f0\u009f\u008e\u00b6', '\ud83c\udfb6'], // 🎶
  ['\u00f0\u009f\u008e\u00a4', '\ud83c\udfa4'], // 🎤
  ['\u00f0\u009f\u008e\u00a7', '\ud83c\udfa7'], // 🎧
  ['\u00f0\u009f\u008e\u00b8', '\ud83c\udfb8'], // 🎸
  ['\u00f0\u009f\u008e\u00b9', '\ud83c\udfb9'], // 🎹
  ['\u00f0\u009f\u008e\u00ba', '\ud83c\udfba'], // 🎺
  ['\u00f0\u009f\u008e\u00bb', '\ud83c\udfbb'], // 🎻
  ['\u00f0\u009f\u008e\u00bc', '\ud83c\udfbc'], // 🎼
  ['\u00f0\u009f\u008e\u00a8', '\ud83c\udfa8'], // 🎨
  ['\u00f0\u009f\u008e\u00ac', '\ud83c\udfac'], // 🎬
];

function collectFiles(dir, exts, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.history' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, exts, results);
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function removeBOM(buf) {
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3);
  }
  return buf;
}

function fixContent(content) {
  for (const [bad, good] of FIXES) {
    // Usa split/join para evitar problemas com regex em strings com chars especiais
    while (content.includes(bad)) {
      content = content.split(bad).join(good);
    }
  }
  return content;
}

const EXTS = ['.html', '.js', '.css', '.json'];
const SKIP_ROOT = new Set(['fix-encoding.js']);
const files = collectFiles(path.join(__dirname, 'public'), EXTS);
// Verifica raiz
for (const entry of fs.readdirSync(__dirname, { withFileTypes: true })) {
  if (entry.isFile() && EXTS.includes(path.extname(entry.name)) && !SKIP_ROOT.has(entry.name)) {
    files.push(path.join(__dirname, entry.name));
  }
}

let totalFixed = 0;
const report = [];

for (const filePath of files) {
  let buf = fs.readFileSync(filePath);
  const hadBOM = buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  buf = removeBOM(buf);

  const original = buf.toString('utf8');
  const fixed = fixContent(original);

  if (fixed !== original || hadBOM) {
    fs.writeFileSync(filePath, fixed, { encoding: 'utf8' });
    const name = path.relative(__dirname, filePath);
    report.push(name);
    totalFixed++;
    console.log('CORRIGIDO: ' + name);
  }
}

console.log('\n=== RELATORIO ===');
console.log('Arquivos verificados : ' + files.length);
console.log('Arquivos corrigidos  : ' + totalFixed);
if (report.length > 0) {
  console.log('\nArquivos alterados:');
  report.forEach(r => console.log('  ' + r));
}
console.log('\nConcluido. Todos os arquivos estao em UTF-8 sem BOM.');
