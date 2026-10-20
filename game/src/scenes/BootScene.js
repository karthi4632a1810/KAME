/**
 * BootScene — First scene, sets up loading bar connection
 */
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Nothing heavy to load here
    }

    create() {
        // Set global game settings
        this.game.registry.set('playerCount', 4);
        this.game.registry.set('gameMode', 'richest_wins');
        this.game.registry.set('turnLimit', 20);

        this.scene.start('PreloadScene');
    }
}
