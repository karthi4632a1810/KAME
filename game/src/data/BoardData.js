/**
 * KAME Board Layout Data
 * Defines the tile positions, types, and biome assignments for the game board.
 * 
 * Includes 50 tiles:
 * - 40 Outer perimeter loop tiles (0..39) spanning 10 biomes
 * - 2 Split Junctions with interactive branching paths:
 *   - Fork 1 (Tile 6): Outer Highway vs Volcano Sky-Bridge Shortcut (Tiles 40..44 -> merges to 16)
 *   - Fork 2 (Tile 24): Swamp Road vs Mech Subway Tunnel Shortcut (Tiles 45..49 -> merges to 36)
 */

import { TILE_TYPE, BIOME } from '../config/GameConfig.js';

export function generateBoardData() {
    const tiles = [];
    const tileSize = 48;
    const gap = 4;
    const step = tileSize + gap; // 52px

    const cols = 12; // 12 tiles across
    const rows = 8;  // 8 tiles down
    const offsetX = 220;
    const offsetY = 95;

    let id = 0;

    // ── Outer Loop: Top row (left to right): 13 tiles (c = 0..12) ──
    for (let c = 0; c <= cols; c++) {
        tiles.push(createTile(id, offsetX + c * step, offsetY, getBiomeForTile(id)));
        id++;
    }

    // ── Outer Loop: Right column (top to bottom, skip corners): 7 tiles (r = 1..7) ──
    for (let r = 1; r < rows; r++) {
        tiles.push(createTile(id, offsetX + cols * step, offsetY + r * step, getBiomeForTile(id)));
        id++;
    }

    // ── Outer Loop: Bottom row (right to left): 13 tiles (c = 12..0) ──
    for (let c = cols; c >= 0; c--) {
        tiles.push(createTile(id, offsetX + c * step, offsetY + rows * step, getBiomeForTile(id)));
        id++;
    }

    // ── Outer Loop: Left column (bottom to top, skip corners): 7 tiles (r = 7..1) ──
    for (let r = rows - 1; r >= 1; r--) {
        tiles.push(createTile(id, offsetX, offsetY + r * step, getBiomeForTile(id)));
        id++;
    }

    // ── Interior Branch 1: Volcano Ravine Sky-Bridge Shortcut (Tiles 40..44) ──
    // Starts from Junction Tile 6 (c = 6, r = 0), cuts through Firelands center, reconnects at Tile 16 (c = 12, r = 4)
    tiles.push(createTile(40, offsetX + 6 * step, offsetY + 2 * step, BIOME.FIRELANDS));
    tiles.push(createTile(41, offsetX + 7 * step, offsetY + 3 * step, BIOME.FIRELANDS));
    tiles.push(createTile(42, offsetX + 8 * step, offsetY + 4 * step, BIOME.FIRELANDS));
    tiles.push(createTile(43, offsetX + 9 * step, offsetY + 4 * step, BIOME.FIRELANDS));
    tiles.push(createTile(44, offsetX + 11 * step, offsetY + 4 * step, BIOME.PIRATE_COVE));

    // ── Interior Branch 2: Mech Subway Tunnel Shortcut (Tiles 45..49) ──
    // Starts from Junction Tile 24 (c = 8, r = 8), cuts through Mechanical/Sky center, reconnects at Tile 36 (c = 0, r = 4)
    tiles.push(createTile(45, offsetX + 8 * step, offsetY + 6 * step, BIOME.MECHANICAL_WASTES));
    tiles.push(createTile(46, offsetX + 6 * step, offsetY + 5 * step, BIOME.MECHANICAL_WASTES));
    tiles.push(createTile(47, offsetX + 4 * step, offsetY + 5 * step, BIOME.SKY_ARCHIPELAGO));
    tiles.push(createTile(48, offsetX + 2 * step, offsetY + 5 * step, BIOME.SKY_ARCHIPELAGO));
    tiles.push(createTile(49, offsetX + 1 * step, offsetY + 4 * step, BIOME.MECHANICAL_WASTES));

    // Assign tile types, names, and graph connections
    assignTileTypes(tiles);
    buildBoardGraph(tiles);

    return tiles;
}

function createTile(id, x, y, biome) {
    return {
        id,
        x,
        y,
        type: TILE_TYPE.EMPTY,
        biome,
        name: '',
        owner: null,        // player index or null
        propertyLevel: 0,   // 0 = unowned/no property, 1-3 = upgrade level
        trap: null,         // trap data if a trap is placed here
        revealed: true,
        next: [],           // array of destination tile IDs
        isJunction: false,  // true if player chooses direction
        branchNames: [],
        branchDescs: [],
        branchIcons: [],
        isShortcut: id >= 40,
    };
}

