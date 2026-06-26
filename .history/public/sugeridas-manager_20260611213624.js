/**
 * ================================================
 * ✅ GERENCIADOR DE COMUNIDADES SUGERIDAS
 * Arquivo separado e independente - sem conflitos
 * ================================================
 * 
 * Funcionalidades:
 * 1. Gerenciamento de estado das comunidades sugeridas
 * 2. Renderização automática da interface
 * 3. Adição com prevenção de duplicatas
 * 4. Persistência no localStorage
 * 5. Funções globais acessíveis de qualquer lugar
 * 
 * Uso:
 * - Adicione <script src="sugeridas-manager.js"></script> no index.html
 * - No menu de contexto: window.SugeridasManager.adicionar(comunidade)
 */

const SugeridasManager = (function() {
    'use strict';

    // Estado interno privado
    let comunidadesSugeridas = [];
    const STORAGE_KEY = 'sagile_comunidades_sugeridas';

    /**
     * Inicializa o gerenciador
     */
    function init() {
        carregarDoArmazenamento();
        
        // Renderiza automaticamente quando a página carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderizarSugeridas);
        } else {
            renderizarSugeridas();
        }

        console.log('✅ SugeridasManager inicializado com sucesso!');
    }

    /**
     * Carrega comunidades salvas no localStorage
     */
    function carregarDoArmazenamento() {
        try {
            const salvas = localStorage.getItem(STORAGE_KEY);
            if (salvas) {
                comunidadesSugeridas = JSON.parse(salvas);
            }
        } catch (e) {
            console.warn('⚠ Erro ao carregar comunidades sugeridas:', e);
            comunidadesSugeridas = [];
        }
    }

    /**
     * Salva comunidades no localStorage
     */
    function salvarNoArmazenamento() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(comunidadesSugeridas));
        } catch (e) {
            console.warn('⚠ Erro ao salvar comunidades sugeridas:', e);
        }
    }

    /**
     * ✅ Renderiza a seção completa de comunidades sugeridas
     * 
     * Funcionamento:
     * - Se array vazio: mostra o card "Nenhuma comunidade ainda"
     * - Se tiver comunidades: mostra todos os cards
     * - Sempre limpa o container antes de renderizar
     */
    function renderizarSugeridas() {
        const container = document.getElementById('suggested-communities-container');
        
        // Se o container não existir na página, não faz nada
        if (!container) {
            return;
        }

        // Limpa completamente o container
        container.innerHTML = '';

        if (comunidadesSugeridas.length === 0) {
            // ✅ Nenhuma comunidade: mostra o card padrão
            container.innerHTML = `
                <div id="suggested-empty-state" style="min-width: 220px; height: 280px; border-radius: 16px; overflow: hidden; border: 2px solid rgba(255, 0, 255, 0.3); cursor: default; transition: all 0.2s; position: relative;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(180deg, rgba(128, 0, 255, 0.2), rgba(0, 0, 0, 0.8)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
                        <div style="font-size: 48px; opacity: 0.5;">🌐</div>
                        <div style="color: #888; font-size: 14px;">Nenhuma comunidade ainda</div>
                    </div>
                </div>
            `;
        } else {
            // ✅ Tem comunidades: renderiza todos os cards
            comunidadesSugeridas.forEach(comunidade => {
                const card = criarCardComunidade(comunidade);
                container.appendChild(card);
            });
        }
    }

    /**
     * Cria o elemento DOM do card da comunidade
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
        card.dataset.suggestedId = comunidade.id;

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

        // Abrir comunidade ao clicar
        card.addEventListener('click', () => {
            window.location.href = `community-page.html?id=${comunidade.id}&name=${encodeURIComponent(comunidade.name)}`;
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
     * ✅ Adiciona uma comunidade na lista de sugeridas
     * 
     * @param {Object} comunidade - Objeto da comunidade
     * @returns {Boolean} true se adicionado com sucesso, false se já existir
     */
    function adicionarAoSugeridas(comunidade) {
        // Validação básica
        if (!comunidade || !comunidade.id) {
            console.warn('⚠ Comunidade inválida fornecida para SugeridasManager');
            return false;
        }

        // ✅ Previne duplicatas
        const jaExiste = comunidadesSugeridas.some(c => c.id === comunidade.id);
        if (jaExiste) {
            console.log('ℹ Comunidade já está nas sugeridas:', comunidade.name);
            return false;
        }

        // Adiciona no array
        comunidadesSugeridas.push(comunidade);

        // Salva no armazenamento
        salvarNoArmazenamento();

        // Atualiza a interface
        renderizarSugeridas();

        console.log('✅ Comunidade adicionada nas sugeridas:', comunidade.name);
        return true;
    }

    /**
     * Remove uma comunidade das sugeridas
     */
    function removerDasSugeridas(comunidadeId) {
        comunidadesSugeridas = comunidadesSugeridas.filter(c => c.id !== comunidadeId);
        salvarNoArmazenamento();
        renderizarSugeridas();
        console.log('✅ Comunidade removida das sugeridas:', comunidadeId);
    }

    /**
     * Verifica se uma comunidade já está nas sugeridas
     */
    function estaNasSugeridas(comunidadeId) {
        return comunidadesSugeridas.some(c => c.id === comunidadeId);
    }

    /**
     * Retorna a lista atual de comunidades sugeridas
     */
    function obterLista() {
        return [...comunidadesSugeridas];
    }

    /**
     * Limpa todas as comunidades sugeridas
     */
    function limparTudo() {
        comunidadesSugeridas = [];
        salvarNoArmazenamento();
        renderizarSugeridas();
        console.log('✅ Todas as comunidades sugeridas foram removidas');
    }

    // ================================================
    // API PÚBLICA - Funções acessíveis globalmente
    // ================================================
    return {
        init,
        renderizarSugeridas,
        adicionar: adicionarAoSugeridas,
        remover: removerDasSugeridas,
        existe: estaNasSugeridas,
        obterLista,
        limparTudo
    };

})();

// ✅ Disponibiliza globalmente para ser chamado de qualquer lugar (inclusive do menu de contexto)
window.SugeridasManager = SugeridasManager;

// ✅ Inicializa automaticamente
SugeridasManager.init();