// ================================================
// SISTEMA MÁQUINA DE ESCREVER - Persistência no Supabase
// ================================================

let typewriterSaves = [];
let typewriterSaveCount = 0;
let useLocalStorage = false; // Fallback para localStorage se Supabase falhar

// ================================================
// INICIALIZAÇÃO
// ================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Tentar carregar do Supabase primeiro
  await loadTypewriterFromSupabase();
  
  // Se falhou, usar localStorage como fallback
  if (typewriterSaves.length === 0) {
    loadTypewriterFromLocalStorage();
  }
  
  // Configurar eventos da máquina de escrever
  setupTypewriterEvents();
});

// ================================================
// CARREGAR MÁQUINA DE ESCREVER DO SUPABASE
// ================================================
async function loadTypewriterFromSupabase() {
  try {
    const result = await window.loadTypewriterEntries();
    
    if (result.success && result.data) {
      typewriterSaves = result.data;
      
      // Atualizar contador baseado no maior save_count
      if (typewriterSaves.length > 0) {
        const maxCount = Math.max(...typewriterSaves.map(s => s.save_count));
        typewriterSaveCount = maxCount;
      }
      
      renderTypewriterSaves();
      console.log('✅ Máquina de escrever carregada do Supabase:', typewriterSaves.length, 'salvamentos');
    } else {
      console.log('⚠️ Nenhum salvamento encontrado no Supabase, tentando localStorage...');
      useLocalStorage = true;
    }
  } catch (err) {
    console.error('Erro ao carregar do Supabase:', err);
    console.log('⚠️ Usando localStorage como fallback');
    useLocalStorage = true;
  }
}

// ================================================
// CARREGAR DO LOCALSTORAGE (FALLBACK)
// ================================================
function loadTypewriterFromLocalStorage() {
  try {
    const saved = localStorage.getItem('typewriterSaves');
    if (saved) {
      typewriterSaves = JSON.parse(saved);
      typewriterSaveCount = parseInt(localStorage.getItem('typewriterSaveCount') || '0');
      renderTypewriterSaves();
      console.log('✅ Máquina de escrever carregada do localStorage:', typewriterSaves.length, 'salvamentos');
    }
  } catch (err) {
    console.error('Erro ao carregar do localStorage:', err);
    typewriterSaves = [];
    renderTypewriterSaves();
  }
}

// ================================================
// CONFIGURAR EVENTOS DA MÁQUINA DE ESCREVER
// ================================================
function setupTypewriterEvents() {
  const btnTypewriterSave = document.getElementById('btn-typewriter-save');
  
  if (btnTypewriterSave) {
    // Remover listener antigo se existir
    const newBtn = btnTypewriterSave.cloneNode(true);
    btnTypewriterSave.parentNode.replaceChild(newBtn, btnTypewriterSave);
    
    // Adicionar novo listener com persistência no Supabase
    newBtn.addEventListener('click', saveTypewriterToSupabase);
  }
}

// ================================================
// SALVAR MÁQUINA DE ESCREVER
// ================================================
async function saveTypewriterToSupabase() {
  typewriterSaveCount++;
  
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  // Tocar som da máquina de escrever
  try {
    const typeSound = new Audio('type.mp3');
    typeSound.volume = 0.7;
    typeSound.play().catch(() => {
      console.log('Som type.mp3 não encontrado');
    });
  } catch {}
  
  // Salvar no Supabase ou localStorage
  const entry = {
    count: typewriterSaveCount,
    time: time,
    status: 'Salvo!'
  };
  
  let saved = false;
  
  // Tentar salvar no Supabase primeiro
  if (!useLocalStorage) {
    try {
      const result = await window.saveTypewriterEntry(entry);
      
      if (result.success) {
        // Adicionar salvamento na lista
        typewriterSaves.unshift({
          id: result.data[0].id,
          save_count: typewriterSaveCount,
          time: time,
          status: 'Salvo!',
          created_at: new Date().toISOString()
        });
        
        saved = true;
        console.log('✅ Salvo no Supabase');
      } else {
        console.error('Erro ao salvar no Supabase:', result.error);
        console.log('⚠️ Tentando localStorage como fallback');
        useLocalStorage = true;
      }
    } catch (err) {
      console.error('Erro ao salvar no Supabase:', err);
      console.log('⚠️ Tentando localStorage como fallback');
      useLocalStorage = true;
    }
  }
  
  // Fallback para localStorage
  if (!saved) {
    try {
      typewriterSaves.unshift({
        id: Date.now().toString(), // ID temporário para localStorage
        save_count: typewriterSaveCount,
        time: time,
        status: 'Salvo! (local)',
        created_at: new Date().toISOString()
      });
      
      // Salvar no localStorage
      localStorage.setItem('typewriterSaves', JSON.stringify(typewriterSaves));
      localStorage.setItem('typewriterSaveCount', typewriterSaveCount.toString());
      
      saved = true;
      console.log('✅ Salvo no localStorage');
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
    }
  }
  
  // Atualizar tabela
  if (saved) {
    renderTypewriterSaves();
    
    // Efeito visual no botão
    const btn = document.getElementById('btn-typewriter-save');
    if (btn) {
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
      }, 100);
    }
    
    showToast(`💾 Salvamento #${typewriterSaveCount} realizado!`);
  } else {
    showToast('❌ Erro ao salvar');
  }
}

// ================================================
// RENDERIZAR SALVAMENTOS
// ================================================
function renderTypewriterSaves() {
  const typewriterSavesList = document.getElementById('typewriter-saves-list');
  if (!typewriterSavesList) return;
  
  if (typewriterSaves.length === 0) {
    typewriterSavesList.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #888;">
        Nenhum salvamento ainda. Clique no botão acima!
      </div>
    `;
    return;
  }
  
  typewriterSavesList.innerHTML = typewriterSaves.map(save => {
    const date = new Date(save.created_at);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const fullTime = `${dateStr} ${save.time}`;
    
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 1rem; border-bottom: 1px solid rgba(255,0,255,0.1);">
        <div>${fullTime}</div>
        <div>#${save.save_count}</div>
        <div style="color: #00ff88;">${save.status}</div>
      </div>
    `;
  }).join('');
}

// ================================================
// EXPORTAR PARA ESCOPO GLOBAL
// ================================================
window.renderTypewriterSaves = renderTypewriterSaves;
