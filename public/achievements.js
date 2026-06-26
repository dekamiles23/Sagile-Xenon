/**
 * Sistema de Conquistas Sagile Xenon
 * Estilo Minecraft Achievement
 */

class AchievementSystem {
    constructor() {
        this.achievements = this.getAchievementsList();
        this.unlocked = this.loadUnlocked();
        this.init();
    }

    getAchievementsList() {
        return {
            'first_login': {
                id: 'first_login',
                name: 'Bingo!',
                icon: '🎮',
                description: 'Entrar pela primeira vez no programa'
            },
            'first_community': {
                id: 'first_community',
                name: 'Primeiro Passo!',
                icon: '👥',
                description: 'Criar uma primeira comunidade'
            },
            'first_server': {
                id: 'first_server',
                name: 'Ultimato!',
                icon: '🖥️',
                description: 'Criar um servidor / grupo pela primeira vez'
            },
            'first_reels': {
                id: 'first_reels',
                name: 'Criador dinâmico!',
                icon: '🎬',
                description: 'Criar um reels / shorts'
            },
            'first_community_post': {
                id: 'first_community_post',
                name: 'Voz da comunidade!',
                icon: '📢',
                description: 'Postar sua primeira postagem na comunidade'
            },
            'thousand_words': {
                id: 'thousand_words',
                name: 'digitador profissional!',
                icon: '⌨️',
                description: 'Atingir mil palavras nos servidores'
            },
            'two_hundred_call_hours': {
                id: 'two_hundred_call_hours',
                name: 'Sonhando e acordando.',
                icon: '🎧',
                description: 'Ficar 200 horas em call'
            },
            'first_diary': {
                id: 'first_diary',
                name: 'Querido diário...',
                icon: '📔',
                description: 'Criar o primeiro texto no diário'
            },
            'first_friend': {
                id: 'first_friend',
                name: 'Friends forever!',
                icon: '🤝',
                description: 'Adicionar seu primeiro amigo'
            },
            'first_typewriter_save': {
                id: 'first_typewriter_save',
                name: 'Isso me lembra algo...',
                icon: '⌨️',
                description: 'Criar o primeiro save da máquina de escrever'
            }
        };
    }

    init() {
        this.createPopupElement();
        
        // Verificar primeiro login
        if (!this.unlocked.first_login) {
            this.unlock('first_login');
        }
    }

    createPopupElement() {
        if (document.getElementById('achievement-popup')) return;
        
        const popup = document.createElement('div');
        popup.id = 'achievement-popup';
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-popup-inner">
                <div class="achievement-icon" id="achievement-icon"></div>
                <div class="achievement-texts">
                    <div class="achievement-title">Achievement Made!</div>
                    <div class="achievement-name" id="achievement-name"></div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
    }

    loadUnlocked() {
        try {
            const saved = localStorage.getItem('sagile_achievements');
            return saved ? JSON.parse(saved) : {};
        } catch(e) {
            return {};
        }
    }

    saveUnlocked() {
        localStorage.setItem('sagile_achievements', JSON.stringify(this.unlocked));
    }

    unlock(achievementId) {
        if (this.unlocked[achievementId]) return false;
        if (!this.achievements[achievementId]) return false;

        this.unlocked[achievementId] = {
            unlockedAt: Date.now(),
            timestamp: new Date().toISOString()
        };
        
        this.saveUnlocked();
        this.showPopup(this.achievements[achievementId]);
        
        console.log(`🏆 Conquista desbloqueada: ${this.achievements[achievementId].name}`);
        return true;
    }

    showPopup(achievement) {
        const popup = document.getElementById('achievement-popup');
        const iconEl = document.getElementById('achievement-icon');
        const nameEl = document.getElementById('achievement-name');

        iconEl.textContent = achievement.icon;
        nameEl.textContent = achievement.name;

        // Resetar animação
        popup.classList.remove('animate');
        void popup.offsetWidth; // Trigger reflow
        popup.classList.add('animate');

        // Tocar som de conquista se existir
        try {
            const audio = new Audio('button.wav');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch(e) {}
    }

    isUnlocked(achievementId) {
        return !!this.unlocked[achievementId];
    }

    getAllUnlocked() {
        return Object.keys(this.unlocked);
    }

    getProgress() {
        const total = Object.keys(this.achievements).length;
        const unlocked = Object.keys(this.unlocked).length;
        return {
            total,
            unlocked,
            percentage: Math.round((unlocked / total) * 100)
        };
    }
}

// Inicializar sistema global
window.Achievements = new AchievementSystem();

// Eventos globais para integração
document.addEventListener('community-created', () => window.Achievements.unlock('first_community'));
document.addEventListener('server-created', () => window.Achievements.unlock('first_server'));
document.addEventListener('reels-created', () => window.Achievements.unlock('first_reels'));
document.addEventListener('community-post-created', () => window.Achievements.unlock('first_community_post'));
document.addEventListener('diary-created', () => window.Achievements.unlock('first_diary'));
document.addEventListener('friend-added', () => window.Achievements.unlock('first_friend'));
document.addEventListener('typewriter-saved', () => window.Achievements.unlock('first_typewriter_save'));

// Contador de palavras
window.achievementWordCount = window.achievementWordCount || 0;
document.addEventListener('message-sent', (e) => {
    const words = (e.detail?.text || '').split(/\s+/).filter(w => w.length > 0).length;
    window.achievementWordCount += words;
    
    if (window.achievementWordCount >= 1000) {
        window.Achievements.unlock('thousand_words');
    }
});

// Contador de horas em call
window.callTimeSeconds = window.callTimeSeconds || 0;
setInterval(() => {
    if (window.isInCall === true) {
        window.callTimeSeconds++;
        
        if (window.callTimeSeconds >= 720000) { // 200 horas em segundos
            window.Achievements.unlock('two_hundred_call_hours');
        }
    }
}, 1000);