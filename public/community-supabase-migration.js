
// Migração de comunidades para Supabase
window.loadCommunitiesFromSupabase = async function() {
 if(!window.supabase) return JSON.parse(localStorage.getItem('userCommunities')||'[]');
 try{
  const {data,error}=await window.supabase.from('communities').select('*').order('created_at');
  if(error) throw error;
  const communities=data||[];
  localStorage.setItem('userCommunities', JSON.stringify(communities));
  return communities;
 }catch(e){
  console.error('Erro carregando comunidades:',e);
  return JSON.parse(localStorage.getItem('userCommunities')||'[]');
 }
};

window.saveCommunityToSupabase = async function(community){
 if(!window.supabase) return false;
 try{
  const {error}=await window.supabase.from('communities').upsert(community,{onConflict:'id'});
  if(error) throw error;
  return true;
 }catch(e){ console.error(e); return false; }
};

window.saveCommunityPostToSupabase = async function(post){
 if(!window.supabase) return false;
 try{
  const {error}=await window.supabase.from('community_posts').insert(post);
  if(error) throw error;
  return true;
 }catch(e){ console.error(e); return false; }
};

document.addEventListener('DOMContentLoaded', async ()=>{
  await window.loadCommunitiesFromSupabase();
  if(window.renderUserCommunities) window.renderUserCommunities();
});
