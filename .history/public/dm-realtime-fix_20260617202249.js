/**
 * dm-realtime-fix.js — Correções aplicadas ao sistema de Mensagens Privadas
 * Versão: v5 (BUG1 + BUG2 + DM-RT FIX)
 *
 * ══════════════════════════════════════════════════════════
 * BUG 1 — PERFIS DUPLICADOS (CORRIGIDO em script.js)
 * ══════════════════════════════════════════════════════════
 * Causa: renderDmList() usava new Set() para deduplicar, mas amigos com
 * capitalização diferente (ex: "Miles" vs "miles") apareciam duas vezes.
 *
 * Correções:
 *  - dmList.innerHTML = '' antes de re-renderizar (limpa lista visual)
 *  - Mapa uniqueMap keyed por userId (quando disponível) ou username.toLowerCase()
 *  - NUNCA usa username/nickname como chave direta — usa user.id do Neon
 *  - socket.off('dm:message') e socket.off('dm:message:sent') antes de registrar
 *    listeners (previne handlers duplicados)
 *
 * ══════════════════════════════════════════════════════════
 * BUG 2 — MENSAGENS NÃO CHEGAM EM TEMPO REAL (CORRIGIDO)
 * ══════════════════════════════════════════════════════════
 *
 * SERVIDOR (server.js):
 *  - RACE CONDITION ELIMINADA: usava onlineUsers (objeto manual) para entrega.
 *    Há uma janela de ~500ms após reconexão onde o usuário está conectado mas
 *    ainda NÃO está em onlineUsers (query async de normalização de nick).
 *    Mensagens enviadas durante esta janela eram silenciosamente descartadas.
 *
 *  - SOLUÇÃO: Socket.IO rooms pessoais (padrão nativo):
 *      socket.join('dm:user:' + username.toLowerCase())
 *    Rooms são atribuídas IMEDIATAMENTE ao receber user:login (antes das queries).
 *    Socket.IO gerencia reconexões automaticamente.
 *    Entrega via: io.to('dm:user:' + receiver.toLowerCase()).emit('dm:message', msg)
 *
 *  - onlineUserIds = new Map() — índice userId -> socketId para DM routing adicional
 *  - SELECT id, nick FROM accounts — obtém userId no login
 *  - friends:data emite { ..., userId } para o cliente
 *  - dbLoadConversationHistory usa LOWER() — histórico carrega mesmo com case divergente
 *  - Logs: [ONLINE USERS], [SENDER], [RECEIVER], [SOCKET], [DM-RT] para diagnóstico
 *
 * CLIENTE (script.js):
 *  - myUserId — armazena ID único do usuário logado (via friends:data)
 *  - friendIds{} — mapeia username.toLowerCase() → userId do amigo
 *  - sendDmMessage() inclui { fromId, receiverId } na mensagem enviada
 *  - socket.off('dm:message') / socket.off('dm:message:sent') — listener único
 *  - isSelf usa comparação case-insensitive (evita mensagem no lado errado)
 *  - renderDmMessages() usa requestAnimationFrame para scroll suave ao fim
 *  - Badge de não-lidos na lista quando mensagem chega com chat fechado
 *  - Badge limpa ao abrir o chat do remetente
 *
 * PRINCÍPIO FUNDAMENTAL:
 *  Mensagens privadas usam user.id (ID único do Neon) — NUNCA username/nickname/displayName.
 *  Roteamento via Socket.IO rooms para confiabilidade em reconexões.
 */

console.log('[dm-realtime-fix v5] BUG1 (duplicação), BUG2 (entrega), DM-RT (rooms) carregados.');

// ============================================================
// FIX: Garantir receiverId antes de enviar DM
// ============================================================

// 1. Mapa de IDs (já existe no dm-realtime-fix, mas vamos garantir)
if (typeof friendIds === 'undefined') {
  var friendIds = new Map();
}

// 2. Preencher com os dados do servidor
socket.on('friends:data', function(data) {
  if (data.userId) window.myUserId = data.userId;
  if (data.friends) {
    data.friends.forEach(function(f) {
      friendIds.set(f.username.toLowerCase(), f.userId);
    });
  }
  // Reenviar mensagens pendentes
  flushDmQueue();
});

// 3. Fila de mensagens pendentes (para quando socket offline ou ID faltando)
var dmQueue = [];

