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

        // Limpa TUDO que está dentro do container
        container.innerHTML = '';

        if (comunidadesSugeridas.length === 0) {
            // ✅ Nenhuma comunidade: RECRIA O CARD VAZIO
            container.innerHTML = `
                <div id="${CONFIG.cardVazioId}" style="min-width: 220px; height: 280px; border-radius: 16px; overflow: hidden; border: 2px solid rgba(255, 0, 255, 0.3); cursor: default;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(180deg, rgba(128, 0, 255, 0.2), rgba(0, 0, 0, 0.8)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
                        <div style="font-size: 48px; opacity: 0.5;">🌐</div>
                        <div style="color: #888; font-size: 14px;">Nenhuma comunidade ainda</div>
                    </div>
                </div>
            `;
        } else {
            // ✅ TEM COMUNIDADES: REMOVE O CARD VAZIO COMPLETAMENTE
            // Adiciona TODAS as comunidades na lista
            comunidadesSugeridas.forEach(comunidade => {
                const card = criarCardComunidade(comunidade);
                container.appendChild(card);
            });
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