/**
 * HUDScene — Real Game HUD with character portraits, action bar, power cards drawer, and activity ticker
 */
import Phaser from 'phaser';
import { PLAYER, CHARACTERS, POWER_CARDS, TRAP_TYPES, EMOTES } from '../config/GameConfig.js';
import { audio } from '../audio/AudioManager.js';

export class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    init(data) {
        this.boardScene = data.boardScene;
    }

    create() {
        const { width, height } = this.cameras.main;
        this.width = width;
        this.height = height;

        this.playerCardElements = [];
        this.cardsModal = null;
        this.trapsModal = null;
        this.emotesModal = null;

        // Notification feed
        this.logMessages = [
            '⚔️ Welcome to KAME! Roll the dice or play a card to begin.',
        ];

        this.createTopBar();
        this.createPlayerCards();
        this.createActivityFeed();
        this.createActionButtons();

        // Listen for board updates
        if (this.boardScene) {
            this.boardScene.events.on('updateHUD', this.refreshHUD, this);
            this.boardScene.events.on('hudMessage', this.addLogMessage, this);
        }

        // Global hotkeys for quick access
        this.input.keyboard.on('keydown-E', () => {
            if (this.boardScene && this.boardScene.currentPlayer === 0) {
                this.toggleEmotesModal();
            }
        });
        this.input.keyboard.on('keydown-T', () => {
            if (this.boardScene && this.boardScene.currentPlayer === 0) {
                this.toggleTrapsModal();
            }
        });
        this.input.keyboard.on('keydown-C', () => {
            if (this.boardScene && this.boardScene.currentPlayer === 0) {
                this.togglePowerCardsModal();
            }
        });
        this.input.keyboard.on('keydown-M', () => {
            this.toggleSound();
        });

        // Clean up events on shutdown
        this.events.on('shutdown', () => {
            if (this.boardScene) {
                this.boardScene.events.off('updateHUD', this.refreshHUD, this);
                this.boardScene.events.off('hudMessage', this.addLogMessage, this);
            }
        });
    }

    createTopBar() {
        const barHeight = 44;
        const bg = this.add.graphics();
        bg.fillStyle(0x0c0c16, 0.9);
        bg.fillRect(0, 0, this.width, barHeight);
        bg.lineStyle(1, 0xf0c040, 0.25);
        bg.lineBetween(0, barHeight, this.width, barHeight);

        // Game Title
        this.titleText = this.add.text(24, 12, 'KAME', {
            fontFamily: 'Cinzel, serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#f0c040',
        });

        // Sound Toggle Button
        this.soundBtn = this.add.text(105, 14, audio.enabled ? '🔊 SFX' : '🔇 SFX', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#8888aa',
        }).setInteractive({ useHandCursor: true });

        this.soundBtn.on('pointerdown', () => this.toggleSound());
        this.soundBtn.on('pointerover', () => this.soundBtn.setColor('#f0c040'));
        this.soundBtn.on('pointerout', () => this.soundBtn.setColor('#8888aa'));

        // Turn Counter
        this.turnText = this.add.text(this.width / 2, 13, 'TURN 1 / 20', {
            fontFamily: 'Cinzel, "Segoe UI Emoji", sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            letterSpacing: 2,
        }).setOrigin(0.5, 0);

        // Current Active Player Banner (with character icon)
        this.activePlayerText = this.add.text(this.width - 24, 13, 'Player 1 Turn', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#e74c3c',
        }).setOrigin(1, 0);
    }

    toggleSound() {
        const state = audio.toggle();
        if (this.soundBtn) {
            this.soundBtn.setText(state ? '🔊 SFX' : '🔇 SFX');
            this.soundBtn.setColor(state ? '#8888aa' : '#e74c3c');
        }
        this.addLogMessage(state ? '🔊 Audio sound effects unmuted.' : '🔇 Audio sound effects muted.');
    }

    createPlayerCards() {
        const players = this.boardScene ? this.boardScene.players : [];
        const cardWidth = 185;
        const cardHeight = 76;
        const spacing = 10;
        const startX = 20;
        const y = this.height - cardHeight - 14;

        players.forEach((player, i) => {
            const x = startX + i * (cardWidth + spacing);
            const container = this.add.container(x, y);

            // Background card
            const bg = this.add.graphics();
            bg.fillStyle(0x121224, 0.92);
            bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 10);
            bg.lineStyle(1.5, player.color, 0.4);
            bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 10);

            // Active glow border
            const glow = this.add.graphics();
            glow.lineStyle(2.5, player.color, 1);
            glow.strokeRoundedRect(-2, -2, cardWidth + 4, cardHeight + 4, 12);
            glow.setVisible(i === 0);

            // Avatar portrait image
            const avatarKey = `char_avatar_${i + 1}`;
            let avatarImg;
            if (this.textures.exists(avatarKey)) {
                avatarImg = this.add.image(24, 26, avatarKey).setDisplaySize(32, 32);
            } else {
                avatarImg = this.add.circle(24, 26, 12, player.color, 1);
            }

            // Shield icon indicator
            const shieldBadge = this.add.text(12, 12, '🛡️', {
                fontSize: '12px'
            }).setVisible(player.hasShield || false);

            // Name
            const name = this.add.text(46, 10, player.name || `P${i + 1}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#ffffff',
            });

            // Gold
            const gold = this.add.text(46, 26, `💰 $${player.gold.toLocaleString()}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                color: '#f0c040',
            });

            // HP Bar Background
            const hpBg = this.add.graphics();
            hpBg.fillStyle(0x222233, 1);
            hpBg.fillRoundedRect(12, 48, cardWidth - 24, 6, 3);

            // HP Bar Fill
            const hpFill = this.add.graphics();
            this.drawHpBar(hpFill, 12, 48, cardWidth - 24, 6, player.hp, player.maxHp);

            // Stats row (Properties, Stars, Weapon, Cards)
            const stats = this.add.text(12, 58, `🏠 ${player.properties.length} ⭐ ${player.stars} ⚔️ ${player.weapons.length} 🎴 ${(player.powerCards || []).length}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                color: '#8888aa',
            });

            container.add([bg, glow, avatarImg, shieldBadge, name, gold, hpBg, hpFill, stats]);

            this.playerCardElements.push({
                container,
                bg,
                glow,
                gold,
                hpFill,
                stats,
                shieldBadge,
                player,
                baseX: x,
                baseY: y,
                width: cardWidth,
            });
        });
    }

    createActionButtons() {
        // Buttons above the active player's card
        this.actionGroup = this.add.container(20, this.height - 128);

        // Power Cards Button
        this.cardsBtnBg = this.add.graphics();
        this.drawButton(this.cardsBtnBg, 0, 0, 105, 32, 0x1f1f3a, 0xf0c040);

        this.cardsBtnLabel = this.add.text(52, 16, '🎴 CARDS (1)', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5);

        const cardsHitArea = this.add.rectangle(52, 16, 105, 32, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        cardsHitArea.on('pointerdown', () => {
            audio.playClick();
            this.togglePowerCardsModal();
        });

        cardsHitArea.on('pointerover', () => {
            this.drawButton(this.cardsBtnBg, 0, 0, 105, 32, 0x2d2d55, 0xffd700);
        });

        cardsHitArea.on('pointerout', () => {
            this.drawButton(this.cardsBtnBg, 0, 0, 105, 32, 0x1f1f3a, 0xf0c040);
        });

        // PvP Attack Button (activates when target in range)
        this.attackBtnBg = this.add.graphics();
        this.drawButton(this.attackBtnBg, 115, 0, 95, 32, 0x331111, 0xe74c3c);

        this.attackBtnLabel = this.add.text(162, 16, '⚔️ ATTACK', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#e74c3c',
        }).setOrigin(0.5);

        this.attackHitArea = this.add.rectangle(162, 16, 95, 32, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        this.attackHitArea.on('pointerdown', () => {
            if (this.boardScene && this.boardScene.canAttack()) {
                audio.playClick();
                this.boardScene.playerPerformAttack();
            }
        });

        // Trap Placement Button
        this.trapsBtnBg = this.add.graphics();
        this.drawButton(this.trapsBtnBg, 220, 0, 90, 32, 0x241414, 0xe67e22);

        this.trapsBtnLabel = this.add.text(265, 16, '💣 TRAPS', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#e67e22',
        }).setOrigin(0.5);

        const trapsHitArea = this.add.rectangle(265, 16, 90, 32, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        trapsHitArea.on('pointerdown', () => {
            audio.playClick();
            this.toggleTrapsModal();
        });

        trapsHitArea.on('pointerover', () => {
            this.drawButton(this.trapsBtnBg, 220, 0, 90, 32, 0x3d1f1f, 0xff9f43);
        });
        trapsHitArea.on('pointerout', () => {
            this.drawButton(this.trapsBtnBg, 220, 0, 90, 32, 0x241414, 0xe67e22);
        });

        // Cosmetic Emote Wheel Button
        this.emoteBtnBg = this.add.graphics();
        this.drawButton(this.emoteBtnBg, 320, 0, 90, 32, 0x1f162c, 0xc084fc);

        this.emoteBtnLabel = this.add.text(365, 16, '💬 EMOTE', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#c084fc',
        }).setOrigin(0.5);

        const emoteHitArea = this.add.rectangle(365, 16, 90, 32, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        emoteHitArea.on('pointerdown', () => {
            audio.playClick();
            this.toggleEmotesModal();
        });

        emoteHitArea.on('pointerover', () => {
            this.drawButton(this.emoteBtnBg, 320, 0, 90, 32, 0x2e1a42, 0xd8b4fe);
        });
        emoteHitArea.on('pointerout', () => {
            this.drawButton(this.emoteBtnBg, 320, 0, 90, 32, 0x1f162c, 0xc084fc);
        });

        this.actionGroup.add([
            this.cardsBtnBg, this.cardsBtnLabel, cardsHitArea,
            this.attackBtnBg, this.attackBtnLabel, this.attackHitArea,
            this.trapsBtnBg, this.trapsBtnLabel, trapsHitArea,
            this.emoteBtnBg, this.emoteBtnLabel, emoteHitArea,
        ]);
        this.updateActionButtonsState();
    }

    drawButton(gfx, x, y, w, h, fill, border) {
        gfx.clear();
        gfx.fillStyle(fill, 0.95);
        gfx.fillRoundedRect(x, y, w, h, 6);
        gfx.lineStyle(1.5, border, 0.7);
        gfx.strokeRoundedRect(x, y, w, h, 6);
    }

    updateActionButtonsState() {
        if (!this.boardScene) return;

        const isHumanTurn = this.boardScene.currentPlayer === 0 && this.boardScene.gameState === 'waiting';
        this.actionGroup.setVisible(isHumanTurn);

        const cp = this.boardScene.players[0];
        if (cp && this.cardsBtnLabel) {
            this.cardsBtnLabel.setText(`🎴 CARDS (${cp.powerCards.length})`);
        }

        // Check if attack is available
        const canAttack = this.boardScene.canAttack && this.boardScene.canAttack();
        if (this.attackBtnLabel && this.attackBtnBg) {
            if (canAttack) {
                this.drawButton(this.attackBtnBg, 115, 0, 95, 32, 0x661111, 0xff4444);
                this.attackBtnLabel.setColor('#ffffff');
            } else {
                this.drawButton(this.attackBtnBg, 115, 0, 95, 32, 0x1f1111, 0x663333);
                this.attackBtnLabel.setColor('#664444');
            }
        }

        // Check if trap placement is affordable
        const canTrap = this.boardScene.canPlantTrap && this.boardScene.canPlantTrap();
        if (this.trapsBtnLabel && this.trapsBtnBg) {
            if (canTrap) {
                this.drawButton(this.trapsBtnBg, 220, 0, 90, 32, 0x3d1c10, 0xe67e22);
                this.trapsBtnLabel.setColor('#f39c12');
            } else {
                this.drawButton(this.trapsBtnBg, 220, 0, 90, 32, 0x1a1210, 0x553322);
                this.trapsBtnLabel.setColor('#664433');
            }
        }
    }

    togglePowerCardsModal() {
        if (this.cardsModal) {
            this.cardsModal.destroy();
            this.cardsModal = null;
            return;
        }

        const cp = this.boardScene ? this.boardScene.players[0] : null;
        if (!cp) return;

        const modalW = 480;
        const modalH = 260;
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.cardsModal = this.add.container(cx, cy).setDepth(200);

        // Overlay backdrop
        const backdrop = this.add.rectangle(0, 0, this.width, this.height, 0x000000, 0.5)
            .setInteractive();
        backdrop.on('pointerdown', () => this.togglePowerCardsModal());
        this.cardsModal.add(backdrop);

        // Modal Frame
        const frame = this.add.graphics();
        frame.fillStyle(0x121226, 0.98);
        frame.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        frame.lineStyle(2, 0xf0c040, 0.8);
        frame.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        this.cardsModal.add(frame);

        // Title
        const title = this.add.text(0, -modalH / 2 + 24, '🎴 YOUR TACTICAL POWER CARDS', {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#f0c040',
            letterSpacing: 2,
        }).setOrigin(0.5);
        this.cardsModal.add(title);

        // Close button
        const closeBtn = this.add.text(modalW / 2 - 24, -modalH / 2 + 16, '✕', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.togglePowerCardsModal());
        this.cardsModal.add(closeBtn);

        // Cards list
        const cards = cp.powerCards || [];
        if (cards.length === 0) {
            const emptyText = this.add.text(0, 10, 'No power cards available.\nAcquire cards from Mystery Events, Shops or Black Market!', {
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                color: '#8888aa',
                align: 'center',
            }).setOrigin(0.5);
            this.cardsModal.add(emptyText);
        } else {
            const cardW = 135;
            const cardSpacing = 12;
            const startX = -((cards.length * cardW + (cards.length - 1) * cardSpacing) / 2) + cardW / 2;

            cards.forEach((card, idx) => {
                const cardX = startX + idx * (cardW + cardSpacing);
                const cardY = 10;
                const cContainer = this.add.container(cardX, cardY);

                const cBg = this.add.graphics();
                cBg.fillStyle(0x1c1c38, 1);
                cBg.fillRoundedRect(-cardW / 2, -75, cardW, 150, 10);
                cBg.lineStyle(1.5, 0xf0c040, 0.6);
                cBg.strokeRoundedRect(-cardW / 2, -75, cardW, 150, 10);

                const icon = this.add.text(0, -42, card.icon, {
                    fontSize: '28px'
                }).setOrigin(0.5);

                const cName = this.add.text(0, -12, card.name, {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    align: 'center',
                }).setOrigin(0.5);

                const cDesc = this.add.text(0, 15, card.desc, {
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '9px',
                    color: '#aaaaaa',
                    align: 'center',
                    wordWrap: { width: cardW - 16 }
                }).setOrigin(0.5);

                // Use Button
                const useBtnBg = this.add.graphics();
                this.drawButton(useBtnBg, -45, 42, 90, 24, 0xf0c040, 0xd4a820);

                const useBtnText = this.add.text(0, 54, 'PLAY', {
                    fontFamily: 'Cinzel, serif',
                    fontSize: '10px',
                    fontStyle: 'bold',
                    color: '#0a0a14',
                }).setOrigin(0.5);

                const useHit = this.add.rectangle(0, 54, 90, 24, 0xffffff, 0)
                    .setInteractive({ useHandCursor: true });

                useHit.on('pointerdown', () => {
                    audio.playClick();
                    this.togglePowerCardsModal();
                    this.boardScene.usePowerCard(0, idx);
                });

                cContainer.add([cBg, icon, cName, cDesc, useBtnBg, useBtnText, useHit]);
                this.cardsModal.add(cContainer);
            });
        }
    }

    toggleTrapsModal() {
        if (this.trapsModal) {
            this.trapsModal.destroy();
            this.trapsModal = null;
            return;
        }

        const cp = this.boardScene ? this.boardScene.players[0] : null;
        if (!cp) return;

        const modalW = 500;
        const modalH = 260;
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.trapsModal = this.add.container(cx, cy).setDepth(200);

        // Overlay backdrop
        const backdrop = this.add.rectangle(0, 0, this.width, this.height, 0x000000, 0.55)
            .setInteractive();
        backdrop.on('pointerdown', () => this.toggleTrapsModal());
        this.trapsModal.add(backdrop);

        // Frame
        const frame = this.add.graphics();
        frame.fillStyle(0x0e0e1e, 0.96);
        frame.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        frame.lineStyle(2, 0xe74c3c, 0.9);
        frame.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        this.trapsModal.add(frame);

        // Header
        const header = this.add.text(0, -modalH / 2 + 24, '💣 TACTICAL TRAP ARSENAL', {
            fontFamily: 'Cinzel, serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#e74c3c',
        }).setOrigin(0.5);

        const sub = this.add.text(0, -modalH / 2 + 48, `Arm current tile with a sabotage trap • Your Gold: $${cp.gold.toLocaleString()}`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#8888aa',
        }).setOrigin(0.5);
        this.trapsModal.add([header, sub]);

        // Trap options
        const trapList = Object.values(TRAP_TYPES);
        const cardW = 105;
        const cardH = 150;
        const totalW = trapList.length * cardW + (trapList.length - 1) * 12;
        const startX = -totalW / 2 + cardW / 2;
        const cardY = 25;

        trapList.forEach((trap, idx) => {
            const x = startX + idx * (cardW + 12);
            const tContainer = this.add.container(x, cardY);

            const canAfford = cp.gold >= trap.cost;
            const tBg = this.add.graphics();
            tBg.fillStyle(canAfford ? 0x1f1624 : 0x15151f, 0.95);
            tBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
            tBg.lineStyle(1.5, canAfford ? 0xe74c3c : 0x444455, 0.7);
            tBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);

            const icon = this.add.text(0, -cardH / 2 + 24, trap.icon, { fontSize: '24px' }).setOrigin(0.5);
            const tName = this.add.text(0, -10, trap.name, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                fontStyle: 'bold',
                color: canAfford ? '#ffffff' : '#666677',
                align: 'center',
                wordWrap: { width: cardW - 8 }
            }).setOrigin(0.5);

            const tDesc = this.add.text(0, 20, trap.desc, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '8px',
                color: '#aaaaaa',
                align: 'center',
                wordWrap: { width: cardW - 12 }
            }).setOrigin(0.5);

            const costText = this.add.text(0, 42, `$${trap.cost}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                fontStyle: 'bold',
                color: canAfford ? '#f0c040' : '#885555',
            }).setOrigin(0.5);

            // Arm Button
            const armBtnBg = this.add.graphics();
            this.drawButton(armBtnBg, -40, 50, 80, 20, canAfford ? 0xcc2222 : 0x221111, canAfford ? 0xff4444 : 0x442222);

            const armBtnText = this.add.text(0, 60, canAfford ? 'ARM' : 'POOR', {
                fontFamily: 'Cinzel, serif',
                fontSize: '9px',
                fontStyle: 'bold',
                color: canAfford ? '#ffffff' : '#664444',
            }).setOrigin(0.5);

            if (canAfford) {
                const armHit = this.add.rectangle(0, 60, 80, 20, 0xffffff, 0)
                    .setInteractive({ useHandCursor: true });
                armHit.on('pointerdown', () => {
                    audio.playClick();
                    this.toggleTrapsModal();
                    this.boardScene.playerPlantTrap(trap);
                });
                tContainer.add(armHit);
            }

            tContainer.add([tBg, icon, tName, tDesc, costText, armBtnBg, armBtnText]);
            this.trapsModal.add(tContainer);
        });
    }

    toggleEmotesModal() {
        if (this.emotesModal) {
            this.emotesModal.destroy();
            this.emotesModal = null;
            return;
        }

        const modalW = 440;
        const modalH = 170;
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.emotesModal = this.add.container(cx, cy).setDepth(200);

        const backdrop = this.add.rectangle(0, 0, this.width, this.height, 0x000000, 0.5)
            .setInteractive();
        backdrop.on('pointerdown', () => this.toggleEmotesModal());
        this.emotesModal.add(backdrop);

        const frame = this.add.graphics();
        frame.fillStyle(0x111124, 0.98);
        frame.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        frame.lineStyle(2, 0xc084fc, 0.85);
        frame.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        this.emotesModal.add(frame);

        const title = this.add.text(0, -modalH / 2 + 20, '💬 EXPRESS YOURSELF (EMOTE WHEEL)', {
            fontFamily: 'Cinzel, serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#c084fc',
            letterSpacing: 1.5,
        }).setOrigin(0.5);
        this.emotesModal.add(title);

        const emotesList = EMOTES || [
            { id: 'crown', icon: '👑', label: 'I Rule!' },
            { id: 'fire', icon: '🔥', label: 'On Fire!' },
            { id: 'skull', icon: '💀', label: 'RIP!' },
            { id: 'trophy', icon: '🏆', label: 'EZ Win!' },
            { id: 'rage', icon: '😡', label: 'Salty!' },
            { id: 'heart', icon: '💖', label: 'GG & Love!' },
        ];

        const itemW = 62;
        const itemSpacing = 8;
        const totalW = emotesList.length * itemW + (emotesList.length - 1) * itemSpacing;
        const startX = -totalW / 2 + itemW / 2;
        const itemY = 16;

        emotesList.forEach((emote, idx) => {
            const x = startX + idx * (itemW + itemSpacing);
            const eContainer = this.add.container(x, itemY);

            const eBg = this.add.graphics();
            eBg.fillStyle(0x1c1730, 0.95);
            eBg.fillRoundedRect(-itemW / 2, -38, itemW, 76, 8);
            eBg.lineStyle(1.5, 0xa855f7, 0.6);
            eBg.strokeRoundedRect(-itemW / 2, -38, itemW, 76, 8);

            let iconObj;
            if (emote.iconKey && this.textures.exists(emote.iconKey)) {
                iconObj = this.add.image(0, -12, emote.iconKey).setDisplaySize(28, 28);
            } else {
                iconObj = this.add.text(0, -12, emote.icon, { fontSize: '24px' }).setOrigin(0.5);
            }

            const eLabel = this.add.text(0, 18, emote.label, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
            }).setOrigin(0.5);

            const hit = this.add.rectangle(0, 0, itemW, 76, 0xffffff, 0)
                .setInteractive({ useHandCursor: true });

            hit.on('pointerover', () => {
                eBg.lineStyle(2, 0xf0c040, 1);
                eBg.strokeRoundedRect(-itemW / 2, -38, itemW, 76, 8);
            });
            hit.on('pointerout', () => {
                eBg.lineStyle(1.5, 0xa855f7, 0.6);
                eBg.strokeRoundedRect(-itemW / 2, -38, itemW, 76, 8);
            });

            hit.on('pointerdown', () => {
                audio.playClick();
                this.toggleEmotesModal();
                if (this.boardScene && this.boardScene.triggerEmote) {
                    this.boardScene.triggerEmote(0, emote);
                }
            });

            eContainer.add([eBg, iconObj, eLabel, hit]);
            this.emotesModal.add(eContainer);
        });
    }

    drawHpBar(gfx, x, y, width, height, current, max) {
        gfx.clear();
        const ratio = Math.max(0, Math.min(1, current / max));
        const color = ratio > 0.5 ? 0x2ecc71 : (ratio > 0.25 ? 0xf39c12 : 0xe74c3c);
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(x, y, Math.max(4, width * ratio), height, 3);
    }

    createActivityFeed() {
        const feedWidth = 320;
        const feedHeight = 84;
        const x = this.width - feedWidth - 20;
        const y = this.height - feedHeight - 14;

        const feedBg = this.add.graphics();
        feedBg.fillStyle(0x0e0e1a, 0.85);
        feedBg.fillRoundedRect(x, y, feedWidth, feedHeight, 10);
        feedBg.lineStyle(1, 0xffffff, 0.08);
        feedBg.strokeRoundedRect(x, y, feedWidth, feedHeight, 10);

        this.feedTitle = this.add.text(x + 12, y + 8, 'ACTIVITY FEED', {
            fontFamily: 'Cinzel, serif',
            fontSize: '10px',
            color: '#8888aa',
            letterSpacing: 1,
        });

        this.feedText = this.add.text(x + 12, y + 26, this.logMessages.join('\n'), {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#cccccc',
            lineSpacing: 4,
            wordWrap: { width: feedWidth - 24 },
        });
    }

    addLogMessage(msg) {
        this.logMessages.unshift(msg);
        if (this.logMessages.length > 3) {
            this.logMessages.pop();
        }
        if (this.feedText) {
            this.feedText.setText(this.logMessages.join('\n'));
        }
    }

    refreshHUD() {
        if (!this.boardScene) return;

        const turnLimit = this.boardScene.game.registry.get('turnLimit') || 20;
        const currentPlayer = this.boardScene.currentPlayer;
        const activePlayerData = this.boardScene.players[currentPlayer];

        // Update Turn info with Game Mode
        const mode = (this.boardScene && this.boardScene.gameMode) || this.boardScene.game.registry.get('gameMode') || 'tycoon';
        const modeBadges = {
            tycoon: '🏆 TYCOON',
            star_hunter: '⭐ STAR HUNTER',
            elimination: '💀 SURVIVAL',
        };
        const badge = modeBadges[mode] || '🏆 CONQUEST';

        if (this.turnText) {
            this.turnText.setText(`TURN ${this.boardScene.turnNumber} / ${turnLimit}  •  ${badge}`);
        }

        if (this.activePlayerText && activePlayerData) {
            this.activePlayerText.setText(`${activePlayerData.name}'s Turn`);
            this.activePlayerText.setColor(activePlayerData.colorHex || '#ffffff');
        }

        // Update Player Cards
        this.playerCardElements.forEach((item, index) => {
            const p = this.boardScene.players[index];
            if (!p) return;

            const isActive = index === currentPlayer;
            item.glow.setVisible(isActive);
            if (item.shieldBadge) {
                item.shieldBadge.setVisible(p.hasShield || false);
            }

            if (isActive) {
                this.tweens.add({
                    targets: item.container,
                    y: item.baseY - 4,
                    duration: 200,
                    ease: 'Power2.easeOut',
                });
            } else {
                this.tweens.add({
                    targets: item.container,
                    y: item.baseY,
                    duration: 200,
                    ease: 'Power2.easeOut',
                });
            }

            item.gold.setText(`💰 $${p.gold.toLocaleString()}`);
            this.drawHpBar(item.hpFill, 12, 48, item.width - 24, 6, p.hp, p.maxHp);
            item.stats.setText(`🏠 ${p.properties.length} ⭐ ${p.stars} ⚔️ ${p.weapons.length} 🎴 ${(p.powerCards || []).length}`);
        });

        this.updateActionButtonsState();
    }
}
