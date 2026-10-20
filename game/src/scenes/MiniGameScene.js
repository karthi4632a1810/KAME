/**
 * MiniGameScene — Pummel Party Style Round-End Mini-Game Arena
 * Rotates between 3 action-packed competitive mini-games:
 * 1. "Meteor Coin Rush" (Dodge meteors & scoop up coins)
 * 2. "Laser Grid Survival" (Dodge sweeping high-voltage death lasers)
 * 3. "Bumper KAME Arena" (Ram opponents off the floating arena)
 */
import Phaser from 'phaser';
import { POWER_CARDS, MINI_GAMES } from '../config/GameConfig.js';
import { audio } from '../audio/AudioManager.js';

export class MiniGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MiniGameScene' });
    }

    init(data) {
        this.boardScene = data.boardScene;
        this.playersData = data.players || [];
        this.roundNumber = data.roundNumber || 1;

        // Select mini-game
        const gameCatalog = MINI_GAMES || [
            { id: 'coin_rush', name: 'Meteor Coin Rush', subtitle: 'DODGE & COLLECT', duration: 10.0 },
            { id: 'laser_grid', name: 'Laser Grid Survival', subtitle: 'ELECTRIC DODGE', duration: 12.0 },
            { id: 'bumper_arena', name: 'Bumper KAME Arena', subtitle: 'SUMO KNOCKOUT', duration: 12.0 },
        ];

        if (data.gameType && typeof data.gameType === 'object') {
            this.currentGameConfig = data.gameType;
        } else if (typeof data.gameType === 'string') {
            this.currentGameConfig = gameCatalog.find(g => g.id === data.gameType) || gameCatalog[0];
        } else {
            // Cycle through the 3 games based on round number
            const cycleIndex = (this.roundNumber - 1) % gameCatalog.length;
            this.currentGameConfig = gameCatalog[cycleIndex];
        }
    }

    create() {
        const { width, height } = this.cameras.main;
        this.width = width;
        this.height = height;

        this.gameActive = false;
        this.timeLeft = this.currentGameConfig.duration || 10.0;
        this.scores = {};
        this.playersData.forEach(p => { this.scores[p.id] = 0; });

        this.miniTokens = [];
        this.coins = [];
        this.meteors = [];
        this.lasers = [];
        this.hazards = [];

        // ── Arena Setup ──
        this.createArena();

        // ── Competitor Tokens ──
        this.createCompetitors();

        // ── Mini-Game UI ──
        this.createMiniGameUI();

        // ── Countdown Sequence ──
        this.startCountdown();
    }

    createArena() {
        // Dark arena background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x070712, 0x070712, 0x121024, 0x121024, 1);
        bg.fillRect(0, 0, this.width, this.height);

        this.arenaBounds = {
            left: 140,
            right: this.width - 140,
            top: 90,
            bottom: this.height - 70,
            centerX: this.width / 2,
            centerY: (90 + this.height - 70) / 2,
            radius: 220,
        };

        if (this.currentGameConfig.id === 'bumper_arena') {
            // Circular sumo platform with void around it
            const voidGfx = this.add.graphics();
            voidGfx.fillStyle(0x04030a, 0.95);
            voidGfx.fillRect(this.arenaBounds.left - 40, this.arenaBounds.top - 20, 
                this.arenaBounds.right - this.arenaBounds.left + 80, 
                this.arenaBounds.bottom - this.arenaBounds.top + 40);

            // Lava boundary glow
            const lavaBorder = this.add.graphics();
            lavaBorder.lineStyle(8, 0xe74c3c, 0.6);
            lavaBorder.strokeCircle(this.arenaBounds.centerX, this.arenaBounds.centerY, this.arenaBounds.radius);
            lavaBorder.fillStyle(0x18182c, 0.98);
            lavaBorder.fillCircle(this.arenaBounds.centerX, this.arenaBounds.centerY, this.arenaBounds.radius);

            // Inner ring
            lavaBorder.lineStyle(2, 0xf0c040, 0.5);
            lavaBorder.strokeCircle(this.arenaBounds.centerX, this.arenaBounds.centerY, this.arenaBounds.radius - 20);
            lavaBorder.strokeCircle(this.arenaBounds.centerX, this.arenaBounds.centerY, 60);
        } else {
            // Rectangular grid arena
            const arenaBorder = this.add.graphics();
            const strokeColor = this.currentGameConfig.id === 'laser_grid' ? 0x00f0ff : 0xf0c040;
            arenaBorder.lineStyle(3, strokeColor, 0.65);
            arenaBorder.strokeRoundedRect(
                this.arenaBounds.left,
                this.arenaBounds.top,
                this.arenaBounds.right - this.arenaBounds.left,
                this.arenaBounds.bottom - this.arenaBounds.top,
                16
            );

            // Interior tech grid
            arenaBorder.lineStyle(1, 0xffffff, 0.04);
            for (let x = this.arenaBounds.left; x < this.arenaBounds.right; x += 40) {
                arenaBorder.lineBetween(x, this.arenaBounds.top, x, this.arenaBounds.bottom);
            }
            for (let y = this.arenaBounds.top; y < this.arenaBounds.bottom; y += 40) {
                arenaBorder.lineBetween(this.arenaBounds.left, y, this.arenaBounds.right, y);
            }
        }
    }

    createCompetitors() {
        const centerY = this.arenaBounds.centerY;
        const totalPlayers = this.playersData.length;

        this.playersData.forEach((player, i) => {
            let startX, startY;
            if (this.currentGameConfig.id === 'bumper_arena') {
                const angle = (i / totalPlayers) * Math.PI * 2;
                startX = this.arenaBounds.centerX + Math.cos(angle) * (this.arenaBounds.radius * 0.55);
                startY = this.arenaBounds.centerY + Math.sin(angle) * (this.arenaBounds.radius * 0.55);
            } else {
                const spacing = (this.arenaBounds.right - this.arenaBounds.left) / (totalPlayers + 1);
                startX = this.arenaBounds.left + spacing * (i + 1);
                startY = centerY;
            }

            const container = this.add.container(startX, startY);

            // Ring aura
            const ring = this.add.circle(0, 0, 18, player.color, 0.85);
            ring.setStrokeStyle(2, 0xffffff, 0.85);

            // Mascot Avatar
            let avatar;
            const avatarKey = `char_avatar_${i + 1}`;
            if (this.textures.exists(avatarKey)) {
                avatar = this.add.image(0, 0, avatarKey).setDisplaySize(24, 24);
            } else {
                avatar = this.add.text(0, 0, `${i + 1}`, {
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    fontStyle: 'bold'
                }).setOrigin(0.5);
            }

            // Name label
            const label = this.add.text(0, -26, player.character ? player.character.name : player.name, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                fontStyle: 'bold',
                color: player.colorHex || '#ffffff',
            }).setOrigin(0.5);

            container.add([ring, avatar, label]);

            this.miniTokens.push({
                id: player.id,
                isBot: player.isBot,
                container,
                vx: 0,
                vy: 0,
                speed: 280,
                stunned: false,
                alive: true,
                data: player,
            });
        });
    }

    createMiniGameUI() {
        // Top header banner
        const title = this.currentGameConfig.name.toUpperCase();
        this.add.text(this.width / 2, 28, `🔥 ROUND ${this.roundNumber}: ${title} 🔥`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#f0c040',
            letterSpacing: 2,
        }).setOrigin(0.5);

        this.timerText = this.add.text(this.width / 2, 58, `⏱️ ${this.timeLeft.toFixed(1)}s`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Controls hint at bottom
        let hint = 'Move: Mouse Pointer or Arrow / WASD keys';
        if (this.currentGameConfig.id === 'coin_rush') {
            hint += ' • Collect Golden Coins • Dodge Blazing Meteors!';
        } else if (this.currentGameConfig.id === 'laser_grid') {
            hint += ' • Dodge Sweeping Death Lasers • Stay Alive to Score!';
        } else if (this.currentGameConfig.id === 'bumper_arena') {
            hint += ' • Ram into opponents! • Knock rivals off the platform into the abyss!';
        }

        this.add.text(this.width / 2, this.height - 35, hint, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#8888aa',
        }).setOrigin(0.5);

        // Live score capsules on top-right
        this.scoreTexts = {};
        this.playersData.forEach((p, idx) => {
            const txt = this.add.text(this.arenaBounds.right - 10, 20 + idx * 16, `${p.name}: 0 pts`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                color: p.colorHex || '#ffffff',
            }).setOrigin(1, 0);
            this.scoreTexts[p.id] = txt;
        });

        // Key inputs
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
    }

    startCountdown() {
        const titleModal = this.add.container(this.width / 2, this.height / 2).setDepth(60);

        const bannerBg = this.add.graphics();
        bannerBg.fillStyle(0x0a0a18, 0.94);
        bannerBg.fillRoundedRect(-220, -70, 440, 140, 16);
        bannerBg.lineStyle(2, 0xf0c040, 0.85);
        bannerBg.strokeRoundedRect(-220, -70, 440, 140, 16);
        titleModal.add(bannerBg);

        const subTitle = this.add.text(0, -38, this.currentGameConfig.subtitle || 'MINI-GAME', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#67e8f9',
            letterSpacing: 2,
        }).setOrigin(0.5);

        const nameTitle = this.add.text(0, -12, this.currentGameConfig.name, {
            fontFamily: 'Cinzel, serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5);

        const countText = this.add.text(0, 28, 'READY', {
            fontFamily: 'Cinzel, serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5);

        titleModal.add([subTitle, nameTitle, countText]);

        audio.playDiceTick();

        this.time.delayedCall(900, () => {
            countText.setText('3');
            audio.playDiceTick();
            this.time.delayedCall(600, () => {
                countText.setText('2');
                audio.playDiceTick();
                this.time.delayedCall(600, () => {
                    countText.setText('1');
                    audio.playDiceTick();
                    this.time.delayedCall(600, () => {
                        countText.setText('GO!!');
                        audio.playCash();
                        this.tweens.add({
                            targets: titleModal,
                            alpha: 0,
                            scaleX: 1.2,
                            scaleY: 1.2,
                            duration: 350,
                            onComplete: () => {
                                titleModal.destroy();
                                this.startMiniGameLoop();
                            }
                        });
                    });
                });
            });
        });
    }

    startMiniGameLoop() {
        this.gameActive = true;

        if (this.currentGameConfig.id === 'coin_rush') {
            // Coins & Meteors
            this.coinTimer = this.time.addEvent({
                delay: 450,
                callback: () => this.spawnCoin(),
                loop: true,
            });
            this.meteorTimer = this.time.addEvent({
                delay: 900,
                callback: () => this.spawnMeteor(),
                loop: true,
            });
        } else if (this.currentGameConfig.id === 'laser_grid') {
            // Lasers cycle every 1.6s
            this.laserTimer = this.time.addEvent({
                delay: 1600,
                callback: () => this.spawnLaserWave(),
                loop: true,
            });
            // Passive survival score tick every 0.5s
            this.survivalTimer = this.time.addEvent({
                delay: 500,
                callback: () => {
                    if (!this.gameActive) return;
                    this.miniTokens.forEach(token => {
                        if (token.alive && !token.stunned) {
                            this.scores[token.id] += 25;
                        }
                    });
                    this.updateScoreboard();
                },
                loop: true,
            });
        }
    }

    // ═══════════════════════════════════════
    // GAME MODE 1: COIN RUSH SPAWNERS
    // ═══════════════════════════════════════

    spawnCoin() {
        if (!this.gameActive) return;
        const x = Phaser.Math.Between(this.arenaBounds.left + 30, this.arenaBounds.right - 30);
        const y = Phaser.Math.Between(this.arenaBounds.top + 30, this.arenaBounds.bottom - 30);

        const isStar = Math.random() < 0.2;
        const color = isStar ? 0x9b59b6 : 0xf0c040;
        const points = isStar ? 300 : 100;

        const coin = this.add.circle(x, y, isStar ? 9 : 7, color);
        coin.setStrokeStyle(1.5, 0xffffff, 0.9);
        coin.setData('points', points);

        this.tweens.add({
            targets: coin,
            scaleX: 1.3,
            scaleY: 1.3,
            yoyo: true,
            repeat: -1,
            duration: 400,
        });

        this.coins.push(coin);
        this.time.delayedCall(4500, () => {
            if (coin.active) {
                coin.destroy();
                const idx = this.coins.indexOf(coin);
                if (idx !== -1) this.coins.splice(idx, 1);
            }
        });
    }

    spawnMeteor() {
        if (!this.gameActive) return;
        const targetX = Phaser.Math.Between(this.arenaBounds.left + 30, this.arenaBounds.right - 30);
        const targetY = Phaser.Math.Between(this.arenaBounds.top + 30, this.arenaBounds.bottom - 30);

        const warning = this.add.circle(targetX, targetY, 26, 0xe74c3c, 0.3);
        warning.setStrokeStyle(2, 0xe74c3c, 0.8);

        this.tweens.add({
            targets: warning,
            alpha: 0.8,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 650,
            yoyo: true,
            repeat: 0,
            onComplete: () => {
                warning.destroy();
                this.detonateMeteor(targetX, targetY);
            }
        });
    }

    detonateMeteor(x, y) {
        if (!this.gameActive) return;
        audio.playHazard();
        this.cameras.main.shake(150, 0.007);

        const blast = this.add.circle(x, y, 38, 0xff5533, 0.85);
        this.tweens.add({
            targets: blast,
            scaleX: 1.6,
            scaleY: 1.6,
            alpha: 0,
            duration: 350,
            onComplete: () => blast.destroy(),
        });

        this.miniTokens.forEach(token => {
            const dist = Phaser.Math.Distance.Between(token.container.x, token.container.y, x, y);
            if (dist < 46 && !token.stunned) {
                token.stunned = true;
                this.scores[token.id] = Math.max(0, this.scores[token.id] - 150);
                this.updateScoreboard();

                const ft = this.add.text(token.container.x, token.container.y - 25, '-150 💥', {
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    fontStyle: 'bold',
                    color: '#e74c3c',
                }).setOrigin(0.5);

                this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 600, onComplete: () => ft.destroy() });

                this.tweens.add({
                    targets: token.container,
                    angle: 360,
                    alpha: 0.4,
                    duration: 600,
                    onComplete: () => {
                        token.container.setAngle(0).setAlpha(1);
                        token.stunned = false;
                    }
                });
            }
        });
    }

    // ═══════════════════════════════════════
    // GAME MODE 2: LASER GRID SPAWNERS
    // ═══════════════════════════════════════

    spawnLaserWave() {
        if (!this.gameActive) return;
        const isHorizontal = Math.random() > 0.5;
        const pos = isHorizontal ?
            Phaser.Math.Between(this.arenaBounds.top + 30, this.arenaBounds.bottom - 30) :
            Phaser.Math.Between(this.arenaBounds.left + 30, this.arenaBounds.right - 30);

        const warningLine = this.add.graphics();
        warningLine.lineStyle(2, 0xff0044, 0.4);
        if (isHorizontal) {
            warningLine.lineBetween(this.arenaBounds.left, pos, this.arenaBounds.right, pos);
        } else {
            warningLine.lineBetween(pos, this.arenaBounds.top, pos, this.arenaBounds.bottom);
        }

        // Telegraph flash
        this.tweens.add({
            targets: warningLine,
            alpha: 0.9,
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                warningLine.destroy();
                this.fireLaser(isHorizontal, pos);
            }
        });
    }

    fireLaser(isHorizontal, pos) {
        if (!this.gameActive) return;
        audio.playHazard();
        this.cameras.main.shake(120, 0.005);

        const beam = this.add.graphics();
        beam.lineStyle(14, 0x00f0ff, 0.9);
        if (isHorizontal) {
            beam.lineBetween(this.arenaBounds.left, pos, this.arenaBounds.right, pos);
        } else {
            beam.lineBetween(pos, this.arenaBounds.top, pos, this.arenaBounds.bottom);
        }

        // Hit check
        this.miniTokens.forEach(token => {
            if (token.stunned) return;
            const hit = isHorizontal ?
                Math.abs(token.container.y - pos) < 22 :
                Math.abs(token.container.x - pos) < 22;

            if (hit) {
                token.stunned = true;
                this.scores[token.id] = Math.max(0, this.scores[token.id] - 100);
                this.updateScoreboard();

                const ft = this.add.text(token.container.x, token.container.y - 25, 'ZAPPED! ⚡ -100', {
                    fontFamily: 'Inter',
                    fontSize: '11px',
                    fontStyle: 'bold',
                    color: '#00f0ff',
                }).setOrigin(0.5);

                this.tweens.add({ targets: ft, y: ft.y - 20, alpha: 0, duration: 600, onComplete: () => ft.destroy() });

                this.tweens.add({
                    targets: token.container,
                    alpha: 0.3,
                    duration: 500,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        token.container.setAlpha(1);
                        token.stunned = false;
                    }
                });
            }
        });

        this.tweens.add({
            targets: beam,
            alpha: 0,
            duration: 350,
            onComplete: () => beam.destroy(),
        });
    }

    // ═══════════════════════════════════════
    // MAIN UPDATE LOOP
    // ═══════════════════════════════════════

    update(time, delta) {
        if (!this.gameActive) return;

        const dt = delta / 1000;
        this.timeLeft -= dt;

        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.timerText.setText('⏱️ 0.0s');
            this.endMiniGame();
            return;
        }

        this.timerText.setText(`⏱️ ${this.timeLeft.toFixed(1)}s`);

        // Update player 1 (Human) controls
        this.updateHumanPlayer(dt);

        // Update Bot AI steering
        this.updateBotPlayers(dt);

        // Game mode specific mechanics
        if (this.currentGameConfig.id === 'coin_rush') {
            this.checkCoinPickups();
        } else if (this.currentGameConfig.id === 'bumper_arena') {
            this.updateBumperCollisions(dt);
        }
    }

    updateHumanPlayer(dt) {
        const human = this.miniTokens[0];
        if (!human || human.stunned || !human.alive) return;

        let moveX = 0;
        let moveY = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) moveX += 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) moveY -= 1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) moveY += 1;

        // Pointer steering if clicked or dragging
        if (this.input.activePointer.isDown) {
            const dx = this.input.activePointer.x - human.container.x;
            const dy = this.input.activePointer.y - human.container.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 15) {
                moveX = dx / dist;
                moveY = dy / dist;
            }
        }

        if (moveX !== 0 || moveY !== 0) {
            const len = Math.sqrt(moveX * moveX + moveY * moveY);
            human.container.x += (moveX / len) * human.speed * dt;
            human.container.y += (moveY / len) * human.speed * dt;
        }

        this.clampPlayerPosition(human);
    }

    updateBotPlayers(dt) {
        for (let i = 1; i < this.miniTokens.length; i++) {
            const bot = this.miniTokens[i];
            if (!bot || bot.stunned || !bot.alive) continue;

            let targetX = bot.container.x;
            let targetY = bot.container.y;

            if (this.currentGameConfig.id === 'coin_rush') {
                const nearestCoin = this.findNearestCoin(bot.container.x, bot.container.y);
                if (nearestCoin) {
                    targetX = nearestCoin.x;
                    targetY = nearestCoin.y;
                }
            } else if (this.currentGameConfig.id === 'bumper_arena') {
                // Seek nearest opponent to ram into them!
                const target = this.miniTokens.find(t => t.id !== bot.id && t.alive);
                if (target) {
                    targetX = target.container.x;
                    targetY = target.container.y;
                }
            } else {
                // Laser grid: wander safely around center
                if (Math.random() < 0.04) {
                    targetX = Phaser.Math.Between(this.arenaBounds.left + 50, this.arenaBounds.right - 50);
                    targetY = Phaser.Math.Between(this.arenaBounds.top + 50, this.arenaBounds.bottom - 50);
                }
            }

            const dist = Phaser.Math.Distance.Between(bot.container.x, bot.container.y, targetX, targetY);
            if (dist > 8) {
                const angle = Phaser.Math.Angle.Between(bot.container.x, bot.container.y, targetX, targetY);
                const step = Math.min(dist, bot.speed * dt);
                bot.container.x += Math.cos(angle) * step;
                bot.container.y += Math.sin(angle) * step;
            }

            this.clampPlayerPosition(bot);
        }
    }

    clampPlayerPosition(token) {
        if (this.currentGameConfig.id === 'bumper_arena') {
            // Check if player fell outside circle platform
            const distFromCenter = Phaser.Math.Distance.Between(
                token.container.x, token.container.y,
                this.arenaBounds.centerX, this.arenaBounds.centerY
            );
            if (distFromCenter > this.arenaBounds.radius + 10 && token.alive) {
                this.eliminateBumperPlayer(token);
            }
        } else {
            token.container.x = Phaser.Math.Clamp(token.container.x, this.arenaBounds.left + 20, this.arenaBounds.right - 20);
            token.container.y = Phaser.Math.Clamp(token.container.y, this.arenaBounds.top + 20, this.arenaBounds.bottom - 20);
        }
    }

    // ═══════════════════════════════════════
    // GAME MODE 3: BUMPER COLLISION PHYSICS
    // ═══════════════════════════════════════

    updateBumperCollisions(dt) {
        const tokens = this.miniTokens.filter(t => t.alive);
        for (let i = 0; i < tokens.length; i++) {
            for (let j = i + 1; j < tokens.length; j++) {
                const a = tokens[i];
                const b = tokens[j];
                const dist = Phaser.Math.Distance.Between(a.container.x, a.container.y, b.container.x, b.container.y);

                if (dist < 36) {
                    // Impulse bounce
                    const angle = Phaser.Math.Angle.Between(a.container.x, a.container.y, b.container.x, b.container.y);
                    const pushForce = 35;
                    audio.playHazard();

                    a.container.x -= Math.cos(angle) * pushForce;
                    a.container.y -= Math.sin(angle) * pushForce;
                    b.container.x += Math.cos(angle) * pushForce;
                    b.container.y += Math.sin(angle) * pushForce;

                    // Award ram points
                    this.scores[a.id] += 15;
                    this.scores[b.id] += 15;
                    this.updateScoreboard();
                }
            }
        }
    }

    eliminateBumperPlayer(token) {
        token.alive = false;
        audio.playHazard();

        const ft = this.add.text(token.container.x, token.container.y, 'FALLEN! 💀', {
            fontFamily: 'Inter',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#e74c3c',
        }).setOrigin(0.5);

        this.tweens.add({ targets: ft, y: ft.y - 30, alpha: 0, duration: 600, onComplete: () => ft.destroy() });

        this.tweens.add({
            targets: token.container,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 400,
            onComplete: () => {
                // Respawn back in center with penalty
                this.time.delayedCall(1200, () => {
                    if (!this.gameActive) return;
                    token.container.x = this.arenaBounds.centerX + Phaser.Math.Between(-30, 30);
                    token.container.y = this.arenaBounds.centerY + Phaser.Math.Between(-30, 30);
                    token.container.setScale(1).setAlpha(1);
                    token.alive = true;
                });
            }
        });
    }

    findNearestCoin(x, y) {
        let best = null;
        let bestDist = Infinity;
        this.coins.forEach(coin => {
            if (!coin.active) return;
            const d = Phaser.Math.Distance.Between(x, y, coin.x, coin.y);
            if (d < bestDist) {
                bestDist = d;
                best = coin;
            }
        });
        return best;
    }

    checkCoinPickups() {
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            if (!coin.active) continue;

            for (const token of this.miniTokens) {
                const dist = Phaser.Math.Distance.Between(token.container.x, token.container.y, coin.x, coin.y);
                if (dist < 26) {
                    const pts = coin.getData('points') || 100;
                    this.scores[token.id] += pts;
                    audio.playCash();

                    const ft = this.add.text(coin.x, coin.y, `+${pts}`, {
                        fontFamily: 'Inter',
                        fontSize: '11px',
                        fontStyle: 'bold',
                        color: pts > 100 ? '#f0c040' : '#2ecc71',
                    }).setOrigin(0.5);

                    this.tweens.add({
                        targets: ft,
                        y: ft.y - 25,
                        alpha: 0,
                        duration: 600,
                        onComplete: () => ft.destroy(),
                    });

                    coin.destroy();
                    this.coins.splice(i, 1);
                    this.updateScoreboard();
                    break;
                }
            }
        }
    }

    updateScoreboard() {
        this.playersData.forEach(p => {
            const txt = this.scoreTexts[p.id];
            if (txt) {
                txt.setText(`${p.name}: ${this.scores[p.id]} pts`);
            }
        });
    }

    endMiniGame() {
        this.gameActive = false;
        if (this.coinTimer) this.coinTimer.remove();
        if (this.meteorTimer) this.meteorTimer.remove();
        if (this.laserTimer) this.laserTimer.remove();
        if (this.survivalTimer) this.survivalTimer.remove();

        audio.playVictory();

        // Sort rankings
        const ranked = [...this.playersData].sort((a, b) => this.scores[b.id] - this.scores[a.id]);

        // Reward distributions
        const rewards = [
            { gold: 3500, card: true, star: 1, label: '🥇 1st: +$3,500 + 1 Card + 1⭐' },
            { gold: 2000, card: false, star: 0, label: '🥈 2nd: +$2,000' },
            { gold: 1000, card: false, star: 0, label: '🥉 3rd: +$1,000' },
            { gold: 500, card: false, star: 0, label: '4th: +$500' },
        ];

        ranked.forEach((player, rank) => {
            const rew = rewards[rank] || rewards[rewards.length - 1];
            player.gold += rew.gold;
            if (rew.star) player.stars += rew.star;
            if (rew.card) {
                const cardKeys = Object.keys(POWER_CARDS);
                const randomCard = POWER_CARDS[cardKeys[Math.floor(Math.random() * cardKeys.length)]];
                player.powerCards.push(randomCard);
            }
        });

        // Overlay dialog
        const modal = this.add.container(this.width / 2, this.height / 2).setDepth(100);

        const bg = this.add.graphics();
        bg.fillStyle(0x0e0e1e, 0.96);
        bg.fillRoundedRect(-240, -140, 480, 280, 16);
        bg.lineStyle(2, 0xf0c040, 0.85);
        bg.strokeRoundedRect(-240, -140, 480, 280, 16);
        modal.add(bg);

        modal.add(this.add.text(0, -100, `🏆 ${this.currentGameConfig.name.toUpperCase()} RESULTS 🏆`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5));

        ranked.forEach((p, rank) => {
            const rew = rewards[rank];
            const y = -50 + rank * 34;
            const line = `${rank + 1}. ${p.name} — ${this.scores[p.id]} pts  (${rew ? rew.label.split(':')[1] : ''})`;
            modal.add(this.add.text(0, y, line, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontStyle: rank === 0 ? 'bold' : 'normal',
                color: rank === 0 ? '#f0c040' : (p.colorHex || '#ffffff'),
            }).setOrigin(0.5));
        });

        const returnText = this.add.text(0, 105, 'Click anywhere to return to the board', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#8888aa',
        }).setOrigin(0.5);
        modal.add(returnText);

        this.tweens.add({ targets: returnText, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

        this.input.once('pointerdown', () => {
            this.scene.stop();
            this.scene.resume('BoardScene');
            if (this.boardScene) {
                this.boardScene.onMiniGameComplete(ranked[0]);
            }
        });
    }
}
