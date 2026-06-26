// ================================================
// SISTEMA DE EMOJIS SEPARADO - NÃO BUGA MAIS
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // Guard: evita carregamento múltiplo
  if (window.__zx_emoji_system_loaded) {
    console.warn('emoji-system.js already loaded — skipping duplicate initialization');
    return;
  }
  window.__zx_emoji_system_loaded = true;

  const btnEmoji = document.getElementById('btn-emoji');
  const emojiPicker = document.getElementById('emoji-picker');
  const messageInput = document.getElementById('message-input');

  // Dados dos Emojis por Categoria
  const emojiCategories = {
    smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
    gestures: ['👋','🤚','🖐','✋','✖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵'],
    objects: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','💯','⭐','✨','💫','⚡','🎈','🎉','🎊','🎁','🏆','💎','💵','💸','📱','💻','🎮','🎧','🎵','🎶'],
    nature: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐌','🐞','🐜'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌽','🥕','🥔','🍠','🥐','🥯','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕'],
    flags: ['🏳️','🏴','🏴‍☠️','🏁','🚩','🏳️‍🌈','🇧🇷','🇺🇸','🇪🇸','🇫🇷','🇩🇪','🇮🇹','🇯🇵','🇨🇳','🇰🇷','🇷🇺','🇦🇷','🇵🇹','🇬🇧','🇦🇺']
  };

  // Carregar emojis personalizados do localStorage
  function loadCustomEmojis() {
    try {
      return JSON.parse(localStorage.getItem('customEmojis') || '[]');
    } catch {
      return [];
    }
  }

  // Salvar emoji personalizado
  function saveCustomEmoji(imageData) {
    const customEmojis = loadCustomEmojis();
    customEmojis.push({
      id: Date.now(),
      data: imageData,
      addedAt: Date.now()
    });
    localStorage.setItem('customEmojis', JSON.stringify(customEmojis));
    return customEmojis;
  }

  // Deletar emoji personalizado
  function deleteCustomEmoji(id) {
    let customEmojis = loadCustomEmojis();
    customEmojis = customEmojis.filter(e => e.id !== id);
    localStorage.setItem('customEmojis', JSON.stringify(customEmojis));
    renderEmojiCategory('custom');
  }

  // Inserir texto na posição do cursor
  function insertAtCursor(text) {
    const start = messageInput.selectionStart;
    const end = messageInput.selectionEnd;
    const value = messageInput.value;
    
    messageInput.value = value.substring(0, start) + text + value.substring(end);
    messageInput.selectionStart = messageInput.selectionEnd = start + text.length;
    messageInput.focus();
  }

  // Renderizar categoria de emoji
  function renderEmojiCategory(category) {
    const container = emojiPicker.querySelector('.emoji-grid-container');
    
    if (category === 'custom') {
      const customEmojis = loadCustomEmojis();
      
      if (customEmojis.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #888;">
            <div style="font-size: 48px; margin-bottom: 12px;">⭐</div>
            <div style="font-size: 14px; margin-bottom: 8px;">Nenhum emoji personalizado</div>
            <div style="font-size: 12px;">Clique no botão + para adicionar seus próprios emojis</div>
          </div>
        `;
        return;
      }
      
      container.innerHTML = `<div class="emoji-grid">
        ${customEmojis.map(e => `
          <button class="emoji-item custom-emoji" data-id="${e.id}">
            <img src="${e.data}" alt="custom emoji" />
            <span class="emoji-delete-btn" data-id="${e.id}">✕</span>
          </button>
        `).join('')}
      </div>`;
      
      // Eventos de clique nos emojis customizados
      container.querySelectorAll('.emoji-item.custom-emoji').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (e.target.classList.contains('emoji-delete-btn')) {
            e.stopPropagation();
            deleteCustomEmoji(parseInt(e.target.dataset.id));
            return;
          }
          
          const img = btn.querySelector('img');
          
          // ✅ CORREÇÃO: Enviar o emoji DIRETAMENTE no chat
          const canal = localStorage.getItem('currentChannel') || 'geral';
          const usuario = localStorage.getItem('userNickname') || localStorage.getItem('username') || 'Usuário';
          
          const mensagem = {
            id: Date.now(),
            text: img.src,
            username: usuario,
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            type: 'emoji',
            channel: canal
          };

          // Salvar no localStorage
          const chave = `mensagens_${canal}`;
          const lista = JSON.parse(localStorage.getItem(chave) || '[]');
          lista.push(mensagem);
          localStorage.setItem(chave, JSON.stringify(lista));

          // Enviar em tempo real
          if (typeof socket !== 'undefined' && socket) {
            socket.emit('message', mensagem);
          }

          // Mostrar na tela IMEDIATAMENTE
          const area = document.getElementById('messages-area');
          if (area) {
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `
              <div class="msg-avatar">${usuario.charAt(0).toUpperCase()}</div>
              <div class="msg-body">
                <div class="msg-meta">
                  <span class="msg-username">${usuario}</span>
                  <span class="msg-time">${mensagem.time}</span>
                </div>
                <div class="msg-text"><img src="${img.src}" style="max-height: 80px; max-width: 200px;" alt="emoji" /></div>
              </div>
            `;
            area.appendChild(div);
            area.scrollTop = area.scrollHeight;
          }

          closeAllPickers();
        });
      });
      
    } else {
      const emojis = emojiCategories[category] || [];
      
      container.innerHTML = `<div class="emoji-grid">
        ${emojis.map(e => `<button class="emoji-item">${e}</button>`).join('')}
      </div>`;
      
      container.querySelectorAll('.emoji-item').forEach(btn => {
        btn.addEventListener('click', () => {
          // ✅ CORREÇÃO: Enviar emoji normal DIRETAMENTE
          const canal = localStorage.getItem('currentChannel') || 'geral';
          const usuario = localStorage.getItem('userNickname') || localStorage.getItem('username') || 'Usuário';
          
          const mensagem = {
            id: Date.now(),
            text: btn.textContent,
            username: usuario,
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            type: 'texto',
            channel: canal
          };

          // Salvar no localStorage
          const chave = `mensagens_${canal}`;
          const lista = JSON.parse(localStorage.getItem(chave) || '[]');
          lista.push(mensagem);
          localStorage.setItem(chave, JSON.stringify(lista));

          // Enviar em tempo real
          if (typeof socket !== 'undefined' && socket) {
            socket.emit('message', mensagem);
          }

          // Mostrar na tela IMEDIATAMENTE
          const area = document.getElementById('messages-area');
          if (area) {
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `
              <div class="msg-avatar">${usuario.charAt(0).toUpperCase()}</div>
              <div class="msg-body">
                <div class="msg-meta">
                  <span class="msg-username">${usuario}</span>
                  <span class="msg-time">${mensagem.time}</span>
                </div>
                <div class="msg-text">${btn.textContent}</div>
              </div>
            `;
            area.appendChild(div);
            area.scrollTop = area.scrollHeight;
          }

          closeAllPickers();
        });
      });
    }
  }

  // Fechar todos os pickers
  function closeAllPickers() {
    emojiPicker.classList.remove('active');
    const gifPicker = document.getElementById('gif-picker');
    if (gifPicker) gifPicker.classList.remove('active');
  }

  // Eventos das categorias
  emojiPicker.querySelectorAll('.emoji-category-btn:not(.emoji-add-btn)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEmojiCategory(btn.dataset.category);
    });
  });

  // Botão adicionar emoji customizado
  document.getElementById('btn-add-custom-emoji').addEventListener('click', (e) => {
    e.stopPropagation();
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        saveCustomEmoji(event.target.result);
        renderEmojiCategory('custom');
        
        // Selecionar automaticamente a aba custom
        emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
        emojiPicker.querySelector('[data-category="custom"]').classList.add('active');
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  });

  // Botão abrir emoji picker
  btnEmoji.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = emojiPicker.classList.contains('active');
    closeAllPickers();
    if (!isActive) {
      emojiPicker.classList.add('active');
      renderEmojiCategory('smileys');
    }
  });

  // Fechar picker ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chat-picker') && 
        !e.target.closest('#btn-emoji')) {
      emojiPicker.classList.remove('active');
    }
  });

  // ✅ CORREÇÃO: Garantir que o botão + funciona 100%
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-add-custom-emoji' || e.target.closest('#btn-add-custom-emoji')) {
      e.stopPropagation();
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          saveCustomEmoji(event.target.result);
          
          // Selecionar automaticamente a aba custom
          emojiPicker.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
          emojiPicker.querySelector('[data-category="custom"]').classList.add('active');
          
          renderEmojiCategory('custom');
          
          // Mostrar feedback visual
          const btn = document.getElementById('btn-add-custom-emoji');
          btn.style.background = 'rgba(0, 255, 136, 0.3)';
          btn.style.color = '#00ff88';
          setTimeout(() => {
            btn.style.background = '';
            btn.style.color = '';
          }, 300);
        };
        reader.readAsDataURL(file);
      };
      
      input.click();
    }
  }, true);

  // Fechar com ESC
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      emojiPicker.classList.remove('active');
    }
  });

  console.log('✅ Sistema de Emojis carregado com sucesso em arquivo separado!');

  // ✅ SISTEMA DE SALVAMENTO PERMANENTE DE MENSAGENS
  // ================================================
  function salvarMensagem(texto, tipo = 'texto') {
    const canal = localStorage.getItem('currentChannel') || 'geral';
    const usuario = localStorage.getItem('userNickname') || localStorage.getItem('username') || 'Usuário';
    
    const mensagem = {
      id: Date.now(),
      text: texto,
      username: usuario,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      type: tipo,
      channel: canal
    };

    // Salvar no localStorage
    const chave = `mensagens_${canal}`;
    const lista = JSON.parse(localStorage.getItem(chave) || '[]');
    lista.push(mensagem);
    localStorage.setItem(chave, JSON.stringify(lista));

    // Enviar em tempo real para todos os usuários
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('message', mensagem);
    }

    return mensagem;
  }

  // ✅ Carregar mensagens salvas ao abrir o canal
  function carregarMensagensSalvas() {
    const canal = localStorage.getItem('currentChannel') || 'geral';
    const chave = `mensagens_${canal}`;
    const lista = JSON.parse(localStorage.getItem(chave) || '[]');
    
    const area = document.getElementById('messages-area');
    if (!area) return;

    area.innerHTML = '';
    
    lista.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'message';
      
      // ✅ CORREÇÃO: Sempre verifica se é imagem, independente do tipo
      if (msg.text.startsWith('data:image') || msg.type === 'emoji' || msg.text.includes('base64')) {
        div.innerHTML = `
          <div class="msg-avatar">${msg.username.charAt(0).toUpperCase()}</div>
          <div class="msg-body">
            <div class="msg-meta">
              <span class="msg-username">${msg.username}</span>
              <span class="msg-time">${msg.time}</span>
            </div>
            <div class="msg-text"><img src="${msg.text}" style="max-height: 80px; max-width: 200px;" alt="emoji" /></div>
          </div>
        `;
      } else {
        div.innerHTML = `
          <div class="msg-avatar">${msg.username.charAt(0).toUpperCase()}</div>
          <div class="msg-body">
            <div class="msg-meta">
              <span class="msg-username">${msg.username}</span>
              <span class="msg-time">${msg.time}</span>
            </div>
            <div class="msg-text">${msg.text}</div>
          </div>
        `;
      }

      area.appendChild(div);
    });

    area.scrollTop = area.scrollHeight;
  }

  // ✅ Interceptar envio de mensagem para salvar
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const btnEnviar = document.getElementById('send-btn');
      const inputMsg = document.getElementById('message-input');

      if (btnEnviar) {
        const novoBtn = btnEnviar.cloneNode(true);
        btnEnviar.parentNode.replaceChild(novoBtn, btnEnviar);
        
        novoBtn.addEventListener('click', () => {
          const texto = inputMsg.value.trim();
          if (texto) {
            if (texto.startsWith('data:image')) {
              salvarMensagem(texto, 'emoji');
            } else {
              salvarMensagem(texto, 'texto');
            }
            carregarMensagensSalvas();
            inputMsg.value = '';
          }
        });
      }

      if (inputMsg) {
        inputMsg.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const texto = inputMsg.value.trim();
            if (texto) {
              if (texto.startsWith('data:image')) {
                salvarMensagem(texto, 'emoji');
              } else {
                salvarMensagem(texto, 'texto');
              }
              carregarMensagensSalvas();
              inputMsg.value = '';
            }
          }
        });
      }

      // Carregar mensagens ao iniciar
      carregarMensagensSalvas();

      // Atualizar quando mudar de canal
      window.addEventListener('storage', (e) => {
        if (e.key.includes('mensagens_')) {
          carregarMensagensSalvas();
        }
      });

    }, 500);
  });

});
