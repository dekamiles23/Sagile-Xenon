// ================================================
// SISTEMA DO DIÁRIO - Persistência no Supabase
// ================================================

let diaryEntries = [];
let currentDiaryEntry = null;
let autoSaveTimeout = null;

// ================================================
// INICIALIZAÇÃO
// ================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Carregar anotações do Supabase ao iniciar
  await loadDiaryFromSupabase();
  
  // Configurar eventos do diário
  setupDiaryEvents();
});

// ================================================
// CARREGAR DIÁRIO DO SUPABASE
// ================================================
async function loadDiaryFromSupabase() {
  try {
    const result = await window.loadDiaryEntries();
    
    if (result.success && result.data) {
      diaryEntries = result.data;
      renderDiaryList();
      console.log('✅ Diário carregado do Supabase:', diaryEntries.length, 'anotações');
    } else {
      console.log('⚠️ Nenhuma anotação encontrada ou erro ao carregar');
      diaryEntries = [];
      renderDiaryList();
    }
  } catch (err) {
    console.error('Erro ao carregar diário:', err);
    diaryEntries = [];
    renderDiaryList();
  }
}

// ================================================
// CONFIGURAR EVENTOS DO DIÁRIO
// ================================================
function setupDiaryEvents() {
  // Botão nova anotação
  const newBtn = document.getElementById('diary-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', createNewDiaryEntry);
  }
  
  // Botão salvar
  const saveBtn = document.getElementById('diary-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveCurrentDiaryEntry);
  }
  
  // Botão fixar
  const pinBtn = document.getElementById('diary-pin-btn');
  if (pinBtn) {
    pinBtn.addEventListener('click', togglePinDiaryEntry);
  }
  
  // Botão deletar
  const deleteBtn = document.getElementById('diary-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteCurrentDiaryEntry);
  }
  
  // Busca
  const searchInput = document.getElementById('diary-search');
  if (searchInput) {
    searchInput.addEventListener('input', filterDiaryEntries);
  }
  
  // Filtro de categoria
  const categoryFilter = document.getElementById('diary-category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterDiaryEntries);
  }
}

// ================================================
// CRIAR NOVA ANOTAÇÃO
// ================================================
function createNewDiaryEntry() {
  currentDiaryEntry = {
    id: null, // Será gerado pelo Supabase
    title: '',
    content: '',
    category: 'pessoal',
    pinned: false,
    created_at: new Date().toISOString()
  };
  
  // Limpar editor
  document.getElementById('diary-title').value = '';
  document.getElementById('diary-content').value = '';
  document.getElementById('diary-category').value = 'pessoal';
  
  // Atualizar UI
  updateDiaryEditorUI();
  
  showToast('📝 Nova anotação criada');
}

