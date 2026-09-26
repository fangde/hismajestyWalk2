/**
 * His Majesty - Parallax World & Level Manager
 * Creates the ancient Egyptian palace environment, multi-layered parallax scrolling,
 * monument placement, incense censers, and level progression.
 */

class World {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.groundY = 510; // Sandstone ground baseline

        // Game Mode: 'story' (finite procession to throne) or 'endless'
        this.mode = 'story';
        this.levelLength = 4200; // Final throne at x = 3900

        // Collections
        this.subjects = [];
        this.props = [];
        this.incenseCensers = [];
        this.banners = [];
        this.pillars = [];
        this.birds = [];

        // Atmospheric FX
        this.sun = {
            x: 750,
            y: 90,
            radius: 45,
            pulse: 0
        };

        this.dayTime = 0;
        this.throneReached = false;

        this.initStage();
    }

    initStage() {
        this.subjects = [];
        this.props = [];
        this.incenseCensers = [];
        this.pillars = [];
        this.banners = [];

        const carpetSurface = this.groundY - 16;

        // 1. Generate Subjects along the avenue
        for (let x = 350; x < this.levelLength - 280; x += 115 + Math.random() * 70) {
            let type = 'commoner_worker';
            const progress = x / this.levelLength;

            if (progress < 0.28) {
                // Early harbor: commoners, fruit, cloth
                const pool = ['commoner_worker', 'tribute_food', 'bundle_bearer'];
                type = pool[Math.floor(Math.random() * pool.length)];
            } else if (progress < 0.65) {
                // Mid sphinx avenue: urns, food, captives, commoners
                const pool = ['tribute_urn', 'tribute_food', 'captive', 'commoner_worker'];
                type = pool[Math.floor(Math.random() * pool.length)];
            } else {
                // Palace approach: heavy treasures, precious urns, captives
                const pool = ['tribute_chest', 'tribute_urn', 'commoner_worker'];
                type = pool[Math.floor(Math.random() * pool.length)];
            }

            this.subjects.push(new Subject(x, carpetSurface, type));
        }

        // 2. Pillars, Palms, Banners along the road
        for (let x = 120; x < this.levelLength; x += 220) {
            this.pillars.push({ x: x, y: carpetSurface });
        }

        for (let x = 240; x < this.levelLength; x += 360) {
            this.banners.push({ x: x, y: carpetSurface });
        }

        for (let x = 300; x < this.levelLength; x += 420) {
            this.incenseCensers.push({ x: x, y: carpetSurface });
        }

        // Royal Golden Throne at the climax of the palace!
        this.props.push({ type: 'throne', x: 3900, y: carpetSurface });

        // Flying background birds
        for (let i = 0; i < 5; i++) {
            this.birds.push({
                x: 100 + i * 240,
                y: 65 + Math.random() * 60,
                speed: 30 + Math.random() * 20,
                bob: Math.random() * Math.PI * 2
            });
        }
    }

    update(dt, king, particleSystem, camera) {
        this.sun.pulse += dt * 2;
        this.dayTime += dt * 0.05;

        // Incense smoke generation
        this.incenseCensers.forEach(c => {
            if (Math.abs(c.x - camera.x) < camera.width) {
                if (Math.random() < 0.35) {
                    particleSystem.spawnIncense(c.x, c.y);
                }
            }
        });

        // Occasional falling rose/lotus petal in royal palace
        if (Math.random() < 0.3) {
            const petalX = camera.x + (Math.random() - 0.5) * camera.width;
            const petalY = this.groundY - 260 - Math.random() * 100;
            particleSystem.spawnPetal(petalX, petalY);
        }

        // Birds flying across sky
        this.birds.forEach(b => {
            b.x += b.speed * dt;
            b.bob += dt * 3;
            if (b.x > camera.x + camera.width + 200) {
                b.x = camera.x - 200;
            }
        });

        // Update all subjects
        const carpetSurface = this.groundY - 16;
        this.subjects.forEach(s => s.update(dt, king, particleSystem, camera, carpetSurface));

        // Check if King reached the Throne in story mode
        if (this.mode === 'story' && !this.throneReached && king.x >= 3890) {
            this.triggerThroneCoronation(king, particleSystem);
        }

        // Endless mode procedural generation
        if (this.mode === 'endless') {
            const rightEdge = camera.x + camera.width + 400;
            const lastSubject = this.subjects[this.subjects.length - 1];
            if (!lastSubject || lastSubject.x < rightEdge) {
                const nextX = lastSubject ? lastSubject.x + 120 + Math.random() * 80 : rightEdge;
                const pool = ['commoner_worker', 'tribute_food', 'tribute_urn', 'tribute_chest', 'captive'];
                const type = pool[Math.floor(Math.random() * pool.length)];
                this.subjects.push(new Subject(nextX, carpetSurface, type));
            }
        }
    }

    triggerThroneCoronation(king, particleSystem) {
        this.throneReached = true;
        king.state = 'enthroned';
        king.x = 3900;
        king.vx = 0;

        if (window.soundSystem) {
            window.soundSystem.playFanfare();
        }

        // All subjects on screen bow and cheer
        this.subjects.forEach(s => {
            s.state = 'prostrating';
            s.receiveBlessing(particleSystem);
        });

        // Massive shower of blessing particles and petals
        for (let i = 0; i < 80; i++) {
            setTimeout(() => {
                particleSystem.spawnBlessingBurst(king.x + (Math.random() - 0.5) * 200, king.y - 120, 15);
                particleSystem.spawnPetal(king.x + (Math.random() - 0.5) * 400, king.y - 300);
            }, i * 40);
        }

        if (window.gameUI) {
            setTimeout(() => {
                window.gameUI.showVictoryModal(king);
            }, 2000);
        }
    }

    render(ctx, camera, assets) {
        // 1. Sky & Sun Layer
        this.renderSky(ctx, camera);

        // 2. Palace Panorama Backdrop (The complete 2D level design from Image 2)
        this.renderPanorama(ctx, camera, assets);

        // 3. Ground Layer: Sandstone pavement & Royal Carpet
        this.renderGround(ctx, camera, assets);

        // 4. Back Props (Pillars, Palms, Banners behind characters)
        this.renderBackProps(ctx, camera, assets);

        // 5. Front Props (Censers with glowing charcoal, incense)
        this.renderFrontProps(ctx, camera, assets);
    }

    renderSky(ctx, camera) {
        // Ancient Egyptian desert sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, camera.height * 0.7);
        grad.addColorStop(0, '#fef3c7'); // warm sunlit gold
        grad.addColorStop(0.35, '#fed7aa'); // peach desert atmosphere
        grad.addColorStop(0.7, '#fef08a'); // luminous golden horizon
        grad.addColorStop(1, '#fde047');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, camera.width, camera.height);

        // Blazing Aten Sun Disc with Radiating Sunbeams
        const sunScreenX = camera.width * 0.72 - (camera.x * 0.04);
        const sunScreenY = 95;

        ctx.save();
        const pulse = Math.sin(this.sun.pulse) * 4;

        // Radial Sunburst Aura
        const sunGrad = ctx.createRadialGradient(sunScreenX, sunScreenY, 0, sunScreenX, sunScreenY, 130 + pulse);
        sunGrad.addColorStop(0, 'rgba(234, 88, 12, 0.95)');
        sunGrad.addColorStop(0.25, 'rgba(245, 158, 11, 0.85)');
        sunGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.45)');
        sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunScreenX, sunScreenY, 130 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Egyptian Sun Disc Solid Center
        ctx.fillStyle = '#dc2626'; // Deep Egyptian red
        ctx.beginPath();
        ctx.arc(sunScreenX, sunScreenY, 30, 0, Math.PI * 2);
        ctx.fill();

        // Sun Rays (God Rays)
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI) / 8 + this.sun.pulse * 0.05;
            const r1 = 34;
            const r2 = 85 + (i % 2 === 0 ? 25 : 0) + pulse;
            ctx.beginPath();
            ctx.moveTo(sunScreenX + Math.cos(angle) * r1, sunScreenY + Math.sin(angle) * r1);
            ctx.lineTo(sunScreenX + Math.cos(angle) * r2, sunScreenY + Math.sin(angle) * r2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderPanorama(ctx, camera, assets) {
        const panorama = assets.get('palace_panorama');
        if (!panorama) return;

        // The background panorama spans the level majestically
        // In Image 2, the level panorama contains:
        // Nile boat dock -> Obelisks -> Colossus & Sphinx -> Colonnade -> Sun Palace Gate
        const groundScreen = camera.worldToScreen(0, this.groundY).y;
        const bgH = 260 * camera.zoom;
        const bgY = groundScreen - bgH + 8; // Anchor snugly to ground

        // Stretch panorama across levelLength with gentle parallax (0.5)
        const parallax = 0.55;
        const totalWorldWidth = this.levelLength * 1.1;
        const screenStart = camera.worldToScreen(0, 0).x;
        const panoDrawW = totalWorldWidth * camera.zoom * parallax;

        // We draw the panorama repeating smoothly
        const offsetX = (camera.x * (1 - parallax)) * camera.zoom;
        const drawX = (0 - camera.x * parallax) * camera.zoom + camera.width / 2;

        ctx.save();
        // Draw the grand panoramic backdrop
        ctx.drawImage(panorama, drawX, bgY, panoDrawW, bgH);

        // If camera extends past right edge, repeat panorama seamless
        if (drawX + panoDrawW < camera.width) {
            ctx.drawImage(panorama, drawX + panoDrawW, bgY, panoDrawW, bgH);
        }
        ctx.restore();
    }

    renderGround(ctx, camera, assets) {
        const groundScreen = camera.worldToScreen(0, this.groundY);
        const y = groundScreen.y;

        // Sandstone pavement base (warm Egyptian limestone)
        ctx.fillStyle = '#d8bc98';
        ctx.fillRect(0, y, camera.width, camera.height - y);

        // Ancient Sandstone Slab Joints
        ctx.strokeStyle = '#b39572';
        ctx.lineWidth = 2;
        const slabW = 110 * camera.zoom;
        const offsetX = -((camera.x * camera.zoom) % slabW);

        for (let x = offsetX; x < camera.width + slabW; x += slabW) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, camera.height);
            ctx.stroke();
        }

        // Horizontal mortar line
        ctx.beginPath();
        ctx.moveTo(0, y + 22 * camera.zoom);
        ctx.lineTo(camera.width, y + 22 * camera.zoom);
        ctx.stroke();

        // Royal Crimson Procession Carpet
        const carpetH = 16 * camera.zoom;
        ctx.fillStyle = '#991b1b'; // Imperial Egyptian red
        ctx.fillRect(0, y - carpetH, camera.width, carpetH);

        // Gold Fringe borders on royal carpet
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, y - carpetH, camera.width, 2.5 * camera.zoom);
        ctx.fillRect(0, y - 2.5 * camera.zoom, camera.width, 2.5 * camera.zoom);
    }

    renderBackProps(ctx, camera, assets) {
        const pillarSprite = assets.get('pillar_lotus');
        const palmSprite = assets.get('palm_tree');
        const bannerSprite = assets.get('royal_banner');
        const throneSprite = assets.get('royal_throne');
        const fanSprite = assets.get('royal_fan');

        // Lotus Pillars in background
        if (pillarSprite) {
            this.pillars.forEach(p => {
                const screen = camera.worldToScreen(p.x, p.y);
                const drawH = 150 * camera.zoom;
                const drawW = 50 * camera.zoom;
                if (screen.x > -drawW && screen.x < camera.width + drawW) {
                    ctx.drawImage(pillarSprite, screen.x - drawW / 2, screen.y - drawH - 12 * camera.zoom, drawW, drawH);
                }
            });
        }

        // Palms
        if (palmSprite) {
            for (let x = 160; x < this.levelLength; x += 380) {
                const screen = camera.worldToScreen(x, this.groundY);
                const drawH = 165 * camera.zoom;
                const drawW = 75 * camera.zoom;
                if (screen.x > -drawW && screen.x < camera.width + drawW) {
                    ctx.drawImage(palmSprite, screen.x - drawW / 2, screen.y - drawH - 12 * camera.zoom, drawW, drawH);
                }
            }
        }

        // Royal Banners
        if (bannerSprite) {
            this.banners.forEach(b => {
                const screen = camera.worldToScreen(b.x, b.y);
                const drawH = 125 * camera.zoom;
                const drawW = 40 * camera.zoom;
                if (screen.x > -drawW && screen.x < camera.width + drawW) {
                    const wave = Math.sin(performance.now() * 0.003 + b.x) * 3;
                    ctx.drawImage(bannerSprite, screen.x - drawW / 2 + wave, screen.y - drawH - 12 * camera.zoom, drawW, drawH);
                }
            });
        }

        // Golden Throne at End
        if (throneSprite) {
            const throneScreen = camera.worldToScreen(3900, this.groundY);
            const drawH = 175 * camera.zoom;
            const drawW = 105 * camera.zoom;
            if (throneScreen.x > -drawW && throneScreen.x < camera.width + drawW) {
                // Golden throne glow
                ctx.save();
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 25 * camera.zoom;
                ctx.drawImage(throneSprite, throneScreen.x - drawW / 2, throneScreen.y - drawH - 12 * camera.zoom, drawW, drawH);
                ctx.restore();

                // Ceremonial fans flanking throne
                if (fanSprite) {
                    const fanH = 135 * camera.zoom;
                    const fanW = 50 * camera.zoom;
                    ctx.drawImage(fanSprite, throneScreen.x - drawW / 2 - 40 * camera.zoom, throneScreen.y - fanH - 12 * camera.zoom, fanW, fanH);
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.drawImage(fanSprite, -(throneScreen.x + drawW / 2 + 40 * camera.zoom), throneScreen.y - fanH - 12 * camera.zoom, fanW, fanH);
                    ctx.restore();
                }
            }
        }
    }

    renderFrontProps(ctx, camera, assets) {
        // Incense Censers (glowing embers)
        this.incenseCensers.forEach(c => {
            const screen = camera.worldToScreen(c.x, c.y);
            if (screen.x > -30 && screen.x < camera.width + 30) {
                ctx.save();
                // Golden censer bowl
                ctx.fillStyle = '#b45309';
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, 7 * camera.zoom, 0, Math.PI);
                ctx.fill();

                // Glowing embers
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 8 * camera.zoom;
                ctx.beginPath();
                ctx.arc(screen.x, screen.y - 2, 3.5 * camera.zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }

    renderBorders(ctx, assets, canvasWidth, canvasHeight) {
        // Authentic Top and Bottom Hieroglyphic Mural Borders from Image 1!
        const borderTop = assets.get('border_top');
        const borderBottom = assets.get('border_bottom');
        const wingedSun = assets.get('winged_sun_disc');

        if (borderTop) {
            ctx.drawImage(borderTop, 0, 0, canvasWidth, 34);
        }

        if (borderBottom) {
            const bHeight = 44;
            ctx.drawImage(borderBottom, 0, canvasHeight - bHeight, canvasWidth, bHeight);

            // Centered Great Winged Sun Disc
            if (wingedSun) {
                const wW = 180;
                const wH = 44;
                ctx.drawImage(wingedSun, (canvasWidth - wW) / 2, canvasHeight - bHeight, wW, wH);
            }
        }
    }
}

window.World = World;
