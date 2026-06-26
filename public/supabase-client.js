// ================================================
// CLIENTE SUPABASE - Integração Frontend
// ================================================

const SUPABASE_URL = 'https://mescdtlvpqblhlqtvnlm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtZXNjZHRsdnBxYmxobHF0dm5sbSIsInJlZiI6InFwRWZSbGRNUE1rUGNrVkMtcFVJcF9uV05HeUU5TnEiLCJpYXQiOjE3MTk1MjQ4NDQsImV4cCI6MjAzNTA5MDg0NH0.sb_secret_GEsYmczQKJip2Ejvj7N06A_WFHHjXRq';

// Criar cliente Supabase
let supabaseClient = null;

try {
  if (typeof window.supabase === 'undefined') {
    console.error('❌ SDK do Supabase não está carregado');
    console.log('⚠️ Usando localStorage como fallback');
  } else {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase = supabaseClient;
    console.log('✅ Supabase client inicializado');
  }
} catch (err) {
  console.error('❌ Erro ao inicializar Supabase:', err);
  console.log('⚠️ Usando localStorage como fallback');
}

// Função auxiliar para obter o username atual
function getCurrentUsername() {
  return window.username || window.currentUsername || localStorage.getItem('username') || 'anonymous';
}

// ================================================
// FUNÇÕES DO DIÁRIO
// ================================================

async function saveDiaryEntry(entry) {
  try {
    const username = getCurrentUsername();
    
    const { data, error } = await supabase
      .from('diary_entries')
      .upsert({
        user_id: username,
        id: entry.id || null,
        title: entry.title,
        content: entry.content,
        category: entry.category,
        pinned: entry.pinned || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error('Erro ao salvar diário no Supabase:', error);
      console.log('⚠️ Usando localStorage como fallback');
      return saveDiaryEntryToLocal(entry);
    }

    return { success: true, data };
  } catch (err) {
    console.error('Erro ao salvar diário:', err);
    console.log('⚠️ Usando localStorage como fallback');
    return saveDiaryEntryToLocal(entry);
  }
}

function saveDiaryEntryToLocal(entry) {
  try {
    const username = getCurrentUsername();
    const key = `diary_${username}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (entry.id) {
      const index = existing.findIndex(e => e.id === entry.id);
      if (index !== -1) {
        existing[index] = { ...entry, updated_at: new Date().toISOString() };
      } else {
        existing.unshift({ ...entry, updated_at: new Date().toISOString() });
      }
    } else {
      const newEntry = {
        ...entry,
        id: Date.now().toString(),
        updated_at: new Date().toISOString(),
        created_at: entry.created_at || new Date().toISOString()
      };
      existing.unshift(newEntry);
    }
    
    localStorage.setItem(key, JSON.stringify(existing));
    return { success: true, data: existing };
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
    return { success: false, error: err };
  }
}

async function loadDiaryEntries() {
  try {
    const username = getCurrentUsername();
    
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', username)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar diário do Supabase:', error);
      console.log('⚠️ Usando localStorage como fallback');
      return loadDiaryEntriesFromLocal();
    }

    return { success: true, data };
  } catch (err) {
    console.error('Erro ao carregar diário:', err);
    console.log('⚠️ Usando localStorage como fallback');
    return loadDiaryEntriesFromLocal();
  }
}

function loadDiaryEntriesFromLocal() {
  try {
    const username = getCurrentUsername();
    const key = `diary_${username}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return { success: true, data };
  } catch (err) {
    console.error('Erro ao carregar do localStorage:', err);
    return { success: false, error: err };
  }
}

async function deleteDiaryEntry(entryId) {
  try {
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('Erro ao deletar diário:', error);
      return { success: false, error };
    }

    console.log('✅ Diário deletado');
    return { success: true };
  } catch (err) {
    console.error('Erro ao deletar diário:', err);
    return { success: false, error: err };
  }
}

// ================================================
// FUNÇÕES DA MÁQUINA DE ESCREVER
// ================================================

async function saveTypewriterEntry(entry) {
  if (!supabaseClient) {
    console.error('❌ Supabase client não está disponível');
    return { success: false, error: 'Supabase não inicializado' };
  }
  
  try {
    const username = window.username || window.currentUsername || 'anonymous';
    
    const { data, error } = await supabaseClient
      .from('typewriter_saves')
      .insert({
        user_id: username,
        save_count: entry.count,
        time: entry.time,
        status: entry.status,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao salvar máquina de escrever:', error);
      return { success: false, error };
    }

    console.log('✅ Máquina de escrever salva:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Erro ao salvar máquina de escrever:', err);
    return { success: false, error: err };
  }
}

async function loadTypewriterEntries() {
  if (!supabaseClient) {
    console.error('❌ Supabase client não está disponível');
    return { success: false, error: 'Supabase não inicializado' };
  }
  
  try {
    const username = window.username || window.currentUsername || 'anonymous';
    
    const { data, error } = await supabaseClient
      .from('typewriter_saves')
      .select('*')
      .eq('user_id', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar máquina de escrever:', error);
      return { success: false, error };
    }

    console.log('✅ Máquina de escrever carregada:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Erro ao carregar máquina de escrever:', err);
    return { success: false, error: err };
  }
}

// ================================================
// FUNÇÕES DE COMUNIDADES (via Socket)
// ================================================

function createCommunityViaSocket(community) {
  if (!window.socket || !window.socket.connected) {
    console.error('❌ Socket não conectado');
    return Promise.reject('Socket não conectado');
  }
  
  return new Promise((resolve, reject) => {
    window.socket.emit('community:suggest', { community });
    window.socket.once('suggested:new', (data) => {
      resolve({ success: true, data });
    });
  });
}

function getCommunitiesViaSocket() {
  if (!window.socket || !window.socket.connected) {
    console.error('❌ Socket não conectado');
    return Promise.reject('Socket não conectado');
  }
  
  return new Promise((resolve, reject) => {
    window.socket.emit('community:add-suggested');
    window.socket.once('suggested:communities', (data) => {
      resolve({ success: true, data });
    });
  });
}

// ================================================
// FUNÇÕES DE SERVIDORES (via Socket)
// ================================================

function createServerViaSocket(server) {
  if (!window.socket || !window.socket.connected) {
    console.error('❌ Socket não conectado');
    return Promise.reject('Socket não conectado');
  }
  
  return new Promise((resolve, reject) => {
    window.socket.emit('server:create', { server });
    window.socket.once('server:created', (data) => {
      resolve({ success: true, data });
    });
  });
}

function getServersViaSocket() {
  if (!window.socket || !window.socket.connected) {
    console.error('❌ Socket não conectado');
    return Promise.reject('Socket não conectado');
  }
  
  return new Promise((resolve, reject) => {
    window.socket.emit('server:list');
    window.socket.once('server:list', (data) => {
      resolve({ success: true, data });
    });
  });
}

// ================================================
// EXPORTAR FUNÇÕES PARA ESCOPO GLOBAL
// ================================================
window.saveDiaryEntry = saveDiaryEntry;
window.loadDiaryEntries = loadDiaryEntries;
window.deleteDiaryEntry = deleteDiaryEntry;
window.saveTypewriterEntry = saveTypewriterEntry;
window.loadTypewriterEntries = loadTypewriterEntries;
window.createCommunityViaSocket = createCommunityViaSocket;
window.getCommunitiesViaSocket = getCommunitiesViaSocket;
window.createServerViaSocket = createServerViaSocket;
window.getServersViaSocket = getServersViaSocket;
