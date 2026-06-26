const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'script.js');
let content = fs.readFileSync(filePath, 'utf8');

const anchor = "btnOpenCommunity.addEventListener('click', () => {\n  if (servers.length > 0) openServer(servers[0].id);\n  else openCommunityModal();\n});";

const addition = `

// ── Botões direita da navbar (atualização, notificações, typewriter) ──
document.getElementById('btn-update-check')?.addEventListener('click', () => {
  showToast('Verificando atualizações...');
  if (window.checkForUpdates) {
    window.checkForUpdates();
  } else {
    setTimeout(() => showToast('Nenhuma atualização disponível.'), 1200);
  }
});

document.getElementById('btn-notifications')?.addEventListener('click', () => {
  const badge = document.getElementById('notification-badge');
  if (badge) { badge.classList.add('hidden'); badge.textContent = '0'; }
  showToast('Nenhuma notificação nova.');
});`;

if (content.includes(anchor)) {
  content = content.replace(anchor, anchor + addition);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patch aplicado com sucesso!');
} else {
  console.log('ERRO: ancora não encontrada no arquivo.');
}
