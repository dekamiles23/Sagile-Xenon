// Debug para shorts - injeta logs nos handlers existentes
(function() {
  console.log('[SHORTS-DEBUG] Iniciando debug de shorts...');

  // Sobrescreve addShortCard para adicionar logs
  var originalAddShortCard = window.addShortCard;
  window.addShortCard = function(shortData, prepend) {
    console.log('[SHORTS-DEBUG] addShortCard chamado:', shortData.id, shortData.title, 'prepend:', prepend);
    var container = document.getElementById('shorts-container');
    console.log('[SHORTS-DEBUG] Container existe:', !!container);
    if (container) {
      console.log('[SHORTS-DEBUG] Container tem', container.children.length, 'filhos');
    }
    if (originalAddShortCard) {
      return originalAddShortCard(shortData, prepend);
    }
  };

  // Adiciona logs aos eventos de socket
  if (window.socket) {
    window.socket.on('shorts:history', function(shortsList) {
      console.log('[SHORTS-DEBUG] shorts:history recebido:', shortsList.length, 'itens');
      console.log('[SHORTS-DEBUG] Dados:', shortsList);
    });

    window.socket.on('short:new', function(shortData) {
      console.log('[SHORTS-DEBUG] short:new recebido:', shortData);
    });
  } else {
    console.warn('[SHORTS-DEBUG] Socket não disponível ainda');
  }

  console.log('[SHORTS-DEBUG] Debug carregado');
})();