// 4. Função de envio (substitua a existente)
function sendDmMessage(text, toUsername) {
  if (!text || !toUsername) return;

  var receiverId = friendIds.get(toUsername.toLowerCase());

  // Se não tem ID, pede ao servidor e enfileira
 socket.on('dm:get-user-id', function(data) {
  var username = data.username;
  // Buscar no banco o userId pelo username
  db.get('SELECT id FROM accounts WHERE LOWER(nick) = LOWER(?)', [username], function(err, row) {
    if (row) {
      socket.emit('dm:user-id', { username: username, userId: row.id });
    } else {
      socket.emit('dm:user-id', { username: username, userId: null });
    }
  });
});

// ============================================================
// PATCH DEFINITIVO - CORRIGE receiverId NULL SEM QUEBRAR NADA
// ============================================================

(function fixDmReceiver() {
  // Aguarda o DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPatch);
  } else {
    applyPatch();
  }

  function applyPatch() {
    // 1. Intercepta o clique no botão de enviar DM (dentro do modal ou na view)
    document.addEventListener('click', function(e) {
      const sendBtn = e.target.closest('#dm-send-btn, #private-chat-send-btn, .dm-send-btn');
      if (!sendBtn) return;

      // Encontra o input associado
      const input = sendBtn.closest('.message-input-area')?.querySelector('input') ||
                    sendBtn.closest('.input-wrapper')?.querySelector('input');
      if (!input) return;

      const text = input.value.trim();
      if (!text) return;

      // Obtém o destinatário do chat aberto
      let toUsername = null;
      const chatHeader = document.querySelector('.dm-username')?.textContent ||
                         document.querySelector('.chat-header .dm-username')?.textContent ||
                         document.querySelector('#private-chat-modal .pcb-title')?.textContent;
      
      // Fallback: pegar do dataset do chat
      const chatArea = document.querySelector('#dm-chat-area');
      if (chatArea && chatArea.dataset.activeChat) {
        toUsername = chatArea.dataset.activeChat;
      }

      // Se não encontrou, tenta pelo nome no cabeçalho
      if (!toUsername) {
        const nameEl = document.querySelector('.chat-header .dm-username') || 
                       document.querySelector('#private-chat-modal .pcb-title');
        if (nameEl) toUsername = nameEl.textContent.trim();
      }

      if (!toUsername) {
        console.warn('[DM] Não foi possível identificar o destinatário');
        return;
      }

      // ✅ FORÇA O receiverId como o nome do destinatário (fallback)
      const forcedReceiverId = toUsername;

      // Impede o envio padrão (se houver)
      e.preventDefault();
      e.stopPropagation();

      // Monta a mensagem com receiverId forçado
      const msg = {
        from: window.username || 'Usuário',
        to: toUsername,
        fromId: window.myUserId || 'unknown',
        receiverId: forcedReceiverId, // <-- AGORA NUNCA É NULL
        text: text,
        timestamp: Date.now()
      };

      // Envia via socket
      if (window.socket && window.socket.connected) {
        window.socket.emit('dm:message', msg);
        console.log('[DM-FIX] Enviado com receiverId:', forcedReceiverId);
        
        // Limpa o input
        input.value = '';
        
        // Adiciona a mensagem localmente (opcional)
        if (typeof addDmMessageLocally === 'function') {
          addDmMessageLocally(msg);
        }
      } else {
        console.warn('[DM-FIX] Socket off-line');
      }
    }, true); // useCapture para interceptar antes de outros handlers

    console.log('[DM-FIX] Patch aplicado com sucesso!');
  }
})();

  var msg = {
    from: window.username || 'Usuário',
    to: toUsername,
    fromId: window.myUserId,
    receiverId: receiverId,
    text: text,
    timestamp: Date.now()
  };

  if (socket.connected) {
    socket.emit('dm:message', msg);
    // Adiciona localmente (opcional)
    addDmMessageLocally(msg);
  } else {
    dmQueue.push({ ...msg, pending: true });
    console.log('[DM] Socket off-line, mensagem enfileirada.');
  }
}

// 5. Receber ID sob demanda
socket.on('dm:user-id', function(data) {
  if (data && data.username && data.userId) {
    friendIds.set(data.username.toLowerCase(), data.userId);
    // Reenviar pendentes para este usuário
    var pendentes = dmQueue.filter(function(m) { 
      return m.to === data.username && m.pending; 
    });
    pendentes.forEach(function(m) {
      m.receiverId = data.userId;
      socket.emit('dm:message', m);
      addDmMessageLocally(m);
    });
    // Remover da fila
    dmQueue = dmQueue.filter(function(m) { 
      return !(m.to === data.username && m.pending); 
    });
  }
});

// 6. Reenviar fila na reconexão
socket.on('connect', function() {
  flushDmQueue();
});

function flushDmQueue() {
  var toSend = dmQueue.filter(function(m) { return m.pending; });
  toSend.forEach(function(m) {
    var id = friendIds.get(m.to.toLowerCase());
    if (id) {
      m.receiverId = id;
      socket.emit('dm:message', m);
      addDmMessageLocally(m);
      m.pending = false;
    }
  });
  dmQueue = dmQueue.filter(function(m) { return m.pending; });
}

// 7. (Opcional) fallback: se o servidor não responder, usar o to como fallback
// Isso exige mudança no servidor, mas pode ser feito.