/**
 * PreloadScene — Loads real sliced game assets and builds dynamic procedural textures
 */
import Phaser from 'phaser';
import { PLAYER, TILE_COLORS, CHARACTERS } from '../config/GameConfig.js';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        this.updateLoadingBar(10, 'Loading real game assets...');

        // ── Load Real Sliced Game Assets ──
        // Tiles
        this.load.image('tile_straight_real', '/assets/tiles/straight_path.png');
        this.load.image('tile_curved_real', '/assets/tiles/curved_path.png');
        this.load.image('tile_junction_real', '/assets/tiles/split_junction.png');
        this.load.image('tile_ramp_real', '/assets/tiles/ramp.png');
        this.load.image('tile_bridge_real', '/assets/tiles/bridge.png');

        // Category Icons
        this.load.image('icon_property', '/assets/icons/property_1.png');
        this.load.image('icon_shop', '/assets/icons/shop_1.png');
        this.load.image('icon_weapon', '/assets/icons/weapon_1.png');
        this.load.image('icon_danger', '/assets/icons/danger_1.png');
        this.load.image('icon_heal', '/assets/icons/heal_1.png');
        this.load.image('icon_trap', '/assets/icons/trap_1.png');
        this.load.image('icon_airport', '/assets/icons/airport_1.png');
        this.load.image('icon_harbor', '/assets/icons/harbor_1.png');
        this.load.image('icon_train', '/assets/icons/train_1.png');
        this.load.image('icon_blackmarket', '/assets/icons/blackmarket_1.png');

        // Character Mascot Avatars
        for (let i = 1; i <= 6; i++) {
            this.load.image(`char_avatar_${i}`, `/assets/characters/char_${i}.png`);
        }

        // Global Disaster Event Assets
        this.load.image('event_volcano', '/assets/events/disaster_volcano.png');
        this.load.image('event_tornado', '/assets/events/disaster_tornado.png');
        this.load.image('event_meteor', '/assets/events/disaster_meteor.png');
        this.load.image('event_emp', '/assets/events/disaster_emp.png');
        this.load.image('event_goldrush', '/assets/events/disaster_goldrush.png');
        this.load.image('event_taxday', '/assets/events/disaster_taxday.png');
        this.load.image('event_tsunami', '/assets/events/disaster_tsunami.png');

        // Automated Defense Turrets
        this.load.image('turret_gatling', '/assets/turrets/turret_gatling.png');
        this.load.image('turret_tesla', '/assets/turrets/turret_tesla.png');
        this.load.image('turret_mortar', '/assets/turrets/turret_mortar.png');
        this.load.image('turret_flame', '/assets/turrets/turret_flame.png');
        this.load.image('turret_laser', '/assets/turrets/turret_laser.png');
        this.load.image('turret_shield', '/assets/turrets/turret_shield.png');

        // World Mechanics & Devices
        this.load.image('device_pressure_plate', '/assets/world/device_pressure_plate.png');
        this.load.image('device_elevator', '/assets/world/device_elevator.png');
        this.load.image('device_portal', '/assets/world/device_portal.png');
        this.load.image('device_laser_gate', '/assets/world/device_laser_gate.png');
        this.load.image('device_spring_pad', '/assets/world/device_spring_pad.png');
        this.load.image('device_secret_hatch', '/assets/world/device_secret_hatch.png');

        // Cosmetics & Emotes
        this.load.image('emote_crown', '/assets/cosmetics/emote_crown.png');
        this.load.image('emote_fire', '/assets/cosmetics/emote_fire.png');
        this.load.image('emote_skull', '/assets/cosmetics/emote_skull.png');
        this.load.image('emote_trophy', '/assets/cosmetics/emote_trophy.png');
        this.load.image('emote_gg', '/assets/cosmetics/emote_gg.png');
        this.load.image('emote_rage', '/assets/cosmetics/emote_rage.png');
        this.load.image('emote_laugh', '/assets/cosmetics/emote_laugh.png');
        this.load.image('emote_heart', '/assets/cosmetics/emote_heart.png');

        // Progress listener
        this.load.on('progress', (val) => {
            this.updateLoadingBar(Math.round(10 + val * 60), 'Streaming assets...');
        });
    }

    create() {
        this.updateLoadingBar(75, 'Generating tile textures...');
        this.generateTileTextures();

        this.updateLoadingBar(85, 'Building player tokens...');
        this.generatePlayerTokens();

        this.updateLoadingBar(95, 'Building dice textures...');
        this.generateDiceTextures();

        this.updateLoadingBar(100, 'Ready!');

        // Fade out HTML loading screen
        this.time.delayedCall(400, () => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                this.time.delayedCall(600, () => {
                    loadingScreen.remove();
                });
            }
            this.scene.start('MainMenuScene');
        });
    }

    updateLoadingBar(percent, text) {
        const bar = document.getElementById('loading-bar');
        const textEl = document.getElementById('loading-text');
        if (bar) bar.style.width = `${percent}%`;
        if (textEl) textEl.textContent = text;
    }

    /**
     * Generate fallback and base tile textures
     */
    generateTileTextures() {
        const size = 50;

        Object.entries(TILE_COLORS).forEach(([type, color]) => {
            const key = `tile_${type}`;
            const gfx = this.add.graphics();

            // Isometric tile base styling
            gfx.fillStyle(0x18182c, 0.95);
            gfx.fillRoundedRect(0, 0, size, size, 8);

            // Biome accent stripe
            gfx.fillStyle(color, 0.85);
            gfx.fillRoundedRect(3, 3, size - 6, 8, 4);

            // Subtle interior plate
            gfx.fillStyle(0x222238, 0.6);
            gfx.fillRoundedRect(3, 13, size - 6, size - 16, 5);

            // Gold/Metallic rim
            gfx.lineStyle(1.5, 0xf0c040, 0.35);
            gfx.strokeRoundedRect(0, 0, size, size, 8);

            gfx.generateTexture(key, size, size);
            gfx.destroy();
        });

        // Hover highlight
        const hGfx = this.add.graphics();
        hGfx.fillStyle(0xf0c040, 0.25);
        hGfx.fillRoundedRect(0, 0, size + 6, size + 6, 10);
        hGfx.lineStyle(2, 0xf0c040, 0.9);
        hGfx.strokeRoundedRect(0, 0, size + 6, size + 6, 10);
        hGfx.generateTexture('tile_highlight', size + 6, size + 6);
        hGfx.destroy();
    }

    /**
     * Generate player token tokens with colored border rings
     */
    generatePlayerTokens() {
        const size = 32;

        CHARACTERS.forEach((char, index) => {
            const key = `player_token_${index}`;
            const gfx = this.add.graphics();

            // Shadow
            gfx.fillStyle(0x000000, 0.4);
            gfx.fillCircle(size / 2 + 2, size / 2 + 2, size / 2 - 2);

            // Outer colored aura
            gfx.fillStyle(char.color, 0.9);
            gfx.fillCircle(size / 2, size / 2, size / 2 - 2);

            // Inner dark center (for avatar portrait)
            gfx.fillStyle(0x0a0a14, 0.95);
            gfx.fillCircle(size / 2, size / 2, size / 2 - 5);

            // Outer gold border ring
            gfx.lineStyle(2, 0xffffff, 0.8);
            gfx.strokeCircle(size / 2, size / 2, size / 2 - 2);

            gfx.generateTexture(key, size + 4, size + 4);
            gfx.destroy();
        });
    }

    /**
     * Generate dice face textures (1-6)
     */
    generateDiceTextures() {
        const size = 64;

        for (let face = 1; face <= 6; face++) {
            const key = `dice_${face}`;
            const gfx = this.add.graphics();

            // Dark luxury body
            gfx.fillStyle(0x141428, 1);
            gfx.fillRoundedRect(0, 0, size, size, 12);

            // Gold border
            gfx.lineStyle(3, 0xf0c040, 1);
            gfx.strokeRoundedRect(0, 0, size, size, 12);

            // Subtle sheen
            gfx.fillStyle(0xffffff, 0.08);
            gfx.fillRoundedRect(4, 4, size - 8, size / 2 - 2, 8);

            // Pips
            const dotSize = 5.5;
            gfx.fillStyle(0xf0c040, 1);
            const dotPositions = this.getDicePositions(face, size);
            dotPositions.forEach(([dx, dy]) => {
                gfx.fillCircle(dx, dy, dotSize);
            });

            gfx.generateTexture(key, size, size);
            gfx.destroy();
        }
    }

    getDicePositions(face, size) {
        const cx = size / 2, cy = size / 2;
        const off = size * 0.25;
        const positions = {
            1: [[cx, cy]],
            2: [[cx - off, cy - off], [cx + off, cy + off]],
            3: [[cx - off, cy - off], [cx, cy], [cx + off, cy + off]],
            4: [[cx - off, cy - off], [cx + off, cy - off], [cx - off, cy + off], [cx + off, cy + off]],
            5: [[cx - off, cy - off], [cx + off, cy - off], [cx, cy], [cx - off, cy + off], [cx + off, cy + off]],
            6: [[cx - off, cy - off], [cx + off, cy - off], [cx - off, cy], [cx + off, cy], [cx - off, cy + off], [cx + off, cy + off]],
        };
        return positions[face] || [];
    }
}
