/**
 * supabase-backend.js - Integração Supabase no Backend
 * Uso: require('./supabase-backend')
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mescdtlvpqblhlqtvnlm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_GEsYmczQKJip2Ejvj7N06A_WFHHjXRq';

let supabase = null;

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('[SUPABASE] Backend client inicializado');
} catch (err) {
  console.error('[SUPABASE] Erro ao inicializar:', err.message);
}

// ================================================
// COMUNIDADES
// ================================================

async function getCommunities() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SUPABASE] Erro ao buscar comunidades:', err.message);
    return [];
  }
}

async function createCommunity(community) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('communities')
      .insert({
        id: community.id,
        name: community.name,
        description: community.description,
        icon_url: community.iconUrl,
        banner_url: community.bannerUrl,
        created_by: community.createdBy,
        member_count: community.memberCount || 0
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao criar comunidade:', err.message);
    return null;
  }
}

async function updateCommunity(id, updates) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao atualizar comunidade:', err.message);
    return null;
  }
}

async function deleteCommunity(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[SUPABASE] Erro ao deletar comunidade:', err.message);
    return false;
  }
}

// ================================================
// SERVIDORES
// ================================================

async function getServers() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('servers')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SUPABASE] Erro ao buscar servidores:', err.message);
    return [];
  }
}

async function createServer(server) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('servers')
      .insert({
        id: server.id,
        name: server.name,
        description: server.description,
        icon_url: server.iconUrl,
        owner: server.owner,
        member_count: server.memberCount || 0
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao criar servidor:', err.message);
    return null;
  }
}

async function updateServer(id, updates) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('servers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao atualizar servidor:', err.message);
    return null;
  }
}

async function deleteServer(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('servers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[SUPABASE] Erro ao deletar servidor:', err.message);
    return false;
  }
}

// ================================================
// CANAIS DE SERVIDOR
// ================================================

async function getServerChannels(serverId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('server_channels')
      .select('*')
      .eq('server_id', serverId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SUPABASE] Erro ao buscar canais:', err.message);
    return [];
  }
}

async function createServerChannel(channel) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('server_channels')
      .insert({
        id: channel.id,
        server_id: channel.serverId,
        name: channel.name,
        type: channel.type || 'text',
        description: channel.description
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao criar canal:', err.message);
    return null;
  }
}

async function deleteServerChannel(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('server_channels')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[SUPABASE] Erro ao deletar canal:', err.message);
    return false;
  }
}

// ================================================
// SHORTS
// ================================================

async function getShorts() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('shorts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SUPABASE] Erro ao buscar shorts:', err.message);
    return [];
  }
}

async function createShort(short) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('shorts')
      .insert({
        id: short.id,
        title: short.title,
        description: short.description,
        file_url: short.fileUrl,
        file_type: short.fileType || 'image',
        username: short.username,
        tags: short.tags || []
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao criar short:', err.message);
    return null;
  }
}

async function deleteShort(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('shorts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[SUPABASE] Erro ao deletar short:', err.message);
    return false;
  }
}

// ================================================
// AMIZADES
// ================================================

async function getFriends(username) {
  if (!supabase) return [];
  // Normaliza para minúsculas para evitar problemas de case sensitivity
  const uname = (username || '').toLowerCase();
  if (!uname) return [];
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('user_a, user_b')
      .or(`user_a.eq.${uname},user_b.eq.${uname}`);
    if (error) throw error;
    return (data || []).map(row =>
      row.user_a === uname ? row.user_b : row.user_a
    );
  } catch (err) {
    console.error('[SUPABASE] Erro ao buscar amigos:', err.message);
    return [];
  }
}

async function addFriendship(userA, userB) {
  if (!supabase) return;
  // Normaliza para minúsculas e garante ordem alfabética para o UNIQUE(user_a, user_b)
  const [a, b] = [userA.toLowerCase(), userB.toLowerCase()].sort();
  try {
    await supabase
      .from('friendships')
      .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b', ignoreDuplicates: true });
  } catch (err) {
    console.error('[SUPABASE] Erro ao salvar amizade:', err.message);
  }
}

async function removeFriendship(userA, userB) {
  if (!supabase) return;
  // Normaliza para minúsculas para garantir que encontra o registro
  const [a, b] = [userA.toLowerCase(), userB.toLowerCase()].sort();
  try {
    await supabase
      .from('friendships')
      .delete()
      .eq('user_a', a)
      .eq('user_b', b);
  } catch (err) {
    console.error('[SUPABASE] Erro ao remover amizade:', err.message);
  }
}

// ================================================
// MENSAGENS PRIVADAS (DMs)
// ================================================

async function saveDmMessage(msg) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('dm_messages')
      .insert({
        id: msg.id,
        from_user: msg.from,
        to_user: msg.to,
        text: msg.text || '',
        avatar: msg.avatar || null,
        type: msg.type || 'text',
        media: msg.media || null,
        created_at: new Date(msg.timestamp || Date.now()).toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao salvar DM:', err.message);
    return null;
  }
}

async function getDmHistory(userA, userB, limit = 100) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('dm_messages')
      .select('*')
      .or(
        `and(from_user.eq.${userA},to_user.eq.${userB}),and(from_user.eq.${userB},to_user.eq.${userA})`
      )
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      from: row.from_user,
      to: row.to_user,
      text: row.text,
      avatar: row.avatar,
      type: row.type || 'text',
      media: row.media,
      timestamp: new Date(row.created_at).getTime(),
      time: new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }));
  } catch (err) {
    console.error('[SUPABASE] Erro ao buscar histórico DM:', err.message);
    return [];
  }
}

module.exports = {
  supabase,
  getCommunities,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getServers,
  createServer,
  updateServer,
  deleteServer,
  getServerChannels,
  createServerChannel,
  deleteServerChannel,
  getShorts,
  createShort,
  deleteShort,
  saveDmMessage,
  getDmHistory,
  getFriends,
  addFriendship,
  removeFriendship
};
