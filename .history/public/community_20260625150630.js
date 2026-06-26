// ============================================
// community.js — Versão corrigida sem duplicações
// ============================================

// 1. Definir variáveis de forma consistente
const IS_COMMUNITY_PAGE = true;

// 2. Garantir que window.socket exista
if (typeof window.socket === 'undefined' || !window.socket) {
  if (typeof io !== 'undefined') {
    window.socket = io();
  }
}

// 3. Garantir que username exista
let username = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || '';
window.username = username;
window.currentUsername = username;
window.currentUserId = username;

// 4. Se não houver socket, tenta criar um (fallback)
const communitySocket = window.socket || (typeof io !== 'undefined' ? io() : null);
if (communitySocket) window.socket = communitySocket;

// 5. Parâmetros da URL
const params = new URLSearchParams(window.location.search);
const communityId = params.get('id') || `comm_${Date.now().toString(36)}`;
const communityName = params.get('name') || 'Minha Comunidade';

// 6. Definir variáveis globais para o sistema de chat
if (typeof currentChannel === 'undefined') window.currentChannel = null;
window.currentChannelType = window.currentChannelType || 'text';
if (typeof lastMessageUser === 'undefined') var lastMessageUser = null;

// 7. Sistema de Perfil Visual do Usuário
if (typeof window.DEFAULT_VISUAL_PROFILE === 'undefined') {
  window.DEFAULT_VISUAL_PROFILE = {
    bubbleColor: '#1a002b',
    textColor: '#eeeeee',
    bold: false,
    italic: false,
    underline: false,
    glow: false,
    glowColor: '#ff00ff',
    outline: false,
    outlineColor: '#000000'
  };
}
var DEFAULT_VISUAL_PROFILE = window.DEFAULT_VISUAL_PROFILE;

let userVisualProfile = JSON.parse(localStorage.getItem(`zx_visual_profile_${communityId}`) || JSON.stringify(DEFAULT_VISUAL_PROFILE));
let userVisualProfiles = {}; // Cache de perfis visuais de outros usuários

// 8. Canais persistidos por sessão
const STORAGE_KEY = `zx_channels_${communityId}`;
let channels = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');

if (!channels) {
  const template = params.get('template') === 'blank' ? 'blank' : 'base';
  channels = template === 'blank'
    ? [{ id: `${communityId}_geral`, name: 'geral', type: 'text', desc: 'Seu primeiro canal' }]
    : [
        { id: `${communityId}_geral`, name: 'geral', type: 'text', desc: 'Canal principal' },
        { id: `${communityId}_jogos`, name: 'jogos', type: 'text', desc: 'Fale sobre jogos' },
        { id: `${communityId}_musica`, name: 'musica', type: 'text', desc: 'Músicas e playlists' },
        { id: `${communityId}_voz`, name: 'voz', type: 'voice', desc: '' },
        { id: `${communityId}_anuncios`, name: 'anuncios', type: 'announcement', desc: 'Anúncios importantes' },
      ];
}

// 9. Exportar para o escopo global (se necessário)
window.channels = channels;
window.communityId = communityId;
window.communityName = communityName;

console.log('[community.js] Carregado com sucesso!');
console.log('[community.js] communityId:', communityId);
console.log('[community.js] username:', username);
console.log('[community.js] socket conectado:', window.socket ? window.socket.connected : false);