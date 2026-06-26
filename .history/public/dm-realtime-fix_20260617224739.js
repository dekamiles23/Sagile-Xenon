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
