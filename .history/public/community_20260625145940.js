// ===== BLOCO DE SEGURANÇA PARA community.js =====
if (typeof window.socket === 'undefined' || !window.socket) {
  if (typeof io !== 'undefined') window.socket = io();
}
if (typeof username === 'undefined' || !username) {
  var username = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || '';
}
window.username = username;
window.currentUsername = username;
window.currentUserId = username;
// ===== FIM DO BLOCO =====

const IS_COMMUNITY_PAGE = true;
const communitySocket = IS_COMMUNITY_PAGE ? (window.socket || (typeof io !== 'undefined' ? io() : null)) : null;
if (IS_COMMUNITY_PAGE && communitySocket) window.socket = communitySocket;

const params = new URLSearchParams(window.location.search);
const communityId = params.get('id') || `comm_${Date.now().toString(36)}`;
const communityName = params.get('name') || 'Minha Comunidade';

if (typeof username === 'undefined') var username = '';
username = sessionStorage.getItem('username') || username;
// Exportar imediatamente para que voice-system-complete.js acesse antes do login
window.username = username;
window.currentUsername = username;
window.currentUserId = username;
if (typeof currentChannel === 'undefined') window.currentChannel = null;
window.currentChannelType = window.currentChannelType || 'text';
if (typeof lastMessageUser === 'undefined') var lastMessageUser = null;

// Sistema de Perfil Visual do Usuário
// FIX: DEFAULT_VISUAL_PROFILE já é declarado em script.js (carregado antes)
// Usamos var para evitar "Identifier already declared" se script.js já definiu,
// ou simplesmente checamos se já existe.
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

// Canais persistidos por sessão
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

// 🔹 BLOCO DE SEGURANÇA - Coloque ANTES de todo o código existente no community.js
if (typeof window.socket === 'undefined' || !window.socket) {
  if (typeof io !== 'undefined') {
    window.socket = io();
  }
}
if (typeof username === 'undefined' || !username) {
  var username = sessionStorage.getItem('username') || localStorage.getItem('zx_username') || '';
}
window.username = username;
window.currentUsername = username;
window.currentUserId = username;