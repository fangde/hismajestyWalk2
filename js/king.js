/**
 * His Majesty - The King & Royal Entourage
 * Manages the King's movement, walk cycle animation, divine blessing mechanics,
 * royal aura, and his faithful retinue (Parasol Bearer, Fan Bearer, Sacred Horus).
 */

class King {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.vx = 0;
        this.facing = 1; // 1 = right, -1 = left

        // Speeds
        this.walkSpeed = 80;
        this.sprintSpeed = 145;
        this.autoWalk = false;

        // Visual options: 'classic' (walk cycle sheet) or 'custom' (Image 1 portrait with glasses)
        this.avatarStyle = 'classic';

        // Walk cycle animation (7 frames)
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDuration = 0.13; // seconds per frame

        // State: 'idle', 'walk', 'bless', 'enthroned'
        this.state = 'idle';

        // Divine Blessing Action
        this.isBlessing = false;
        this.blessTimer = 0;
        this.blessDuration = 0.75;
        this.blessRadius = 240;
        this.blessCooldown = 0;

        // Footstep timing
        this.lastFootstepFrame = -1;

        // Visual dimensions
        this.width = 75;
        this.height = 115;
        this.scale = 2.0; // High-res rendering scale

        // Entourage
        this.parasolBearer = {
            offset: -85,
            x: x - 85,
            y: y,
            bob: 0
        };
        this.fanBearer = {
            offset: -160,
            x: x - 160,
            y: y,
            bob: 0
        };

