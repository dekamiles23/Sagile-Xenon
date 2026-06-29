/**

 * ================================================

 * ✅ GERENCIADOR DE COMUNIDADES SUGERIDAS

 * Versão final pronta para integração direta

 * ================================================

 * 

 * Funciona DIRETAMENTE com a estrutura HTML existente

 * Nenhuma modificação necessária no HTML

 * Basta adicionar o script e funcionará

 */



console.log('🔍 [DEBUG] sugeridas-manager.js carregado');



(function() {

    'use strict';



    // Evitar inicialização múltipla

    if (window._sugeridasManagerInitialized) {

        console.log('⚠️ [SugeridasManager] Já inicializado, pulando');

        return;

    }

    window._sugeridasManagerInitialized = true;



    // ================================================

    // CONFIGURAÇÕES - AJUSTE AQUI SE PRECISAR

    // ================================================

    const CONFIG = {

        containerSugeridasId: 'suggested-communities-list',

        cardVazioId: 'suggested-empty-state',

        classeBotaoAdicionar: 'btn-adicionar-sugerida',

        atributoComunidadeId: 'data-community-id',

        storageKey: 'comunidades_sugeridas'

    };



    // Estado interno

    let comunidadesSugeridas = [];

    let _renderDebounceTimer = null;

    let _isRendering = false;



    /**

     * ✅ INICIALIZAÇÃO AUTOMÁTICA

     */

    function init() {

        // Configurar Socket.IO listeners para receber dados do servidor

        configurarSocketListeners();



        // Renderiza a seção de sugeridas

        renderizarSugeridas();



        // Adiciona eventos nos botões existentes

        adicionarEventosNosBotoes();



        // Observa novos botões que são criados dinamicamente

        observarNovosBotoes();



        console.log('✅ SugeridasManager carregado e funcionando!');

    }



    /**

     * Configura Socket.IO listeners para receber dados do servidor

     */

    function configurarSocketListeners() {

        if (!window.socket) {

            console.warn('⚠️ [SugeridasManager] Socket não disponível, tentando novamente em 500ms');

            // Limitar tentativas para evitar loop infinito

            if (!window._sugeridasRetryCount) window._sugeridasRetryCount = 0;

            window._sugeridasRetryCount++;

            if (window._sugeridasRetryCount < 20) { // Máximo 10 segundos (20 * 500ms)

                setTimeout(configurarSocketListeners, 500);

            } else {

                console.error('❌ [SugeridasManager] Socket não disponível após múltiplas tentativas. Verifique se o servidor está rodando.');

            }

            return;

        }



        // Evitar registrar listeners múltiplas vezes

        if (window._sugeridasListenersConfigured) {

            console.log('⚠️ [SugeridasManager] Listeners já configurados, pulando');

            return;

        }

        window._sugeridasListenersConfigured = true;



        // Solicitar lista ao conectar (e em reconexões)

        function requestSuggested() {

            window.socket.emit('community:get-suggested');

        }

        if (window.socket.connected) {

            requestSuggested();

        } else {

            window.socket.once('connect', requestSuggested);

        }

        window.socket.on('reconnect', requestSuggested);



        // Receber lista completa

        window.socket.on('suggested:communities', (communities) => {

            comunidadesSugeridas = communities || [];

            window.suggestedCommunities = comunidadesSugeridas;

            renderizarSugeridas();

            console.log('✅ [SugeridasManager] Lista de comunidades sugeridas recebida do servidor:', comunidadesSugeridas.length);

        });



        // Quando uma nova comunidade é adicionada

        window.socket.on('suggested:new', (community) => {

            console.log('🔍 [SugeridasManager] Evento suggested:new recebido:', community);

            console.log('🔍 [SugeridasManager] Lista atual antes de adicionar:', comunidadesSugeridas.map(c => c.id));

            if (!comunidadesSugeridas.find(c => c.id === community.id)) {

                comunidadesSugeridas.push(community);

                renderizarSugeridas();

                console.log('✅ [SugeridasManager] Nova comunidade sugerida adicionada:', community.name);

            } else {

                console.log('⚠️ [SugeridasManager] Comunidade já existe na lista:', community.name);

            }

        });



        // Quando uma comunidade é removida

        window.socket.on('suggested:removed', (data) => {

            const removedId = data.communityId || data.id;

            comunidadesSugeridas = comunidadesSugeridas.filter(c => c.id !== removedId);

            window.suggestedCommunities = comunidadesSugeridas;

            renderizarSugeridas();

            console.log('✅ [SugeridasManager] Comunidade sugerida removida:', removedId);

        });



        console.log('✅ [SugeridasManager] Socket.IO listeners configurados');

    }



    /**

     * Renderiza os cards no container da HOME (suggested-communities-container)

     */

    function renderizarSugeridasHome() {

        const homeContainer = document.getElementById('suggested-communities-container');

        if (!homeContainer) return;



        // Remove cards existentes (exceto o card vazio)

        homeContainer.querySelectorAll('[data-suggested-home-id]').forEach(c => c.remove());



        comunidadesSugeridas.forEach(comunidade => {

            const card = document.createElement('div');

            card.style.cssText = 'min-width:180px;height:280px;border-radius:16px;overflow:hidden;border:2px solid rgba(255,0,255,0.3);cursor:pointer;transition:all 0.2s;position:relative;flex-shrink:0;';

            card.dataset.suggestedHomeId = comunidade.id;



            if (comunidade.banner) {

                card.innerHTML = `

                    <img src="${comunidade.banner}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" />

                    <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.9));padding:16px;">

                        ${comunidade.icon ? `<img src="${comunidade.icon}" style="width:40px;height:40px;border-radius:10px;margin-bottom:6px;border:2px solid rgba(255,0,255,0.5);object-fit:cover;" />` : ''}

                        <div style="color:#fff;font-size:14px;font-weight:700;margin-bottom:2px;">${comunidade.name}</div>

                        <div style="color:#aaa;font-size:11px;">${comunidade.members || 1} membros</div>

                    </div>`;

            } else {

                card.innerHTML = `

                    <div style="width:100%;height:100%;background:linear-gradient(180deg,rgba(128,0,255,0.2),rgba(0,0,0,0.8));display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;padding:16px;">

                        ${comunidade.icon ? `<img src="${comunidade.icon}" style="width:56px;height:56px;border-radius:14px;border:2px solid rgba(255,0,255,0.5);object-fit:cover;" />` : '<div style="font-size:40px;opacity:0.7;">🌐</div>'}

                        <div style="color:#fff;font-size:14px;font-weight:700;">${comunidade.name}</div>

                        <div style="color:#aaa;font-size:11px;">${comunidade.members || 1} membros</div>

                    </div>`;

            }



            card.addEventListener('mouseenter', () => { card.style.transform='translateY(-4px)'; card.style.borderColor='rgba(255,0,255,0.6)'; card.style.boxShadow='0 10px 30px rgba(255,0,255,0.2)'; });

            card.addEventListener('mouseleave', () => { card.style.transform=''; card.style.borderColor='rgba(255,0,255,0.3)'; card.style.boxShadow=''; });

            card.addEventListener('click', () => {

                window.location.href = `community-page.html?id=${comunidade.id}&name=${encodeURIComponent(comunidade.name)}`;

            });



            // Insere antes do card vazio

            const emptyState = document.getElementById('suggested-empty-state');

            if (emptyState && homeContainer.contains(emptyState)) {

                homeContainer.insertBefore(card, emptyState);

            } else {

                homeContainer.appendChild(card);

            }

        });

    }



    /**

     * ✅ RENDERIZA A SEÇÃO DE SUGERIDAS (modal)

     */

    function renderizarSugeridas() {

        // Debounce para evitar renderizações múltiplas

        if (_renderDebounceTimer) {

            clearTimeout(_renderDebounceTimer);

        }



        _renderDebounceTimer = setTimeout(() => {

            if (_isRendering) {

                console.log('⚠️ [SugeridasManager] Já renderizando, pulando');

                return;

            }



            _isRendering = true;



            const container = document.getElementById(CONFIG.containerSugeridasId);

            if (!container) {

                console.warn('⚠️ [SugeridasManager] Container não encontrado:', CONFIG.containerSugeridasId);

                _isRendering = false;

                return;

            }



            console.log('🔍 [SugeridasManager] Renderizando comunidades sugeridas:', comunidadesSugeridas.length);



            // ✅ Remove todos os cards de comunidades existentes, mantém o card vazio

            container.querySelectorAll('[data-suggested-id]').forEach(card => card.remove());



            // ✅ Remove também cards duplicados sem o atributo data-suggested-id

            const existingCards = container.querySelectorAll('div');

            existingCards.forEach(card => {

                if (card.id !== CONFIG.cardVazioId) {

                    card.remove();

                }

            });



            // Adiciona TODAS as comunidades na lista, AO LADO do card vazio

            comunidadesSugeridas.forEach(comunidade => {

                // Verifica se já existe um card com este ID para evitar duplicatas

                if (container.querySelector(`[data-suggested-id="${comunidade.id}"]`)) {

                    console.log('⚠️ [SugeridasManager] Card já existe para comunidade:', comunidade.id);

                    return;

                }



                const card = criarCardComunidade(comunidade);

                card.dataset.suggestedId = comunidade.id;



                // Insere ANTES do card vazio, se o card vazio for filho do container

                const cardVazio = document.getElementById(CONFIG.cardVazioId);

                if (cardVazio && container.contains(cardVazio)) {

                    container.insertBefore(card, cardVazio);

                } else {

                    container.appendChild(card);

                }

            });



            console.log('✅ [SugeridasManager] Renderização concluída');

            renderizarSugeridasHome();



            // ✅ O CARD "Explore novas comunidades" FICA SEMPRE VISÍVEL, AO LADO DAS COMUNIDADES

            // ✅ NUNCA É REMOVIDO, NUNCA É SUBSTITUIDO

            if (!document.getElementById(CONFIG.cardVazioId)) {

                const cardVazio = document.createElement('div');

                cardVazio.id = CONFIG.cardVazioId;

                cardVazio.style.minWidth = '220px';

                cardVazio.style.height = '280px';

                cardVazio.style.borderRadius = '16px';

                cardVazio.style.overflow = 'hidden';

                cardVazio.style.border = '2px solid rgba(255, 0, 255, 0.3)';

                cardVazio.style.cursor = 'pointer';

                cardVazio.style.transition = 'all 0.2s';

                cardVazio.style.position = 'relative';



                cardVazio.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;opacity:0.4;"><div style="font-size:48px;">🏘️</div><div style="color:#888;font-size:13px;">Nenhuma comunidade</div></div>`;



                // ✅ Abre o modal diretamente

                cardVazio.addEventListener('click', () => {

                    const modal = document.getElementById('suggested-communities-modal');

                    if (modal) {

                        modal.classList.remove('hidden');

                        console.log('✅ Card clicado, abrindo modal');

                    }

                });



                // Efeito hover

                cardVazio.addEventListener('mouseenter', () => {

                    cardVazio.style.transform = 'translateY(-4px)';

                    cardVazio.style.borderColor = 'rgba(255, 0, 255, 0.6)';

                    cardVazio.style.boxShadow = '0 10px 30px rgba(255, 0, 255, 0.2)';

                });



                cardVazio.addEventListener('mouseleave', () => {

                    cardVazio.style.transform = 'translateY(0)';

                    cardVazio.style.borderColor = 'rgba(255, 0, 255, 0.3)';

                    cardVazio.style.boxShadow = 'none';

                });



                container.appendChild(cardVazio);

            }



            _isRendering = false;

        }, 100); // Debounce de 100ms

    }



    /**

     * Cria o card da comunidade

     */

    function criarCardComunidade(comunidade) {

        const card = document.createElement('div');

        

        // ✅ Proporção 9:16 (180px x 320px)

        card.style.minWidth = '180px';

        card.style.height = '320px';

        card.style.borderRadius = '16px';

        card.style.overflow = 'hidden';

        card.style.border = '2px solid rgba(255, 0, 255, 0.3)';

        card.style.cursor = 'pointer';

        card.style.transition = 'all 0.2s';

        card.style.position = 'relative';

        card.style.flexShrink = '0';



        // Efeito hover

        card.addEventListener('mouseenter', () => {

            card.style.transform = 'translateY(-4px)';

            card.style.borderColor = 'rgba(255, 0, 255, 0.6)';

            card.style.boxShadow = '0 10px 30px rgba(255, 0, 255, 0.2)';

        });



        card.addEventListener('mouseleave', () => {

            card.style.transform = 'translateY(0)';

            card.style.borderColor = 'rgba(255, 0, 255, 0.3)';

            card.style.boxShadow = 'none';

        });



        // ✅ MENU DE CONTEXTO BOTÃO DIREITO (SOMENTE DEV/STAFF)

        card.addEventListener('contextmenu', (e) => {

            e.preventDefault();

            e.stopPropagation();



            // Verifica se usuário é DEV ou STAFF

            const usuarioAtual = window.currentUser?.name || localStorage.getItem('currentUsername');

            const isDevOrStaff = ['demid', 'admin'].includes(usuarioAtual);



            if (!isDevOrStaff) return;



            // Remove menus existentes

            document.querySelectorAll('.community-ctx-menu').forEach(m => m.remove());



            const menu = document.createElement('div');

            menu.className = 'community-ctx-menu';

            menu.style.cssText = `

                position: fixed;

                left: ${e.clientX}px;

                top: ${e.clientY}px;

                background: #12121a;

                border: 1px solid #ff00ff;

                border-radius: 12px;

                box-shadow: 0 0 25px rgba(255, 0, 255, 0.3);

                z-index: 10000;

                min-width: 220px;

                animation: pickerOpen 0.2s ease-out;

                overflow: hidden;

            `;



            menu.innerHTML = `

                <div class="ctx-item" data-action="remove-suggested">🗑️ Remover da lista Sugeridas</div>

                <div class="ctx-divider"></div>

                <div class="ctx-item ctx-danger" data-action="delete-community">❌ Apagar Comunidade PERMANENTEMENTE</div>

            `;



            const style = document.createElement('style');

            style.textContent = `

                .ctx-item {

                    padding: 10px 14px;

                    cursor: pointer;

                    transition: all 0.15s;

                    font-size: 14px;

                }

                .ctx-item:hover {

                    background: rgba(255,0,255,0.15);

                }

                .ctx-danger {

                    color: #ff6b6b;

                }

                .ctx-danger:hover {

                    background: rgba(255, 107, 107, 0.15);

                }

                .ctx-divider {

                    height: 1px;

                    background: rgba(255,0,255,0.2);

                    margin: 4px 0;

                }

            `;

            document.head.appendChild(style);



            menu.querySelectorAll('.ctx-item').forEach(item => {

                item.addEventListener('click', () => {

                    menu.remove();



                    switch(item.dataset.action) {

                        case 'remove-suggested':

                            if (confirm(`Remover "${comunidade.name}" da lista de comunidades sugeridas?`)) {

                                if (window.socket) {

                                    window.socket.emit('community:unsuggest', { id: comunidade.id });

                                }

                                alert(`✅ Comunidade removida da lista de sugeridas!`);

                            }

                            break;



                        case 'delete-community':

                            if (confirm(`⚠️ ATENÇÃO!\n\nVocê tem certeza que deseja APAGAR PERMANENTEMENTE a comunidade "${comunidade.name}"?\n\nEsta ação NÃO PODE ser desfeita!`)) {

                                if (window.socket) {

                                    window.socket.emit('community:unsuggest', { id: comunidade.id });

                                }

                                

                                // Aqui futuramente integrar com API para apagar do banco

                                alert(`✅ Comunidade "${comunidade.name}" foi APAGADA permanentemente!`);

                            }

                            break;

                    }

                });

            });



            setTimeout(() => {

                document.addEventListener('click', function closeMenu(evt) {

                    if (!menu.contains(evt.target)) {

                        menu.remove();

                        document.removeEventListener('click', closeMenu);

                    }

                }, { once: false });

            }, 10);



            document.body.appendChild(menu);

        });



        // Conteúdo do card

        const usuarioAtual = window.currentUser?.name || localStorage.getItem('currentUsername') || localStorage.getItem('userNickname') || localStorage.getItem('username');

        const isDevOrStaff = ['demid', 'admin'].includes(usuarioAtual);

        console.log('🔍 Usuário atual:', usuarioAtual, 'isDevOrStaff:', isDevOrStaff);

        

        if (comunidade.banner) {

            card.innerHTML = `

                <img src="${comunidade.banner}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" />

                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 16px;">

                    ${comunidade.icon ? `<img src="${comunidade.icon}" style="width: 40px; height: 40px; border-radius: 10px; margin-bottom: 6px; border: 2px solid rgba(255,0,255,0.5); object-fit: cover;" />` : ''}

                    <div style="color: #fff; font-size: 14px; font-weight: 700; margin-bottom: 2px;">${comunidade.name}</div>

                    <div style="color: #aaa; font-size: 11px;">${comunidade.members || 1} membros</div>

                </div>

                ${isDevOrStaff ? `

                <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;">

                    <button class="suggested-action-btn" data-action="remove" style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 107, 107, 0.9); border: none; color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">🗑</button>

                    <button class="suggested-action-btn" data-action="delete" style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 0, 0, 0.9); border: none; color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">❌</button>

                </div>

                ` : ''}

            `;

        } else {

            card.innerHTML = `

                <div style="width: 100%; height: 100%; background: linear-gradient(180deg, rgba(128, 0, 255, 0.2), rgba(0, 0, 0, 0.8)); display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; padding: 16px;">

                    ${comunidade.icon ? `<img src="${comunidade.icon}" style="width: 56px; height: 56px; border-radius: 14px; border: 2px solid rgba(255,0,255,0.5); object-fit: cover;" />` : '<div style="font-size: 40px; opacity: 0.7;">🌐</div>'}

                    <div style="color: #fff; font-size: 14px; font-weight: 700;">${comunidade.name}</div>

                    <div style="color: #aaa; font-size: 11px;">${comunidade.members || 1} membros</div>

                </div>

                ${isDevOrStaff ? `

                <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;">

                    <button class="suggested-action-btn" data-action="remove" style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 107, 107, 0.9); border: none; color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">🗑</button>

                    <button class="suggested-action-btn" data-action="delete" style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 0, 0, 0.9); border: none; color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">❌</button>

                </div>

                ` : ''}

            `;

        }

        

        // ✅ Ações dos botões (só para dev/staff)

        if (isDevOrStaff) {

            card.querySelectorAll('.suggested-action-btn').forEach(btn => {

                btn.addEventListener('click', (e) => {

                    e.stopPropagation();

                    const action = btn.dataset.action;

                    

                    if (action === 'remove') {

                        if (confirm(`Remover "${comunidade.name}" da lista de comunidades sugeridas?`)) {

                            if (window.socket) {

                                window.socket.emit('community:unsuggest', { id: comunidade.id });

                            }

                            alert(`✅ Comunidade removida da lista de sugeridas!`);

                        }

                    } else if (action === 'delete') {

                        if (confirm(`⚠️ ATENÇÃO!\n\nVocê tem certeza que deseja APAGAR PERMANENTEMENTE a comunidade "${comunidade.name}"?\n\nEsta ação NÃO PODE ser desfeita!`)) {

                            if (window.socket) {

                                window.socket.emit('community:unsuggest', { id: comunidade.id });

                            }



                            // Remove também das comunidades do usuário

                            let userCommunities = JSON.parse(localStorage.getItem('userCommunities') || '[]');

                            userCommunities = userCommunities.filter(c => c.id !== comunidade.id);

                            localStorage.setItem('userCommunities', JSON.stringify(userCommunities));



                            window.renderUserCommunities && window.renderUserCommunities();

                            alert(`✅ Comunidade "${comunidade.name}" foi APAGADA permanentemente!`);

                        }

                    }

                });

            });

        }



        return card;

    }



    /**

     * ✅ ADICIONA COMUNIDADE NAS SUGERIDAS

     *

     * Chamado quando o usuário clica no botão

     */

    function adicionarComunidade(comunidade) {

        // Verifica se já existe

        const jaExiste = comunidadesSugeridas.some(c => c.id === comunidade.id);

        if (jaExiste) {

            alert('⚠ Essa comunidade já está nas Sugeridas!');

            return false;

        }



        // Envia evento para o servidor adicionar

        if (window.socket) {

            window.socket.emit('community:add-suggested', comunidade);

        }



        alert(`✅ Comunidade "${comunidade.name}" adicionada nas Sugeridas!`);

        return true;

    }



    /**

     * Adiciona evento de clique em TODOS os botões "Colocar nas sugeridas"

     */

    function adicionarEventosNosBotoes() {

        document.querySelectorAll('[data-action="add-suggested"]').forEach(botao => {

            // Remove evento existente para não duplicar

            botao.removeEventListener('click', tratarCliqueBotao);

            // Adiciona o evento

            botao.addEventListener('click', tratarCliqueBotao);

        });

    }



    /**

     * Trata o clique no botão

     */

    function tratarCliqueBotao(event) {

        const botao = event.currentTarget;

        

        // Extrai os dados da comunidade dos atributos do botão

        const comunidade = {

            id: botao.dataset.communityId,

            name: botao.dataset.communityName,

            banner: botao.dataset.communityBanner || null,

            icon: botao.dataset.communityIcon || null,

            members: parseInt(botao.dataset.communityMembers || 1)

        };



        // Adiciona nas sugeridas

        adicionarComunidade(comunidade);

    }



    /**

     * Observa novos botões que são criados dinamicamente na página

     */

    function observarNovosBotoes() {

        const observer = new MutationObserver(() => {

            adicionarEventosNosBotoes();

        });



        observer.observe(document.body, { childList: true, subtree: true });

    }



    // ================================================

    // DISPONIBILIZA FUNÇÕES GLOBALMENTE

    // ================================================

    window.SugeridasManager = {

        adicionar: adicionarComunidade,

        renderizar: renderizarSugeridas,

        obterLista: () => [...comunidadesSugeridas]

    };



    // ================================================

    // INICIALIZA AUTOMATICAMENTE QUANDO A PÁGINA CARREGAR

    // ================================================

    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', init);

    } else {

        init();

    }



})();

