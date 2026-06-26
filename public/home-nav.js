// ================================================
// NAVEGAÇÃO INÍCIO — carrega por último, sempre funciona
// ================================================
(function () {
  'use strict';

  function mountRail() {
    const rail = document.getElementById('servers-rail');
    if (!rail) return;
    if (rail.parentElement !== document.body) {
      document.body.appendChild(rail);
    }
    rail.style.setProperty('z-index', '2147483646', 'important');
    rail.style.setProperty('pointer-events', 'auto', 'important');
    rail.style.setProperty('position', 'fixed', 'important');
    rail.style.setProperty('bottom', '0', 'important');
  }
  window.__zxMountRail = mountRail;

  function resetNavbar() {
    const navbar = document.querySelector('.main-area > .navbar');
    if (!navbar) return;
    navbar.removeAttribute('style');
    navbar.style.setProperty('display', 'flex', 'important');
    navbar.style.setProperty('visibility', 'visible', 'important');
    navbar.style.setProperty('opacity', '1', 'important');
    navbar.style.setProperty('position', 'relative', 'important');
    navbar.style.setProperty('height', 'auto', 'important');
    navbar.style.setProperty('width', '100%', 'important');
    navbar.style.setProperty('pointer-events', 'auto', 'important');
  }

  function forceHide(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
  }

  function forceShowDiscover() {
    const el = document.getElementById('discover-view');
    if (!el) return;
    el.classList.remove('hidden');
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('opacity');
    el.style.removeProperty('position');
    el.style.removeProperty('width');
    el.style.removeProperty('height');
    el.style.setProperty('display', 'flex', 'important');
  }

  function goHomeFallback() {
    document.body.classList.remove('server-body', 'dm-active', 'dm-view-active', 'dm-mode');

    const sidebar = document.getElementById('server-sidebar');
    if (sidebar) {
      sidebar.classList.add('hidden');
      sidebar.removeAttribute('style');
      sidebar.style.setProperty('display', 'none', 'important');
    }

    ['chat-view', 'voice-view', 'forum-view', 'announcement-view', 'dm-view', 'typewriter-view', 'post-view'].forEach(forceHide);
    forceShowDiscover();
    resetNavbar();

    window.currentServerId = null;
    window.currentChannel = null;

    document.querySelectorAll('.server-rail-icon').forEach(e => e.classList.remove('active'));
    document.getElementById('btn-home')?.classList.add('active');
  }

  let _homeBusy = false;

  window.__zxGoHome = function (e) {
    if (_homeBusy) return;
    _homeBusy = true;
    setTimeout(function () { _homeBusy = false; }, 350);

    if (e) {
      e.preventDefault();
    }

    mountRail();

    try {
      if (typeof window.goHome === 'function') {
        window.goHome();
      } else {
        goHomeFallback();
      }
    } catch (err) {
      console.error('[home-nav] Erro ao voltar ao início:', err);
      goHomeFallback();
    }

    document.dispatchEvent(new CustomEvent('zx:home'));
  };

  function bindHome() {
    mountRail();
    const btn = document.getElementById('btn-home');
    if (!btn) return;
    btn.style.cursor = 'pointer';
    btn.style.pointerEvents = 'auto';
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#btn-home')) return;
    window.__zxGoHome(e);
  });

  bindHome();
  document.addEventListener('DOMContentLoaded', bindHome);
  window.addEventListener('load', bindHome);

  // Se algum script recolocar a rail dentro de #app, move de volta para o body
  const railObserver = new MutationObserver(mountRail);
  railObserver.observe(document.body, { childList: true, subtree: true });
})();
