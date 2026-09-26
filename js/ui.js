/**
 * His Majesty - UI & HUD System
 * Manages the top imperial status bar, devotion meter, treasury counter,
 * on-screen mobile/tablet touch controls, and victory coronation dialog.
 */

class GameUI {
    constructor() {
        this.devotionEl = document.getElementById('devotion-bar');
        this.treasuryEl = document.getElementById('treasury-count');
        this.progressEl = document.getElementById('procession-progress');
        this.comboEl = document.getElementById('combo-badge');
        this.avatarToggleBtn = document.getElementById('btn-toggle-avatar');
        this.autoWalkBtn = document.getElementById('btn-auto-walk');
        this.soundBtn = document.getElementById('btn-sound');
        this.helpBtn = document.getElementById('btn-help');
        this.helpModal = document.getElementById('help-modal');
        this.victoryModal = document.getElementById('victory-modal');

        this.initEventListeners();
    }

    initEventListeners() {
        // Avatar switcher
        if (this.avatarToggleBtn) {
            this.avatarToggleBtn.addEventListener('click', () => {
                if (window.gameKing) {
                    const style = window.gameKing.switchAvatarStyle();
                    this.avatarToggleBtn.innerText = (style === 'classic') ? '👑 Style: Classic' : '👑 Style: Royal Portrait';
                }
            });
        }

        // Auto walk
        if (this.autoWalkBtn) {
            this.autoWalkBtn.addEventListener('click', () => {
                if (window.gameKing) {
                    window.gameKing.autoWalk = !window.gameKing.autoWalk;
                    this.autoWalkBtn.classList.toggle('active', window.gameKing.autoWalk);
                    this.autoWalkBtn.innerText = window.gameKing.autoWalk ? '🚶 Auto: ON' : '🚶 Auto: OFF';
                }
            });
        }

        // Sound toggle
        if (this.soundBtn) {
            this.soundBtn.addEventListener('click', () => {
                if (window.soundSystem) {
                    const muted = window.soundSystem.toggleMute();
                    this.soundBtn.innerText = muted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
                }
            });
        }

        // Help modal
        if (this.helpBtn && this.helpModal) {
            this.helpBtn.addEventListener('click', () => {
                this.helpModal.classList.toggle('hidden');
            });
            const closeBtn = document.getElementById('btn-close-help');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.helpModal.classList.add('hidden'));
            }
        }

        // Mode switch buttons in top bar
        const storyModeBtn = document.getElementById('btn-mode-story');
        const endlessModeBtn = document.getElementById('btn-mode-endless');

        if (storyModeBtn && endlessModeBtn) {
            storyModeBtn.addEventListener('click', () => {
                if (window.gameWorld) {
                    window.gameWorld.mode = 'story';
                    storyModeBtn.classList.add('active');
                    endlessModeBtn.classList.remove('active');
                    document.getElementById('progress-container').style.display = 'flex';
                }
            });

            endlessModeBtn.addEventListener('click', () => {
                if (window.gameWorld) {
                    window.gameWorld.mode = 'endless';
                    endlessModeBtn.classList.add('active');
                    storyModeBtn.classList.remove('active');
                    document.getElementById('progress-container').style.display = 'none';
                }
            });
        }

        // Victory Modal Buttons
        const btnPlayAgain = document.getElementById('btn-play-again');
        const btnContinueEndless = document.getElementById('btn-continue-endless');

        if (btnPlayAgain) {
            btnPlayAgain.addEventListener('click', () => {
                this.victoryModal.classList.add('hidden');
                if (window.resetGame) window.resetGame('story');
            });
        }

        if (btnContinueEndless) {
            btnContinueEndless.addEventListener('click', () => {
                this.victoryModal.classList.add('hidden');
                if (window.gameWorld && window.gameKing) {
                    window.gameWorld.mode = 'endless';
                    window.gameKing.state = 'walk';
                    window.gameWorld.throneReached = false;
                }
            });
        }

        // Virtual Touch / Onscreen Action Buttons
        const touchLeft = document.getElementById('touch-left');
        const touchRight = document.getElementById('touch-right');
        const touchBless = document.getElementById('touch-bless');

        if (touchLeft && window.gameInput) {
            const startL = (e) => { e.preventDefault(); window.gameInput.touchMoveDir = -1; };
            const endL = (e) => { e.preventDefault(); window.gameInput.touchMoveDir = 0; };
            touchLeft.addEventListener('mousedown', startL);
            touchLeft.addEventListener('mouseup', endL);
            touchLeft.addEventListener('touchstart', startL);
            touchLeft.addEventListener('touchend', endL);
        }

        if (touchRight && window.gameInput) {
            const startR = (e) => { e.preventDefault(); window.gameInput.touchMoveDir = 1; };
            const endR = (e) => { e.preventDefault(); window.gameInput.touchMoveDir = 0; };
            touchRight.addEventListener('mousedown', startR);
            touchRight.addEventListener('mouseup', endR);
            touchRight.addEventListener('touchstart', startR);
            touchRight.addEventListener('touchend', endR);
        }

        if (touchBless) {
            touchBless.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.gameKing && window.gameParticles && window.gameWorld) {
                    window.gameKing.triggerBlessing(window.gameParticles, window.gameWorld);
                }
            });
            touchBless.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (window.gameKing && window.gameParticles && window.gameWorld) {
                    window.gameKing.triggerBlessing(window.gameParticles, window.gameWorld);
                }
            });
        }
    }

    update(king, world) {
        if (!king) return;

        // Devotion bar
        if (this.devotionEl) {
            this.devotionEl.style.width = `${king.devotion}%`;
        }

        // Treasury count
        if (this.treasuryEl) {
            this.treasuryEl.innerText = `${king.tributesCollected}`;
        }

        // Story progress
        if (this.progressEl && world) {
            if (world.mode === 'story') {
                const pct = Math.min(100, Math.floor((king.x / world.levelLength) * 100));
                this.progressEl.style.width = `${pct}%`;
                const progressText = document.getElementById('progress-text');
                if (progressText) progressText.innerText = `${pct}%`;
            }
        }

        // Combo badge
        if (this.comboEl) {
            if (king.combo > 1) {
                this.comboEl.style.display = 'block';
                this.comboEl.innerText = `x${king.combo} BLESSING COMBO!`;
            } else {
                this.comboEl.style.display = 'none';
            }
        }
    }

    showVictoryModal(king) {
        if (!this.victoryModal) return;

        document.getElementById('vic-treasury').innerText = `${king.tributesCollected} Gold`;
        document.getElementById('vic-blessings').innerText = `${king.blessingsBestowed} Subjects`;
        document.getElementById('vic-distance').innerText = `${Math.floor(king.distanceWalked / 10)} Royal Cubits`;

        // Imperial Title
        let title = 'Beloved of the Nile';
        if (king.devotion > 80 && king.blessingsBestowed > 15) {
            title = 'Living Horus & Eternal Sun God';
        } else if (king.tributesCollected > 300) {
            title = 'Lord of Boundless Imperial Wealth';
        }
        document.getElementById('vic-title').innerText = title;

        this.victoryModal.classList.remove('hidden');
    }
}

window.GameUI = GameUI;