function getBiomeForTile(id) {
    if (id <= 3) return BIOME.METROPOLIS;
    if (id <= 7) return BIOME.FROZEN_TUNDRA;
    if (id <= 11) return BIOME.FIRELANDS;
    if (id <= 15) return BIOME.SAND_KINGDOM;
    if (id <= 19) return BIOME.ANCIENT_JUNGLE;
    if (id <= 23) return BIOME.PIRATE_COVE;
    if (id <= 27) return BIOME.DARK_FOREST;
    if (id <= 31) return BIOME.TOXIC_SWAMP;
    if (id <= 35) return BIOME.SKY_ARCHIPELAGO;
    if (id <= 39) return BIOME.MECHANICAL_WASTES;
    if (id <= 44) return BIOME.FIRELANDS;
    return BIOME.MECHANICAL_WASTES;
}

function assignTileTypes(tiles) {
    const typePattern = [
        // ── Metropolis (0-3) ──
        TILE_TYPE.START,
        TILE_TYPE.PROPERTY,
        TILE_TYPE.SHOP,
        TILE_TYPE.PROPERTY,

        // ── Frozen Tundra (4-7) ──
        TILE_TYPE.EVENT,
        TILE_TYPE.PROPERTY,
        TILE_TYPE.SHOP,         // Tile 6: Split Junction 1
        TILE_TYPE.PROPERTY,

        // ── Firelands (8-11) ──
        TILE_TYPE.WEAPON,
        TILE_TYPE.PROPERTY,
        TILE_TYPE.TRAP,
        TILE_TYPE.PRESSURE_PLATE, // Tile 11: Firelands Volcano Pressure Plate

        // ── Sand Kingdom (12-15) ──
        TILE_TYPE.PROPERTY,
        TILE_TYPE.HEAL,
        TILE_TYPE.PROPERTY,
        TILE_TYPE.EVENT,

        // ── Ancient Jungle (16-19) ──
        TILE_TYPE.PROPERTY,       // Tile 16: Shortcut 1 merge point
        TILE_TYPE.SHOP,
        TILE_TYPE.SPRING_PAD,     // Tile 18: Catapult Springboard!
        TILE_TYPE.PROPERTY,

        // ── Pirate Cove (20-23) ──
        TILE_TYPE.TRAP,
        TILE_TYPE.PROPERTY,
        TILE_TYPE.DANGER,
        TILE_TYPE.PROPERTY,

        // ── Dark Forest (24-27) ──
        TILE_TYPE.EVENT,          // Tile 24: Split Junction 2
        TILE_TYPE.PROPERTY,
        TILE_TYPE.WEAPON,
        TILE_TYPE.PROPERTY,

        // ── Toxic Swamp (28-31) ──
        TILE_TYPE.BLACK_MARKET,
        TILE_TYPE.PROPERTY,
        TILE_TYPE.TRAIN,
        TILE_TYPE.PRESSURE_PLATE, // Tile 31: Swamp Cleansing Pressure Plate

        // ── Sky Archipelago (32-35) ──
        TILE_TYPE.HEAL,
        TILE_TYPE.PROPERTY,
        TILE_TYPE.EVENT,
        TILE_TYPE.PROPERTY,

        // ── Mechanical Wastes (36-39) ──
        TILE_TYPE.PROPERTY,       // Tile 36: Shortcut 2 merge point
        TILE_TYPE.PROPERTY,
        TILE_TYPE.SECRET_HATCH,   // Tile 38: Mechanical Secret Vault Hatch
        TILE_TYPE.PROPERTY,

        // ── Shortcut 1: Volcano Ravine (40-44) ──
        TILE_TYPE.PROPERTY,     // 40: Sky-Bridge Entry
        TILE_TYPE.DANGER,       // 41: Molten Lava Pit
        TILE_TYPE.WEAPON,       // 42: Infernal Armory
        TILE_TYPE.BLACK_MARKET, // 43: Smuggler's Den
        TILE_TYPE.PROPERTY,     // 44: Cove Ramp Bridge

        // ── Shortcut 2: Mech Subway (45-49) ──
        TILE_TYPE.TUNNEL,       // 45: Subway Metro Entry
        TILE_TYPE.DANGER,       // 46: Live Wire Grid
        TILE_TYPE.EVENT,        // 47: Imperial Star Vault
        TILE_TYPE.HEAL,         // 48: Celestial Oasis
        TILE_TYPE.TUNNEL,       // 49: Subway Metro Exit
    ];

    tiles.forEach((tile, index) => {
        if (index < typePattern.length) {
            tile.type = typePattern[index];
        }
        tile.name = getTileName(tile.type, tile.biome, index);
    });
}

