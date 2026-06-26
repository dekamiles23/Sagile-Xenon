===========================================
  SAGILE ZX — INSTRUÇÕES DE USO
===========================================

COMO INICIAR O SERVIDOR:
------------------------
1. Instale o Node.js (https://nodejs.org) caso ainda não tenha

2. Abra o terminal/prompt nesta pasta e execute:
   npm install

3. Depois inicie o servidor:
   npm start

4. Acesse no navegador ou Electron:
   http://localhost:3002

===========================================

PROBLEMA CORRIGIDO:
------------------
- O arquivo server.js foi CRIADO (não existia antes)
- O servidor Socket.IO agora roda na porta 3002
- Isso corrige o erro "Sem conexão com o servidor" nas chamadas de voz do DM
- Agora o /socket.io/socket.io.js carrega corretamente

===========================================