// ================================================
// SALVAR ANOTAÇÃO ATUAL
// ================================================
async function saveCurrentDiaryEntry() {
  console.log('💾 saveCurrentDiaryEntry chamada');
  
  if (!currentDiaryEntry) {
    console.log('❌ currentDiaryEntry é null');
    showToast('⚠️ Crie uma nova anotação primeiro');
    return;
  }
  
  const title = document.getElementById('diary-title').value;
  const content = document.getElementById('diary-content').value;
  const category = document.getElementById('diary-category').value;
  
  console.log('📝 Dados da anotação:', { title, content, category });
  
  // Atualizar entrada atual
  currentDiaryEntry.title = title;
  currentDiaryEntry.content = content;
  currentDiaryEntry.category = category;
  
  const statusEl = document.getElementById('diary-save-status');
  if (statusEl) {
    statusEl.textContent = 'Salvando...';
  }
  
  try {
    const result = await window.saveDiaryEntry(currentDiaryEntry);
    console.log('📊 Resultado do salvamento:', result);
    
    if (result.success) {
      console.log('✅ Salvamento bem-sucedido');
      console.log('📋 diaryEntries antes:', diaryEntries.length);
      
      // Se é uma nova entrada, atualizar o ID retornado pelo Supabase
      if (!currentDiaryEntry.id && result.data) {
        // O upsert pode retornar os dados inseridos/atualizados
        const returnedEntry = Array.isArray(result.data) ? result.data[0] : result.data;
        console.log('🔍 returnedEntry:', returnedEntry);
        
        if (returnedEntry && returnedEntry.id) {
          currentDiaryEntry.id = returnedEntry.id;
          console.log('🆔 ID atualizado:', currentDiaryEntry.id);
          
          // Adicionar à lista se não existe
          if (!diaryEntries.find(e => e.id === currentDiaryEntry.id)) {
            diaryEntries.unshift(currentDiaryEntry);
            console.log('➕ Anotação adicionada à lista');
          }
        }
      } else if (currentDiaryEntry.id) {
        // Entrada existente - atualizar na lista
        const index = diaryEntries.findIndex(e => e.id === currentDiaryEntry.id);
        if (index !== -1) {
          diaryEntries[index] = currentDiaryEntry;
          console.log('🔄 Anotação atualizada na lista');
        } else {
          // Se não encontrou, adicionar
          diaryEntries.unshift(currentDiaryEntry);
          console.log('➕ Anotação existente não encontrada, adicionando');
        }
      }
      
      console.log('📋 diaryEntries depois:', diaryEntries.length);
      
      if (statusEl) {
        statusEl.textContent = 'Salvo';
      }
      
      renderDiaryList();
      showToast('✅ Anotação salva');
    } else {
      console.error('❌ Erro ao salvar:', result.error);
      if (statusEl) {
        statusEl.textContent = 'Erro ao salvar';
      }
      showToast('❌ Erro ao salvar');
    }
  } catch (err) {
    console.error('❌ Erro ao salvar anotação:', err);
    const statusEl = document.getElementById('diary-save-status');
    if (statusEl) {
      statusEl.textContent = 'Erro ao salvar';
    }
    showToast('❌ Erro ao salvar');
  }
}

// ================================================
// CARREGAR ANOTAÇÃO PARA EDIÇÃO
// ================================================
function loadDiaryEntry(entry) {
  currentDiaryEntry = entry;
  
  document.getElementById('diary-title').value = entry.title || '';
  document.getElementById('diary-content').value = entry.content || '';
  document.getElementById('diary-category').value = entry.category || 'pessoal';
  
  updateDiaryEditorUI();
}

// ================================================
// FIXAR/DESFIXAR ANOTAÇÃO
// ================================================
async function togglePinDiaryEntry() {
  if (!currentDiaryEntry || !currentDiaryEntry.id) {
    return;
  }
  
  currentDiaryEntry.pinned = !currentDiaryEntry.pinned;
  
  await saveCurrentDiaryEntry();
  renderDiaryList();
  
  showToast(currentDiaryEntry.pinned ? '📌 Anotação fixada' : '📌 Anotação desfixada');
}

// ================================================
// DELETAR ANOTAÇÃO ATUAL
// ================================================
async function deleteCurrentDiaryEntry() {
  if (!currentDiaryEntry || !currentDiaryEntry.id) {
    showToast('⚠️ Selecione uma anotação para deletar');
    return;
  }
  
  if (!confirm('Tem certeza que deseja deletar esta anotação?')) {
    return;
  }
  
  try {
    const result = await window.deleteDiaryEntry(currentDiaryEntry.id);
    
    if (result.success) {
      // Remover da lista
      diaryEntries = diaryEntries.filter(e => e.id !== currentDiaryEntry.id);
      
      // Limpar editor
      currentDiaryEntry = null;
      document.getElementById('diary-title').value = '';
      document.getElementById('diary-content').value = '';
      document.getElementById('diary-category').value = 'pessoal';
      
      renderDiaryList();
      updateDiaryEditorUI();
      
      showToast('🗑 Anotação deletada');
    } else {
      showToast('❌ Erro ao deletar anotação');
    }
  } catch (err) {
    console.error('Erro ao deletar anotação:', err);
    showToast('❌ Erro ao deletar anotação');
  }
}

