(function () {
  'use strict';

  function criarBotao() {
    var btn = document.createElement('div');
    btn.id = 'btn-submit-community';
    btn.setAttribute('style',
      'display:flex !important;' +
      'align-items:center !important;' +
      'gap:10px !important;' +
      'background:rgba(0,255,200,0.08) !important;' +
      'border:2px solid rgba(0,255,200,0.55) !important;' +
      'border-radius:12px !important;' +
      'padding:10px 20px !important;' +
      'cursor:pointer !important;' +
      'transition:all 0.2s !important;' +
      'flex-shrink:0 !important;' +
      'margin-left:auto !important;' +
      'user-select:none !important;'
    );
    btn.innerHTML =
      '<span style="font-size:22px;line-height:1;">📤</span>' +
      '<div>' +
        '<div style="color:#00ffc8;font-size:14px;font-weight:700;line-height:1.3;">Enviar Comunidade</div>' +
        '<div style="color:#888;font-size:11px;margin-top:2px;">Envie para análise da staff</div>' +
      '</div>';

    btn.addEventListener('mouseenter', function () {
      btn.style.setProperty('background', 'rgba(0,255,200,0.18)', 'important');
      btn.style.setProperty('border-color', 'rgba(0,255,200,0.85)', 'important');
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.setProperty('background', 'rgba(0,255,200,0.08)', 'important');
      btn.style.setProperty('border-color', 'rgba(0,255,200,0.55)', 'important');
    });
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (typeof window.openSubmitCommunityModal === 'function') {
        window.openSubmitCommunityModal();
      } else {
        // fallback: dispara evento de clique delegado
        document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, target: btn }));
      }
    });

    return btn;
  }

  function injetarBotao() {
    var headings = document.querySelectorAll('h3');
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if (h.textContent.indexOf('MINHAS COMUNIDADES') === -1) continue;

      var pai = h.parentElement;
      if (!pai) continue;

      // Caso 1: pai já tem o botão → apenas garante espaçamento correto
      var existente = pai.querySelector('#btn-submit-community') ||
        (pai.parentElement && pai.parentElement.querySelector('#btn-submit-community'));
      if (existente) {
        // Garante margin-left:auto no botão existente para empurrar para a direita
        if (existente.style.marginLeft !== 'auto') {
          existente.style.setProperty('margin-left', 'auto', 'important');
        }
        // Garante que o wrapper pai tem width:100%
        if (pai.style.display === 'flex' || pai.style.display === '') {
          pai.style.setProperty('width', '100%', 'important');
        }
        continue;
      }

      // Caso 2: botão ainda não existe → cria wrapper e injeta
      var wrapper = document.createElement('div');
      wrapper.id = 'submit-community-header-row';
      wrapper.setAttribute('style',
        'display:flex !important;' +
        'align-items:center !important;' +
        'width:100% !important;' +
        'margin-bottom:16px !important;'
      );

      h.style.margin = '0';
      h.style.setProperty('flex-shrink', '0', 'important');
      h.parentNode.insertBefore(wrapper, h);
      wrapper.appendChild(h);
      wrapper.appendChild(criarBotao());

      console.log('[enviar-comunidade] Botão injetado ao lado de MINHAS COMUNIDADES');
    }
  }

  var _debounceTimer = null;
  function debounceInjetar() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(injetarBotao, 80);
  }

  var observer = new MutationObserver(debounceInjetar);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injetarBotao);
  } else {
    injetarBotao();
  }

  [300, 700, 1200, 2000, 3000].forEach(function (t) {
    setTimeout(injetarBotao, t);
  });
})();
