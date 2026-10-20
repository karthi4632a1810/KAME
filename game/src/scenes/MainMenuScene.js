/**
 * MainMenuScene — Premium game menu with start/settings
 */
import Phaser from 'phaser';
import { PLAYER, CHARACTERS, GAME_MODES } from '../config/GameConfig.js';
import { network } from '../network/NetworkManager.js';
import { audio } from '../audio/AudioManager.js';

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // ── Background ──
        this.createBackground(width, height);

        // ── Title ──
        this.add.text(width / 2, height * 0.16, 'KAME', {
            fontFamily: 'Cinzel, serif',
            fontSize: '76px',
            fontStyle: 'bold',
            color: '#f0c040',
            stroke: '#8b6914',
            strokeThickness: 4,
        }).setOrigin(0.5).setShadow(0, 4, '#000000', 8);

        this.add.text(width / 2, height * 0.25, 'ROLL  •  BUILD  •  SABOTAGE  •  CONQUER', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '15px',
            color: '#a0a0c0',
            letterSpacing: 6,
        }).setOrigin(0.5);

        // ── Game Mode Selector ──
        this.selectedModeIndex = 0;
        this.gameModes = GAME_MODES || [
            { id: 'tycoon', name: 'Tycoon Conquest', icon: '🏆', desc: 'Richest net worth wins after 20 turns!' },
            { id: 'star_hunter', name: 'Star Hunter', icon: '⭐', desc: 'First tycoon to collect 3 Stars wins!' },
            { id: 'elimination', name: 'Last Mascot Standing', icon: '💀', desc: 'Elimination Battle Royale! Last survivor wins!' },
        ];
        this.game.registry.set('gameMode', this.gameModes[this.selectedModeIndex].id);

        const modeY = height * 0.34;
        const modeBox = this.add.container(width / 2, modeY);

        const modeBadgeBg = this.add.graphics();
        modeBadgeBg.fillStyle(0x131326, 0.85);
        modeBadgeBg.fillRoundedRect(-175, -24, 350, 48, 10);
        modeBadgeBg.lineStyle(1.5, 0xf0c040, 0.4);
        modeBadgeBg.strokeRoundedRect(-175, -24, 350, 48, 10);
        modeBox.add(modeBadgeBg);

        this.modeTitleText = this.add.text(0, -8, `${this.gameModes[this.selectedModeIndex].icon} ${this.gameModes[this.selectedModeIndex].name.toUpperCase()}`, {
            fontFamily: 'Inter, Cinzel, "Segoe UI Emoji", sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#f0c040',
            letterSpacing: 2,
        }).setOrigin(0.5);

        this.modeDescText = this.add.text(0, 10, this.gameModes[this.selectedModeIndex].desc, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '10px',
            color: '#9ca3af',
        }).setOrigin(0.5);

        modeBox.add([this.modeTitleText, this.modeDescText]);

        // Mode Left Arrow
        this.createArrowButton(width / 2 - 200, modeY, '<', () => {
            this.selectedModeIndex = (this.selectedModeIndex - 1 + this.gameModes.length) % this.gameModes.length;
            this.updateModeDisplay();
        });

        // Mode Right Arrow
        this.createArrowButton(width / 2 + 200, modeY, '>', () => {
            this.selectedModeIndex = (this.selectedModeIndex + 1) % this.gameModes.length;
            this.updateModeDisplay();
        });

        // ── Player Count Selector ──
        this.playerCount = this.game.registry.get('playerCount') || 4;

        this.add.text(width / 2, height * 0.44, 'PLAYERS', {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            color: '#888',
            letterSpacing: 4,
        }).setOrigin(0.5);

        this.playerCountText = this.add.text(width / 2, height * 0.50, `${this.playerCount}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5);

        // Left arrow
        this.createArrowButton(width / 2 - 60, height * 0.50, '<', () => {
            this.playerCount = Math.max(2, this.playerCount - 1);
            this.playerCountText.setText(`${this.playerCount}`);
            this.updatePlayerPreviews(width, height);
        });

        // Right arrow
        this.createArrowButton(width / 2 + 60, height * 0.50, '>', () => {
            this.playerCount = Math.min(6, this.playerCount + 1);
            this.playerCountText.setText(`${this.playerCount}`);
            this.updatePlayerPreviews(width, height);
        });

        // Player color previews
        this.playerPreviews = [];
        this.updatePlayerPreviews(width, height);

        // ── Action Buttons ──
        const startGame = () => {
            this.game.registry.set('playerCount', this.playerCount);
            this.game.registry.set('gameMode', this.gameModes[this.selectedModeIndex].id);
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('BoardScene');
            });
        };

        this.createStartButton(width / 2 - 140, height * 0.77, 'PLAY VS BOTS', startGame);

        this.createSecondaryButton(width / 2 + 140, height * 0.77, 'ONLINE LOBBY', () => {
            this.showOnlineRoomModal(width, height);
        });

        // Guide Button
        this.createGuideButton(width / 2, height * 0.86, '📖 HOW TO PLAY', () => {
            this.showGuideModal(width, height);
        });

        // Keyboard navigation
        this.input.keyboard.on('keydown-ENTER', startGame);
        this.input.keyboard.on('keydown-SPACE', startGame);
        this.input.keyboard.on('keydown-H', () => this.showGuideModal(width, height));
        this.input.keyboard.on('keydown-LEFT', () => {
            this.selectedModeIndex = (this.selectedModeIndex - 1 + this.gameModes.length) % this.gameModes.length;
            this.updateModeDisplay();
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            this.selectedModeIndex = (this.selectedModeIndex + 1) % this.gameModes.length;
            this.updateModeDisplay();
        });

        // ── Version & Server Status ──
        this.add.text(width / 2, height - 25, 'v0.3.0 • Phase 4: Turrets, Devices & Online Lobby • [SPACE] Play • [H] Guide', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#666688',
        }).setOrigin(0.5);

        // Fade in
        this.cameras.main.fadeIn(800, 0, 0, 0);
    }

    createBackground(width, height) {
        // Dark gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x141428, 0x141428, 1);
        bg.fillRect(0, 0, width, height);

        // Subtle grid pattern
        bg.lineStyle(1, 0xffffff, 0.03);
        for (let x = 0; x < width; x += 50) {
            bg.lineBetween(x, 0, x, height);
        }
        for (let y = 0; y < height; y += 50) {
            bg.lineBetween(0, y, width, y);
        }

        // Ambient particles
        for (let i = 0; i < 30; i++) {
            const px = Phaser.Math.Between(0, width);
            const py = Phaser.Math.Between(0, height);
            const particle = this.add.circle(px, py, Phaser.Math.Between(1, 3), 0xf0c040, 0.15);
            this.tweens.add({
                targets: particle,
                y: py - Phaser.Math.Between(20, 60),
                alpha: 0,
                duration: Phaser.Math.Between(3000, 6000),
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut',
            });
        }
    }

    createArrowButton(x, y, text, callback) {
        const btn = this.add.text(x, y, text, {
            fontFamily: 'Cinzel, serif',
            fontSize: '32px',
            color: '#666',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setColor('#f0c040'));
        btn.on('pointerout', () => btn.setColor('#666'));
        btn.on('pointerdown', callback);
    }

    createStartButton(x, y, text, callback) {
        const btnWidth = 280;
        const btnHeight = 56;
        const btnContainer = this.add.container(x, y);

        // Button background
        const bg = this.add.graphics();
        bg.fillStyle(0xf0c040, 1);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        bg.lineStyle(2, 0xd4a820, 1);
        bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

        // Shine effect
        bg.fillStyle(0xffffff, 0.2);
        bg.fillRoundedRect(-btnWidth / 2 + 4, -btnHeight / 2 + 4, btnWidth - 8, btnHeight / 2 - 4, 8);

        const label = this.add.text(0, 0, text, {
            fontFamily: 'Cinzel, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#1a1a2e',
            letterSpacing: 3,
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        btnContainer.add([bg, label, hitArea]);

        hitArea.on('pointerover', () => {
            label.setColor('#0a0a0f');
            this.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Back.easeOut' });
        });
        hitArea.on('pointerout', () => {
            label.setColor('#1a1a2e');
            this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
        });
        hitArea.on('pointerdown', callback);
    }

    createSecondaryButton(x, y, text, callback) {
        const btnWidth = 240;
        const btnHeight = 56;
        const btnContainer = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x18182c, 0.95);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        bg.lineStyle(2, 0x38bdf8, 0.85);
        bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

        const label = this.add.text(0, 0, text, {
            fontFamily: 'Cinzel, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#38bdf8',
            letterSpacing: 2,
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        btnContainer.add([bg, label, hitArea]);

        hitArea.on('pointerover', () => {
            this.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Back.easeOut' });
        });
        hitArea.on('pointerout', () => {
            this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
        });
        hitArea.on('pointerdown', callback);
    }

    createGuideButton(x, y, text, callback) {
        const btnWidth = 200;
        const btnHeight = 36;
        const btnContainer = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x131326, 0.9);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
        bg.lineStyle(1.5, 0xf0c040, 0.6);
        bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);

        const label = this.add.text(0, 0, text, {
            fontFamily: 'Cinzel, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#f0c040',
            letterSpacing: 1.5,
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        btnContainer.add([bg, label, hitArea]);

        hitArea.on('pointerover', () => {
            bg.lineStyle(1.5, 0xf0c040, 1);
            bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
            this.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Back.easeOut' });
        });
        hitArea.on('pointerout', () => {
            bg.lineStyle(1.5, 0xf0c040, 0.6);
            bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
            this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
        });
        hitArea.on('pointerdown', () => {
            audio.playClick();
            callback();
        });
    }

    showGuideModal(width, height) {
        audio.playClick();
        const modal = this.add.container(width / 2, height / 2).setDepth(150);

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.78).setInteractive();
        backdrop.on('pointerdown', () => modal.destroy());
        modal.add(backdrop);

        const frameW = 680;
        const frameH = 410;
        const frame = this.add.graphics();
        frame.fillStyle(0x0e0e1e, 0.98);
        frame.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        frame.lineStyle(2, 0xf0c040, 0.9);
        frame.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        modal.add(frame);

        const title = this.add.text(0, -frameH / 2 + 28, '📖 KAME MASTER GUIDE & RULES', {
            fontFamily: 'Cinzel, "Segoe UI Emoji", sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#f0c040',
            letterSpacing: 2,
        }).setOrigin(0.5);
        modal.add(title);

        const sections = [
            {
                title: '3 GAME MODES',
                icon: '👑',
                color: '#f0c040',
                desc: '• Tycoon: Highest Net Worth (Cash + Props + Stars) after 20 turns wins!\n• Star Hunter: First to acquire 3 Stars ⭐ wins immediately!\n• Survival: Permanent knockout at 0 HP. Last mascot standing wins!'
            },
            {
                title: 'BOARD & TRANSPORTS',
                icon: '🚀',
                color: '#38bdf8',
                desc: '• Branching Forks: Choose between safer main loops or high-reward shortcuts.\n• Express Trains: Jump +4 tiles forward.\n• Airports: Fly across the world (+16 tiles).\n• Harbor: Earn trade cargo cash!'
            },
            {
                title: 'COMBAT & DEFENSE TURRETS',
                icon: '🛡️',
                color: '#ef4444',
                desc: '• Melee Attack: Strike nearby rivals to deal damage and loot 20% of their cash!\n• Aegis Shield: Absorbs 100% of damage from attacks and traps.\n• Workshop: Mount Gatling, Tesla, and Flame turrets to shoot enemies mid-step!'
            },
            {
                title: 'TRAPS & WORLD DEVICES',
                icon: '⚙️',
                color: '#a855f7',
                desc: '• Trap Armory: Arm Landmines, EMPs, and Ice roots on tiles to ambush rivals.\n• Pressure Plates: Trigger magma cash or swamp filtration shields.\n• Springboards: Catapult 5 tiles ahead.\n• Secret Vaults: Grant +$3,000 & +1⭐!'
            }
        ];

        const cardW = 310;
        const cardH = 125;
        const positions = [
            { x: -frameW / 4, y: -45 },
            { x: frameW / 4, y: -45 },
            { x: -frameW / 4, y: 95 },
            { x: frameW / 4, y: 95 }
        ];

        sections.forEach((sec, idx) => {
            const pos = positions[idx];
            const cBg = this.add.graphics();
            cBg.fillStyle(0x141426, 0.95);
            cBg.fillRoundedRect(pos.x - cardW / 2, pos.y - cardH / 2, cardW, cardH, 10);
            cBg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(sec.color).color, 0.7);
            cBg.strokeRoundedRect(pos.x - cardW / 2, pos.y - cardH / 2, cardW, cardH, 10);

            const hText = this.add.text(pos.x - cardW / 2 + 14, pos.y - cardH / 2 + 14, `${sec.icon} ${sec.title}`, {
                fontFamily: 'Cinzel, "Segoe UI Emoji", sans-serif',
                fontSize: '12px',
                fontStyle: 'bold',
                color: sec.color,
                letterSpacing: 1,
            });

            const bText = this.add.text(pos.x - cardW / 2 + 14, pos.y - cardH / 2 + 36, sec.desc, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                color: '#cccccc',
                lineSpacing: 4,
                wordWrap: { width: cardW - 24 }
            });

            modal.add([cBg, hText, bText]);
        });

        // Close button
        const closeBtn = this.add.graphics();
        closeBtn.fillStyle(0x222238, 1);
        closeBtn.fillRoundedRect(-60, 168, 120, 26, 6);
        closeBtn.lineStyle(1.5, 0xf0c040, 0.6);
        closeBtn.strokeRoundedRect(-60, 168, 120, 26, 6);

        const closeText = this.add.text(0, 181, 'CLOSE GUIDE', {
            fontFamily: 'Cinzel, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#f0c040'
        }).setOrigin(0.5);

        const closeHit = this.add.rectangle(0, 181, 120, 26, 0xffffff, 0).setInteractive({ useHandCursor: true });
        closeHit.on('pointerdown', () => modal.destroy());

        modal.add([closeBtn, closeText, closeHit]);
    }

    showOnlineRoomModal(width, height) {
        audio.playClick();
        const modal = this.add.container(width / 2, height / 2).setDepth(120);

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setInteractive();
        backdrop.on('pointerdown', () => modal.destroy());
        modal.add(backdrop);

        const frameW = 520;
        const frameH = 340;
        const frame = this.add.graphics();
        frame.fillStyle(0x0e0e1e, 0.98);
        frame.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        frame.lineStyle(2, 0x38bdf8, 0.9);
        frame.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        modal.add(frame);

        const title = this.add.text(0, -frameH / 2 + 28, '🌐 ONLINE MULTIPLAYER MATCHES', {
            fontFamily: 'Cinzel, "Segoe UI Emoji", sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#38bdf8',
            letterSpacing: 2,
        }).setOrigin(0.5);

        const sub = this.add.text(0, -frameH / 2 + 52, 'Real-time WebSocket lobby on port 3001', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#8888aa',
        }).setOrigin(0.5);
        modal.add([title, sub]);

        let activeTab = 'host';
        const tabContent = this.add.container(0, 0);
        modal.add(tabContent);

        // Tab Switchers
        const hostTabBtn = this.add.text(-90, -85, '👑 HOST MATCH', {
            fontFamily: 'Cinzel, serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#38bdf8',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const joinTabBtn = this.add.text(90, -85, '🔑 JOIN MATCH', {
            fontFamily: 'Cinzel, serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#666688',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        modal.add([hostTabBtn, joinTabBtn]);

        const renderTab = () => {
            tabContent.removeAll(true);
            hostTabBtn.setColor(activeTab === 'host' ? '#38bdf8' : '#666688');
            joinTabBtn.setColor(activeTab === 'join' ? '#38bdf8' : '#666688');

            if (activeTab === 'host') {
                renderHostTab();
            } else {
                renderJoinTab();
            }
        };

        const renderHostTab = () => {
            const statusLabel = this.add.text(0, -50, 'Connecting to Game Server...', {
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                color: '#f0c040',
            }).setOrigin(0.5);
            tabContent.add(statusLabel);

            const codeBox = this.add.graphics();
            codeBox.fillStyle(0x161b2e, 0.95);
            codeBox.fillRoundedRect(-120, -32, 240, 50, 10);
            codeBox.lineStyle(1.5, 0xf0c040, 0.8);
            codeBox.strokeRoundedRect(-120, -32, 240, 50, 10);
            tabContent.add(codeBox);

            const codeText = this.add.text(0, -7, 'CONNECTING...', {
                fontFamily: 'Cinzel, serif',
                fontSize: '22px',
                fontStyle: 'bold',
                color: '#f0c040',
                letterSpacing: 4,
            }).setOrigin(0.5);
            tabContent.add(codeText);

            const playerListLabel = this.add.text(0, 36, 'Connected Players: 1 / 4 (Host Ready)', {
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                color: '#94a3b8',
            }).setOrigin(0.5);
            tabContent.add(playerListLabel);

            // Launch Button
            const launchBtn = this.add.graphics();
            launchBtn.fillStyle(0x38bdf8, 1);
            launchBtn.fillRoundedRect(-130, 60, 260, 42, 8);
            const launchLabel = this.add.text(0, 81, '🚀 LAUNCH ONLINE MATCH', {
                fontFamily: 'Cinzel, serif',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#081d28',
            }).setOrigin(0.5);

            const launchHit = this.add.rectangle(0, 81, 260, 42, 0xffffff, 0).setInteractive({ useHandCursor: true });
            tabContent.add([launchBtn, launchLabel, launchHit]);

            // Connect & Create Room
            network.connect().then(() => {
                statusLabel.setText('Connected! Share this code with friends:');
                network.createRoom('Host Player', 0);
            }).catch(() => {
                statusLabel.setText('Offline fallback: Local Room Ready');
                const fallbackCode = 'KAME-' + Math.floor(100 + Math.random() * 900);
                codeText.setText(fallbackCode);
            });

            network.on('ROOM_CREATED', (payload) => {
                codeText.setText(payload.roomCode);
                playerListLabel.setText(`Connected Players: ${payload.players.length} / 4`);
            });

            network.on('PLAYER_JOINED', (payload) => {
                playerListLabel.setText(`Connected Players: ${payload.players.length} / 4`);
                audio.playCash();
            });

            launchHit.on('pointerdown', () => {
                audio.playClick();
                network.startGame();
                this.game.registry.set('playerCount', this.playerCount);
                this.game.registry.set('roomCode', codeText.text);
                modal.destroy();
                this.cameras.main.fadeOut(400, 0, 0, 0);
                this.time.delayedCall(400, () => {
                    this.scene.start('BoardScene');
                });
            });
        };

        const renderJoinTab = () => {
            let enteredCode = '';

            const promptText = this.add.text(0, -50, 'Enter 4-Letter Room Code:', {
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                color: '#cccccc',
            }).setOrigin(0.5);
            tabContent.add(promptText);

            const codeBox = this.add.graphics();
            codeBox.fillStyle(0x161b2e, 0.95);
            codeBox.fillRoundedRect(-110, -32, 220, 46, 8);
            codeBox.lineStyle(1.5, 0x38bdf8, 0.8);
            codeBox.strokeRoundedRect(-110, -32, 220, 46, 8);
            tabContent.add(codeBox);

            const codeDisplay = this.add.text(0, -9, '_ _ _ _', {
                fontFamily: 'Cinzel, serif',
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#38bdf8',
                letterSpacing: 8,
            }).setOrigin(0.5);
            tabContent.add(codeDisplay);

            // Join Button
            const joinBtn = this.add.graphics();
            joinBtn.fillStyle(0x22c55e, 1);
            joinBtn.fillRoundedRect(-110, 26, 220, 40, 8);
            const joinLabel = this.add.text(0, 46, 'ENTER MATCH', {
                fontFamily: 'Cinzel, serif',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#081d28',
            }).setOrigin(0.5);

            const joinHit = this.add.rectangle(0, 46, 220, 40, 0xffffff, 0).setInteractive({ useHandCursor: true });
            tabContent.add([joinBtn, joinLabel, joinHit]);

            const statusText = this.add.text(0, 80, 'Type code on keyboard or click box to paste', {
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                color: '#8888aa',
            }).setOrigin(0.5);
            tabContent.add(statusText);

            const keyListener = (event) => {
                const key = event.key.toUpperCase();
                if (/^[A-Z0-9]$/.test(key) && enteredCode.length < 4) {
                    enteredCode += key;
                    audio.playClick();
                } else if (event.key === 'Backspace' && enteredCode.length > 0) {
                    enteredCode = enteredCode.slice(0, -1);
                    audio.playClick();
                }
                const padded = enteredCode.padEnd(4, '_').split('').join(' ');
                codeDisplay.setText(padded);
            };

            this.input.keyboard.on('keydown', keyListener);

            const clickInput = this.add.rectangle(0, -9, 220, 46, 0xffffff, 0).setInteractive({ useHandCursor: true });
            clickInput.on('pointerdown', () => {
                const input = window.prompt('Paste or enter 4-letter Room Code:', enteredCode);
                if (input) {
                    enteredCode = input.trim().toUpperCase().slice(0, 4);
                    codeDisplay.setText(enteredCode.padEnd(4, '_').split('').join(' '));
                }
            });
            tabContent.add(clickInput);

            joinHit.on('pointerdown', () => {
                if (enteredCode.length < 3) {
                    statusText.setText('⚠️ Please enter a valid room code!');
                    statusText.setColor('#ef4444');
                    return;
                }
                statusText.setText('Connecting and joining room...');
                statusText.setColor('#f0c040');

                network.connect().then(() => {
                    network.joinRoom(enteredCode, 'Challenger', 1);
                }).catch(() => {
                    statusText.setText('Could not connect to server.');
                    statusText.setColor('#ef4444');
                });
            });

            network.on('ROOM_JOINED', (payload) => {
                statusText.setText(`Joined Room ${payload.roomCode}! Waiting for host...`);
                statusText.setColor('#22c55e');
            });

            network.on('GAME_STARTED', () => {
                this.input.keyboard.off('keydown', keyListener);
                this.game.registry.set('playerCount', this.playerCount);
                this.game.registry.set('roomCode', enteredCode);
                modal.destroy();
                this.cameras.main.fadeOut(400, 0, 0, 0);
                this.time.delayedCall(400, () => {
                    this.scene.start('BoardScene');
                });
            });
        };

        hostTabBtn.on('pointerdown', () => { activeTab = 'host'; renderTab(); });
        joinTabBtn.on('pointerdown', () => { activeTab = 'join'; renderTab(); });

        renderTab();

        const closeHint = this.add.text(0, frameH / 2 - 16, 'Click outside to close', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '10px',
            color: '#666688',
        }).setOrigin(0.5);
        modal.add(closeHint);
    }

    updatePlayerPreviews(width, height) {
        // Clean old
        this.playerPreviews.forEach(p => p.destroy());
        this.playerPreviews = [];

        const cardW = 150;
        const spacing = 12;
        const totalW = this.playerCount * cardW + (this.playerCount - 1) * spacing;
        const startX = width / 2 - totalW / 2 + cardW / 2;
        const y = height * 0.60;

        for (let i = 0; i < this.playerCount; i++) {
            const char = CHARACTERS[i] || { color: 0xffffff, name: `Player ${i+1}`, perk: 'Balanced stats' };
            const cx = startX + i * (cardW + spacing);
            const container = this.add.container(cx, y);

            // Card background
            const bg = this.add.graphics();
            bg.fillStyle(0x121224, 0.92);
            bg.fillRoundedRect(-cardW / 2, -34, cardW, 68, 8);
            bg.lineStyle(1.5, char.color, 0.5);
            bg.strokeRoundedRect(-cardW / 2, -34, cardW, 68, 8);

            // Character avatar image
            const avatar = this.add.image(-44, 0, `char_avatar_${i + 1}`).setDisplaySize(42, 42);

            // Name
            const name = this.add.text(-16, -24, char.name, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#ffffff'
            });

            // Role / Title
            const role = this.add.text(-16, -10, i === 0 ? 'Player 1 (You)' : `Bot ${i + 1}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '9px',
                fontStyle: 'bold',
                color: `#${char.color.toString(16).padStart(6, '0')}`
            });

            // Perk
            const perk = this.add.text(-16, 6, char.perk, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '8px',
                color: '#9999bb',
                wordWrap: { width: 85 }
            });

            container.add([bg, avatar, name, role, perk]);
            this.playerPreviews.push(container);
        }
    }

    updateModeDisplay() {
        const mode = this.gameModes[this.selectedModeIndex];
        this.game.registry.set('gameMode', mode.id);
        if (this.modeTitleText) {
            this.modeTitleText.setText(`${mode.icon} ${mode.name.toUpperCase()}`);
        }
        if (this.modeDescText) {
            this.modeDescText.setText(mode.desc);
        }
    }
}
