/**
 * His Majesty - Subjects & Slaves
 * Manages the AI, postures, and reactions of subjects bowing, prostrating,
 * offering tributes, and receiving blessings as His Majesty passes by.
 */

class Subject {
    constructor(x, y, archetype = 'commoner_worker') {
        this.x = x;
        this.y = y;
        this.archetype = archetype;

        // Posture states: 'standing', 'alert', 'kneeling', 'prostrating', 'offering'
        this.state = 'standing';
        this.previousState = 'standing';

        // Attributes
        this.facing = -1; // Face toward the approaching king (usually facing left)
        this.scale = 1.5;
        this.isBlessed = false;
        this.blessTimer = 0;
        this.hasGift = false;
        this.giftCollected = false;
        this.giftValue = 15;
        this.speechBubble = null;
        this.speechTimer = 0;

        // Configure based on archetype
        this.initArchetype();

        // Distance thresholds
        this.alertDist = 280;
        this.kneelDist = 180;
        this.prostrateDist = 95;

        // Idle animation
        this.idleBob = Math.random() * Math.PI * 2;
        this.idleSpeed = 1.5 + Math.random();
    }

    initArchetype() {
        switch (this.archetype) {
            case 'tribute_food':
                this.hasGift = true;
                this.giftValue = 25;
                this.spriteOffering = 'subject_offer_food';
                this.spriteAlt = 'subj1_fruit';
                break;
            case 'tribute_urn':
                this.hasGift = true;
                this.giftValue = 40;
                this.spriteOffering = 'subject_offer_urn';
                this.spriteAlt = 'subj1_urn';
                break;
            case 'tribute_chest':
                this.hasGift = true;
                this.giftValue = 75;
                this.spriteOffering = 'subject_offer_chest';
                this.spriteAlt = 'subj1_chest';
                break;
            case 'captive':
                this.hasGift = false;
                this.spriteOffering = null;
                break;
            case 'bundle_bearer':
                this.hasGift = true;
                this.giftValue = 20;
                this.spriteOffering = 'subj1_bundle';
                break;
            case 'commoner_worker':
            default:
                this.hasGift = false;
                this.spriteOffering = null;
                break;
        }
    }

    update(dt, king, particleSystem, camera, groundY) {
        if (groundY !== undefined) {
            this.y = groundY;
        }
        this.idleBob += dt * this.idleSpeed;

        // Blessing timer
        if (this.isBlessed) {
            this.blessTimer -= dt;
            if (this.blessTimer <= 0) {
                // Blessing glow fades
            }
        }

        // Speech bubble timer
        if (this.speechBubble) {
            this.speechTimer -= dt;
            this.speechBubble.y -= 25 * dt;
            if (this.speechTimer <= 0) {
                this.speechBubble = null;
            }
        }

        // Calculate distance to King
        const dx = this.x - king.x;
        const absDist = Math.abs(dx);

        // Subject always faces toward the King unless prostrated
        if (this.state !== 'prostrating') {
            this.facing = dx > 0 ? -1 : 1;
        }

        const oldState = this.state;

        // State transitions based on King's approach:
        if (absDist > this.alertDist) {
            // Far away: Standing or idle
            if (dx > 0) {
                this.state = 'standing';
            } else {
                // King already passed far into the distance
                this.state = this.isBlessed ? 'kneeling' : 'standing';
            }
        } else if (absDist > this.kneelDist) {
            // Approaching notice zone: Alert / dropping tasks
            this.state = 'alert';
        } else if (absDist > this.prostrateDist) {
            // Kneeling zone
            if (this.hasGift && !this.giftCollected) {
                this.state = 'offering';
            } else {
                this.state = 'kneeling';
            }
        } else {
            // Prostration zone: King is directly passing by!
            // Slaves and subjects fall completely flat to the ground!
            this.state = 'prostrating';
        }

        // Audio and reactions on state changes
        if (this.state !== oldState) {
            if (this.state === 'prostrating') {
                if (window.soundSystem) window.soundSystem.playProstration();
            } else if (this.state === 'alert' && oldState === 'standing') {
                this.showSpeech('!', 1.2, '#fef08a');
            }
        }
    }

