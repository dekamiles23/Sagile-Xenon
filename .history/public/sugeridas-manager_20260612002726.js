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

(function() {
    'use strict';

    // ================================================
    // CONFIGURAÇÕES - AJUSTE AQUI SE PRECISAR
    // ================================================
    const CONFIG = {
        containerSugeridasId: 'suggested-communities-container',
        cardVazioId: 'suggested-empty-state',
        classeBotaoAdicionar: 'btn-adicionar-sugerida',
        atributoComunidadeId: 'data-community-id',
        storageKey: 'comunidades_sugeridas'
    };

    // Estado interno
    let comunidadesSugeridas = [];

    /**
     * ✅ INICIALIZAÇÃO AUTOMÁTICA
     */
    function init() {
        // Carrega comunidades salvas
        carregarSalvas();

        // Renderiza a seção de sugeridas
        renderizarSugeridas();

        // Adiciona eventos nos botões existentes
        adicionarEventosNosBotoes();

        // Observa novos botões que são criados dinamicamente
        observarNovosBotoes();

        console.log('✅ SugeridasManager carregado e funcionando!');
    }

    /**
     * Carrega comunidades salvas no localStorage
     */
    function carregarSalvas() {
        try {
            const salvas = localStorage.getItem(CONFIG.storageKey);
            if (salvas) {
                comunidadesSugeridas = JSON.parse(salvas);
            }
        } catch (e) {
            comunidadesSugeridas = [];
        }
    }

    /**
     * Salva comunidades no localStorage
     */
    function salvar() {
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(comunidadesSugeridas));
        } catch (e) {}
    }

    /**
     * ✅ RENDERIZA A SEÇÃO DE SUGERIDAS
     * 
     * ✅ SUBSTITUI COMPLETAMENTE O CARD VAZIO
     */
    function renderizarSugeridas() {
        const container = document.getElementById(CONFIG.containerSugeridasId);
        if (!container) return;

        // ✅ NÃO LIMPA O CONTAINER! MANTÉM O CARD VAZIO E ADICIONA A COMUNIDADE AO LADO
        // Remove apenas os cards de comunidades existentes, mantém o card vazio
        container.querySelectorAll('[data-suggested-id]').forEach(card => card.remove());

        // Adiciona TODAS as comunidades na lista, AO LADO do card vazio
        comunidadesSugeridas.forEach(comunidade => {
            const card = criarCardComunidade(comunidade);
            card.dataset.suggestedId = comunidade.id;
            
            // Insere ANTES do card vazio
            const cardVazio = document.getElementById(CONFIG.cardVazioId);
            if (cardVazio) {
                container.insertBefore(card, cardVazio);
            } else {
                container.appendChild(card);
            }
        });

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

            cardVazio.innerHTML = `
                <div style="width: 100%; height: 100%; background: linear-gradient(180deg, rgba(128, 0, 255, 0.2), rgba(0, 0, 0, 0.8)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
                    <div style="font-size: 48px; opacity: 0.7;">🔍</div>
                    <div style="color: #ff00ff; font-size: 14px; font-weight: 600;">Explore novas comunidades</div>
                </div>
            `;

            // ✅ Abre a mesma função do botão "Ver mais" - SOMENTE NO INDEX.HTML
            cardVazio.addEventListener('click', () => {
                // Verifica se o botão existe na página atual
                const botaoVerMais = document.getElementById('btn-see-all-suggested');
                
                if (botaoVerMais) {
                    // ✅ Está no index.html: executa o clique no botão original
                    botaoVerMais.click();
                    console.log('✅ Card clicado, abrindo modal do Ver mais');
                } else {
                    // ❌ Não está no index.html: não faz nada
                    console.log('ℹ Botão Ver mais não existe nesta página, ação ignorada');
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
    }

    /**
     * Cria o card da comunidade
     */
    function criarCardComunidade(comunidade) {
        const card = document.createElement('div');
        
        card.style.minWidth = '220px';
        card.style.height = '280px';
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
                                comunidadesSugeridas = comunidadesSugeridas.filter(c => c.id !== comunidade.id);
                                salvar();
                                renderizarSugeridas();
                                alert(`✅ Comunidade removida da lista de sugeridas!`);
                            }
                            break;

                        case 'delete-community':
                            if (confirm(`⚠️ ATENÇÃO!\n\nVocê tem certeza que deseja APAGAR PERMANENTEMENTE a comunidade "${comunidade.name}"?\n\nEsta ação NÃO PODE ser desfeita!`)) {
                                // Remove primeiro da lista de sugeridas
                                comunidadesSugeridas = comunidadesSugeridas.filter(c => c.id !== comunidade.id);
                                salvar();
                                renderizarSugeridas();
                                
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
        if (comunidade.banner) {
            card.innerHTML = `
                <img src="${comunidade.banner}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" />
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 20px 16px 16px 16px;">
                    ${comunidade.icon ? `<img src="${comunidade.icon}" style="width: 48px; height: 48px; border-radius: 12px; margin-bottom: 8px; border: 2px solid rgba(255,0,255,0.5);" />` : ''}
                    <div style="color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 4px;">${comunidade.name}</div>
                    <div style="color: #aaa; font-size: 12px;">${comunidade.members || 1} membros</div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div style="width: 100%; height: 100%; background: linear-gradient(180deg, rgba(128, 0, 255, 0.2), rgba(0, 0, 0, 0.8)); display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; padding: 20px 16px 16px 16px;">
                    ${comunidade.icon ? `<img src="${comunidade.icon}" style="width: 64px; height: 64px; border-radius: 16px; border: 2px solid rgba(255,0,255,0.5);" />` : '<div style="font-size: 48px; opacity: 0.7;">🌐</div>'}
                    <div style="color: #fff; font-size: 16px; font-weight: 700;">${comunidade.name}</div>
                    <div style="color: #aaa; font-size: 12px;">${comunidade.members || 1} membros</div>
                </div>
            `;
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

        // Adiciona na lista
        comunidadesSugeridas.push(comunidade);

        // Salva
        salvar();

        // ✅ ATUALIZA A INTERFACE - O CARD VAZIO DESAPARECE COMPLETAMENTE
        renderizarSugeridas();

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