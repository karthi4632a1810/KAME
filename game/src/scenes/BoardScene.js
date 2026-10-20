/**
 * BoardScene — Real Game Board with real sliced assets, characters, perks, power cards, and PvP combat
 */
import Phaser from 'phaser';
import { BOARD, PLAYER, TILE_COLORS, TILE_TYPE, TILE_ASSET_ICONS, BIOME_COLORS, DICE, ANIM, GAME_STATE, CHARACTERS, POWER_CARDS, WEAPON_TYPES, TRAP_TYPES, MINI_GAMES, TURRET_TYPES, EMOTES } from '../config/GameConfig.js';
import { generateBoardData } from '../data/BoardData.js';
import { audio } from '../audio/AudioManager.js';
import { network } from '../network/NetworkManager.js';

export class BoardScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BoardScene' });
    }

    create() {
        const { width, height } = this.cameras.main;
        this.boardData = generateBoardData();
        this.tileSprites = [];
        this.tileTexts = [];
        this.propertyBadges = {};
        this.trapSprites = {};
        this.turretSprites = {};
        this.junctionChoiceModal = null;
        this.junctionArrows = [];
        this.activeBoardModal = null;
        this.gameMode = this.game.registry.get('gameMode') || 'tycoon';

        // ── Game State ──
        this.playerCount = this.game.registry.get('playerCount') || 4;
        this.currentPlayer = 0;
        this.turnNumber = 1;
        this.gameState = GAME_STATE.WAITING;
        this.diceResult = 0;
        this.movesRemaining = 0;

        // ── Players (Player 1 is Human, Others are Bots) ──
        this.players = [];
        const cardKeys = Object.keys(POWER_CARDS);

        for (let i = 0; i < this.playerCount; i++) {
            const char = CHARACTERS[i] || CHARACTERS[0];
            // Starter power card
            const starterCard = POWER_CARDS[cardKeys[i % cardKeys.length]];

            this.players.push({
                id: i,
                character: char,
                name: i === 0 ? `${char.name} (You)` : `${char.name} [Bot]`,
                isBot: i !== 0,
                color: char.color,
                colorHex: char.colorHex,
                tileIndex: 0,
                gold: PLAYER.STARTING_GOLD,
                hp: PLAYER.STARTING_HP,
                maxHp: PLAYER.STARTING_HP,
                energy: PLAYER.STARTING_ENERGY,
                maxEnergy: PLAYER.STARTING_ENERGY,
                properties: [],
                weapons: [WEAPON_TYPES[i % WEAPON_TYPES.length].name],
                traps: [],
                powerCards: [starterCard],
                hasShield: false,
                doubleDice: false,
                isKnockedOut: false,
                stars: 0,
                sprite: null,
                avatarSprite: null,
                label: null,
            });
        }

        // ── Draw Board ──
        this.createBackground(width, height);
        this.drawBoard();
        this.createPlayerTokens();
        this.createDiceUI(width, height);
        this.createInfoPanel(width, height);

        // ── Launch HUD ──
        this.scene.launch('HUDScene', { boardScene: this });

        // ── Camera ──
        this.cameras.main.fadeIn(600, 0, 0, 0);

        // ── Input ──
        this.input.on('pointerdown', (pointer) => {
            // Ignore clicks if clicking near HUD controls
            if (pointer.y > height - 140 && pointer.x < 260) return;

            const cp = this.players[this.currentPlayer];
            if (this.gameState === GAME_STATE.WAITING && !cp.isBot && !cp.isKnockedOut) {
                this.rollDice();
            }
        });

        // Start first turn prompt
        this.time.delayedCall(800, () => {
            this.showTurnBanner();
        });

        // Online multiplayer setup
        this.roomCode = this.game.registry.get('roomCode') || null;
        this.isOnlineMatch = !!this.roomCode;
        if (this.isOnlineMatch) {
            this.setupMultiplayerSync();
        }
    }

    setupMultiplayerSync() {
        this.events.emit('hudMessage', `🌐 Real-Time Multiplayer Room: ${this.roomCode}`);

        network.on('DICE_ROLLED', (data) => {
            if (data.playerId !== 0 && this.currentPlayer === data.playerId) {
                this.diceResult = data.result;
                this.rollLabel.setText(`${data.result}`);
                this.startMoving();
            }
        });

        network.on('EMOTE_RECEIVED', (data) => {
            if (data.playerId !== 0) {
                this.triggerEmote(data.playerId, data.emote);
            }
        });

        network.on('ATTACK_OCCURRED', (data) => {
            if (data.attackerId !== 0) {
                const attacker = this.players[data.attackerId];
                const defender = this.players[data.defenderId];
                if (attacker && defender) {
                    this.executeAttack(attacker, defender);
                }
            }
        });

        network.on('TRAP_PLANTED', (data) => {
            if (data.playerId !== 0) {
                const p = this.players[data.playerId];
                if (p) this.armTrapOnTile(data.tileIndex, data.trapType, p);
            }
        });
    }

    // ═══════════════════════════════════════
    // BACKGROUND & PARTICLES
    // ═══════════════════════════════════════

    createBackground(width, height) {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a18, 0x0a0a18, 0x0f0f24, 0x0f0f24, 1);
        bg.fillRect(0, 0, width, height);

        // Subtle tech grid
        bg.lineStyle(1, 0xffffff, 0.02);
        for (let x = 0; x < width; x += 50) bg.lineBetween(x, 0, x, height);
        for (let y = 0; y < height; y += 50) bg.lineBetween(0, y, width, y);

        // Center arena emblem
        const centerEmblem = this.add.text(width / 2 - 90, height / 2 - 25, 'KAME', {
            fontFamily: 'Cinzel, serif',
            fontSize: '76px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5).setAlpha(0.06);

        this.tweens.add({
            targets: centerEmblem,
            alpha: 0.12,
            duration: 3200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Ambient particles in center arena
        for (let i = 0; i < 28; i++) {
            const px = width / 2 - 90 + Phaser.Math.Between(-250, 250);
            const py = height / 2 - 25 + Phaser.Math.Between(-140, 140);
            const color = [0xf0c040, 0x67e8f9, 0xf97316, 0x84cc16][Phaser.Math.Between(0, 3)];
            const particle = this.add.circle(px, py, Phaser.Math.Between(1, 2.5), color, 0.25);
            this.tweens.add({
                targets: particle,
                y: py - Phaser.Math.Between(15, 45),
                alpha: 0,
                duration: Phaser.Math.Between(2500, 5000),
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut',
            });
        }
    }

    // ═══════════════════════════════════════
    // BOARD RENDERING WITH REAL SLICED ASSETS
    // ═══════════════════════════════════════

    drawBoard() {
        this.boardContainer = this.add.container(0, 0);

        this.boardData.forEach((tile, index) => {
            const tileKey = `tile_${tile.type}`;

            // Tile base sprite
            const sprite = this.add.image(tile.x, tile.y, tileKey).setOrigin(0);
            sprite.setInteractive({ useHandCursor: true });
            sprite.setData('tileIndex', index);

            // Tile number label
            const numText = this.add.text(tile.x + 25, tile.y + 7, `${tile.id}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '9px',
                color: '#ffffff',
                align: 'center',
            }).setOrigin(0.5).setAlpha(0.6);

            // Real Sliced Category Icon or Emoji fallback
            const iconKey = TILE_ASSET_ICONS[tile.type];
            let iconElement;
            if (iconKey && this.textures.exists(iconKey)) {
                iconElement = this.add.image(tile.x + 25, tile.y + 30, iconKey)
                    .setDisplaySize(24, 24)
                    .setOrigin(0.5);
            } else {
                const typeIcon = this.getTileIcon(tile.type);
                iconElement = this.add.text(tile.x + 25, tile.y + 30, typeIcon, {
                    fontSize: '15px',
                    align: 'center',
                }).setOrigin(0.5);
            }

            // Hover tooltip
            sprite.on('pointerover', () => {
                sprite.setAlpha(0.85);
                this.showTileTooltip(tile, sprite);
            });
            sprite.on('pointerout', () => {
                sprite.setAlpha(1);
                this.hideTileTooltip();
            });

            this.tileSprites.push(sprite);
            this.tileTexts.push(numText);
            this.boardContainer.add([sprite, numText, iconElement]);

            // Junction & Shortcut Visual Accents
            if (tile.isJunction) {
                const jGfx = this.add.graphics();
                jGfx.lineStyle(2, 0xf0c040, 0.95);
                jGfx.strokeRoundedRect(tile.x - 2, tile.y - 2, 54, 54, 10);
                const forkBadge = this.add.text(tile.x + 38, tile.y + 6, '🔀', { fontSize: '11px' }).setOrigin(0.5);
                this.boardContainer.add([jGfx, forkBadge]);

                this.tweens.add({
                    targets: jGfx,
                    alpha: 0.25,
                    duration: 650,
                    yoyo: true,
                    repeat: -1,
                });
            } else if (tile.isShortcut) {
                const sColor = (tile.id >= 40 && tile.id <= 44) ? 0xf97316 : 0x38bdf8;
                const sGfx = this.add.graphics();
                sGfx.lineStyle(1.5, sColor, 0.65);
                sGfx.strokeRoundedRect(tile.x - 1, tile.y - 1, 52, 52, 9);
                this.boardContainer.add(sGfx);
            }
        });

        // Biome section banners
        this.drawBiomeLabels();

        // Path connection lines
        this.drawPathLines();
    }

    getTileIcon(type) {
        const icons = {
            [TILE_TYPE.START]: '🏁',
            [TILE_TYPE.PROPERTY]: '🏠',
            [TILE_TYPE.SHOP]: '🛒',
            [TILE_TYPE.EVENT]: '❓',
            [TILE_TYPE.TRAP]: '💀',
            [TILE_TYPE.DANGER]: '⚠️',
            [TILE_TYPE.HEAL]: '💚',
            [TILE_TYPE.WEAPON]: '⚔️',
            [TILE_TYPE.AIRPORT]: '✈️',
            [TILE_TYPE.HARBOR]: '⚓',
            [TILE_TYPE.TRAIN]: '🚂',
            [TILE_TYPE.TUNNEL]: '🕳️',
            [TILE_TYPE.BLACK_MARKET]: '🏴',
            [TILE_TYPE.PRESSURE_PLATE]: '🔘',
            [TILE_TYPE.SPRING_PAD]: '🚀',
            [TILE_TYPE.SECRET_HATCH]: '🔒',
            [TILE_TYPE.EMPTY]: '',
        };
        return icons[type] || '';
    }

    drawBiomeLabels() {
        const biomeGroups = {};
        this.boardData.forEach(tile => {
            if (tile.isShortcut) return; // Skip shortcuts in outer labels
            if (!biomeGroups[tile.biome]) biomeGroups[tile.biome] = [];
            biomeGroups[tile.biome].push(tile);
        });

        Object.entries(biomeGroups).forEach(([biome, tiles]) => {
            const avgX = tiles.reduce((s, t) => s + t.x, 0) / tiles.length;
            const avgY = tiles.reduce((s, t) => s + t.y, 0) / tiles.length;
            const color = BIOME_COLORS[biome];
            if (!color) return;

            const biomeNames = {
                metropolis: 'METROPOLIS', frozen_tundra: 'FROZEN TUNDRA',
                firelands: 'FIRELANDS', sand_kingdom: 'SAND KINGDOM',
                ancient_jungle: 'ANCIENT JUNGLE', pirate_cove: 'PIRATE COVE',
                dark_forest: 'DARK FOREST', toxic_swamp: 'TOXIC SWAMP',
                sky_archipelago: 'SKY ARCHIPELAGO', mechanical_wastes: 'MECH WASTES',
            };

            const isTopRow = avgY < 200;
            const isBottomRow = avgY > 380;
            const labelY = isTopRow ? avgY - 18 : isBottomRow ? avgY + 58 : avgY + 24;

            const label = this.add.text(avgX + 25, labelY, biomeNames[biome] || biome, {
                fontFamily: 'Cinzel, serif',
                fontSize: '9px',
                color: `#${color.primary.toString(16).padStart(6, '0')}`,
                letterSpacing: 2,
            }).setOrigin(0.5).setAlpha(0.75);

            this.boardContainer.add(label);
        });
    }

    drawPathLines() {
        const pathGfx = this.add.graphics();

        this.boardData.forEach(current => {
            if (current.next && current.next.length > 0) {
                current.next.forEach(targetId => {
                    const target = this.boardData[targetId];
                    if (!target) return;

                    const isVolcano = (current.id >= 40 && current.id <= 44) || (target.id >= 40 && target.id <= 44);
                    const isSubway = (current.id >= 45 && current.id <= 49) || (target.id >= 45 && target.id <= 49);

                    if (isVolcano) {
                        pathGfx.lineStyle(3, 0xf97316, 0.55); // Glowing Volcano Ravine bridge
                    } else if (isSubway) {
                        pathGfx.lineStyle(3, 0x38bdf8, 0.55); // Glowing Mech Subway tunnel
                    } else if (current.isJunction) {
                        pathGfx.lineStyle(2.5, 0xf0c040, 0.45); // Junction line
                    } else {
                        pathGfx.lineStyle(2, 0xf0c040, 0.18); // Main perimeter track
                    }
                    pathGfx.lineBetween(
                        current.x + 25, current.y + 25,
                        target.x + 25, target.y + 25
                    );
                });
            }
        });

        this.boardContainer.addAt(pathGfx, 0);
    }

    // ═══════════════════════════════════════
    // PLAYER TOKENS WITH MASCOT PORTRAITS
    // ═══════════════════════════════════════

    createPlayerTokens() {
        this.players.forEach((player, index) => {
            const tile = this.boardData[player.tileIndex];
            const offset = this.getPlayerOffset(index);
            const tokenX = tile.x + 25 + offset.x;
            const tokenY = tile.y + 25 + offset.y;

            // Outer colored aura circle
            const token = this.add.image(tokenX, tokenY, `player_token_${index}`)
                .setOrigin(0.5)
                .setDepth(10);

            // Mascot avatar image inside token
            const avatarKey = `char_avatar_${index + 1}`;
            let avatarImg = null;
            if (this.textures.exists(avatarKey)) {
                avatarImg = this.add.image(tokenX, tokenY, avatarKey)
                    .setDisplaySize(20, 20)
                    .setOrigin(0.5)
                    .setDepth(11);
            }

            // Small badge number
            const label = this.add.text(tokenX + 8, tokenY - 8, `${index + 1}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor: '#111122',
                padding: { x: 2, y: 1 }
            }).setOrigin(0.5).setDepth(12);

            player.sprite = token;
            player.avatarSprite = avatarImg;
            player.label = label;
        });
    }

    getPlayerOffset(playerIndex) {
        const offsets = [
            { x: -8, y: -8 },
            { x: 8, y: -8 },
            { x: -8, y: 8 },
            { x: 8, y: 8 },
            { x: 0, y: -12 },
            { x: 0, y: 12 },
        ];
        return offsets[playerIndex] || { x: 0, y: 0 };
    }

    // ═══════════════════════════════════════
    // DICE UI
    // ═══════════════════════════════════════

    createDiceUI(width, height) {
        this.diceContainer = this.add.container(width - 90, height / 2 - 50);

        const diceBg = this.add.graphics();
        diceBg.fillStyle(0x1a1a2e, 0.9);
        diceBg.fillRoundedRect(-48, -20, 96, 160, 12);
        diceBg.lineStyle(1.5, 0xf0c040, 0.4);
        diceBg.strokeRoundedRect(-48, -20, 96, 160, 12);
        this.diceContainer.add(diceBg);

        this.rollLabel = this.add.text(0, -4, 'ROLL', {
            fontFamily: 'Cinzel, serif',
            fontSize: '12px',
            color: '#f0c040',
            letterSpacing: 3,
        }).setOrigin(0.5);
        this.diceContainer.add(this.rollLabel);

        this.diceImage = this.add.image(0, 50, 'dice_1').setOrigin(0.5).setScale(1);
        this.diceImage.setInteractive({ useHandCursor: true });
        this.diceImage.on('pointerdown', () => {
            const cp = this.players[this.currentPlayer];
            if (this.gameState === GAME_STATE.WAITING && !cp.isBot && !cp.isKnockedOut) {
                this.rollDice();
            }
        });
        this.diceContainer.add(this.diceImage);

        this.clickPrompt = this.add.text(0, 105, 'Click to Roll', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#8888aa',
        }).setOrigin(0.5);
        this.diceContainer.add(this.clickPrompt);

        this.tweens.add({
            targets: this.clickPrompt,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.diceContainer.setDepth(20);
    }

    createInfoPanel(width, height) {
        this.updateInfoPanel();
    }

    updateInfoPanel() {
        this.events.emit('updateHUD');
    }

    // ═══════════════════════════════════════
    // TOOLTIP
    // ═══════════════════════════════════════

    showTileTooltip(tile, sprite) {
        this.hideTileTooltip();

        const x = tile.x + 25;
        const y = tile.y - 28;

        const tooltipBg = this.add.graphics();
        tooltipBg.fillStyle(0x1a1a2e, 0.95);
        tooltipBg.fillRoundedRect(x - 70, y - 14, 140, 28, 6);
        tooltipBg.lineStyle(1, 0xf0c040, 0.4);
        tooltipBg.strokeRoundedRect(x - 70, y - 14, 140, 28, 6);
        tooltipBg.setDepth(30);

        const tooltipText = this.add.text(x, y, tile.name, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '10px',
            color: '#f0c040',
            align: 'center',
        }).setOrigin(0.5).setDepth(31);

        this.tooltip = { bg: tooltipBg, text: tooltipText };
    }

    hideTileTooltip() {
        if (this.tooltip) {
            this.tooltip.bg.destroy();
            this.tooltip.text.destroy();
            this.tooltip = null;
        }
    }

    // ═══════════════════════════════════════
    // TURN BANNER & BOT AI DISPATCH
    // ═══════════════════════════════════════

    showTurnBanner() {
        const { width, height } = this.cameras.main;
        const cp = this.players[this.currentPlayer];

        // Check if player was knocked out
        if (cp.isKnockedOut) {
            cp.isKnockedOut = false;
            this.events.emit('hudMessage', `🩹 ${cp.name} recovered from knockout! (Turn skipped)`);
            this.showFloatingText(cp.sprite.x, cp.sprite.y - 20, 'Recovering...', '#e74c3c');
            this.time.delayedCall(1200, () => this.endTurn());
            return;
        }

        const banner = this.add.container(width / 2, height / 2).setDepth(50).setAlpha(0);

        const bg = this.add.graphics();
        bg.fillStyle(0x0a0a1a, 0.88);
        bg.fillRoundedRect(-200, -40, 400, 80, 16);
        bg.lineStyle(2, cp.color, 0.7);
        bg.strokeRoundedRect(-200, -40, 400, 80, 16);
        banner.add(bg);

        const titleText = cp.isBot ? `${cp.name}` : `${cp.name}'s Turn`;
        const text = this.add.text(0, -8, titleText, {
            fontFamily: 'Cinzel, serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: cp.colorHex || '#ffffff',
        }).setOrigin(0.5);
        banner.add(text);

        const subtextContent = cp.isBot ? '🤖 Calculating strategy...' : 'Roll dice or use tactical card';
        const subtext = this.add.text(0, 20, subtextContent, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#8888aa',
        }).setOrigin(0.5);
        banner.add(subtext);

        this.tweens.add({
            targets: banner,
            alpha: 1,
            duration: 300,
            ease: 'Power2.easeOut',
            onComplete: () => {
                this.time.delayedCall(cp.isBot ? 700 : 1100, () => {
                    this.tweens.add({
                        targets: banner,
                        alpha: 0,
                        duration: 250,
                        ease: 'Power2.easeIn',
                        onComplete: () => {
                            banner.destroy();
                            // If Bot turn, process AI choices (Card / Attack / Roll)
                            if (cp.isBot && this.gameState === GAME_STATE.WAITING) {
                                this.processBotTurn(cp);
                            }
                        },
                    });
                });
            },
        });
    }

    processBotTurn(bot) {
        // AI: Check if bot should play a card
        if (bot.powerCards && bot.powerCards.length > 0 && Math.random() > 0.6) {
            this.time.delayedCall(400, () => {
                this.usePowerCard(bot.id, 0);
                this.time.delayedCall(700, () => this.rollDice());
            });
        } else {
            this.time.delayedCall(400, () => this.rollDice());
        }
    }

    // ═══════════════════════════════════════
    // DICE ROLLING
    // ═══════════════════════════════════════

    rollDice() {
        if (this.gameState !== GAME_STATE.WAITING) return;
        this.gameState = GAME_STATE.ROLLING;

        const cp = this.players[this.currentPlayer];
        audio.playClick();
        this.clickPrompt.setVisible(false);
        this.rollLabel.setText('ROLLING...');

        let rollCount = 0;
        const maxRolls = DICE.BOUNCE_COUNT;
        const rollInterval = DICE.ROLL_DURATION / maxRolls;

        this.time.addEvent({
            delay: rollInterval,
            repeat: maxRolls - 1,
            callback: () => {
                rollCount++;
                const face = Phaser.Math.Between(1, 6);
                this.diceImage.setTexture(`dice_${face}`);
                audio.playDiceTick();

                this.tweens.add({
                    targets: this.diceImage,
                    angle: Phaser.Math.Between(-15, 15),
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: rollInterval * 0.7,
                    ease: 'Bounce.easeOut',
                });

                if (rollCount >= maxRolls) {
                    let roll1 = Phaser.Math.Between(DICE.MIN, DICE.MAX);
                    let total = roll1;

                    // Double dice card effect
                    if (cp.doubleDice) {
                        let roll2 = Phaser.Math.Between(DICE.MIN, DICE.MAX);
                        total = roll1 + roll2;
                        cp.doubleDice = false;
                        this.showFloatingText(this.diceContainer.x, this.diceContainer.y - 40, `DOUBLE! ${roll1} + ${roll2} = ${total}`, '#f0c040');
                    }

                    // Volt Ninja perk: +1 move on 4+
                    if (cp.character.perkType === 'speed' && roll1 >= 4) {
                        total += 1;
                        this.showFloatingText(cp.sprite.x, cp.sprite.y - 20, '+1 Volt Speed!', '#f1c40f');
                    }

                    this.diceResult = total;
                    this.diceImage.setTexture(`dice_${Math.min(6, roll1)}`);
                    this.diceImage.setAngle(0).setScale(1);
                    this.rollLabel.setText(`${total}`);

                    if (this.isOnlineMatch && cp.id === 0) {
                        network.sendRoll(total);
                    }

                    this.tweens.add({
                        targets: this.diceImage,
                        scaleX: 1.3,
                        scaleY: 1.3,
                        duration: 150,
                        yoyo: true,
                        ease: 'Back.easeOut',
                        onComplete: () => {
                            this.time.delayedCall(400, () => {
                                this.startMoving();
                            });
                        },
                    });
                }
            },
        });
    }

    // ═══════════════════════════════════════
    // PLAYER MOVEMENT & SPLIT JUNCTIONS
    // ═══════════════════════════════════════

    startMoving() {
        this.gameState = GAME_STATE.MOVING;
        this.movesRemaining = this.diceResult;
        const cp = this.players[this.currentPlayer];
        cp.branchChosen = false;
        this.movePlayerOneStep();
    }

    movePlayerOneStep() {
        if (this.movesRemaining <= 0) {
            this.onLandOnTile();
            return;
        }

        const cp = this.players[this.currentPlayer];
        const currentTile = this.boardData[cp.tileIndex];

        // Check if current tile is a junction with remaining moves
        if (currentTile.isJunction && currentTile.next && currentTile.next.length > 1 && !cp.branchChosen) {
            this.handleSplitJunctionChoice(cp, currentTile);
            return;
        }

        // Reset branchChosen flag once we proceed past junction
        cp.branchChosen = false;

        const nextIndex = (currentTile.next && currentTile.next.length > 0) ? currentTile.next[0] : (cp.tileIndex + 1) % this.boardData.length;
        this.stepPlayerToTile(cp, nextIndex);
    }

    handleSplitJunctionChoice(player, junctionTile) {
        this.gameState = GAME_STATE.JUNCTION_CHOICE;
        audio.playClick();

        if (player.isBot) {
            // Bot AI Evaluation
            const choice = (player.hp > 1100 && Math.random() > 0.4) ? 1 : 0;
            const branchName = junctionTile.branchNames[choice];
            this.showFloatingText(player.sprite.x, player.sprite.y - 25, `🤖 Chose ${branchName}!`, '#f0c040');
            this.events.emit('hudMessage', `🤖 ${player.name} took ${branchName} at junction!`);
            this.time.delayedCall(750, () => {
                player.branchChosen = true;
                this.stepPlayerToTile(player, junctionTile.next[choice]);
            });
            return;
        }

        // Human Player Modal
        const { width, height } = this.cameras.main;
        const modal = this.add.container(width / 2, height / 2).setDepth(150);
        this.junctionChoiceModal = modal;

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setInteractive();
        modal.add(backdrop);

        const frameW = 460;
        const frameH = 220;
        const bg = this.add.graphics();
        bg.fillStyle(0x0e0e1e, 0.96);
        bg.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        bg.lineStyle(2, 0xf0c040, 0.9);
        bg.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        modal.add(bg);

        const title = this.add.text(0, -frameH / 2 + 25, `FORK IN THE ROAD: ${junctionTile.name.toUpperCase()}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, -frameH / 2 + 50, `Choose your path (${this.movesRemaining} moves remaining)`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#8888aa',
        }).setOrigin(0.5);
        modal.add([title, subtitle]);

        const btnW = 195;
        const btnH = 95;
        const btnY = 20;

        junctionTile.next.forEach((targetId, idx) => {
            const btnX = idx === 0 ? -110 : 110;
            const branchContainer = this.add.container(btnX, btnY);

            const btnBg = this.add.graphics();
            const btnColor = idx === 0 ? 0x1f2937 : 0x3b1812;
            const borderColor = idx === 0 ? 0x60a5fa : 0xf97316;
            btnBg.fillStyle(btnColor, 0.95);
            btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
            btnBg.lineStyle(1.5, borderColor, 0.85);
            btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);

            const iconText = this.add.text(0, -25, junctionTile.branchIcons[idx] || '➡️', { fontSize: '20px' }).setOrigin(0.5);
            const nameText = this.add.text(0, 0, junctionTile.branchNames[idx] || `Path ${idx + 1}`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
            }).setOrigin(0.5);

            const descText = this.add.text(0, 24, junctionTile.branchDescs[idx] || '', {
                fontFamily: 'Inter, sans-serif',
                fontSize: '9px',
                color: '#9ca3af',
                align: 'center',
                wordWrap: { width: btnW - 20 },
            }).setOrigin(0.5);

            const hitArea = this.add.rectangle(0, 0, btnW, btnH, 0xffffff, 0)
                .setInteractive({ useHandCursor: true });

            hitArea.on('pointerover', () => {
                btnBg.lineStyle(2, 0xf0c040, 1);
                btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
            });
            hitArea.on('pointerout', () => {
                btnBg.lineStyle(1.5, borderColor, 0.85);
                btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
            });

            hitArea.on('pointerdown', () => {
                audio.playClick();
                this.closeJunctionModal();
                player.branchChosen = true;
                this.stepPlayerToTile(player, targetId);
            });

            branchContainer.add([btnBg, iconText, nameText, descText, hitArea]);
            modal.add(branchContainer);

            // Animated bouncing pointer over destination tile
            const targetTile = this.boardData[targetId];
            if (targetTile) {
                const arrow = this.add.text(targetTile.x + 25, targetTile.y - 12, '⬇️', { fontSize: '16px' })
                    .setOrigin(0.5).setDepth(45);
                this.tweens.add({
                    targets: arrow,
                    y: targetTile.y - 20,
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                });
                this.junctionArrows.push(arrow);
            }
        });
    }

    closeJunctionModal() {
        if (this.junctionChoiceModal) {
            this.junctionChoiceModal.destroy();
            this.junctionChoiceModal = null;
        }
        if (this.junctionArrows) {
            this.junctionArrows.forEach(a => a.destroy());
            this.junctionArrows = [];
        }
    }

    stepPlayerToTile(player, nextIndex) {
        this.gameState = GAME_STATE.MOVING;
        const nextTile = this.boardData[nextIndex];
        const offset = this.getPlayerOffset(player.id);

        audio.playStep();

        const targets = [player.sprite, player.label];
        if (player.avatarSprite) targets.push(player.avatarSprite);

        this.tweens.add({
            targets,
            x: nextTile.x + 25 + offset.x,
            y: nextTile.y + 25 + offset.y,
            duration: ANIM.PLAYER_MOVE_SPEED,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                player.tileIndex = nextIndex;
                this.movesRemaining--;

                // Passed START bonus ($2,000 + Ronin Perk)
                if (nextIndex === 0) {
                    let bonus = 2000;
                    if (player.character.perkType === 'gold_bonus') {
                        bonus = Math.round(bonus * 1.2);
                    }
                    player.gold += bonus;
                    audio.playCash();
                    this.showFloatingText(player.sprite.x, player.sprite.y - 20, `+$${bonus.toLocaleString()} (START!)`, '#2ecc71');
                    this.events.emit('hudMessage', `🏁 ${player.name} crossed START (+$${bonus.toLocaleString()})!`);
                }

                // Mid-step trap detonation check
                if (nextTile.trap && nextTile.trap.owner !== player.id) {
                    const trapEndedMove = this.triggerMidStepTrap(player, nextTile);
                    if (trapEndedMove && this.movesRemaining <= 0) {
                        this.onLandOnTile();
                        return;
                    }
                }

                // Mid-step automated turret defense check
                this.checkTurretDefenseFiring(player, nextTile);

                if (player.isEliminated || player.isKnockedOut) {
                    this.movesRemaining = 0;
                    this.onLandOnTile();
                    return;
                }

                if (this.movesRemaining > 0) {
                    this.movePlayerOneStep();
                } else {
                    this.onLandOnTile();
                }
            },
        });
    }

    triggerMidStepTrap(player, tile) {
        const trap = tile.trap;
        tile.trap = null;
        if (this.trapSprites[tile.id]) {
            this.trapSprites[tile.id].destroy();
            delete this.trapSprites[tile.id];
        }

        if (player.hasShield) {
            player.hasShield = false;
            this.showFloatingText(player.sprite.x, player.sprite.y - 25, 'SHIELD SAVED FROM TRAP!', '#67e8f9');
            this.events.emit('hudMessage', `🛡️ ${player.name}'s Shield absorbed trap on tile ${tile.id}!`);
            return false;
        }

        audio.playHazard();
        this.cameras.main.shake(250, 0.009);

        const trapOwner = this.players[trap.owner] || { name: 'Opponent' };

        if (trap.type === 'bear_trap') {
            const dmg = 250;
            player.hp = Math.max(0, player.hp - dmg);
            this.movesRemaining = 0; // ROOT EFFECT!
            this.showFloatingText(player.sprite.x, player.sprite.y - 25, `🪤 BEAR TRAP! ROOTED! (-${dmg}HP)`, '#e74c3c');
            this.events.emit('hudMessage', `🪤 ${player.name} was caught in a Bear Trap by ${trapOwner.name}! Rooted in place!`);
            return true;
        } else if (trap.type === 'landmine') {
            const dmg = 400;
            const burn = Math.round(player.gold * 0.15);
            player.hp = Math.max(0, player.hp - dmg);
            player.gold = Math.max(0, player.gold - burn);
            this.showFloatingText(player.sprite.x, player.sprite.y - 25, `💥 LANDMINE! -${dmg}HP -$${burn}`, '#e74c3c');
            this.events.emit('hudMessage', `💥 ${player.name} detonated a Landmine by ${trapOwner.name} (-${dmg}HP, -$${burn})!`);
            return false;
        } else if (trap.type === 'oil_slick') {
            player.hp = Math.max(0, player.hp - 100);
            this.showFloatingText(player.sprite.x, player.sprite.y - 25, `🍌 OIL SLICK! Slipped backwards!`, '#f1c40f');
            this.events.emit('hudMessage', `🍌 ${player.name} slipped on an Oil Slick by ${trapOwner.name}!`);
            return false;
        } else if (trap.type === 'emp_grid') {
            player.energy = 0;
            player.powerCards = [];
            player.hp = Math.max(0, player.hp - 180);
            this.showFloatingText(player.sprite.x, player.sprite.y - 25, `⚡ EMP GRID! Energy & Cards wiped!`, '#a855f7');
            this.events.emit('hudMessage', `⚡ ${player.name} hit an EMP Shock Grid by ${trapOwner.name}!`);
            return false;
        } else {
            player.hp = Math.max(0, player.hp - 200);
            this.showFloatingText(player.sprite.x, player.sprite.y - 25, `TRAP! -200 HP`, '#e74c3c');
            return false;
        }
    }

    armTrapOnTile(tileIndex, trapType, player) {
        const tile = this.boardData[tileIndex];
        if (!tile) return;

        tile.trap = {
            id: trapType.id,
            type: trapType.id,
            name: trapType.name,
            owner: player.id,
            color: player.color,
        };

        if (this.trapSprites[tile.id]) {
            this.trapSprites[tile.id].destroy();
        }

        const trapGfx = this.add.container(tile.x + 25, tile.y + 25).setDepth(6);
        const ring = this.add.circle(0, 0, 15, player.color, 0.45);
        ring.setStrokeStyle(1.5, player.color, 0.95);
        const icon = this.add.text(0, 0, trapType.icon || '💣', { fontSize: '13px' }).setOrigin(0.5);
        trapGfx.add([ring, icon]);

        this.tweens.add({
            targets: ring,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
        });

        this.trapSprites[tile.id] = trapGfx;
        audio.playClick();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, `${trapType.name} Armed!`, '#f39c12');
        this.events.emit('hudMessage', `💣 ${player.name} armed a ${trapType.name} on ${tile.name}!`);
        this.updateInfoPanel();
    }

    checkTurretDefenseFiring(victim, currentTile) {
        if (victim.isKnockedOut || victim.isEliminated) return;

        this.boardData.forEach(t => {
            if (t.turret && t.turret.owner !== victim.id) {
                const turret = t.turret.type;
                const distPx = Phaser.Math.Distance.Between(t.x + 25, t.y + 25, currentTile.x + 25, currentTile.y + 25);
                const maxRangePx = (turret.range || 1) * 70;

                if (distPx <= maxRangePx) {
                    const owner = this.players[t.turret.owner] || { name: 'Sentry', color: 0xe74c3c };

                    // Tracer beam animation
                    const beam = this.add.graphics().setDepth(35);
                    const beamColor = turret.id === 'tesla' ? 0x06b6d4 : (turret.id === 'flame' ? 0xf97316 : (turret.id === 'mortar' ? 0xef4444 : 0xf0c040));
                    beam.lineStyle(3, beamColor, 0.95);
                    beam.lineBetween(t.x + 25, t.y + 12, victim.sprite.x, victim.sprite.y);

                    this.tweens.add({
                        targets: beam,
                        alpha: 0,
                        duration: 350,
                        ease: 'Power2.easeOut',
                        onComplete: () => beam.destroy(),
                    });

                    audio.playHazard();
                    this.cameras.main.shake(180, 0.006);

                    // Shield check
                    if (victim.hasShield) {
                        victim.hasShield = false;
                        this.showFloatingText(victim.sprite.x, victim.sprite.y - 25, 'SHIELD SAVED FROM TURRET!', '#67e8f9');
                        this.events.emit('hudMessage', `🛡️ ${victim.name}'s Shield absorbed ${turret.name} blast from ${owner.name}!`);
                        this.updateInfoPanel();
                        return;
                    }

                    // Apply damage
                    const dmg = turret.damage;
                    victim.hp = Math.max(0, victim.hp - dmg);

                    if (turret.energyDrain) {
                        victim.energy = Math.max(0, victim.energy - turret.energyDrain);
                    }

                    if (turret.goldBurn && victim.gold > 0) {
                        const burned = Math.round(victim.gold * turret.goldBurn);
                        victim.gold = Math.max(0, victim.gold - burned);
                        owner.gold += burned;
                    }

                    this.showFloatingText(victim.sprite.x, victim.sprite.y - 25, `🎯 ${turret.name.toUpperCase()}! -${dmg}HP`, '#e74c3c');
                    this.events.emit('hudMessage', `🔫 ${owner.name}'s ${turret.name} blasted ${victim.name} (-${dmg} HP)!`);

                    // Check Knockout / Elimination
                    if (victim.hp <= 0) {
                        if (this.gameMode === 'elimination') {
                            victim.isEliminated = true;
                            victim.sprite.setAlpha(0.25);
                            if (victim.avatarSprite) victim.avatarSprite.setAlpha(0.25);
                            this.showFloatingText(victim.sprite.x, victim.sprite.y - 35, '💀 ELIMINATED!', '#e74c3c');
                            this.events.emit('hudMessage', `💀 ${victim.name} was ELIMINATED by ${owner.name}'s turret!`);
                            this.checkWinConditions();
                        } else {
                            victim.isKnockedOut = true;
                            victim.hp = 600;
                            this.showFloatingText(victim.sprite.x, victim.sprite.y - 35, '💀 KNOCKED OUT!', '#e74c3c');
                            this.events.emit('hudMessage', `💀 ${victim.name} was KNOCKED OUT by ${owner.name}'s turret!`);
                        }
                    }

                    this.updateInfoPanel();
                }
            }
        });
    }

    installTurretOnTile(tile, turretType, player) {
        player.gold -= turretType.cost;
        tile.turret = {
            id: turretType.id,
            type: turretType,
            owner: player.id,
        };

        if (this.turretSprites[tile.id]) {
            this.turretSprites[tile.id].destroy();
        }

        const container = this.add.container(tile.x + 38, tile.y + 12).setDepth(7);
        const ring = this.add.circle(0, 0, 11, player.color, 0.4);
        ring.setStrokeStyle(1.5, player.color, 0.9);

        let iconEl;
        const imgKey = turretType.iconKey || `turret_${turretType.id}`;
        if (this.textures.exists(imgKey)) {
            iconEl = this.add.image(0, 0, imgKey).setDisplaySize(18, 18);
        } else {
            iconEl = this.add.text(0, 0, turretType.icon, { fontSize: '12px' }).setOrigin(0.5);
        }
        container.add([ring, iconEl]);
        this.turretSprites[tile.id] = container;

        this.tweens.add({
            targets: ring,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0.2,
            duration: 900,
            yoyo: true,
            repeat: -1,
        });

        audio.playClick();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, `${turretType.name} Installed!`, '#f0c040');
        this.events.emit('hudMessage', `🔫 ${player.name} deployed ${turretType.name} on ${tile.name}!`);
        this.updateInfoPanel();
    }

    // ═══════════════════════════════════════
    // TILE LANDING & ACTION RESOLUTION
    // ═══════════════════════════════════════

    onLandOnTile() {
        this.gameState = GAME_STATE.LANDING;
        const cp = this.players[this.currentPlayer];
        const tile = this.boardData[cp.tileIndex];

        // Animate tile bounce
        const tileSprite = this.tileSprites[cp.tileIndex];
        this.tweens.add({
            targets: tileSprite,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 180,
            yoyo: true,
            ease: 'Back.easeOut',
        });

        // Dispatch tile handler
        switch (tile.type) {
            case TILE_TYPE.PROPERTY:
                this.handlePropertyTile(cp, tile);
                break;
            case TILE_TYPE.SHOP:
                this.handleShopTile(cp, tile);
                break;
            case TILE_TYPE.EVENT:
                this.handleEventTile(cp, tile);
                break;
            case TILE_TYPE.DANGER:
                this.handleDangerTile(cp, tile);
                break;
            case TILE_TYPE.HEAL:
                this.handleHealTile(cp, tile);
                break;
            case TILE_TYPE.WEAPON:
                this.handleWeaponTile(cp, tile);
                break;
            case TILE_TYPE.TRAP:
                this.handleTrapTile(cp, tile);
                break;
            case TILE_TYPE.AIRPORT:
                this.handleAirportTile(cp, tile);
                break;
            case TILE_TYPE.HARBOR:
                this.handleHarborTile(cp, tile);
                break;
            case TILE_TYPE.TRAIN:
                this.handleTrainTile(cp, tile);
                break;
            case TILE_TYPE.TUNNEL:
                this.handleTunnelTile(cp, tile);
                break;
            case TILE_TYPE.BLACK_MARKET:
                this.handleBlackMarketTile(cp, tile);
                break;
            case TILE_TYPE.PRESSURE_PLATE:
                this.handlePressurePlateTile(cp, tile);
                break;
            case TILE_TYPE.SPRING_PAD:
                this.handleSpringPadTile(cp, tile);
                break;
            case TILE_TYPE.SECRET_HATCH:
                this.handleSecretHatchTile(cp, tile);
                break;
            default:
                this.postTileLandingCheck(cp);
                break;
        }

        this.updateInfoPanel();
    }

    closeActiveBoardModal() {
        if (this.activeBoardModal) {
            this.activeBoardModal.destroy();
            this.activeBoardModal = null;
        }
    }

    postTileLandingCheck(player) {
        // Check win conditions first
        if (this.checkWinConditions()) return;

        // Check if an opponent is on this tile or adjacent tile for automatic PvP attack
        if (player.isBot) {
            const target = this.getNearbyOpponent(player);
            if (target && Math.random() > 0.4) {
                this.time.delayedCall(400, () => {
                    this.executeAttack(player, target);
                    this.time.delayedCall(1200, () => this.endTurn());
                });
                return;
            }
        }
        this.endTurn();
    }

    // ── Tile Handlers ──

    handlePressurePlateTile(player, tile) {
        audio.playClick();
        const tileSprite = this.tileSprites[tile.id];
        if (tileSprite) {
            this.tweens.add({ targets: tileSprite, scaleX: 0.85, scaleY: 0.85, duration: 120, yoyo: true });
        }

        if (tile.biome === 'firelands') {
            const bonus = 2000;
            player.gold += bonus;
            player.energy = Math.min(player.maxEnergy, player.energy + 150);
            audio.playCash();
            this.cameras.main.shake(200, 0.007);
            this.showFloatingText(player.sprite.x, player.sprite.y - 20, `🌋 MAGMA CACHE! +$${bonus.toLocaleString()} +150⚡`, '#f97316');
            this.events.emit('hudMessage', `🌋 ${player.name} triggered Geothermal Pressure Plate (+$${bonus.toLocaleString()}, +150⚡)!`);
        } else {
            // Swamp cleansing filtration
            player.hp = Math.min(player.maxHp, player.hp + 400);
            player.hasShield = true;
            audio.playHeal();
            this.showFloatingText(player.sprite.x, player.sprite.y - 20, `🧪 SWAMP PURIFICATION! +400HP +SHIELD`, '#2ecc71');
            this.events.emit('hudMessage', `🧪 ${player.name} activated Swamp Cleansing Plate (+400 HP & Shield)!`);
        }
        this.time.delayedCall(1200, () => this.postTileLandingCheck(player));
    }

    handleSpringPadTile(player, tile) {
        audio.playStep();
        const targetIndex = (player.tileIndex + 5) % this.boardData.length;
        const targetTile = this.boardData[targetIndex];
        const offset = this.getPlayerOffset(player.id);

        this.showFloatingText(player.sprite.x, player.sprite.y - 25, '🚀 SPRINGBOARD CATAPULT! +5 TILES!', '#06b6d4');
        this.events.emit('hudMessage', `🚀 ${player.name} launched forward 5 tiles via Springboard Launchpad!`);

        const targets = [player.sprite, player.label];
        if (player.avatarSprite) targets.push(player.avatarSprite);

        this.tweens.add({
            targets,
            x: targetTile.x + 25 + offset.x,
            y: targetTile.y + 25 + offset.y - 50,
            scaleX: 1.45,
            scaleY: 1.45,
            duration: 380,
            ease: 'Power2.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets,
                    y: targetTile.y + 25 + offset.y,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 350,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        player.tileIndex = targetIndex;
                        this.cameras.main.shake(180, 0.007);
                        audio.playHazard();
                        this.time.delayedCall(500, () => this.onLandOnTile());
                    }
                });
            }
        });
    }

    handleSecretHatchTile(player, tile) {
        audio.playCash();
        player.gold += 3000;
        player.stars += 1;
        const cardKeys = Object.keys(POWER_CARDS);
        const freeCard = POWER_CARDS[cardKeys[Math.floor(Math.random() * cardKeys.length)]];
        player.powerCards.push(freeCard);

        this.showFloatingText(player.sprite.x, player.sprite.y - 20, '🔒 SECRET VAULT! +$3,000 +1⭐ +1 CARD!', '#d97706');
        this.events.emit('hudMessage', `🔒 ${player.name} unlocked Imperial Secret Vault (+$3,000, +1⭐, ${freeCard.name})!`);
        this.time.delayedCall(1300, () => this.postTileLandingCheck(player));
    }

    handlePropertyTile(player, tile) {
        if (tile.owner === null) {
            const cost = 2500;
            if (!player.isBot) {
                this.showPropertyBuyModal(player, tile, cost);
                return;
            }

            if (player.gold >= cost) {
                player.gold -= cost;
                tile.owner = player.id;
                tile.propertyLevel = 1;
                player.properties.push(tile.id);
                audio.playCash();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Acquired! -$${cost.toLocaleString()}`, '#3498db');
                this.updatePropertyBadge(tile, player);
                this.events.emit('hudMessage', `🏠 ${player.name} bought ${tile.name}!`);
            } else {
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Not enough funds!', '#e74c3c');
            }
        } else if (tile.owner === player.id) {
            if (!player.isBot) {
                this.showPropertyUpgradeModal(player, tile);
                return;
            }

            // Bot decision: install turret if rich, else upgrade
            if (player.gold >= 4000 && !tile.turret) {
                this.installTurretOnTile(tile, TURRET_TYPES.TESLA, player);
            } else if (tile.propertyLevel < 3 && player.gold >= 2000) {
                player.gold -= 2000;
                tile.propertyLevel++;
                audio.playCash();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Upgraded Lv ${tile.propertyLevel}! -$2,000`, '#f0c040');
                this.updatePropertyBadge(tile, player);
                this.events.emit('hudMessage', `⭐ ${player.name} upgraded ${tile.name} to Lv ${tile.propertyLevel}!`);
            } else {
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Your domain!', '#2ecc71');
            }
        } else {
            const rent = 350 * tile.propertyLevel;
            player.gold = Math.max(0, player.gold - rent);
            this.players[tile.owner].gold += rent;
            audio.playHazard();
            this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Rent -$${rent}`, '#e74c3c');
            this.events.emit('hudMessage', `💸 ${player.name} paid $${rent} rent to ${this.players[tile.owner].name}`);
        }
        this.time.delayedCall(1100, () => this.postTileLandingCheck(player));
    }

    showPropertyBuyModal(player, tile, cost) {
        this.closeActiveBoardModal();
        const { width, height } = this.cameras.main;
        const modal = this.add.container(width / 2, height / 2).setDepth(150);
        this.activeBoardModal = modal;

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setInteractive();
        modal.add(backdrop);

        const frameW = 420;
        const frameH = 220;
        const bg = this.add.graphics();
        bg.fillStyle(0x0e0e1e, 0.96);
        bg.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        bg.lineStyle(2, 0x3498db, 0.9);
        bg.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        modal.add(bg);

        modal.add(this.add.text(0, -frameH / 2 + 25, `ACQUIRE PROPERTY`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#3498db',
            letterSpacing: 2,
        }).setOrigin(0.5));

        modal.add(this.add.text(0, -frameH / 2 + 55, `${tile.name} • Rent Income: $350 / turn`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#ffffff',
        }).setOrigin(0.5));

        modal.add(this.add.text(0, -frameH / 2 + 80, `Price: $${cost.toLocaleString()}  •  Your Gold: $${player.gold.toLocaleString()}`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#f0c040',
        }).setOrigin(0.5));

        const canAfford = player.gold >= cost;

        // Buy Button
        const buyBtn = this.add.graphics();
        buyBtn.fillStyle(canAfford ? 0x2563eb : 0x1f2937, 0.95);
        buyBtn.fillRoundedRect(-140, 15, 130, 42, 8);
        buyBtn.lineStyle(1.5, canAfford ? 0x60a5fa : 0x4b5563, 0.85);
        buyBtn.strokeRoundedRect(-140, 15, 130, 42, 8);

        const buyText = this.add.text(-75, 36, canAfford ? '🛒 BUY NOW' : 'TOO POOR', {
            fontFamily: 'Cinzel, serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: canAfford ? '#ffffff' : '#9ca3af',
        }).setOrigin(0.5);

        if (canAfford) {
            const buyHit = this.add.rectangle(-75, 36, 130, 42, 0xffffff, 0).setInteractive({ useHandCursor: true });
            buyHit.on('pointerdown', () => {
                this.closeActiveBoardModal();
                player.gold -= cost;
                tile.owner = player.id;
                tile.propertyLevel = 1;
                player.properties.push(tile.id);
                audio.playCash();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Acquired! -$${cost.toLocaleString()}`, '#3498db');
                this.updatePropertyBadge(tile, player);
                this.events.emit('hudMessage', `🏠 ${player.name} bought ${tile.name}!`);
                this.time.delayedCall(700, () => this.postTileLandingCheck(player));
            });
            modal.add(buyHit);
        }

        // Pass Button
        const passBtn = this.add.graphics();
        passBtn.fillStyle(0x1f2430, 0.95);
        passBtn.fillRoundedRect(10, 15, 130, 42, 8);
        passBtn.lineStyle(1.5, 0x64748b, 0.7);
        passBtn.strokeRoundedRect(10, 15, 130, 42, 8);

        const passText = this.add.text(75, 36, 'PASS', {
            fontFamily: 'Cinzel, serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#94a3b8',
        }).setOrigin(0.5);

        const passHit = this.add.rectangle(75, 36, 130, 42, 0xffffff, 0).setInteractive({ useHandCursor: true });
        passHit.on('pointerdown', () => {
            this.closeActiveBoardModal();
            audio.playClick();
            this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Passed on property', '#888');
            this.time.delayedCall(500, () => this.postTileLandingCheck(player));
        });

        modal.add([buyBtn, buyText, passBtn, passText, passHit]);
    }

    showPropertyUpgradeModal(player, tile) {
        this.closeActiveBoardModal();
        const { width, height } = this.cameras.main;
        const modal = this.add.container(width / 2, height / 2).setDepth(150);
        this.activeBoardModal = modal;

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setInteractive();
        modal.add(backdrop);

        const frameW = 540;
        const frameH = 290;
        const bg = this.add.graphics();
        bg.fillStyle(0x0e0e1e, 0.98);
        bg.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        bg.lineStyle(2, 0xf0c040, 0.85);
        bg.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        modal.add(bg);

        modal.add(this.add.text(0, -frameH / 2 + 25, `PROPERTY & DEFENSE WORKSHOP`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#f0c040',
            letterSpacing: 2,
        }).setOrigin(0.5));

        const turretStatus = tile.turret ? `Installed: ${tile.turret.type.name}` : 'No Defense Installed';
        modal.add(this.add.text(0, -frameH / 2 + 50, `${tile.name} (Lv ${tile.propertyLevel}) • ${turretStatus} • Cash: $${player.gold.toLocaleString()}`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#8888aa',
        }).setOrigin(0.5));

        // Upgrade Building Option (if < 3)
        const upCost = 2000;
        const canUpgrade = tile.propertyLevel < 3 && player.gold >= upCost;
        const upBtn = this.add.graphics();
        upBtn.fillStyle(canUpgrade ? 0x1e3a5f : 0x151b26, 0.95);
        upBtn.fillRoundedRect(-frameW / 2 + 20, -55, 155, 115, 8);
        upBtn.lineStyle(1.5, canUpgrade ? 0x38bdf8 : 0x334155, 0.8);
        upBtn.strokeRoundedRect(-frameW / 2 + 20, -55, 155, 115, 8);

        modal.add(upBtn);
        modal.add(this.add.text(-frameW / 2 + 97, -35, '⭐ UPGRADE LEVEL', { fontFamily: 'Cinzel, serif', fontSize: '11px', fontStyle: 'bold', color: canUpgrade ? '#38bdf8' : '#64748b' }).setOrigin(0.5));
        modal.add(this.add.text(-frameW / 2 + 97, -10, tile.propertyLevel < 3 ? `Upgrade to Lv ${tile.propertyLevel + 1}\nRent: $${(tile.propertyLevel + 1) * 350}/turn\nCost: $${upCost}` : 'MAX LEVEL (Lv 3)\nFully upgraded!', { fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#cbd5e1', align: 'center' }).setOrigin(0.5));

        if (canUpgrade) {
            const upHit = this.add.rectangle(-frameW / 2 + 97, 2, 155, 115, 0xffffff, 0).setInteractive({ useHandCursor: true });
            upHit.on('pointerdown', () => {
                this.closeActiveBoardModal();
                player.gold -= upCost;
                tile.propertyLevel++;
                audio.playCash();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Upgraded Lv ${tile.propertyLevel}!`, '#f0c040');
                this.updatePropertyBadge(tile, player);
                this.events.emit('hudMessage', `⭐ ${player.name} upgraded ${tile.name} to Lv ${tile.propertyLevel}!`);
                this.time.delayedCall(700, () => this.postTileLandingCheck(player));
            });
            modal.add(upHit);
        }

        // Turret Options: Gatling ($1,500), Tesla ($2,200), Flame ($2,800)
        const turrets = [TURRET_TYPES.GATLING, TURRET_TYPES.TESLA, TURRET_TYPES.FLAME];
        const cardW = 105;
        turrets.forEach((tType, idx) => {
            const tx = -frameW / 2 + 195 + idx * (cardW + 10);
            const canAfford = player.gold >= tType.cost;
            const tBg = this.add.graphics();
            tBg.fillStyle(canAfford ? 0x2a1b1b : 0x181216, 0.95);
            tBg.fillRoundedRect(tx, -55, cardW, 115, 8);
            tBg.lineStyle(1.5, canAfford ? 0xe74c3c : 0x473335, 0.8);
            tBg.strokeRoundedRect(tx, -55, cardW, 115, 8);
            modal.add(tBg);

            modal.add(this.add.text(tx + cardW / 2, -38, `${tType.icon} ${tType.name.split(' ')[0]}`, { fontFamily: 'Inter, sans-serif', fontSize: '10px', fontStyle: 'bold', color: canAfford ? '#ffffff' : '#886666' }).setOrigin(0.5));
            modal.add(this.add.text(tx + cardW / 2, -10, `${tType.damage} DMG\nRange ${tType.range} tile\n$${tType.cost}`, { fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#fca5a5', align: 'center' }).setOrigin(0.5));

            if (canAfford) {
                const installBtn = this.add.graphics();
                installBtn.fillStyle(0xcc2222, 1);
                installBtn.fillRoundedRect(tx + 12, 28, cardW - 24, 22, 5);
                const installTxt = this.add.text(tx + cardW / 2, 39, 'INSTALL', { fontFamily: 'Cinzel, serif', fontSize: '9px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
                const tHit = this.add.rectangle(tx + cardW / 2, 39, cardW - 24, 22, 0xffffff, 0).setInteractive({ useHandCursor: true });

                tHit.on('pointerdown', () => {
                    this.closeActiveBoardModal();
                    this.installTurretOnTile(tile, tType, player);
                    this.time.delayedCall(700, () => this.postTileLandingCheck(player));
                });
                modal.add([installBtn, installTxt, tHit]);
            }
        });

        // Done / Close Button
        const doneBtn = this.add.graphics();
        doneBtn.fillStyle(0x1f2430, 0.95);
        doneBtn.fillRoundedRect(-70, 95, 140, 32, 6);
        doneBtn.lineStyle(1.5, 0xf0c040, 0.6);
        doneBtn.strokeRoundedRect(-70, 95, 140, 32, 6);

        const doneText = this.add.text(0, 111, 'CLOSE WORKSHOP', { fontFamily: 'Cinzel, serif', fontSize: '11px', fontStyle: 'bold', color: '#f0c040' }).setOrigin(0.5);
        const doneHit = this.add.rectangle(0, 111, 140, 32, 0xffffff, 0).setInteractive({ useHandCursor: true });
        doneHit.on('pointerdown', () => {
            this.closeActiveBoardModal();
            audio.playClick();
            this.time.delayedCall(400, () => this.postTileLandingCheck(player));
        });

        modal.add([doneBtn, doneText, doneHit]);
    }

    handleShopTile(player, tile) {
        if (!player.isBot) {
            this.showShopModal(player, tile);
        } else {
            // Bot AI: purchase elixir if low HP or cardpack if rich
            if (player.hp < player.maxHp * 0.5 && player.gold >= 800) {
                player.gold -= 800;
                player.hp = Math.min(player.maxHp, player.hp + 350);
                audio.playCash();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Health Elixir (-$800)', '#2ecc71');
                this.events.emit('hudMessage', `🛒 ${player.name} bought Health Elixir at Shop!`);
            } else if (player.gold >= 1600 && Math.random() > 0.4) {
                player.gold -= 1600;
                const cardKeys = Object.keys(POWER_CARDS);
                player.powerCards.push(POWER_CARDS[cardKeys[Math.floor(Math.random() * cardKeys.length)]]);
                audio.playCash();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Tactical Card (-$1,600)', '#67e8f9');
                this.events.emit('hudMessage', `🛒 ${player.name} bought a Tactical Card at Shop!`);
            }
            this.time.delayedCall(800, () => this.postTileLandingCheck(player));
        }
    }

    showShopModal(player, tile) {
        this.closeActiveBoardModal();
        const { width, height } = this.cameras.main;
        const modal = this.add.container(width / 2, height / 2).setDepth(150);
        this.activeBoardModal = modal;

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setInteractive();
        modal.add(backdrop);

        const frameW = 480;
        const frameH = 250;
        const bg = this.add.graphics();
        bg.fillStyle(0x0e0e1e, 0.98);
        bg.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        bg.lineStyle(2, 0xf59e0b, 0.85);
        bg.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        modal.add(bg);

        modal.add(this.add.text(0, -frameH / 2 + 25, `🛒 ${tile.name.toUpperCase()}`, {
            fontFamily: 'Cinzel, "Segoe UI Emoji", sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#f59e0b',
            letterSpacing: 2,
        }).setOrigin(0.5));

        modal.add(this.add.text(0, -frameH / 2 + 50, `Select item to purchase • Your Cash: $${player.gold.toLocaleString()}`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#9ca3af',
        }).setOrigin(0.5));

        const shopItems = [
            { id: 'elixir', name: 'Health Elixir', icon: '🧪', cost: 800, desc: 'Restores +350 HP instantly' },
            { id: 'serum', name: 'Adrenaline Pack', icon: '⚡', cost: 1200, desc: 'Restores +200 Energy' },
            { id: 'cardpack', name: 'Tactical Card', icon: '🎴', cost: 1600, desc: 'Draws 1 tactical power card' },
        ];

        const cardW = 125;
        const cardSpacing = 16;
        const totalW = shopItems.length * cardW + (shopItems.length - 1) * cardSpacing;
        const startX = -totalW / 2 + cardW / 2;

        shopItems.forEach((item, idx) => {
            const cx = startX + idx * (cardW + cardSpacing);
            const canAfford = player.gold >= item.cost;

            const cBg = this.add.graphics();
            cBg.fillStyle(canAfford ? 0x1f1f35 : 0x141420, 0.95);
            cBg.fillRoundedRect(cx - cardW / 2, -45, cardW, 110, 8);
            cBg.lineStyle(1.5, canAfford ? 0xf59e0b : 0x47475a, 0.7);
            cBg.strokeRoundedRect(cx - cardW / 2, -45, cardW, 110, 8);
            modal.add(cBg);

            modal.add(this.add.text(cx, -25, item.icon, { fontSize: '22px' }).setOrigin(0.5));
            modal.add(this.add.text(cx, -2, item.name, { fontFamily: 'Inter, sans-serif', fontSize: '10px', fontStyle: 'bold', color: canAfford ? '#ffffff' : '#888899', align: 'center' }).setOrigin(0.5));
            modal.add(this.add.text(cx, 16, item.desc, { fontFamily: 'Inter, sans-serif', fontSize: '8px', color: '#9ca3af', align: 'center', wordWrap: { width: cardW - 12 } }).setOrigin(0.5));
            modal.add(this.add.text(cx, 34, `$${item.cost}`, { fontFamily: 'Inter, sans-serif', fontSize: '10px', fontStyle: 'bold', color: canAfford ? '#f0c040' : '#887755' }).setOrigin(0.5));

            if (canAfford) {
                const buyBtn = this.add.graphics();
                buyBtn.fillStyle(0xf59e0b, 1);
                buyBtn.fillRoundedRect(cx - 38, 46, 76, 20, 4);
                const buyTxt = this.add.text(cx, 56, 'BUY', { fontFamily: 'Cinzel, serif', fontSize: '9px', fontStyle: 'bold', color: '#000000' }).setOrigin(0.5);
                const hit = this.add.rectangle(cx, 56, 76, 20, 0xffffff, 0).setInteractive({ useHandCursor: true });

                hit.on('pointerdown', () => {
                    this.closeActiveBoardModal();
                    player.gold -= item.cost;
                    audio.playCash();

                    if (item.id === 'elixir') player.hp = Math.min(player.maxHp, player.hp + 350);
                    if (item.id === 'serum') player.energy = Math.min(player.maxEnergy, player.energy + 200);
                    if (item.id === 'cardpack') {
                        const cardKeys = Object.keys(POWER_CARDS);
                        player.powerCards.push(POWER_CARDS[cardKeys[Math.floor(Math.random() * cardKeys.length)]]);
                    }

                    this.showFloatingText(player.sprite.x, player.sprite.y - 20, `${item.name} (-$${item.cost})`, '#f39c12');
                    this.events.emit('hudMessage', `🛒 ${player.name} purchased ${item.name} at Shop!`);
                    this.time.delayedCall(700, () => this.postTileLandingCheck(player));
                });
                modal.add([buyBtn, buyTxt, hit]);
            }
        });

        // Leave Button
        const leaveBtn = this.add.graphics();
        leaveBtn.fillStyle(0x181828, 0.95);
        leaveBtn.fillRoundedRect(-60, 85, 120, 28, 6);
        leaveBtn.lineStyle(1.5, 0x64748b, 0.6);
        leaveBtn.strokeRoundedRect(-60, 85, 120, 28, 6);

        const leaveText = this.add.text(0, 99, 'LEAVE SHOP', { fontFamily: 'Cinzel, serif', fontSize: '10px', fontStyle: 'bold', color: '#94a3b8' }).setOrigin(0.5);
        const leaveHit = this.add.rectangle(0, 99, 120, 28, 0xffffff, 0).setInteractive({ useHandCursor: true });
        leaveHit.on('pointerdown', () => {
            this.closeActiveBoardModal();
            audio.playClick();
            this.time.delayedCall(400, () => this.postTileLandingCheck(player));
        });
        modal.add([leaveBtn, leaveText, leaveHit]);
    }

    handleEventTile(player, tile) {
        const events = [
            { text: 'Ancient Relic found! +$3,500', gold: 3500, hp: 0, positive: true },
            { text: 'Tax Audited! -$1,500', gold: -1500, hp: 0, positive: false },
            { text: 'Holy Blessings! +300 HP', gold: 0, hp: 300, positive: true },
            { text: 'Ambush Ambush! -200 HP', gold: 0, hp: -200, positive: false },
            { text: 'Tactical Supply Crate! +1 Card', card: true, positive: true },
            { text: 'Jackpot Lottery! +$5,000 +1⭐', gold: 5000, hp: 0, star: 1, positive: true },
        ];

        const ev = events[Math.floor(Math.random() * events.length)];
        if (ev.gold) player.gold = Math.max(0, player.gold + ev.gold);
        if (ev.hp) player.hp = Math.min(player.maxHp, Math.max(0, player.hp + ev.hp));
        if (ev.star) player.stars += ev.star;
        if (ev.card) {
            const cardKeys = Object.keys(POWER_CARDS);
            player.powerCards.push(POWER_CARDS[cardKeys[Math.floor(Math.random() * cardKeys.length)]]);
        }

        if (ev.positive) audio.playCash();
        else audio.playHazard();

        const color = ev.positive ? '#9b59b6' : '#e74c3c';
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, ev.text, color);
        this.events.emit('hudMessage', `❓ Event: ${player.name} — ${ev.text}`);
        this.time.delayedCall(1200, () => this.postTileLandingCheck(player));
    }

    handleDangerTile(player, tile) {
        let damage = 180 + Math.floor(Math.random() * 200);
        // Fortress Perk: 25% damage reduction
        if (player.character.perkType === 'defense') {
            damage = Math.round(damage * 0.75);
        }

        if (player.hasShield) {
            player.hasShield = false;
            this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'SHIELD BLOCKED HAZARD!', '#67e8f9');
            this.events.emit('hudMessage', `🛡️ ${player.name}'s Aegis Shield blocked hazard!`);
        } else {
            player.hp = Math.max(0, player.hp - damage);
            audio.playHazard();
            this.cameras.main.shake(200, 0.007);
            this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Hazard! -${damage} HP`, '#e74c3c');
            this.events.emit('hudMessage', `⚠️ ${player.name} hit Hazard (-${damage} HP)!`);
        }
        this.time.delayedCall(1100, () => this.postTileLandingCheck(player));
    }

    handleHealTile(player, tile) {
        let heal = 250 + Math.floor(Math.random() * 250);
        if (player.character.perkType === 'regen') {
            heal = Math.round(heal * 1.5);
        }
        player.hp = Math.min(player.maxHp, player.hp + heal);
        player.energy = Math.min(player.maxEnergy, player.energy + 100);
        audio.playHeal();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, `+${heal} HP  +100 ⚡`, '#27ae60');
        this.events.emit('hudMessage', `💚 ${player.name} healed at Spring (+${heal} HP)!`);
        this.time.delayedCall(1100, () => this.postTileLandingCheck(player));
    }

    handleWeaponTile(player, tile) {
        const weaponObj = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
        player.weapons.push(weaponObj.name);
        audio.playClick();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Equipped ${weaponObj.name}! ⚔️`, '#e67e22');
        this.events.emit('hudMessage', `⚔️ ${player.name} equipped ${weaponObj.name} (DMG: ${weaponObj.damage})!`);
        this.time.delayedCall(1100, () => this.postTileLandingCheck(player));
    }

    handleTrapTile(player, tile) {
        if (tile.trap && tile.trap.owner !== player.id) {
            this.triggerMidStepTrap(player, tile);
        } else if (!tile.trap) {
            const trapTypes = Object.values(TRAP_TYPES);
            const chosenTrap = trapTypes[Math.floor(Math.random() * trapTypes.length)];
            const cost = chosenTrap.cost || 800;
            if (player.gold >= cost) {
                player.gold -= cost;
                this.armTrapOnTile(tile.id, chosenTrap, player);
            } else {
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Safe ground', '#888');
            }
        }
        this.time.delayedCall(1100, () => this.postTileLandingCheck(player));
    }

    canPlantTrap() {
        const cp = this.players[this.currentPlayer];
        return cp && !cp.isBot && this.gameState === GAME_STATE.WAITING && cp.gold >= 600;
    }

    playerPlantTrap(trapType) {
        const cp = this.players[this.currentPlayer];
        if (!cp || cp.gold < trapType.cost) return;
        cp.gold -= trapType.cost;
        this.armTrapOnTile(cp.tileIndex, trapType, cp);
        if (this.isOnlineMatch && cp.id === 0) {
            network.sendTrap(cp.tileIndex, trapType);
        }
        this.updateInfoPanel();
    }

    handleAirportTile(player, tile) {
        const targetIndex = (player.tileIndex + 16) % this.boardData.length;
        const targetTile = this.boardData[targetIndex];
        const offset = this.getPlayerOffset(player.id);

        audio.playStep();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Cross-World Flight! ✈️', '#2980b9');
        this.events.emit('hudMessage', `✈️ ${player.name} flew via Airport across to tile ${targetIndex}!`);

        const targets = [player.sprite, player.label];
        if (player.avatarSprite) targets.push(player.avatarSprite);

        this.tweens.add({
            targets,
            x: targetTile.x + 25 + offset.x,
            y: targetTile.y + 25 + offset.y,
            duration: 800,
            ease: 'Power3.easeInOut',
            onComplete: () => {
                player.tileIndex = targetIndex;
                this.time.delayedCall(600, () => this.postTileLandingCheck(player));
            },
        });
    }

    handleHarborTile(player, tile) {
        const profit = 1500;
        player.gold += profit;
        audio.playCash();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, `Trade Cargo! +$${profit}`, '#1abc9c');
        this.events.emit('hudMessage', `⚓ ${player.name} docked at Harbor (+$${profit} Cargo)!`);
        this.time.delayedCall(1100, () => this.postTileLandingCheck(player));
    }

    handleTrainTile(player, tile) {
        const targetIndex = (player.tileIndex + 4) % this.boardData.length;
        const targetTile = this.boardData[targetIndex];
        const offset = this.getPlayerOffset(player.id);

        audio.playStep();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Express Train! +4 Tiles 🚂', '#d4881a');
        this.events.emit('hudMessage', `🚂 ${player.name} rode Express Train forward 4 tiles!`);

        const targets = [player.sprite, player.label];
        if (player.avatarSprite) targets.push(player.avatarSprite);

        this.tweens.add({
            targets,
            x: targetTile.x + 25 + offset.x,
            y: targetTile.y + 25 + offset.y,
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => {
                player.tileIndex = targetIndex;
                this.time.delayedCall(600, () => this.postTileLandingCheck(player));
            },
        });
    }

    handleTunnelTile(player, tile) {
        const warpIndex = (player.tileIndex + 10) % this.boardData.length;
        const targetTile = this.boardData[warpIndex];
        const offset = this.getPlayerOffset(player.id);

        audio.playStep();
        this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Secret Tunnel! 🕳️', '#7f8c8d');
        this.events.emit('hudMessage', `🕳️ ${player.name} traversed Secret Tunnel!`);

        const targets = [player.sprite, player.label];
        if (player.avatarSprite) targets.push(player.avatarSprite);

        this.tweens.add({
            targets,
            x: targetTile.x + 25 + offset.x,
            y: targetTile.y + 25 + offset.y,
            duration: 600,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                player.tileIndex = warpIndex;
                this.time.delayedCall(600, () => this.postTileLandingCheck(player));
            },
        });
    }

    handleBlackMarketTile(player, tile) {
        if (!player.isBot) {
            this.showBlackMarketModal(player, tile);
            return;
        }

        if (player.gold >= 2000) {
            player.gold -= 2000;
            const lucky = Math.random() > 0.35;
            if (lucky) {
                player.gold += 5000;
                player.stars += 1;
                audio.playCash();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Smugglers Deal! +$5,000 +1⭐', '#2ecc71');
                this.events.emit('hudMessage', `🏴 ${player.name} scored big on Black Market!`);
            } else {
                audio.playHazard();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Raided! -$2,000 lost', '#e74c3c');
                this.events.emit('hudMessage', `🏴 Black Market raid: ${player.name} lost $2,000!`);
            }
        } else {
            this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Need more cash for contraband', '#888');
        }
        this.time.delayedCall(1100, () => this.postTileLandingCheck(player));
    }

    showBlackMarketModal(player, tile) {
        this.closeActiveBoardModal();
        const { width, height } = this.cameras.main;
        const modal = this.add.container(width / 2, height / 2).setDepth(150);
        this.activeBoardModal = modal;

        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setInteractive();
        modal.add(backdrop);

        const frameW = 500;
        const frameH = 260;
        const bg = this.add.graphics();
        bg.fillStyle(0x0c0c16, 0.98);
        bg.fillRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        bg.lineStyle(2, 0xa855f7, 0.85);
        bg.strokeRoundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 16);
        modal.add(bg);

        modal.add(this.add.text(0, -frameH / 2 + 25, `🏴 BLACK MARKET CONTRABAND`, {
            fontFamily: 'Cinzel, "Segoe UI Emoji", sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#a855f7',
            letterSpacing: 2,
        }).setOrigin(0.5));

        modal.add(this.add.text(0, -frameH / 2 + 50, `High risk, illegal wares • Cash: $${player.gold.toLocaleString()}`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#8888aa',
        }).setOrigin(0.5));

        const deals = [
            { id: 'star_gamble', name: 'Smuggler Star Gamble', icon: '⭐', cost: 2000, desc: '65% chance for +$5k & +1 Star (35% raid loss)' },
            { id: 'shield_armor', name: 'Aegis Shield Plate', icon: '🛡️', cost: 1800, desc: 'Equips Aegis Shield + restores 300 HP' },
            { id: 'emp_device', name: 'EMP Shock Weapon', icon: '⚡', cost: 2200, desc: 'Wipes rivals\' energy & equips EMP Grid trap' },
        ];

        const cardW = 135;
        const cardSpacing = 14;
        const totalW = deals.length * cardW + (deals.length - 1) * cardSpacing;
        const startX = -totalW / 2 + cardW / 2;

        deals.forEach((deal, idx) => {
            const cx = startX + idx * (cardW + cardSpacing);
            const canAfford = player.gold >= deal.cost;

            const cBg = this.add.graphics();
            cBg.fillStyle(canAfford ? 0x1f162c : 0x14101c, 0.95);
            cBg.fillRoundedRect(cx - cardW / 2, -45, cardW, 115, 8);
            cBg.lineStyle(1.5, canAfford ? 0xc084fc : 0x473355, 0.7);
            cBg.strokeRoundedRect(cx - cardW / 2, -45, cardW, 115, 8);
            modal.add(cBg);

            modal.add(this.add.text(cx, -25, deal.icon, { fontSize: '22px' }).setOrigin(0.5));
            modal.add(this.add.text(cx, -2, deal.name, { fontFamily: 'Inter, sans-serif', fontSize: '10px', fontStyle: 'bold', color: canAfford ? '#ffffff' : '#887799', align: 'center', wordWrap: { width: cardW - 10 } }).setOrigin(0.5));
            modal.add(this.add.text(cx, 18, deal.desc, { fontFamily: 'Inter, sans-serif', fontSize: '8px', color: '#9ca3af', align: 'center', wordWrap: { width: cardW - 12 } }).setOrigin(0.5));
            modal.add(this.add.text(cx, 38, `$${deal.cost}`, { fontFamily: 'Inter, sans-serif', fontSize: '10px', fontStyle: 'bold', color: canAfford ? '#f0c040' : '#887755' }).setOrigin(0.5));

            if (canAfford) {
                const dealBtn = this.add.graphics();
                dealBtn.fillStyle(0x9333ea, 1);
                dealBtn.fillRoundedRect(cx - 38, 50, 76, 20, 4);
                const dealTxt = this.add.text(cx, 60, 'DEAL', { fontFamily: 'Cinzel, serif', fontSize: '9px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
                const hit = this.add.rectangle(cx, 60, 76, 20, 0xffffff, 0).setInteractive({ useHandCursor: true });

                hit.on('pointerdown', () => {
                    this.closeActiveBoardModal();
                    player.gold -= deal.cost;

                    if (deal.id === 'star_gamble') {
                        const win = Math.random() > 0.35;
                        if (win) {
                            player.gold += 5000;
                            player.stars += 1;
                            audio.playCash();
                            this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Smugglers Deal! +$5,000 +1⭐', '#2ecc71');
                            this.events.emit('hudMessage', `🏴 ${player.name} scored big on Black Market (+1⭐, +$5,000)!`);
                        } else {
                            audio.playHazard();
                            this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Raided! -$2,000 lost', '#e74c3c');
                            this.events.emit('hudMessage', `🏴 Black Market raid: ${player.name} lost $2,000!`);
                        }
                    } else if (deal.id === 'shield_armor') {
                        player.hasShield = true;
                        player.hp = Math.min(player.maxHp, player.hp + 300);
                        audio.playHeal();
                        this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'Aegis Shield & +300 HP!', '#67e8f9');
                        this.events.emit('hudMessage', `🏴 ${player.name} bought illegal Aegis Armor Plate!`);
                    } else if (deal.id === 'emp_device') {
                        audio.playHazard();
                        this.players.forEach(p => {
                            if (p.id !== player.id) p.energy = Math.max(0, p.energy - 150);
                        });
                        this.armTrapOnTile(player.tileIndex, TRAP_TYPES.EMP_GRID, player);
                        this.showFloatingText(player.sprite.x, player.sprite.y - 20, 'EMP Grid Deployed!', '#a855f7');
                        this.events.emit('hudMessage', `🏴 ${player.name} unleashed Black Market EMP Shock!`);
                    }

                    this.time.delayedCall(800, () => this.postTileLandingCheck(player));
                });
                modal.add([dealBtn, dealTxt, hit]);
            }
        });

        // Leave Button
        const leaveBtn = this.add.graphics();
        leaveBtn.fillStyle(0x181828, 0.95);
        leaveBtn.fillRoundedRect(-60, 92, 120, 28, 6);
        leaveBtn.lineStyle(1.5, 0x64748b, 0.6);
        leaveBtn.strokeRoundedRect(-60, 92, 120, 28, 6);

        const leaveText = this.add.text(0, 106, 'WALK AWAY', { fontFamily: 'Cinzel, serif', fontSize: '10px', fontStyle: 'bold', color: '#94a3b8' }).setOrigin(0.5);
        const leaveHit = this.add.rectangle(0, 106, 120, 28, 0xffffff, 0).setInteractive({ useHandCursor: true });
        leaveHit.on('pointerdown', () => {
            this.closeActiveBoardModal();
            audio.playClick();
            this.time.delayedCall(400, () => this.postTileLandingCheck(player));
        });
        modal.add([leaveBtn, leaveText, leaveHit]);
    }

    // ═══════════════════════════════════════
    // POWER CARDS SYSTEM
    // ═══════════════════════════════════════

    usePowerCard(playerId, cardIndex) {
        const player = this.players[playerId];
        if (!player || !player.powerCards || !player.powerCards[cardIndex]) return;

        const card = player.powerCards.splice(cardIndex, 1)[0];
        audio.playClick();

        switch (card.id) {
            case 'speed_surge':
                player.movesRemaining = (player.movesRemaining || 0) + 4;
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, '⚡ SPEED SURGE! +4 Moves', '#f0c040');
                this.events.emit('hudMessage', `⚡ ${player.name} activated Speed Surge!`);
                if (this.gameState === GAME_STATE.WAITING) {
                    this.diceResult = 4;
                    this.startMoving();
                }
                break;

            case 'aegis_shield':
                player.hasShield = true;
                audio.playHeal();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, '🛡️ AEGIS SHIELD EQUIPPED!', '#67e8f9');
                this.events.emit('hudMessage', `🛡️ ${player.name} raised Aegis Shield!`);
                break;

            case 'proximity_mine':
                const currTile = this.boardData[player.tileIndex];
                currTile.trap = { owner: player.id };
                audio.playHazard();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, '💣 PROXIMITY MINE ARMED!', '#e74c3c');
                this.events.emit('hudMessage', `💣 ${player.name} armed a Proximity Mine on tile ${currTile.id}!`);
                break;

            case 'midas_siphon':
                let richest = this.players.filter(p => p.id !== player.id).sort((a, b) => b.gold - a.gold)[0];
                if (richest && richest.gold > 0) {
                    const stolen = Math.min(richest.gold, 1800);
                    richest.gold -= stolen;
                    player.gold += stolen;
                    audio.playCash();
                    this.showFloatingText(player.sprite.x, player.sprite.y - 20, `🧲 SIPHONED +$${stolen}!`, '#f0c040');
                    this.events.emit('hudMessage', `🧲 ${player.name} siphoned $${stolen} from ${richest.name}!`);
                }
                break;

            case 'warp_jump':
                const warpTarget = (player.tileIndex + 8) % this.boardData.length;
                player.tileIndex = warpTarget;
                const tileObj = this.boardData[warpTarget];
                const off = this.getPlayerOffset(player.id);
                const tgts = [player.sprite, player.label];
                if (player.avatarSprite) tgts.push(player.avatarSprite);

                this.tweens.add({
                    targets: tgts,
                    x: tileObj.x + 25 + off.x,
                    y: tileObj.y + 25 + off.y,
                    duration: 500,
                    ease: 'Power2.easeOut',
                });
                audio.playStep();
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, '🚀 WARP JUMP! +8 TILES', '#9b59b6');
                this.events.emit('hudMessage', `🚀 ${player.name} warp jumped 8 tiles forward!`);
                break;

            case 'double_dice':
                player.doubleDice = true;
                this.showFloatingText(player.sprite.x, player.sprite.y - 20, '🎲 DOUBLE DICE PRIMED!', '#f0c040');
                this.events.emit('hudMessage', `🎲 ${player.name} primed Double Dice for their next roll!`);
                break;
        }

        this.updateInfoPanel();
    }

    // ═══════════════════════════════════════
    // PVP COMBAT SYSTEM (PUMMEL PARTY STYLE)
    // ═══════════════════════════════════════

    getNearbyOpponent(player) {
        return this.players.find(other => {
            if (other.id === player.id || other.isKnockedOut || other.isEliminated) return false;
            const dist = Math.abs(other.tileIndex - player.tileIndex);
            return dist === 0 || dist === 1 || dist === (this.boardData.length - 1);
        });
    }

    canAttack() {
        const cp = this.players[0];
        if (!cp || cp.isKnockedOut || cp.isEliminated) return false;
        return !!this.getNearbyOpponent(cp);
    }

    playerPerformAttack() {
        const attacker = this.players[0];
        const defender = this.getNearbyOpponent(attacker);
        if (defender) {
            this.executeAttack(attacker, defender);
        }
    }

    executeAttack(attacker, defender) {
        let baseDmg = 450;
        if (attacker.character.perkType === 'attack_bonus') {
            baseDmg = Math.round(baseDmg * 1.35);
        }

        if (this.isOnlineMatch && attacker.id === 0) {
            network.sendAttack(defender.id, baseDmg);
        }

        // Check defender shield
        if (defender.hasShield) {
            defender.hasShield = false;
            audio.playHeal();
            this.showFloatingText(defender.sprite.x, defender.sprite.y - 25, '🛡️ ATTACK BLOCKED!', '#67e8f9');
            this.events.emit('hudMessage', `🛡️ ${defender.name}'s Shield completely absorbed ${attacker.name}'s strike!`);
            this.updateInfoPanel();
            return;
        }

        // Deal damage
        defender.hp = Math.max(0, defender.hp - baseDmg);

        // Loot 20% of defender's cash
        const loot = Math.round(defender.gold * 0.20);
        defender.gold -= loot;
        attacker.gold += loot;

        audio.playHazard();
        this.cameras.main.shake(250, 0.009);

        // Attack animation lunge
        this.tweens.add({
            targets: [attacker.sprite, attacker.avatarSprite],
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut',
        });

        this.showFloatingText(defender.sprite.x, defender.sprite.y - 20, `💥 -${baseDmg} HP! (-$${loot})`, '#e74c3c');
        this.showFloatingText(attacker.sprite.x, attacker.sprite.y - 20, `Looted +$${loot}! 💰`, '#f0c040');
        this.events.emit('hudMessage', `⚔️ ${attacker.name} attacked ${defender.name} for ${baseDmg} DMG and looted $${loot}!`);

        // Check Knockout or Elimination
        if (defender.hp <= 0) {
            if (this.gameMode === 'elimination') {
                defender.isEliminated = true;
                defender.sprite.setAlpha(0.25);
                if (defender.avatarSprite) defender.avatarSprite.setAlpha(0.25);
                this.showFloatingText(defender.sprite.x, defender.sprite.y - 35, '💀 ELIMINATED!', '#e74c3c');
                this.events.emit('hudMessage', `💀 ${defender.name} was PERMANENTLY ELIMINATED by ${attacker.name}!`);
                if (this.checkWinConditions()) return;
            } else {
                defender.isKnockedOut = true;
                defender.hp = 600; // revive with 600 HP
                this.showFloatingText(defender.sprite.x, defender.sprite.y - 35, '💀 KNOCKED OUT!', '#e74c3c');
                this.events.emit('hudMessage', `💀 ${defender.name} was KNOCKED OUT by ${attacker.name}!`);
            }
        }

        this.updateInfoPanel();
    }

    triggerEmote(playerId, emote) {
        const player = this.players[playerId];
        if (!player || !player.sprite) return;

        audio.playClick();

        const bubble = this.add.container(player.sprite.x, player.sprite.y - 36).setDepth(45);

        const bW = 100;
        const bH = 34;
        const bg = this.add.graphics();
        bg.fillStyle(0x131326, 0.95);
        bg.fillRoundedRect(-bW / 2, -bH / 2, bW, bH, 8);
        bg.lineStyle(1.5, player.color, 0.85);
        bg.strokeRoundedRect(-bW / 2, -bH / 2, bW, bH, 8);

        // Pointer triangle
        bg.fillStyle(0x131326, 0.95);
        bg.beginPath();
        bg.moveTo(-6, bH / 2);
        bg.lineTo(6, bH / 2);
        bg.lineTo(0, bH / 2 + 6);
        bg.closePath();
        bg.fillPath();

        let iconObj;
        if (emote.iconKey && this.textures.exists(emote.iconKey)) {
            iconObj = this.add.image(-28, 0, emote.iconKey).setDisplaySize(20, 20);
        } else {
            iconObj = this.add.text(-28, 0, emote.icon, { fontSize: '16px' }).setOrigin(0.5);
        }

        const label = this.add.text(4, 0, emote.label, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5);

        bubble.add([bg, iconObj, label]);
        bubble.setScale(0);

        this.tweens.add({
            targets: bubble,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: bubble,
                    y: bubble.y - 15,
                    alpha: 0,
                    duration: 1800,
                    ease: 'Sine.easeOut',
                    onComplete: () => bubble.destroy(),
                });
            }
        });

        this.events.emit('hudMessage', `💬 ${player.name}: ${emote.icon} ${emote.label}`);

        if (this.isOnlineMatch && playerId === 0) {
            network.sendEmote(emote);
        }

        // If human sent emote, chance for random bot to reply after 700ms!
        if (playerId === 0 && this.players.length > 1) {
            this.time.delayedCall(700, () => {
                if (Math.random() > 0.4) {
                    const botIdx = Phaser.Math.Between(1, this.players.length - 1);
                    const emotesList = EMOTES || [{ id: 'gg', icon: '👑', label: 'I Rule!' }];
                    const randomEmote = emotesList[Phaser.Math.Between(0, emotesList.length - 1)];
                    this.triggerEmote(botIdx, randomEmote);
                }
            });
        }
    }

    checkWinConditions() {
        if (this.gameMode === 'star_hunter') {
            const starWinner = this.players.find(p => p.stars >= 3);
            if (starWinner) {
                this.gameOver(starWinner);
                return true;
            }
        } else if (this.gameMode === 'elimination') {
            const alive = this.players.filter(p => !p.isEliminated);
            if (alive.length <= 1) {
                this.gameOver(alive[0] || this.players[0]);
                return true;
            }
        }
        return false;
    }

    // ═══════════════════════════════════════
    // FLOATING TEXT
    // ═══════════════════════════════════════

    showFloatingText(x, y, text, color) {
        const ft = this.add.text(x, y, text, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5).setDepth(40);

        this.tweens.add({
            targets: ft,
            y: y - 40,
            alpha: 0,
            duration: 1500,
            ease: 'Power2.easeOut',
            onComplete: () => ft.destroy(),
        });
    }

    // ═══════════════════════════════════════
    // TURN MANAGEMENT
    // ═══════════════════════════════════════

    endTurn() {
        if (this.checkWinConditions()) return;

        const turnLimit = this.game.registry.get('turnLimit') || 20;

        if (this.currentPlayer === this.playerCount - 1) {
            this.turnNumber++;
            if (this.turnNumber > turnLimit) {
                this.gameOver();
                return;
            }

            // Round-End Event Check
            if (this.turnNumber % 2 === 0) {
                // Round-End Mini-Game!
                this.time.delayedCall(400, () => {
                    this.launchMiniGame();
                });
                return;
            } else if (this.turnNumber % 3 === 0) {
                // Global Disaster Event!
                this.time.delayedCall(400, () => {
                    this.triggerGlobalDisaster();
                });
                return;
            }
        }

        this.proceedToNextTurn();
    }

    proceedToNextTurn() {
        this.currentPlayer = (this.currentPlayer + 1) % this.playerCount;
        this.gameState = GAME_STATE.WAITING;

        const nextPlayer = this.players[this.currentPlayer];
        this.rollLabel.setText(nextPlayer.isBot ? 'BOT' : 'ROLL');
        this.clickPrompt.setVisible(!nextPlayer.isBot);

        this.updateInfoPanel();

        this.time.delayedCall(400, () => {
            this.showTurnBanner();
        });
    }

    launchMiniGame() {
        this.gameState = GAME_STATE.ACTION;
        const gameCatalog = MINI_GAMES || [
            { id: 'coin_rush', name: 'Meteor Coin Rush' },
            { id: 'laser_grid', name: 'Laser Grid Survival' },
            { id: 'bumper_arena', name: 'Bumper KAME Arena' },
        ];
        const roundNum = Math.floor((this.turnNumber - 1) / this.playerCount) + 1;
        const cycleIndex = (roundNum - 1) % gameCatalog.length;
        const selectedGame = gameCatalog[cycleIndex] || gameCatalog[0];

        this.events.emit('hudMessage', `🔥 ROUND ${roundNum} ARENA: Launching ${selectedGame.name}!`);
        this.scene.pause('BoardScene');
        this.scene.launch('MiniGameScene', {
            boardScene: this,
            players: this.players,
            roundNumber: roundNum,
            gameType: selectedGame,
        });
    }

    onMiniGameComplete(winner) {
        this.gameState = GAME_STATE.WAITING;
        this.events.emit('hudMessage', `🏆 Mini-Game: ${winner.name} finished 1st Place!`);
        this.updateInfoPanel();
        this.proceedToNextTurn();
    }

    triggerGlobalDisaster() {
        const disasters = [
            {
                id: 'volcano',
                name: 'VOLCANIC ERUPTION!',
                icon: 'event_volcano',
                desc: 'Firelands erupts! Molten lava deals 300 DMG to players without shield!',
                action: () => {
                    this.cameras.main.shake(400, 0.012);
                    audio.playHazard();
                    this.players.forEach(p => {
                        if (p.hasShield) {
                            p.hasShield = false;
                            this.showFloatingText(p.sprite.x, p.sprite.y - 25, 'SHIELD SAVED!', '#67e8f9');
                        } else {
                            p.hp = Math.max(100, p.hp - 300);
                            this.showFloatingText(p.sprite.x, p.sprite.y - 25, '-300 HP (Lava)', '#e74c3c');
                        }
                    });
                }
            },
            {
                id: 'tornado',
                name: 'CYCLONE TORNADO!',
                icon: 'event_tornado',
                desc: 'A raging cyclone vortex swaps two players across the board!',
                action: () => {
                    this.cameras.main.shake(300, 0.008);
                    audio.playStep();
                    if (this.players.length >= 2) {
                        const p1 = this.players[0];
                        const p2 = this.players[1];
                        const tempIdx = p1.tileIndex;
                        p1.tileIndex = p2.tileIndex;
                        p2.tileIndex = tempIdx;
                        [p1, p2].forEach(p => {
                            const t = this.boardData[p.tileIndex];
                            const off = this.getPlayerOffset(p.id);
                            const tgts = [p.sprite, p.label];
                            if (p.avatarSprite) tgts.push(p.avatarSprite);
                            this.tweens.add({ targets: tgts, x: t.x + 25 + off.x, y: t.y + 25 + off.y, duration: 800, ease: 'Sine.easeInOut' });
                        });
                    }
                }
            },
            {
                id: 'goldrush',
                name: 'GOLD RUSH BONANZA!',
                icon: 'event_goldrush',
                desc: 'Imperial vaults opened! Every tycoon receives +$2,500 gold!',
                action: () => {
                    audio.playCash();
                    this.players.forEach(p => {
                        p.gold += 2500;
                        this.showFloatingText(p.sprite.x, p.sprite.y - 25, '+$2,500 Gold!', '#f0c040');
                    });
                }
            },
            {
                id: 'taxday',
                name: 'TAX COLLECTOR AUDIT!',
                icon: 'event_taxday',
                desc: 'Global financial audit collects 10% gold from all players!',
                action: () => {
                    audio.playHazard();
                    this.players.forEach(p => {
                        const tax = Math.round(p.gold * 0.10);
                        p.gold -= tax;
                        this.showFloatingText(p.sprite.x, p.sprite.y - 25, `-$${tax} Tax`, '#e74c3c');
                    });
                }
            },
            {
                id: 'emp',
                name: 'EMP STORM DETONATION!',
                icon: 'event_emp',
                desc: 'Electric shockwave detonates and neutralizes all armed traps on the board!',
                action: () => {
                    audio.playHazard();
                    this.boardData.forEach(t => { t.trap = null; });
                    this.cameras.main.flash(300, 0, 200, 255);
                }
            },
            {
                id: 'tsunami',
                name: 'TSUNAMI TIDAL WAVE!',
                icon: 'event_tsunami',
                desc: 'Tidal surge washes in supply chests: +1 Tactical Card to everyone!',
                action: () => {
                    audio.playHeal();
                    const cardKeys = Object.keys(POWER_CARDS);
                    this.players.forEach(p => {
                        const c = POWER_CARDS[cardKeys[Math.floor(Math.random() * cardKeys.length)]];
                        p.powerCards.push(c);
                        this.showFloatingText(p.sprite.x, p.sprite.y - 25, '+1 Card 🎴', '#67e8f9');
                    });
                }
            }
        ];

        const disaster = disasters[Math.floor(Math.random() * disasters.length)];
        const { width, height } = this.cameras.main;

        const modal = this.add.container(width / 2, height / 2).setDepth(150);

        const bg = this.add.graphics();
        bg.fillStyle(0x1a0a0a, 0.95);
        bg.fillRoundedRect(-220, -130, 440, 260, 16);
        bg.lineStyle(2, 0xe74c3c, 0.9);
        bg.strokeRoundedRect(-220, -130, 440, 260, 16);
        modal.add(bg);

        modal.add(this.add.text(0, -95, '⚠️ GLOBAL DISASTER ALERT ⚠️', {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#e74c3c',
            letterSpacing: 2,
        }).setOrigin(0.5));

        if (this.textures.exists(disaster.icon)) {
            modal.add(this.add.image(0, -35, disaster.icon).setDisplaySize(80, 80));
        }

        modal.add(this.add.text(0, 25, disaster.name, {
            fontFamily: 'Cinzel, serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5));

        modal.add(this.add.text(0, 60, disaster.desc, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#dddddd',
            align: 'center',
            wordWrap: { width: 380 }
        }).setOrigin(0.5));

        this.events.emit('hudMessage', `⚠️ DISASTER: ${disaster.name}`);

        this.time.delayedCall(2200, () => {
            this.tweens.add({
                targets: modal,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    modal.destroy();
                    disaster.action();
                    this.updateInfoPanel();
                    this.time.delayedCall(1200, () => {
                        this.proceedToNextTurn();
                    });
                }
            });
        });
    }

    gameOver(forcedWinner = null) {
        this.gameState = GAME_STATE.GAME_OVER;
        this.closeActiveBoardModal();
        const { width, height } = this.cameras.main;

        audio.playVictory();

        // Calculate winner
        let winner = forcedWinner;
        if (!winner) {
            winner = this.players[0];
            this.players.forEach(p => {
                const netWorth = p.gold + p.properties.length * 5000 + p.stars * 5000;
                const winnerWorth = winner.gold + winner.properties.length * 5000 + winner.stars * 5000;
                if (netWorth > winnerWorth) winner = p;
            });
        }

        const overlay = this.add.graphics().setDepth(100);
        overlay.fillStyle(0x000000, 0.82);
        overlay.fillRect(0, 0, width, height);

        const container = this.add.container(width / 2, height / 2).setDepth(101);

        const bg = this.add.graphics();
        bg.fillStyle(0x131326, 0.96);
        bg.fillRoundedRect(-270, -140, 540, 280, 20);
        bg.lineStyle(3, 0xf0c040, 0.9);
        bg.strokeRoundedRect(-270, -140, 540, 280, 20);
        container.add(bg);

        // Victory Title by Mode
        let titleText = '🏆 TYCOON CHAMPION 🏆';
        if (this.gameMode === 'star_hunter') {
            titleText = '⭐ STAR HUNTER CHAMPION ⭐';
        } else if (this.gameMode === 'elimination') {
            titleText = '💀 LAST SURVIVOR STANDING 💀';
        }

        container.add(this.add.text(0, -95, titleText, {
            fontFamily: 'Cinzel, serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#f0c040',
            letterSpacing: 2,
        }).setOrigin(0.5));

        container.add(this.add.text(0, -55, `${winner.name} Wins!`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: winner.colorHex || '#f0c040',
        }).setOrigin(0.5));

        let scoreY = -15;
        this.players.forEach((p, i) => {
            const nw = p.gold + p.properties.length * 5000 + p.stars * 5000;
            const statusTag = p.isEliminated ? ' [ELIMINATED]' : '';
            container.add(this.add.text(0, scoreY + i * 22, `${p.name}${statusTag}: $${nw.toLocaleString()} (${p.properties.length} Props, ${p.stars}⭐, ${p.hp} HP)`, {
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                color: p.id === winner.id ? '#f0c040' : (p.isEliminated ? '#e74c3c' : '#8888aa'),
            }).setOrigin(0.5));
        });

        const playAgainText = this.add.text(0, 100, 'Click to Return to Menu', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#f0c040',
        }).setOrigin(0.5);
        container.add(playAgainText);

        this.tweens.add({ targets: playAgainText, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

        this.input.once('pointerdown', () => {
            this.scene.stop('HUDScene');
            this.scene.start('MainMenuScene');
        });
    }
}