    receiveBlessing(particleSystem) {
        this.isBlessed = true;
        this.blessTimer = 4.0;

        // Random reverent praises
        const praises = [
            'All Hail His Divine Majesty! ☥',
            'Life, Prosperity, Health! 𓋹',
            'May Pharaoh Live Forever! 𓂀',
            'Glory to the Living Horus! 𓊽',
            'The Sun of the Two Lands! 𓇳',
            'Beloved of Ra!'
        ];
        const text = praises[Math.floor(Math.random() * praises.length)];
        this.showSpeech(text, 2.5, '#fde047');

        // Spawn golden particles
        particleSystem.spawnBlessingBurst(this.x, this.y - 40, 16);

        // If holding tribute, auto-collect
        if (this.hasGift && !this.giftCollected) {
            this.collectGift(particleSystem);
        }
    }

    collectGift(particleSystem) {
        if (this.giftCollected) return;
        this.giftCollected = true;

        // Spawn tribute coins flying up
        if (window.soundSystem) window.soundSystem.playTribute();

        // Target UI Treasury icon (approx x=220, y=45)
        if (window.gameCamera) {
            for (let i = 0; i < 3; i++) {
                particleSystem.spawnTributeCoin(this.x, this.y - 45, 230, 45, window.gameCamera);
            }
        }

        this.showSpeech(`+${this.giftValue} Gold`, 1.5, '#4ade80');
    }

    showSpeech(text, duration = 2.0, color = '#ffffff') {
        this.speechBubble = {
            text: text,
            x: this.x,
            y: this.y - 85,
            color: color
        };
        this.speechTimer = duration;
    }

    render(ctx, camera, assets) {
        const renderScale = this.scale * camera.zoom;
        const screen = camera.worldToScreen(this.x, this.y);

        // Culling
        if (screen.x < -100 || screen.x > camera.width + 100) return;

        // Select sprite based on state and archetype
        let spriteName = 'subject_kneel_greet';

        if (this.state === 'standing' || this.state === 'alert') {
            if (this.archetype === 'captive') {
                spriteName = 'subject_captive';
            } else {
                spriteName = 'subject_carry_goods';
            }
        } else if (this.state === 'kneeling') {
            spriteName = 'subject_kneel_greet';
        } else if (this.state === 'offering') {
            spriteName = this.spriteOffering || 'subject_offer_food';
        } else if (this.state === 'prostrating') {
            spriteName = 'subject_prostrate';
        }

        const sprite = assets.get(spriteName) || assets.get('subject_kneel_greet');

        ctx.save();
        ctx.translate(screen.x, screen.y);

        // Ground Contact Shadow
        ctx.save();
        ctx.fillStyle = 'rgba(35, 18, 10, 0.32)';
        ctx.beginPath();
        const shadowW = (this.state === 'prostrating' ? 44 : 22) * (renderScale / 1.5);
        ctx.ellipse(0, 0, shadowW, 5 * (renderScale / 1.5), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.scale(this.facing, 1);

        // Golden aura if blessed
        if (this.isBlessed) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15 * camera.zoom;
        }

        if (sprite) {
            let drawW = sprite.width * (renderScale / 1.5);
            let drawH = sprite.height * (renderScale / 1.5);

            // Anchored to ground (bottom)
            const drawX = -drawW / 2;
            const drawY = -drawH;

            // Breathing / slight idle sway
            const bob = (this.state === 'standing') ? Math.sin(this.idleBob) * 2 : 0;

            ctx.drawImage(sprite, drawX, drawY + bob, drawW, drawH);
        }

        ctx.restore();

        // Render Speech / Exclamation Bubble
        if (this.speechBubble) {
            const bubbleScreen = camera.worldToScreen(this.speechBubble.x, this.speechBubble.y);
            ctx.save();
            ctx.font = `bold ${Math.max(12, 14 * camera.zoom)}px 'Cinzel Decorative', Georgia, serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const metrics = ctx.measureText(this.speechBubble.text);
            const padX = 10 * camera.zoom;
            const padY = 5 * camera.zoom;
            const bgW = metrics.width + padX * 2;
            const bgH = 22 * camera.zoom;

            // Parchment-style bubble background
            ctx.fillStyle = 'rgba(28, 25, 23, 0.88)';
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bubbleScreen.x - bgW / 2, bubbleScreen.y - bgH / 2, bgW, bgH, 4);
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.fillStyle = this.speechBubble.color;
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(this.speechBubble.text, bubbleScreen.x, bubbleScreen.y);
            ctx.restore();
        }
    }
}

window.Subject = Subject;