        // Statistics
        this.blessingsBestowed = 0;
        this.tributesCollected = 0;
        this.distanceWalked = 0;
        this.devotion = 50; // 0..100
        this.combo = 1;
        this.comboTimer = 0;
    }

    switchAvatarStyle() {
        this.avatarStyle = (this.avatarStyle === 'classic') ? 'custom' : 'classic';
        return this.avatarStyle;
    }

    triggerBlessing(particleSystem, world) {
        if (this.blessCooldown > 0 || this.state === 'enthroned') return false;

        this.isBlessing = true;
        this.blessTimer = this.blessDuration;
        this.blessCooldown = 0.4;

        if (window.soundSystem) {
            window.soundSystem.playBlessing();
        }

        // Spawn golden divine particles at the tip of the falcon scepter
        const scepterX = this.x + 35 * this.facing;
        const scepterY = this.y - 120;
        particleSystem.spawnBlessingBurst(scepterX, scepterY, 32);

        // Check kneeling subjects in range to receive blessing
        let blessedCount = 0;
        if (world && world.subjects) {
            world.subjects.forEach(s => {
                const dist = Math.abs(s.x - this.x);
                if (dist < this.blessRadius && !s.isBlessed) {
                    s.receiveBlessing(particleSystem);
                    blessedCount++;
                }
            });
        }

        if (blessedCount > 0) {
            this.blessingsBestowed += blessedCount;
            this.devotion = Math.min(100, this.devotion + blessedCount * 5);
            this.combo += blessedCount;
            this.comboTimer = 3.5; // combo expires in 3.5 seconds
        }

        return true;
    }

    update(dt, input, particleSystem, world) {
        if (this.state === 'enthroned') {
            // Reached throne finale
            return;
        }

        // Cooldowns
        if (this.blessCooldown > 0) {
            this.blessCooldown -= dt;
        }

        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 1;
            }
        }

        // Handle blessing state
        if (this.isBlessing) {
            this.blessTimer -= dt;
            if (this.blessTimer <= 0) {
                this.isBlessing = false;
            }
        }

        // Input movement
        let moveAxis = input.getHorizontalAxis();
        if (this.autoWalk && moveAxis === 0) {
            moveAxis = 1;
        }

        const isSprinting = input.isSprinting();
        const targetSpeed = isSprinting ? this.sprintSpeed : this.walkSpeed;

        if (moveAxis !== 0) {
            this.facing = moveAxis > 0 ? 1 : -1;
            this.vx = moveAxis * targetSpeed;
            this.state = 'walk';

            // Walk animation
            const speedFactor = isSprinting ? 1.5 : 1.0;
            this.frameTimer += dt * speedFactor;
            if (this.frameTimer >= this.frameDuration) {
                this.frameTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % 7;

                // Footstep sound on specific frames (frames 0 and 3 are heel strikes)
                if ((this.currentFrame === 0 || this.currentFrame === 3) && this.currentFrame !== this.lastFootstepFrame) {
                    this.lastFootstepFrame = this.currentFrame;
                    if (window.soundSystem) window.soundSystem.playFootstep();
                }
            }

            const stepDist = Math.abs(this.vx * dt);
            if (moveAxis > 0) {
                this.distanceWalked += stepDist;
            }
        } else {
            this.vx = 0;
            this.state = 'idle';
            this.currentFrame = 0;
            this.frameTimer = 0;
        }

        this.x += this.vx * dt;

        // Entourage follows smoothly with breathing bob
        const time = performance.now() * 0.003;
        const walkBob = (this.state === 'walk') ? Math.sin(time * 8) * 3 : 0;

        // Parasol Bearer
        const targetParasolX = this.x + this.parasolBearer.offset * this.facing;
        this.parasolBearer.x += (targetParasolX - this.parasolBearer.x) * 6 * dt;
        this.parasolBearer.y = this.y + walkBob;

        // Fan Bearer
        const targetFanX = this.x + this.fanBearer.offset * this.facing;
        this.fanBearer.x += (targetFanX - this.fanBearer.x) * 5 * dt;
        this.fanBearer.y = this.y + walkBob;

        // Proximity Tribute Collection
        if (world && world.subjects) {
            world.subjects.forEach(s => {
                if (s.hasGift && !s.giftCollected) {
                    const dist = Math.abs(s.x - this.x);
                    if (dist < 110) {
                        s.collectGift(particleSystem);
                        this.tributesCollected += s.giftValue || 10;
                    }
                }
            });
        }
    }

    render(ctx, camera, assets) {
        const renderScale = this.scale * camera.zoom;
        const screen = camera.worldToScreen(this.x, this.y);

        // 1. Draw Divine Aura
        this.renderRoyalAura(ctx, screen, renderScale);

        // 2. Draw Entourage behind King
        this.renderEntourage(ctx, camera, assets, renderScale);

        // 3. Draw The King
        ctx.save();
        ctx.translate(screen.x, screen.y);

        // Ground Contact Shadow
        ctx.save();
        ctx.fillStyle = 'rgba(35, 18, 10, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 26 * renderScale, 6 * renderScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.scale(this.facing, 1);

        if (this.avatarStyle === 'classic') {
            // Render from walk cycle sheet or padded frames
            const spriteName = `king_walk_padded_${this.currentFrame}`;
            const sprite = assets.get(spriteName) || assets.get('king_walk_sheet');

            if (sprite) {
                const drawW = 70 * renderScale;
                const drawH = 105 * renderScale;
                // Bottom anchored
                const drawX = -drawW / 2;
                const drawY = -drawH;

                // Subtle blessing glow on character
                if (this.isBlessing) {
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 20 * camera.zoom;
                }

                ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
            }
        } else {
            // Custom Portrait King from Image 1
            const sprite = assets.get('king_custom_portrait');
            if (sprite) {
                const drawW = 100 * renderScale;
                const drawH = 125 * renderScale;
                const drawX = -drawW / 2;
                const drawY = -drawH;

                if (this.isBlessing) {
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 20 * camera.zoom;
                }

                // Breathing bounce when walking
                const bob = this.state === 'walk' ? Math.sin(performance.now() * 0.01) * 3 : 0;
                ctx.drawImage(sprite, drawX, drawY + bob, drawW, drawH);
            }
        }

        // Divine Scepter Blessing Radiance
        if (this.isBlessing) {
            const scepterHeadX = 35 * renderScale;
            const scepterHeadY = -95 * renderScale;

            ctx.save();
            const pulse = (Math.sin(performance.now() * 0.02) + 1) * 0.5;
            const glowRad = (25 + pulse * 20) * camera.zoom;

            const grad = ctx.createRadialGradient(scepterHeadX, scepterHeadY, 0, scepterHeadX, scepterHeadY, glowRad);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.3, 'rgba(251, 191, 36, 0.85)');
            grad.addColorStop(0.7, 'rgba(217, 119, 6, 0.4)');
            grad.addColorStop(1, 'rgba(217, 119, 6, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(scepterHeadX, scepterHeadY, glowRad, 0, Math.PI * 2);
            ctx.fill();

            // Light rays emanating from scepter
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
            ctx.lineWidth = 2 * camera.zoom;
            for (let a = 0; a < 8; a++) {
                const angle = a * (Math.PI / 4) + performance.now() * 0.002;
                const r1 = 12 * camera.zoom;
                const r2 = (28 + pulse * 14) * camera.zoom;
                ctx.beginPath();
                ctx.moveTo(scepterHeadX + Math.cos(angle) * r1, scepterHeadY + Math.sin(angle) * r1);
                ctx.lineTo(scepterHeadX + Math.cos(angle) * r2, scepterHeadY + Math.sin(angle) * r2);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore();

    }

    renderRoyalAura(ctx, screen, renderScale) {
        ctx.save();
        const time = performance.now() * 0.002;
        const auraRadius = (this.isBlessing ? this.blessRadius : 110) * (screen.zoom || 1);

        // Ground illumination ellipse
        const grad = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, auraRadius);
        if (this.isBlessing) {
            grad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
            grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
            grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        } else {
            grad.addColorStop(0, 'rgba(251, 191, 36, 0.18)');
            grad.addColorStop(0.7, 'rgba(217, 119, 6, 0.05)');
            grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y - 10, auraRadius, auraRadius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderEntourage(ctx, camera, assets, renderScale) {
        // Parasol Bearer
        const pScreen = camera.worldToScreen(this.parasolBearer.x, this.parasolBearer.y);
        const parasolSprite = assets.get('bearer_parasol');
        if (parasolSprite) {
            ctx.save();
            ctx.translate(pScreen.x, pScreen.y);
            ctx.fillStyle = 'rgba(35, 18, 10, 0.32)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 22 * renderScale, 5 * renderScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.scale(this.facing, 1);
            const drawW = 60 * renderScale;
            const drawH = 135 * renderScale;
            ctx.drawImage(parasolSprite, -drawW / 2, -drawH, drawW, drawH);
            ctx.restore();
        }

        // Fan Bearer
        const fScreen = camera.worldToScreen(this.fanBearer.x, this.fanBearer.y);
        const fanSprite = assets.get('bearer_fan');
        if (fanSprite) {
            ctx.save();
            ctx.translate(fScreen.x, fScreen.y);
            ctx.fillStyle = 'rgba(35, 18, 10, 0.32)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 20 * renderScale, 5 * renderScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.scale(this.facing, 1);
            const drawW = 55 * renderScale;
            const drawH = 130 * renderScale;
            ctx.drawImage(fanSprite, -drawW / 2, -drawH, drawW, drawH);
            ctx.restore();
        }
    }
}

window.King = King;
