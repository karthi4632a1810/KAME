import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { BoardScene } from './scenes/BoardScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { MiniGameScene } from './scenes/MiniGameScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#0a0a0f',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 800,
            height: 450
        },
        max: {
            width: 1920,
            height: 1080
        }
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [BootScene, PreloadScene, MainMenuScene, BoardScene, HUDScene, MiniGameScene],
    render: {
        pixelArt: false,
        antialias: true,
        antialiasGL: true
    }
};

const game = new Phaser.Game(config);

// Expose game instance for debugging
window.KAME = game;