// ================================================
// RENDERIZAR LISTA DE ANOTAÇÕES
// ================================================
function renderDiaryList() {
  const listEl = document.getElementById('diary-list');
  if (!listEl) return;
  
  if (diaryEntries.length === 0) {
    listEl.innerHTML = '<div class="empty-state small">📖 Nenhuma anotação ainda</div>';
    return;
  }
  
  // Ordenar: fixadas primeiro, depois por data
  const sorted = [...diaryEntries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
  });
  
  listEl.innerHTML = sorted.map(entry => {
    const date = new Date(entry.updated_at || entry.created_at);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const categoryEmoji = {
      'pessoal': '📝',
      'trabalho': '💼',
      'ideias': '💡',
      'lembretes': '⏰'
    }[entry.category] || '📝';
    
    const isActive = currentDiaryEntry && currentDiaryEntry.id === entry.id;
    
    return `
      <div class="diary-item ${isActive ? 'active' : ''} ${entry.pinned ? 'pinned' : ''}" 
           data-id="${entry.id}"
           onclick="loadDiaryEntryById('${entry.id}')">
        <div class="diary-item-header">
          <span class="diary-item-category">${categoryEmoji}</span>
          ${entry.pinned ? '<span class="diary-item-pin">📌</span>' : ''}
        </div>
        <div class="diary-item-title">${entry.title || 'Sem título'}</div>
        <div class="diary-item-preview">${(entry.content || '').substring(0, 50)}...</div>
        <div class="diary-item-date">${dateStr} ${timeStr}</div>
      </div>
    `;
  }).join('');
}

// ================================================
// CARREGAR ANOTAÇÃO POR ID
// ================================================
function loadDiaryEntryById(id) {
  const entry = diaryEntries.find(e => e.id === id);
  if (entry) {
    loadDiaryEntry(entry);
    renderDiaryList(); // Atualizar seleção visual
  }
}

// ================================================
// FILTRAR ANOTAÇÕES
// ================================================
function filterDiaryEntries() {
  const search = document.getElementById('diary-search').value.toLowerCase();
  const category = document.getElementById('diary-category-filter').value;
  
  const items = document.querySelectorAll('.diary-item');
  
  items.forEach(item => {
    const id = item.dataset.id;
    const entry = diaryEntries.find(e => e.id === id);
    
    if (!entry) {
      item.style.display = 'none';
      return;
    }
    
    const matchesSearch = !search || 
      (entry.title && entry.title.toLowerCase().includes(search)) ||
      (entry.content && entry.content.toLowerCase().includes(search));
    
    const matchesCategory = !category || entry.category === category;
    
    item.style.display = matchesSearch && matchesCategory ? '' : 'none';
  });
}

// ================================================
// ATUALIZAR UI DO EDITOR
// ================================================
function updateDiaryEditorUI() {
  const pinBtn = document.getElementById('diary-pin-btn');
  const deleteBtn = document.getElementById('diary-delete-btn');
  
  if (currentDiaryEntry) {
    if (pinBtn) {
      pinBtn.textContent = currentDiaryEntry.pinned ? '📌 Desfixar' : '📌 Fixar';
      pinBtn.disabled = false;
    }
    if (deleteBtn) {
      deleteBtn.disabled = false;
    }
  } else {
    if (pinBtn) {
      pinBtn.textContent = '📌 Fixar';
      pinBtn.disabled = true;
    }
    if (deleteBtn) {
      deleteBtn.disabled = true;
    }
  }
}

// ================================================
// EXPORTAR PARA ESCOPO GLOBAL
// ================================================
window.loadDiaryEntryById = loadDiaryEntryById;
