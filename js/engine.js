/**
 * His Majesty - Core Engine
 * Handles Canvas rendering, asset preloading, camera parallax, and particle physics.
 */

class AssetManager {
    constructor() {
        this.images = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    load(name, src) {
        this.totalAssets++;
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                this.loadedAssets++;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load asset: ${src}`);
                this.loadedAssets++;
                resolve(null);
            };
            img.src = src;
        });
    }

    get(name) {
        return this.images[name] || null;
    }

    getProgress() {
        return this.totalAssets === 0 ? 1 : this.loadedAssets / this.totalAssets;
    }
}

class Camera {
    constructor(viewWidth, viewHeight) {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.width = viewWidth;
        this.height = viewHeight;
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.shakeAmount = 0;
        this.shakeDecay = 0.9;
        this.minX = 0;
        this.maxX = 10000;
    }

    update(dt) {
        // Smooth easing towards target
        this.x += (this.targetX - this.x) * 6 * dt;
        this.y += (this.targetY - this.y) * 6 * dt;
        this.zoom += (this.targetZoom - this.zoom) * 5 * dt;

        if (this.shakeAmount > 0.1) {
            this.shakeAmount *= this.shakeDecay;
        } else {
            this.shakeAmount = 0;
        }

        // Clamp camera bounds
        const halfW = (this.width / this.zoom) / 2;
        if (this.x - halfW < this.minX) this.x = this.minX + halfW;
    }

    shake(amount) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    getShakeOffset() {
        if (this.shakeAmount <= 0) return { x: 0, y: 0 };
        return {
            x: (Math.random() - 0.5) * this.shakeAmount * 12,
            y: (Math.random() - 0.5) * this.shakeAmount * 8
        };
    }

    worldToScreen(wx, wy) {
        const shake = this.getShakeOffset();
        return {
            x: (wx - this.x) * this.zoom + this.width / 2 + shake.x,
            y: (wy - this.y) * this.zoom + this.height / 2 + shake.y
        };
    }

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.width / 2) / this.zoom + this.x,
            y: (sy - this.height / 2) / this.zoom + this.y
        };
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.hieroglyphs = ['☥', '𓂀', '𓊽', '𓋹', '𓇳', '✦', '✧'];
    }

    // Golden divine blessing burst
    spawnBlessingBurst(x, y, count = 28) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 140;
            const isGlyph = Math.random() < 0.35;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 35,
                life: 1.0,
                decay: 0.5 + Math.random() * 0.4,
                size: isGlyph ? 16 + Math.random() * 8 : 4 + Math.random() * 6,
                color: isGlyph ? '#ffe066' : (Math.random() < 0.6 ? '#fcd34d' : '#38bdf8'),
                type: isGlyph ? 'glyph' : 'sparkle',
                glyph: this.hieroglyphs[Math.floor(Math.random() * this.hieroglyphs.length)],
                alpha: 1.0
            });
        }
    }

    // Golden tribute arc towards HUD
    spawnTributeCoin(x, y, targetScreenX, targetScreenY, camera) {
        const startScreen = camera.worldToScreen(x, y);
        this.particles.push({
            x: startScreen.x,
            y: startScreen.y,
            tx: targetScreenX,
            ty: targetScreenY,
            t: 0,
            duration: 0.8 + Math.random() * 0.3,
            size: 14,
            type: 'tribute_coin',
            curveOffset: (Math.random() - 0.5) * 160
        });
    }

    // Incense smoke wafting from censers
    spawnIncense(x, y) {
        this.particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y,
            vx: 8 + (Math.random() - 0.5) * 8,
            vy: -20 - Math.random() * 15,
            life: 1.0,
            decay: 0.45 + Math.random() * 0.2,
            size: 3 + Math.random() * 3,
            maxSize: 12,
            color: 'rgba(215, 200, 180, 0.25)',
            type: 'smoke',
            alpha: 0.35
        });
    }

    // Falling lotus/acacia petals
    spawnPetal(x, y) {
        this.particles.push({
            x: x,
            y: y,
            vx: 20 + Math.random() * 30,
            vy: 25 + Math.random() * 25,
            wobbleSpeed: 2 + Math.random() * 4,
            wobbleAmount: 20,
            life: 1.0,
            decay: 0.15 + Math.random() * 0.1,
            size: 6 + Math.random() * 5,
            color: Math.random() < 0.65 ? '#fb7185' : '#fef08a',
            type: 'petal',
            time: Math.random() * 10
        });
    }

    update(dt, camera) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'tribute_coin') {
                p.t += dt / p.duration;
                if (p.t >= 1.0) {
                    this.particles.splice(i, 1);
                    if (window.soundSystem) window.soundSystem.playTribute();
                    continue;
                }
                // Quadratic bezier arc from start to HUD
                continue;
            }

            p.life -= p.decay * dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            if (p.type === 'petal') {
                p.time += dt;
                p.x += (p.vx + Math.sin(p.time * p.wobbleSpeed) * p.wobbleAmount) * dt;
                p.y += p.vy * dt;
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.type === 'smoke') {
                    p.size += (p.maxSize - p.size) * 1.5 * dt;
                    p.alpha = p.life * 0.5;
                }
            }
        }
    }

    render(ctx, camera) {
        ctx.save();
        for (const p of this.particles) {
            if (p.type === 'tribute_coin') {
                // UI space
                const t = p.t;
                // Bezier calculation
                const p0x = p.x;
                const p0y = p.y;
                const p2x = p.tx;
                const p2y = p.ty;
                const p1x = (p0x + p2x) / 2 + p.curveOffset;
                const p1y = Math.min(p0y, p2y) - 100;

                const curX = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
                const curY = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;

                ctx.save();
                ctx.fillStyle = '#f59e0b';
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(curX, curY, p.size * (1 - t * 0.3), 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#78350f';
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('☥', curX, curY);
                ctx.restore();
                continue;
            }

            // World space particles
            const screen = camera.worldToScreen(p.x, p.y);
            // Culling
            if (screen.x < -50 || screen.x > camera.width + 50 || screen.y < -50 || screen.y > camera.height + 50) {
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.life;

            if (p.type === 'glyph') {
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size * camera.zoom}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#d97706';
                ctx.shadowBlur = 8 * camera.zoom;
                ctx.fillText(p.glyph, screen.x, screen.y);
            } else if (p.type === 'sparkle') {
                ctx.fillStyle = p.color;
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 6 * camera.zoom;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, p.size * camera.zoom * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'smoke') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, p.size * camera.zoom, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'petal') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(screen.x, screen.y, p.size * camera.zoom, p.size * 0.5 * camera.zoom, p.time, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        ctx.restore();
    }
}

class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.touchMoveDir = 0;
        this.isTouchWalking = false;
        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            // Prevent scrolling on arrow keys and space
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            if (window.soundSystem && !window.soundSystem.ctx) {
                window.soundSystem.init();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }

    wasPressed(code) {
        const val = !!this.justPressed[code];
        this.justPressed[code] = false;
        return val;
    }

    getHorizontalAxis() {
        let axis = 0;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) axis += 1;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) axis -= 1;
        if (this.touchMoveDir !== 0) axis = this.touchMoveDir;
        return axis;
    }

    isSprinting() {
        return !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    }

    resetFrame() {
        this.justPressed = {};
    }
}

window.AssetManager = AssetManager;
window.Camera = Camera;
window.ParticleSystem = ParticleSystem;
window.InputManager = InputManager;