function buildBoardGraph(tiles) {
    // 1. Default perimeter loop (0..39)
    for (let i = 0; i < 40; i++) {
        if (i === 39) {
            tiles[i].next = [0]; // Loop back to START
        } else {
            tiles[i].next = [i + 1];
        }
    }

    // 2. Split Junction 1 at Tile 6 (Frozen Tundra / Firelands junction)
    tiles[6].isJunction = true;
    tiles[6].name = '🌋 Firelands Fork';
    tiles[6].next = [7, 40]; // Option 0: Main Highway (7), Option 1: Volcano Shortcut (40)
    tiles[6].branchNames = ['Scenic Coast (Safe)', 'Volcano Ravine (Shortcut)'];
    tiles[6].branchDescs = ['Safe road with shops & properties', 'Saves 4 steps! High hazard & Black Market'];
    tiles[6].branchIcons = ['🛣️', '🌋'];

    // Shortcut 1 path (40 -> 41 -> 42 -> 43 -> 44 -> 16)
    tiles[40].next = [41];
    tiles[41].next = [42];
    tiles[42].next = [43];
    tiles[43].next = [44];
    tiles[44].next = [16]; // Reconnects back to Tile 16 on the outer loop!

    // 3. Split Junction 2 at Tile 24 (Dark Forest / Toxic Swamp junction)
    tiles[24].isJunction = true;
    tiles[24].name = '🚇 Mech Subway Fork';
    tiles[24].next = [25, 45]; // Option 0: Swamp Road (25), Option 1: Mech Subway (45)
    tiles[24].branchNames = ['Swamp Road (Main)', 'Mech Subway (Secret)'];
    tiles[24].branchDescs = ['Follow main perimeter road', 'Saves 6 steps! Star Vault & Celestial Spring'];
    tiles[24].branchIcons = ['🛣️', '🚇'];

    // Shortcut 2 path (45 -> 46 -> 47 -> 48 -> 49 -> 36)
    tiles[45].next = [46];
    tiles[46].next = [47];
    tiles[47].next = [48];
    tiles[48].next = [49];
    tiles[49].next = [36]; // Reconnects back to Tile 36 on the left column!
}

function getTileName(type, biome, index) {
    if (index === 6) return '🌋 Firelands Fork';
    if (index === 24) return '🚇 Mech Subway Fork';
    if (index === 40) return 'Volcano Sky-Bridge';
    if (index === 41) return 'Molten Lava Pit';
    if (index === 42) return 'Infernal Armory';
    if (index === 43) return 'Smuggler\'s Den';
    if (index === 44) return 'Cove Ramp Bridge';
    if (index === 45) return 'Subway Metro Entry';
    if (index === 46) return 'Live Wire Grid';
    if (index === 47) return 'Imperial Star Vault';
    if (index === 48) return 'Celestial Oasis';
    if (index === 49) return 'Subway Metro Exit';

    const biomeNames = {
        [BIOME.METROPOLIS]: 'Metropolis',
        [BIOME.FROZEN_TUNDRA]: 'Frozen Tundra',
        [BIOME.FIRELANDS]: 'Firelands',
        [BIOME.TOXIC_SWAMP]: 'Toxic Swamp',
        [BIOME.ANCIENT_JUNGLE]: 'Ancient Jungle',
        [BIOME.SAND_KINGDOM]: 'Sand Kingdom',
        [BIOME.DARK_FOREST]: 'Dark Forest',
        [BIOME.SKY_ARCHIPELAGO]: 'Sky Archipelago',
        [BIOME.MECHANICAL_WASTES]: 'Mech Wastes',
        [BIOME.PIRATE_COVE]: 'Pirate Cove',
    };

    const bn = biomeNames[biome] || 'Unknown';

    switch (type) {
        case TILE_TYPE.START: return 'START (Go)';
        case TILE_TYPE.PROPERTY: return `${bn} Property`;
        case TILE_TYPE.SHOP: return `${bn} Shop`;
        case TILE_TYPE.EVENT: return `${bn} Mystery Event`;
        case TILE_TYPE.TRAP: return `${bn} Trap Zone`;
        case TILE_TYPE.DANGER: return `${bn} Hazard`;
        case TILE_TYPE.HEAL: return `${bn} Spring`;
        case TILE_TYPE.WEAPON: return `${bn} Armory`;
        case TILE_TYPE.AIRPORT: return `${bn} Airport`;
        case TILE_TYPE.HARBOR: return `${bn} Harbor`;
        case TILE_TYPE.TRAIN: return `${bn} Station`;
        case TILE_TYPE.TUNNEL: return `Secret Tunnel`;
        case TILE_TYPE.BLACK_MARKET: return `Black Market`;
        case TILE_TYPE.PRESSURE_PLATE: return `${bn} Pressure Plate`;
        case TILE_TYPE.SPRING_PAD: return `${bn} Catapult Launchpad`;
        case TILE_TYPE.SECRET_HATCH: return `${bn} Secret Vault Hatch`;
        default: return `Tile ${index}`;
    }
}
