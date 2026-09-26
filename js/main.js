/**
 * His Majesty - Main Game Controller & Bootstrapper
 * Initializes canvas, preloads assets, drives 60fps game loop,
 * and wires up input and rendering systems.
 */

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // High DPI Retina Support
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        if (window.gameCamera) {
            window.gameCamera.width = rect.width;
            window.gameCamera.height = rect.height;
        }
        if (window.gameWorld) {
            window.gameWorld.width = rect.width;
            window.gameWorld.height = rect.height;
            window.gameWorld.groundY = rect.height - 110;
            const carpetSurface = window.gameWorld.groundY - 16;

            if (window.gameKing) {
                window.gameKing.baseY = carpetSurface;
                if (window.gameKing.state !== 'enthroned') {
                    window.gameKing.y = carpetSurface;
                }
            }

            if (window.gameWorld.subjects) {
                window.gameWorld.subjects.forEach(s => {
                    s.y = carpetSurface;
                });
            }
            if (window.gameWorld.pillars) {
                window.gameWorld.pillars.forEach(p => {
                    p.y = carpetSurface;
                });
            }
            if (window.gameWorld.banners) {
                window.gameWorld.banners.forEach(b => {
                    b.y = carpetSurface;
                });
            }
            if (window.gameWorld.incenseCensers) {
                window.gameWorld.incenseCensers.forEach(c => {
                    c.y = carpetSurface;
                });
            }
        }
    }

    const assets = new AssetManager();
    const input = new InputManager();
    const particles = new ParticleSystem();

    // Initial dummy camera & world before resize
    const rect = canvas.getBoundingClientRect();
    const camera = new Camera(rect.width || 1024, rect.height || 576);
    const world = new World(camera.width, camera.height);
    const king = new King(200, world.groundY);

    // Make globally accessible
    window.gameAssets = assets;
    window.gameInput = input;
    window.gameParticles = particles;
    window.gameCamera = camera;
    window.gameWorld = world;
    window.gameKing = king;

    // Load UI
    const ui = new GameUI();
    window.gameUI = ui;

    // Camera initial tracking
    camera.targetX = king.x + 120;
    camera.targetY = king.y - 100;
    camera.x = camera.targetX;
    camera.y = camera.targetY;

    // Zoom states: normal (1.0), closeup (1.3), panoramic (0.8)
    const zoomLevels = [1.0, 1.3, 0.8];
    let currentZoomIdx = 0;

    // Asset manifest
    const assetManifest = [
        // King Walk cycle
        { name: 'king_walk_0', src: 'assets/sprites/king_walk_0.png' },
        { name: 'king_walk_1', src: 'assets/sprites/king_walk_1.png' },
        { name: 'king_walk_2', src: 'assets/sprites/king_walk_2.png' },
        { name: 'king_walk_3', src: 'assets/sprites/king_walk_3.png' },
        { name: 'king_walk_4', src: 'assets/sprites/king_walk_4.png' },
        { name: 'king_walk_5', src: 'assets/sprites/king_walk_5.png' },
        { name: 'king_walk_6', src: 'assets/sprites/king_walk_6.png' },
        { name: 'king_walk_padded_0', src: 'assets/sprites/king_walk_padded_0.png' },
        { name: 'king_walk_padded_1', src: 'assets/sprites/king_walk_padded_1.png' },
        { name: 'king_walk_padded_2', src: 'assets/sprites/king_walk_padded_2.png' },
        { name: 'king_walk_padded_3', src: 'assets/sprites/king_walk_padded_3.png' },
        { name: 'king_walk_padded_4', src: 'assets/sprites/king_walk_padded_4.png' },
        { name: 'king_walk_padded_5', src: 'assets/sprites/king_walk_padded_5.png' },
        { name: 'king_walk_padded_6', src: 'assets/sprites/king_walk_padded_6.png' },
        { name: 'king_walk_sheet', src: 'assets/sprites/king_walk_sheet.png' },
        { name: 'king_custom_portrait', src: 'assets/sprites/king_custom_portrait.png' },

        // Entourage
        { name: 'bearer_parasol', src: 'assets/sprites/bearer_parasol.png' },
        { name: 'bearer_fan', src: 'assets/sprites/bearer_fan.png' },
        { name: 'sacred_horus_bird', src: 'assets/sprites/sacred_horus_bird.png' },
        { name: 'flying_swallow', src: 'assets/sprites/flying_swallow.png' },

        // Subjects
        { name: 'subject_carry_goods', src: 'assets/sprites/subject_carry_goods.png' },
        { name: 'subject_captive', src: 'assets/sprites/subject_captive.png' },
        { name: 'subject_kneel_greet', src: 'assets/sprites/subject_kneel_greet.png' },
        { name: 'subject_offer_food', src: 'assets/sprites/subject_offer_food.png' },
        { name: 'subject_offer_urn', src: 'assets/sprites/subject_offer_urn.png' },
        { name: 'subject_offer_chest', src: 'assets/sprites/subject_offer_chest.png' },
        { name: 'subject_prostrate', src: 'assets/sprites/subject_prostrate.png' },
        { name: 'subj1_fruit', src: 'assets/sprites/subj1_fruit.png' },
        { name: 'subj1_urn', src: 'assets/sprites/subj1_urn.png' },
        { name: 'subj1_bundle', src: 'assets/sprites/subj1_bundle.png' },
        { name: 'subj1_chest', src: 'assets/sprites/subj1_chest.png' },

        // Backgrounds
        { name: 'palace_panorama', src: 'assets/backgrounds/palace_panorama.jpg' },
        { name: 'bg_colonnade', src: 'assets/backgrounds/bg_colonnade.png' },
        { name: 'bg_dock_boat', src: 'assets/backgrounds/bg_dock_boat.png' },
        { name: 'bg_obelisks', src: 'assets/backgrounds/bg_obelisks.png' },
        { name: 'bg_palace_gate', src: 'assets/backgrounds/bg_palace_gate.png' },
        { name: 'bg_pharaoh_sphinx', src: 'assets/backgrounds/bg_pharaoh_sphinx.png' },

        // Props
        { name: 'pillar_lotus', src: 'assets/props/pillar_lotus.png' },
        { name: 'palm_tree', src: 'assets/props/palm_tree.png' },
        { name: 'royal_banner', src: 'assets/props/royal_banner.png' },
        { name: 'sphinx_pedestal', src: 'assets/props/sphinx_pedestal.png' },
        { name: 'royal_throne', src: 'assets/props/royal_throne.png' },
        { name: 'royal_fan', src: 'assets/props/royal_fan.png' },
        { name: 'treasure_chest', src: 'assets/props/treasure_chest.png' },
        { name: 'urn_gold', src: 'assets/props/urn_gold.png' },
        { name: 'fruit_bowl', src: 'assets/props/fruit_bowl.png' },

        // UI & Borders
        { name: 'border_top', src: 'assets/ui/border_top.png' },
        { name: 'border_bottom', src: 'assets/ui/border_bottom.png' },
        { name: 'winged_sun_disc', src: 'assets/ui/winged_sun_disc.png' }
    ];

    // Preload
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar-fill');
    const startBtn = document.getElementById('btn-start-game');

    Promise.all(assetManifest.map(a => assets.load(a.name, a.src))).then(() => {
        if (loadingBar) loadingBar.style.width = '100%';
        if (startBtn) {
            startBtn.classList.remove('hidden');
            startBtn.addEventListener('click', () => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => loadingScreen.style.display = 'none', 600);
                if (window.soundSystem) {
                    window.soundSystem.init();
                    window.soundSystem.startMusic();
                }
            });
        }
    });

    window.resetGame = function(mode = 'story') {
        world.mode = mode;
        world.throneReached = false;
        world.initStage();
        king.x = 200;
        king.y = world.groundY - 16;
        king.state = 'idle';
        king.distanceWalked = 0;
        camera.targetX = king.x + 120;
        camera.x = camera.targetX;
    };

    // Hotkey Controls
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'KeyE') {
            king.triggerBlessing(particles, world);
        }
        if (e.code === 'KeyC') {
            currentZoomIdx = (currentZoomIdx + 1) % zoomLevels.length;
            camera.targetZoom = zoomLevels[currentZoomIdx];
        }
        if (e.code === 'KeyV') {
            const style = king.switchAvatarStyle();
            const btn = document.getElementById('btn-toggle-avatar');
            if (btn) btn.innerText = (style === 'classic') ? '👑 Style: Classic' : '👑 Style: Royal Portrait';
        }
        if (e.code === 'KeyP') {
            king.autoWalk = !king.autoWalk;
            const btn = document.getElementById('btn-auto-walk');
            if (btn) {
                btn.classList.toggle('active', king.autoWalk);
                btn.innerText = king.autoWalk ? '🚶 Auto: ON' : '🚶 Auto: OFF';
            }
        }
        if (e.code === 'KeyM') {
            if (window.soundSystem) {
                const muted = window.soundSystem.toggleMute();
                const btn = document.getElementById('btn-sound');
                if (btn) btn.innerText = muted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
            }
        }
        // Sistrum of Submission (Q)
        if (e.code === 'KeyQ') {
            if (window.soundSystem) window.soundSystem.playSistrum(0.8);
            world.subjects.forEach(s => {
                s.state = 'prostrating';
                s.showSpeech('Prostrate before Pharaoh! 𓊽', 2.0, '#fde047');
            });
        }
    });

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 60FPS Game Loop
    let lastTime = performance.now();

    function gameLoop(timestamp) {
        let dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        if (dt > 0.1) dt = 0.1; // clamp delta time

        // 1. Update Game State
        king.update(dt, input, particles, world);
        world.update(dt, king, particles, camera);
        particles.update(dt, camera);

        // Camera smoothly leads the King
        camera.targetX = king.x + (140 * king.facing);
        camera.targetY = king.y - (100 * camera.zoom);
        camera.update(dt);

        ui.update(king, world);
        input.resetFrame();

        // 2. Render Canvas
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        // World Backgrounds & Midgrounds
        world.render(ctx, camera, assets);

        // Subjects (Slaves, commoners, gift bearers)
        world.subjects.forEach(s => s.render(ctx, camera, assets));

        // The King and Royal Entourage
        king.render(ctx, camera, assets);

        // Particles & Divine Sparks
        particles.render(ctx, camera);

        // Top and Bottom Egyptian Hieroglyphic Mural Borders
        world.renderBorders(ctx, assets, rect.width, rect.height);

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
