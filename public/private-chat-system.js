/**
 * private-chat-system.js
 * ======================
 * Sistema completo de chat privado (DM) com botão de chamada WebRTC.
 * v2: barra de input moderna + emoji picker por categoria (100% funcional)
 *
 * IDs internos ao modal usam prefixo "pcs-" para não conflitar
 * com os elementos inline do index.html que usam os mesmos nomes.
 *
 * INTEGRAÇÃO:
 *   - Usa window.startDmVoiceCall (dm-call-system.js) para chamadas
 *   - Usa window.socket para eventos Socket.IO
 *   - Expõe window.openDmChat / window.openPrivateChat / window.closeDmChat
 *   - Expõe window.currentDmUser e window.activePrivateChat
 *
 * EVENTOS SOCKET.IO:
 *   Emit:  dm:history, dm:message, dm:typing, dm:read
 *   On:    dm:history, dm:message, dm:message:sent, dm:typing
 */

(function () {
  'use strict';

  /* ─── Emojis por categoria ────────────────────────────────────────────── */
  var EMOJI_CATEGORIES = [
    {
      label: '😊', name: 'Rostos',
      emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
               '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
               '🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒',
               '🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','💫','🤯','🤠','🥳','🥸','😎','🤓','🧐',
               '😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭',
               '😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️']
    },
    {
      label: '👍', name: 'Gestos',
      emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
               '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️',
               '💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','👣','👁','👀','🫀','🫁','🧠',
               '🦷','🦴','👄','💋','👅','🫦','💬','💭','💤','👤','👥','🫂']
    },
    {
      label: '❤️', name: 'Amor',
      emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
               '💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈',
               '♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️',
               '📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵',
               '❗','‼️','⁉️','🔅','🔆','🔱','⚜️','🔰','✅','❎','🌀']
    },
    {
      label: '🐶', name: 'Animais',
      emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵',
               '🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝',
               '🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🦕','🦖','🦑','🐙',
               '🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧',
               '🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑']
    },
    {
      label: '🍕', name: 'Comida',
      emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
               '🥝','🍅','🍆','🥑','🫛','🥦','🥬','🥒','🌶','🫑','🧄','🧅','🥔','🍠','🥐','🥯',
               '🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔',
               '🍟','🍕','🫓','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕','🍜','🍝','🍛',
               '🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍡','🧁','🍰','🎂','🍮','🍭',
               '🍬','🍫','🍿','🍩','🍪','🌰','🥜','🫘','🍯','🧃','🥤','🧋','☕','🍵','🧉','🍺']
    },
    {
      label: '⚽', name: 'Esportes',
      emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥊','🥋',
               '🎽','🛹','🛼','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋️','🤼','🤸','🏊','🚵','🏇',
               '🧘','🏄','🤽','🚣','🧗','🚴','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎫','🎟',
               '🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎙','🎚','🎛','📻','🎷']
    },
    {
      label: '🚀', name: 'Objetos',
      emojis: ['⌚','📱','📲','💻','⌨️','🖥','🖨','🖱','🖲','🕹','💾','💿','📀','🧮','📷','📸',
               '📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🧭','⏱','⏲','⏰','🕰','⌛',
               '⏳','📡','🔋','🔌','💡','🔦','🕯','🪔','🧯','🛢','💸','💵','💴','💶','💷','🪙',
               '💰','💳','💹','📈','📉','📊','📋','📌','📍','✂️','🗃','🗄','🗑','🔒','🔓','🔏',
               '🔐','🔑','🗝','🔨','🪓','⛏','⚒','🛠','🗡','⚔️','🛡','🪚','🔧','🪛','🔩','⚙️']
    },
    {
      label: '🌍', name: 'Lugares',
      emojis: ['🌍','🌎','🌏','🌐','🗺','🧭','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🏟',
               '🏛','🏗','🧱','🏘','🏚','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫',
               '🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩','🕋','⛲','⛺','🌁',
               '🌃','🏙','🌄','🌅','🌆','🌇','🌉','🎠','🛝','🎡','🎢','💈','🎪','🚂','🚃','🚄',
               '🚅','🚆','🚇','🚈','🚉','🚊','🚞','🚝','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓']
    },
    {
      label: '✨', name: 'Símbolos',
      emojis: ['✨','🌟','⭐','🌠','🎇','🎆','🌈','☀️','🌤','⛅','🌥','☁️','🌦','🌧','⛈','🌩',
               '🌨','❄️','☃️','⛄','🌬','💨','🌀','🌊','🌪','🌫','🌈','🌂','☂️','🔥','💧','🌊',
               '🎃','🎄','🎆','🎇','🧨','✨','🎉','🎊','🎋','🎍','🎎','🎏','🎐','🧧','🎀','🎁',
               '🏮','🪔','💎','🔮','🧿','🪬','🗿','🗺','🧸','🪆','🪅','🎭','🎨','🖼','🎰','🎲',
               '♟','🧩','🪄','🃏','🀄','🎴','🎯','🎳','🎮','🕹','🎲','🧸','🪀','🪁','🧶','🧵']
    }
  ];

  /* ─── CSS injetado uma única vez ──────────────────────────────────────── */
  function injectPrivateChatStyles() {
    if (document.getElementById('pcs-styles')) return;
    var style = document.createElement('style');
    style.id = 'pcs-styles';
    style.textContent = [
      /* Modal overlay */
      '#private-chat-modal{',
        'position:fixed;inset:0;z-index:9000;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);',
        'animation:pcsOverlayIn 0.2s ease-out;',
      '}',
      '#private-chat-modal.pcs-hidden{display:none!important;}',
      '@keyframes pcsOverlayIn{from{opacity:0;}to{opacity:1;}}',

      /* Panel */
      '.pcs-panel{',
        'position:relative;',
        'width:520px;max-width:96vw;',
        'height:620px;max-height:92vh;',
        'background:linear-gradient(160deg,rgba(10,0,28,0.98) 0%,rgba(4,0,16,0.99) 100%);',
        'border:1px solid rgba(0,255,255,0.2);',
        'border-radius:18px;',
        'display:flex;flex-direction:column;overflow:hidden;',
        'box-shadow:0 0 80px rgba(139,0,255,0.15),0 0 30px rgba(0,255,255,0.08),0 24px 60px rgba(0,0,0,0.8);',
        'animation:pcsPanelIn 0.28s cubic-bezier(0.34,1.56,0.64,1);',
      '}',
      '@keyframes pcsPanelIn{from{opacity:0;transform:scale(0.92) translateY(24px);}to{opacity:1;transform:scale(1) translateY(0);}}',

      /* Header */
      '.pcs-header{',
        'display:flex;align-items:center;gap:12px;',
        'padding:14px 16px;',
        'background:rgba(0,0,0,0.35);',
        'border-bottom:1px solid rgba(255,0,255,0.12);',
        'flex-shrink:0;',
      '}',
      '.pcs-avatar{',
        'width:42px;height:42px;min-width:42px;border-radius:50%;',
        'background:linear-gradient(135deg,#8b00ff,#ff00ff);',
        'display:flex;align-items:center;justify-content:center;',
        'color:#fff;font-weight:700;font-size:18px;',
        'background-size:cover;background-position:center;',
        'border:2px solid rgba(0,255,255,0.35);',
        'flex-shrink:0;',
      '}',
      '.pcs-header-info{flex:1;min-width:0;}',
      '.pcs-header-name{',
        'color:#fff;font-weight:700;font-size:15px;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      '}',
      '.pcs-header-status{color:#00ff88;font-size:12px;margin-top:2px;}',
      '.pcs-header-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}',
      '.pcs-action-btn{',
        'width:36px;height:36px;border-radius:8px;border:none;',
        'background:rgba(255,255,255,0.06);',
        'color:#ccc;font-size:16px;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'transition:all 0.15s;flex-shrink:0;',
      '}',
      '.pcs-action-btn:hover{background:rgba(255,255,255,0.14);color:#fff;}',
      '.pcs-call-btn{',
        'background:rgba(0,255,136,0.1)!important;',
        'border:1px solid rgba(0,255,136,0.35)!important;',
        'color:#00ff88!important;font-size:18px!important;',
        'width:40px!important;height:40px!important;border-radius:10px!important;',
      '}',
      '.pcs-call-btn:hover{background:rgba(0,255,136,0.25)!important;box-shadow:0 0 12px rgba(0,255,136,0.3)!important;transform:scale(1.05);}',
      '.pcs-close-btn{background:rgba(237,66,69,0.1)!important;border:1px solid rgba(237,66,69,0.3)!important;color:#ed4245!important;}',
      '.pcs-close-btn:hover{background:rgba(237,66,69,0.25)!important;}',

      /* Messages */
      '#pcs-messages-area{',
        'flex:1;overflow-y:auto;',
        'padding:14px 14px 8px;',
        'display:flex;flex-direction:column;gap:4px;',
        'scroll-behavior:smooth;',
      '}',
      '#pcs-messages-area::-webkit-scrollbar{width:4px;}',
      '#pcs-messages-area::-webkit-scrollbar-track{background:transparent;}',
      '#pcs-messages-area::-webkit-scrollbar-thumb{background:rgba(139,0,255,0.4);border-radius:4px;}',

      /* DM messages */
      '.dm-msg{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(13,0,28,0.5);border:1px solid rgba(255,0,255,0.1);margin:2px 0;transition:background 0.15s;}',
      '.dm-msg:hover{background:rgba(255,0,255,0.06);border-color:rgba(255,0,255,0.22);}',
      '.dm-msg.dm-msg-own{flex-direction:row-reverse;background:rgba(0,100,60,0.15);border-color:rgba(0,255,136,0.12);}',
      '.dm-msg.dm-msg-own:hover{background:rgba(0,255,136,0.08);}',
      '.dm-msg-avatar{width:34px;height:34px;min-width:34px;border-radius:50%;background:linear-gradient(135deg,#8b00ff,#ff00ff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;background-size:cover;background-position:center;}',
      '.dm-msg-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}',
      '.dm-msg-own .dm-msg-body{align-items:flex-end;}',
      '.dm-msg-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.dm-msg-own .dm-msg-meta{flex-direction:row-reverse;}',
      '.dm-msg-name{font-weight:700;font-size:13px;color:#00ffff;}',
      '.dm-msg-own .dm-msg-name{color:#00ff88;}',
      '.dm-msg-time{font-size:11px;color:#555;}',
      '.dm-msg-text{color:#e8e8e8;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;max-width:100%;}',
      '.dm-msg-system{text-align:center;color:#555;font-size:12px;padding:4px 0;margin:4px 0;}',

      /* Typing indicator */
      '#pcs-typing-indicator{padding:3px 14px;font-size:12px;color:#7a7a7a;height:18px;flex-shrink:0;font-style:italic;}',

      /* ═══ INPUT AREA moderna ═══ */
      '.pcs-input-area{',
        'padding:10px 12px 12px;',
        'background:rgba(0,0,0,0.4);',
        'border-top:1px solid rgba(139,0,255,0.18);',
        'display:flex;flex-direction:column;gap:6px;flex-shrink:0;',
      '}',

      /* Wrapper com borda gradiente animada */
      '.pcs-input-wrapper{',
        'position:relative;',
        'border-radius:14px;',
        'padding:1.5px;',
        'background:linear-gradient(90deg,rgba(139,0,255,0.5),rgba(0,255,255,0.4),rgba(255,0,255,0.5));',
        'background-size:200% 100%;',
        'animation:pcsInputGrad 4s linear infinite;',
        'transition:box-shadow 0.2s;',
      '}',
      '.pcs-input-wrapper:focus-within{',
        'box-shadow:0 0 18px rgba(139,0,255,0.35),0 0 8px rgba(0,255,255,0.2);',
        'background:linear-gradient(90deg,rgba(139,0,255,0.8),rgba(0,255,255,0.7),rgba(255,0,255,0.8));',
      '}',
      '@keyframes pcsInputGrad{0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}',

      /* Inner container */
      '.pcs-input-inner{',
        'display:flex;align-items:flex-end;gap:0;',
        'background:rgba(8,0,20,0.97);',
        'border-radius:13px;',
        'overflow:hidden;',
        'padding:6px 6px 6px 12px;',
      '}',

      /* Textarea */
      '#pcs-message-input{',
        'flex:1;',
        'background:transparent;',
        'border:none;outline:none;',
        'color:#f0f0f0;',
        'font-size:14px;',
        'font-family:inherit;',
        'line-height:1.5;',
        'resize:none;',
        'min-height:24px;',
        'max-height:140px;',
        'padding:4px 0;',
        'overflow-y:auto;',
        'word-break:break-word;',
      '}',
      '#pcs-message-input::-webkit-scrollbar{width:3px;}',
      '#pcs-message-input::-webkit-scrollbar-thumb{background:rgba(255,0,255,0.3);border-radius:3px;}',
      '#pcs-message-input::placeholder{color:#454545;}',

      /* Emoji button */
      '#pcs-emoji-btn{',
        'width:34px;height:34px;flex-shrink:0;',
        'border:none;background:transparent;',
        'cursor:pointer;border-radius:8px;',
        'font-size:20px;display:flex;align-items:center;justify-content:center;',
        'color:#777;transition:all 0.15s;',
        'padding:0;line-height:1;',
      '}',
      '#pcs-emoji-btn:hover{color:#ffcc00;transform:scale(1.15);}',
      '#pcs-emoji-btn.pcs-emoji-active{color:#ffcc00;transform:scale(1.1);}',

      /* Send button */
      '#pcs-send-btn{',
        'width:34px;height:34px;flex-shrink:0;',
        'border:none;',
        'background:linear-gradient(135deg,#8b00ff,#00ffff);',
        'border-radius:10px;',
        'color:#fff;font-size:16px;',
        'cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'transition:all 0.15s;',
        'box-shadow:0 2px 10px rgba(139,0,255,0.4);',
        'margin-left:4px;',
      '}',
      '#pcs-send-btn:hover{transform:scale(1.08);box-shadow:0 4px 16px rgba(139,0,255,0.6);}',
      '#pcs-send-btn:active{transform:scale(0.95);}',
      '#pcs-send-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none;}',

      /* Footer (contador) */
      '.pcs-input-footer{display:flex;align-items:center;justify-content:flex-end;padding:0 4px;}',
      '#pcs-char-counter{font-size:11px;color:#3a3a4a;transition:color 0.15s;}',

      /* ═══ EMOJI PICKER ═══ */
      '#pcs-emoji-picker{',
        'position:absolute;',
        'bottom:calc(100% + 8px);',
        'right:0;',
        'width:320px;',
        'max-height:340px;',
        'background:rgba(10,0,26,0.97);',
        'border:1px solid rgba(139,0,255,0.35);',
        'border-radius:14px;',
        'box-shadow:0 -8px 40px rgba(0,0,0,0.7),0 0 24px rgba(139,0,255,0.15);',
        'display:flex;flex-direction:column;',
        'overflow:hidden;',
        'z-index:9999;',
        'animation:pcsPickerIn 0.18s cubic-bezier(0.34,1.56,0.64,1);',
      '}',
      '@keyframes pcsPickerIn{from{opacity:0;transform:scale(0.92) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}}',

      /* Category tabs */
      '.pcs-ep-tabs{',
        'display:flex;',
        'overflow-x:auto;',
        'gap:2px;',
        'padding:8px 8px 0;',
        'border-bottom:1px solid rgba(255,255,255,0.07);',
        'flex-shrink:0;',
      '}',
      '.pcs-ep-tabs::-webkit-scrollbar{height:0;}',
      '.pcs-ep-tab{',
        'flex-shrink:0;',
        'width:30px;height:28px;',
        'border:none;background:transparent;',
        'border-radius:6px 6px 0 0;',
        'cursor:pointer;',
        'font-size:16px;',
        'display:flex;align-items:center;justify-content:center;',
        'color:#888;transition:all 0.12s;',
        'border-bottom:2px solid transparent;',
        'padding:0;',
      '}',
      '.pcs-ep-tab:hover{background:rgba(255,255,255,0.07);color:#fff;}',
      '.pcs-ep-tab.pcs-tab-active{color:#fff;border-bottom-color:#8b00ff;background:rgba(139,0,255,0.12);}',

      /* Emoji grid */
      '.pcs-ep-grid{',
        'display:grid;',
        'grid-template-columns:repeat(8,1fr);',
        'gap:2px;',
        'padding:8px;',
        'overflow-y:auto;',
        'flex:1;',
      '}',
      '.pcs-ep-grid::-webkit-scrollbar{width:4px;}',
      '.pcs-ep-grid::-webkit-scrollbar-thumb{background:rgba(139,0,255,0.4);border-radius:4px;}',
      '.pcs-ep-item{',
        'width:32px;height:32px;',
        'border:none;background:transparent;',
        'border-radius:6px;cursor:pointer;',
        'font-size:18px;',
        'display:flex;align-items:center;justify-content:center;',
        'transition:all 0.1s;',
        'line-height:1;padding:0;',
      '}',
      '.pcs-ep-item:hover{background:rgba(139,0,255,0.25);transform:scale(1.2);}',
      '.pcs-ep-item:active{transform:scale(0.9);}',

      /* Empty state */
      '.dm-empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#444;gap:10px;}',
      '.dm-empty-state span{font-size:40px;}',
      '.dm-empty-state p{font-size:13px;text-align:center;margin:0;}'
    ].join('');
    document.head.appendChild(style);
  }

  /* ─── Escape HTML ─────────────────────────────────────────────────────── */
  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── Formatar hora ───────────────────────────────────────────────────── */
  function formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  /* ─── Meu username ────────────────────────────────────────────────────── */
  function myUsername() {
    return (
      window.username ||
      window.currentUsername ||
      localStorage.getItem('zx_username') ||
      localStorage.getItem('username') ||
      sessionStorage.getItem('username') ||
      'Eu'
    );
  }

  /* ─── Estado da conversa ──────────────────────────────────────────────── */
  var _currentDmUser  = null;
  var _typingTimer    = null;
  var _isTyping       = false;
  var _historyLoaded  = {};
  var _pickerVisible  = false;
  var _activeCatIdx   = 0;

  /* ─── Persistência local de histórico DM ─────────────────────────────── */
  function dmStorageKey(a, b) {
    return 'zx_dm_' + [a, b].map(function(x){ return (x||'').toLowerCase(); }).sort().join('_');
  }
  function loadLocalHistory(partner) {
    try { return JSON.parse(localStorage.getItem(dmStorageKey(myUsername(), partner)) || '[]'); }
    catch(e) { return []; }
  }
  function saveLocalHistory(partner, messages) {
    try { localStorage.setItem(dmStorageKey(myUsername(), partner), JSON.stringify(messages.slice(-200))); }
    catch(e) {}
  }
  function appendLocalHistory(partner, msg) {
    var msgs = loadLocalHistory(partner);
    if (msg.id && msgs.some(function(m){ return m.id === msg.id; })) return msgs;
    msgs.push(msg);
    saveLocalHistory(partner, msgs);
    return msgs;
  }

  /* ─── Emoji Picker ────────────────────────────────────────────────────── */
  function buildEmojiPicker() {
    var picker = document.createElement('div');
    picker.id = 'pcs-emoji-picker';

    /* Tabs */
    var tabs = document.createElement('div');
    tabs.className = 'pcs-ep-tabs';
    EMOJI_CATEGORIES.forEach(function(cat, idx) {
      var btn = document.createElement('button');
      btn.className = 'pcs-ep-tab' + (idx === 0 ? ' pcs-tab-active' : '');
      btn.textContent = cat.label;
      btn.title = cat.name;
      btn.addEventListener('click', function() {
        _activeCatIdx = idx;
        renderEmojiGrid(picker);
        tabs.querySelectorAll('.pcs-ep-tab').forEach(function(b, i) {
          b.classList.toggle('pcs-tab-active', i === idx);
        });
      });
      tabs.appendChild(btn);
    });

    /* Grid */
    var grid = document.createElement('div');
    grid.className = 'pcs-ep-grid';
    grid.id = 'pcs-ep-grid';

    picker.appendChild(tabs);
    picker.appendChild(grid);
    return picker;
  }

  function renderEmojiGrid(picker) {
    var grid = picker.querySelector('#pcs-ep-grid');
    if (!grid) return;
    grid.innerHTML = '';
    var cat = EMOJI_CATEGORIES[_activeCatIdx];
    if (!cat) return;
    cat.emojis.forEach(function(emoji) {
      var btn = document.createElement('button');
      btn.className = 'pcs-ep-item';
      btn.textContent = emoji;
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        insertEmoji(emoji);
      });
      grid.appendChild(btn);
    });
  }

  function insertEmoji(emoji) {
    var input = document.getElementById('pcs-message-input');
    if (!input) return;
    var start = input.selectionStart;
    var end   = input.selectionEnd;
    var val   = input.value;
    input.value = val.substring(0, start) + emoji + val.substring(end);
    var newPos = start + emoji.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    /* Atualiza contador */
    var counter = document.getElementById('pcs-char-counter');
    if (counter) {
      var len = input.value.length;
      counter.textContent = len + '/4000';
      counter.style.color = len > 3800 ? '#ff4444' : '#3a3a4a';
    }
    /* Auto height */
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  }

  function toggleEmojiPicker() {
    var wrapper = document.getElementById('pcs-input-wrapper-el');
    var existing = document.getElementById('pcs-emoji-picker');
    var btn = document.getElementById('pcs-emoji-btn');

    if (existing) {
      existing.remove();
      _pickerVisible = false;
      if (btn) btn.classList.remove('pcs-emoji-active');
      return;
    }

    _pickerVisible = true;
    if (btn) btn.classList.add('pcs-emoji-active');

    var picker = buildEmojiPicker();
    renderEmojiGrid(picker);

    /* posicionar relativo ao wrapper */
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(picker);
    } else {
      document.body.appendChild(picker);
    }
  }

  function closeEmojiPicker() {
    var p = document.getElementById('pcs-emoji-picker');
    if (p) p.remove();
    _pickerVisible = false;
    var btn = document.getElementById('pcs-emoji-btn');
    if (btn) btn.classList.remove('pcs-emoji-active');
  }

  /* ─── Criar modal (somente uma vez) ──────────────────────────────────── */
  function createModal() {
    if (document.getElementById('private-chat-modal')) return;
    injectPrivateChatStyles();

    var modal = document.createElement('div');
    modal.id = 'private-chat-modal';
    modal.className = 'pcs-hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = [
      '<div class="pcs-panel">',

        /* Header */
        '<div class="pcs-header">',
          '<div class="pcs-avatar pm-header-avatar" id="pcs-avatar-el"></div>',
          '<div class="pcs-header-info">',
            '<div class="pcs-header-name" id="pcs-username-el">—</div>',
            '<div class="pcs-header-status" id="pcs-status-el">● Online</div>',
          '</div>',
          '<div class="pcs-header-actions">',
            '<button class="pcs-action-btn pcs-call-btn" id="pcs-call-btn" title="Chamada de voz">📞</button>',
            '<button class="pcs-action-btn" id="pcs-room-btn" title="Sala privada" style="background:rgba(139,0,255,0.1);border:1px solid rgba(139,0,255,0.35);color:#c084fc;font-size:16px;width:40px;height:40px;border-radius:10px;">🏠</button>',
            '<button class="pcs-action-btn pcs-close-btn" id="pcs-close-btn" title="Fechar">✕</button>',
          '</div>',
        '</div>',

        /* Messages */
        '<div id="pcs-messages-area">',
          '<div class="dm-empty-state" id="pcs-empty-state">',
            '<span>💬</span>',
            '<p>Inicie uma conversa privada!</p>',
          '</div>',
        '</div>',

        /* Typing */
        '<div id="pcs-typing-indicator"></div>',

        /* Input area moderna */
        '<div class="pcs-input-area">',
          '<div id="pcs-input-wrapper-el" class="pcs-input-wrapper">',
            '<div class="pcs-input-inner">',
              '<textarea id="pcs-message-input" placeholder="Mensagem privada..." rows="1" maxlength="4000"></textarea>',
              '<button id="pcs-emoji-btn" title="Emojis">😊</button>',
              '<button id="pcs-send-btn" title="Enviar">➤</button>',
            '</div>',
          '</div>',
          '<div class="pcs-input-footer">',
            '<span id="pcs-char-counter">0/4000</span>',
          '</div>',
        '</div>',

      '</div>'
    ].join('');

    document.body.appendChild(modal);

    /* ── Fechar ao clicar no overlay ── */
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeEmojiPicker();
        closeDmChat();
      }
    });

    /* ── Fechar picker ao clicar fora dele ── */
    document.addEventListener('click', function(e) {
      var picker = document.getElementById('pcs-emoji-picker');
      var btn    = document.getElementById('pcs-emoji-btn');
      if (picker && !picker.contains(e.target) && e.target !== btn) {
        closeEmojiPicker();
      }
    }, true);

    /* Botão fechar */
    document.getElementById('pcs-close-btn').addEventListener('click', function() {
      closeEmojiPicker();
      closeDmChat();
    });

    /* Botão sala privada */
    document.getElementById('pcs-room-btn').addEventListener('click', function() {
      if (typeof window.openPrivateRoomsModal === 'function') window.openPrivateRoomsModal();
    });

    /* Botão chamada de voz */
    document.getElementById('pcs-call-btn').addEventListener('click', function() {
      if (!_currentDmUser) return;
      if (typeof window.startDmVoiceCall === 'function') {
        window.startDmVoiceCall(_currentDmUser);
      } else {
        if (typeof showToast === 'function') showToast('⚠️ Sistema de voz ainda carregando...');
      }
    });

    /* Botão emoji */
    document.getElementById('pcs-emoji-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      toggleEmojiPicker();
    });

    /* Botão enviar */
    document.getElementById('pcs-send-btn').addEventListener('click', sendMessage);

    /* Enter para enviar / Shift+Enter nova linha */
    document.getElementById('pcs-message-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        sendMessage();
      }
      /* Escape fecha o picker */
      if (e.key === 'Escape') closeEmojiPicker();
    });

    /* Contador de caracteres e auto-height */
    document.getElementById('pcs-message-input').addEventListener('input', function() {
      var len = this.value.length;
      var counter = document.getElementById('pcs-char-counter');
      if (counter) {
        counter.textContent = len + '/4000';
        counter.style.color = len > 3800 ? '#ff4444' : '#3a3a4a';
      }
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 140) + 'px';

      /* Indicador de digitação */
      if (!_isTyping && _currentDmUser && window.socket && window.socket.connected) {
        _isTyping = true;
        window.socket.emit('dm:typing', { to: _currentDmUser });
      }
      clearTimeout(_typingTimer);
      _typingTimer = setTimeout(function() { _isTyping = false; }, 2500);
    });
  }

  /* ─── Abrir / focar modal ─────────────────────────────────────────────── */
  function openDmChat(username) {
    if (!username) return;
    createModal();

    var modal = document.getElementById('private-chat-modal');
    if (!modal) return;

    var prevUser = _currentDmUser;
    _currentDmUser = username;
    window.currentDmUser = username;
    window.activePrivateChat = username;

    /* Header */
    var nameEl   = document.getElementById('pcs-username-el');
    var avatarEl = document.getElementById('pcs-avatar-el');
    var callBtn  = document.getElementById('pcs-call-btn');

    if (nameEl) nameEl.textContent = username;
    if (avatarEl) {
      avatarEl.textContent = (username[0] || '?').toUpperCase();
      avatarEl.style.backgroundImage = '';
      avatarEl.classList.remove('has-image');
      var cachedAvatar = (window.userAvatarCache || {})[(username||'').toLowerCase()]
                      || (window.friendAvatarCache || {})[(username||'').toLowerCase()];
      if (cachedAvatar) {
        avatarEl.style.cssText = 'background-image:url(' + cachedAvatar + ');background-size:cover;background-position:center;';
        avatarEl.classList.add('has-image');
        avatarEl.textContent = '';
      }
    }
    if (callBtn) callBtn.dataset.username = username;

    /* Limpar mensagens se mudou de usuário */
    if (prevUser !== username) {
      clearMessages();
      _historyLoaded[username] = false;
    }

    /* Fechar picker se estava aberto */
    closeEmojiPicker();

    /* Mostrar modal */
    modal.classList.remove('pcs-hidden');

    /* Focar no input */
    var input = document.getElementById('pcs-message-input');
    if (input) setTimeout(function() { input.focus(); }, 80);

    /* Carregar histórico */
    if (!_historyLoaded[username]) requestHistory(username);

    /* Marcar como lidas */
    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:read', { from: username });
    }

    console.log('[PCS] DM aberta com', username);
  }

  /* ─── Fechar modal ────────────────────────────────────────────────────── */
  function closeDmChat() {
    var modal = document.getElementById('private-chat-modal');
    if (modal) modal.classList.add('pcs-hidden');
    closeEmojiPicker();
    window.currentDmUser   = null;
    window.activePrivateChat = null;
    _currentDmUser = null;
  }

  /* ─── Limpar área de mensagens ────────────────────────────────────────── */
  function clearMessages() {
    var area = document.getElementById('pcs-messages-area');
    if (!area) return;
    area.innerHTML = '<div class="dm-empty-state" id="pcs-empty-state"><span>💬</span><p>Inicie uma conversa privada!</p></div>';
  }

  /* ─── Solicitar histórico ─────────────────────────────────────────────── */
  function requestHistory(username) {
    _historyLoaded[username] = true;
    var local = loadLocalHistory(username);
    if (local.length > 0) renderDmHistory(local);
    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:history', { with: username });
    }
  }

  /* ─── Renderizar UMA mensagem ─────────────────────────────────────────── */
  function renderDmMessage(msg) {
    if (!msg) return;
    var area = document.getElementById('pcs-messages-area');
    if (!area) return;

    var empty = document.getElementById('pcs-empty-state');
    if (empty) empty.remove();

    var me     = myUsername();
    var isOwn  = (msg.from || msg.username || '').toLowerCase() === me.toLowerCase();
    var sender = msg.from || msg.username || 'Alguém';
    var text   = msg.text || msg.content || msg.message || '';
    var ts     = msg.timestamp || msg.createdAt || msg.time || Date.now();
    var initial = (sender[0] || '?').toUpperCase();

    var avatarUrl = (window.userAvatarCache || {})[(sender||'').toLowerCase()]
                 || (window.friendAvatarCache || {})[(sender||'').toLowerCase()];

    var avatarStyle   = avatarUrl ? 'background-image:url(' + avatarUrl + ');background-size:cover;background-position:center;' : '';
    var avatarContent = avatarUrl ? '' : initial;

    var div = document.createElement('div');
    div.className = 'dm-msg' + (isOwn ? ' dm-msg-own' : '');
    div.innerHTML = [
      '<div class="dm-msg-avatar msg-avatar" data-username="' + esc(sender) + '" style="' + avatarStyle + '">' + esc(avatarContent) + '</div>',
      '<div class="dm-msg-body">',
        '<div class="dm-msg-meta">',
          '<span class="dm-msg-name">' + esc(sender) + '</span>',
          '<span class="dm-msg-time">' + formatTime(ts) + '</span>',
        '</div>',
        '<div class="dm-msg-text">' + esc(text) + '</div>',
      '</div>'
    ].join('');

    area.appendChild(div);

    var atBottom = area.scrollTop + area.clientHeight >= area.scrollHeight - 60;
    if (atBottom || isOwn) {
      requestAnimationFrame(function() { area.scrollTop = area.scrollHeight; });
    }
  }

  /* ─── Renderizar lote (histórico) ────────────────────────────────────── */
  function renderDmHistory(messages) {
    var area = document.getElementById('pcs-messages-area');
    if (!area) return;
    area.innerHTML = '';
    if (!messages || messages.length === 0) {
      area.innerHTML = '<div class="dm-empty-state" id="pcs-empty-state"><span>💬</span><p>Sem mensagens ainda. Diga olá!</p></div>';
      return;
    }
    messages.forEach(renderDmMessage);
    area.scrollTop = area.scrollHeight;
  }

  /* ─── Enviar mensagem ─────────────────────────────────────────────────── */
  function sendMessage() {
    var input = document.getElementById('pcs-message-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || !_currentDmUser) return;
    if (text.length > 4000) {
      if (typeof showToast === 'function') showToast('⚠️ Mensagem muito longa (máx 4000 caracteres)');
      return;
    }

    closeEmojiPicker();

    var msg = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      from: myUsername(),
      to: _currentDmUser,
      text: text,
      timestamp: Date.now()
    };

    renderDmMessage(msg);
    appendLocalHistory(_currentDmUser, msg);

    if (window.socket && window.socket.connected) {
      window.socket.emit('dm:message', { from: msg.from, to: msg.to, text: msg.text, id: msg.id });
    }

    input.value = '';
    input.style.height = 'auto';
    var counter = document.getElementById('pcs-char-counter');
    if (counter) counter.textContent = '0/4000';
    _isTyping = false;
  }

  /* ─── Indicador de digitação ─────────────────────────────────────────── */
  var _typingHideTimer = null;
  function showTyping(fromUser) {
    if (fromUser !== _currentDmUser) return;
    var el = document.getElementById('pcs-typing-indicator');
    if (!el) return;
    el.textContent = esc(fromUser) + ' está digitando...';
    clearTimeout(_typingHideTimer);
    _typingHideTimer = setTimeout(function() { el.textContent = ''; }, 3000);
  }

  /* ─── Registrar listeners de socket ──────────────────────────────────── */
  function bindSocketEvents(socket) {
    if (socket._pcsEventsBound) return;
    socket._pcsEventsBound = true;

    socket.on('dm:history', function(data) {
      if (!data) return;
      var partner = data.with || '';
      if (partner.toLowerCase() !== (_currentDmUser || '').toLowerCase()) return;
      var serverMsgs = data.messages || [];
      var localMsgs  = loadLocalHistory(partner);
      var seen = {}, merged = [];
      serverMsgs.concat(localMsgs).forEach(function(m) {
        var key = m.id || (m.from + m.timestamp);
        if (!seen[key]) { seen[key] = true; merged.push(m); }
      });
      merged.sort(function(a,b){ return (a.timestamp||0)-(b.timestamp||0); });
      saveLocalHistory(partner, merged);
      renderDmHistory(merged);
    });

    socket.on('dm:message', function(msg) {
      if (!msg) return;
      var sender = (msg.from || msg.username || '').toLowerCase();
      var me     = myUsername().toLowerCase();
      if (sender === me) return;

      appendLocalHistory(sender, msg);

      if (_currentDmUser && sender === _currentDmUser.toLowerCase()) {
        renderDmMessage(msg);
        if (window.socket && window.socket.connected) socket.emit('dm:read', { from: _currentDmUser });
      } else {
        if (typeof showToast === 'function') {
          showToast('💬 ' + (msg.from || 'Alguém') + ': ' + (msg.text || '').substring(0, 60));
        }
      }
    });

    socket.on('dm:message:sent', function(msg) {
      if (!msg) return;
      appendLocalHistory(msg.to || _currentDmUser || '', msg);
    });

    socket.on('dm:typing', function(data) {
      if (!data || !data.from) return;
      showTyping(data.from);
    });

    socket.on('connect', function() {
      socket._pcsEventsBound = false;
      bindSocketEvents(socket);
      if (_currentDmUser) {
        _historyLoaded[_currentDmUser] = false;
        requestHistory(_currentDmUser);
      }
    });
  }

  /* ─── Aguardar socket e inicializar ──────────────────────────────────── */
  function waitForSocketAndInit() {
    if (window.socket) {
      bindSocketEvents(window.socket);
    } else {
      var timer = setInterval(function() {
        if (window.socket) {
          clearInterval(timer);
          bindSocketEvents(window.socket);
        }
      }, 300);
      setTimeout(function() { clearInterval(timer); }, 20000);
    }
  }

  /* ─── Expor funções globais ───────────────────────────────────────────── */
  window.openDmChat      = openDmChat;
  window.openPrivateChat = openDmChat;
  window.closeDmChat     = closeDmChat;
  window.renderDmMessages = renderDmHistory;
  window.sendDmMessage   = sendMessage;

  Object.defineProperty(window, 'currentDmUser', {
    get: function() { return _currentDmUser; },
    set: function(v) { _currentDmUser = v; },
    configurable: true
  });

  /* ─── Init ────────────────────────────────────────────────────────────── */
  function init() {
    injectPrivateChatStyles();
    createModal();
    waitForSocketAndInit();

    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-dm-user]');
      if (btn && btn.dataset.dmUser) { openDmChat(btn.dataset.dmUser); return; }
      var dmBtn = e.target.closest('.btn-dm');
      if (dmBtn) {
        var uname = dmBtn.dataset.username || dmBtn.dataset.user || dmBtn.getAttribute('data-username');
        if (uname) openDmChat(uname);
      }
    });

    console.log('[PCS] v2 carregado — barra moderna + emoji picker ativo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
