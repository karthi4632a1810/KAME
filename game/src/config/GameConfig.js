/**
 * KAME Game Constants & Configuration
 * Central config for all game systems, characters, cards, and economy
 */

// ── Board Config ──
export const BOARD = {
    TILE_SIZE: 50,
    TILE_GAP: 3,
    TOTAL_TILES: 40,
};

// ── Characters & Avatars ──
export const CHARACTERS = [
    {
        id: 0,
        name: 'Cyber Ronin',
        title: 'The Vagabond',
        avatarKey: 'char_avatar_1',
        color: 0xe74c3c,
        colorHex: '#e74c3c',
        perk: '+20% Gold on passing START',
        perkType: 'gold_bonus'
    },
    {
        id: 1,
        name: 'Mecha Aegis',
        title: 'The Fortress',
        avatarKey: 'char_avatar_2',
        color: 0x3498db,
        colorHex: '#3498db',
        perk: 'Takes 25% less damage from hazards',
        perkType: 'defense'
    },
    {
        id: 2,
        name: 'Jungle Drake',
        title: 'The Beast',
        avatarKey: 'char_avatar_3',
        color: 0x2ecc71,
        colorHex: '#2ecc71',
        perk: '+50% Healing from Springs & Potions',
        perkType: 'regen'
    },
    {
        id: 3,
        name: 'Volt Ninja',
        title: 'The Flash',
        avatarKey: 'char_avatar_4',
        color: 0xf1c40f,
        colorHex: '#f1c40f',
        perk: '+1 bonus move when rolling 4 or higher',
        perkType: 'speed'
    },
    {
        id: 4,
        name: 'Void Sorcerer',
        title: 'The Occultist',
        avatarKey: 'char_avatar_5',
        color: 0x9b59b6,
        colorHex: '#9b59b6',
        perk: 'Opponent Traps deal 50% less damage',
        perkType: 'trap_resist'
    },
    {
        id: 5,
        name: 'Pyro Brawler',
        title: 'The Warmonger',
        avatarKey: 'char_avatar_6',
        color: 0xe67e22,
        colorHex: '#e67e22',
        perk: '+35% Weapon Attack power',
        perkType: 'attack_bonus'
    },
];

// ── Player Config ──
export const PLAYER = {
    MAX_PLAYERS: 6,
    STARTING_GOLD: 25000,
    STARTING_HP: 2000,
    STARTING_ENERGY: 600,
    TOKEN_SIZE: 32,
    COLORS: CHARACTERS.map(c => c.color),
    COLOR_NAMES: CHARACTERS.map(c => c.name),
};

// ── Tile Types ──
export const TILE_TYPE = {
    START: 'start',
    PROPERTY: 'property',
    SHOP: 'shop',
    EVENT: 'event',
    TRAP: 'trap',
    DANGER: 'danger',
    HEAL: 'heal',
    WEAPON: 'weapon',
    AIRPORT: 'airport',
    HARBOR: 'harbor',
    TRAIN: 'train',
    TUNNEL: 'tunnel',
    BLACK_MARKET: 'black_market',
    PRESSURE_PLATE: 'pressure_plate',
    SPRING_PAD: 'spring_pad',
    SECRET_HATCH: 'secret_hatch',
    EMPTY: 'empty',
};

// ── Tile Colors & Fallback Graphics ──
export const TILE_COLORS = {
    [TILE_TYPE.START]: 0x2ecc71,
    [TILE_TYPE.PROPERTY]: 0x3498db,
    [TILE_TYPE.SHOP]: 0xf39c12,
    [TILE_TYPE.EVENT]: 0x9b59b6,
    [TILE_TYPE.TRAP]: 0xe74c3c,
    [TILE_TYPE.DANGER]: 0xc0392b,
    [TILE_TYPE.HEAL]: 0x27ae60,
    [TILE_TYPE.WEAPON]: 0xe67e22,
    [TILE_TYPE.AIRPORT]: 0x2980b9,
    [TILE_TYPE.HARBOR]: 0x1abc9c,
    [TILE_TYPE.TRAIN]: 0xd4881a,
    [TILE_TYPE.TUNNEL]: 0x7f8c8d,
    [TILE_TYPE.BLACK_MARKET]: 0x2c3e50,
    [TILE_TYPE.PRESSURE_PLATE]: 0x8b5cf6,
    [TILE_TYPE.SPRING_PAD]: 0x06b6d4,
    [TILE_TYPE.SECRET_HATCH]: 0xd97706,
    [TILE_TYPE.EMPTY]: 0x34495e,
};

// ── Tile Real Asset Icon Mapping ──
export const TILE_ASSET_ICONS = {
    [TILE_TYPE.START]: 'icon_property',
    [TILE_TYPE.PROPERTY]: 'icon_property',
    [TILE_TYPE.SHOP]: 'icon_shop',
    [TILE_TYPE.EVENT]: 'icon_heal',
    [TILE_TYPE.TRAP]: 'icon_trap',
    [TILE_TYPE.DANGER]: 'icon_danger',
    [TILE_TYPE.HEAL]: 'icon_heal',
    [TILE_TYPE.WEAPON]: 'icon_weapon',
    [TILE_TYPE.AIRPORT]: 'icon_airport',
    [TILE_TYPE.HARBOR]: 'icon_harbor',
    [TILE_TYPE.TRAIN]: 'icon_train',
    [TILE_TYPE.TUNNEL]: 'device_secret_hatch',
    [TILE_TYPE.BLACK_MARKET]: 'icon_blackmarket',
    [TILE_TYPE.PRESSURE_PLATE]: 'device_pressure_plate',
    [TILE_TYPE.SPRING_PAD]: 'device_spring_pad',
    [TILE_TYPE.SECRET_HATCH]: 'device_secret_hatch',
};

// ── Biomes ──
export const BIOME = {
    METROPOLIS: 'metropolis',
    FROZEN_TUNDRA: 'frozen_tundra',
    FIRELANDS: 'firelands',
    SAND_KINGDOM: 'sand_kingdom',
    ANCIENT_JUNGLE: 'ancient_jungle',
    PIRATE_COVE: 'pirate_cove',
    DARK_FOREST: 'dark_forest',
    TOXIC_SWAMP: 'toxic_swamp',
    SKY_ARCHIPELAGO: 'sky_archipelago',
    MECHANICAL_WASTES: 'mechanical_wastes',
};

export const BIOME_COLORS = {
    [BIOME.METROPOLIS]: { primary: 0x6366f1, secondary: 0x818cf8, bg: 0x1e1b4b },
    [BIOME.FROZEN_TUNDRA]: { primary: 0x67e8f9, secondary: 0xa5f3fc, bg: 0x083344 },
    [BIOME.FIRELANDS]: { primary: 0xf97316, secondary: 0xfb923c, bg: 0x431407 },
    [BIOME.TOXIC_SWAMP]: { primary: 0x84cc16, secondary: 0xa3e635, bg: 0x1a2e05 },
    [BIOME.ANCIENT_JUNGLE]: { primary: 0x22c55e, secondary: 0x4ade80, bg: 0x052e16 },
    [BIOME.SAND_KINGDOM]: { primary: 0xfbbf24, secondary: 0xfcd34d, bg: 0x451a03 },
    [BIOME.DARK_FOREST]: { primary: 0xa855f7, secondary: 0xc084fc, bg: 0x2e1065 },
    [BIOME.SKY_ARCHIPELAGO]: { primary: 0x38bdf8, secondary: 0x7dd3fc, bg: 0x082f49 },
    [BIOME.MECHANICAL_WASTES]: { primary: 0x94a3b8, secondary: 0xcbd5e1, bg: 0x1e293b },
    [BIOME.PIRATE_COVE]: { primary: 0xfb7185, secondary: 0xfda4af, bg: 0x4c0519 },
};

// ── Power Cards ──
export const POWER_CARDS = {
    SPEED_SURGE: {
        id: 'speed_surge',
        name: 'Speed Surge',
        icon: '⚡',
        desc: 'Sprint forward +4 extra tiles',
        effect: 'speed',
        amount: 4
    },
    AEGIS_SHIELD: {
        id: 'aegis_shield',
        name: 'Aegis Shield',
        icon: '🛡️',
        desc: 'Block next trap, hazard, or attack',
        effect: 'shield',
        amount: 1
    },
    PROXIMITY_MINE: {
        id: 'proximity_mine',
        name: 'Proximity Mine',
        icon: '💣',
        desc: 'Arm current tile with free trap',
        effect: 'trap',
        amount: 1
    },
    MIDAS_SIPHON: {
        id: 'midas_siphon',
        name: 'Midas Siphon',
        icon: '🧲',
        desc: 'Steal $1,800 from richest opponent',
        effect: 'steal_gold',
        amount: 1800
    },
    WARP_JUMP: {
        id: 'warp_jump',
        name: 'Warp Jump',
        icon: '🚀',
        desc: 'Teleport 8 tiles forward immediately',
        effect: 'teleport',
        amount: 8
    },
    DOUBLE_DICE: {
        id: 'double_dice',
        name: 'Double Dice',
        icon: '🎲',
        desc: 'Roll 2 dice for massive movement',
        effect: 'double_dice',
        amount: 2
    },
};

// ── Weapons & Combat ──
export const WEAPON_TYPES = [
    { name: 'Spiked Bat', damage: 320, lootRatio: 0.15, iconKey: 'weapon_1' },
    { name: 'Laser Pistol', damage: 450, lootRatio: 0.20, iconKey: 'weapon_2' },
    { name: 'Combat Shotgun', damage: 620, lootRatio: 0.25, iconKey: 'weapon_3' },
    { name: 'Golden Pan', damage: 520, lootRatio: 0.35, iconKey: 'weapon_4' },
    { name: 'Rocket Launcher', damage: 850, lootRatio: 0.30, iconKey: 'weapon_5' },
];

// ── Dice Config ──
export const DICE = {
    MIN: 1,
    MAX: 6,
    ROLL_DURATION: 1100,
    BOUNCE_COUNT: 8,
};

// ── Animation Speeds ──
export const ANIM = {
    PLAYER_MOVE_SPEED: 180, // ms per tile
    CAMERA_PAN_SPEED: 500,
    FADE_SPEED: 300,
    POPUP_SPEED: 250,
};

// ── Game State ──
export const GAME_STATE = {
    WAITING: 'waiting',
    ROLLING: 'rolling',
    MOVING: 'moving',
    LANDING: 'landing',
    COMBAT: 'combat',
    ACTION: 'action',
    JUNCTION_CHOICE: 'junction_choice',
    GAME_OVER: 'game_over',
};

// ── Trap Types ──
export const TRAP_TYPES = {
    LANDMINE: {
        id: 'landmine',
        name: 'Proximity Landmine',
        icon: '💣',
        damage: 400,
        cost: 1000,
        goldBurn: 0.15,
        desc: 'Explodes for 400 DMG & vaporizes 15% gold'
    },
    BEAR_TRAP: {
        id: 'bear_trap',
        name: 'Snap Bear Trap',
        icon: '🪤',
        damage: 250,
        cost: 800,
        root: true,
        desc: 'Roots player immediately mid-step + 250 DMG'
    },
    OIL_SLICK: {
        id: 'oil_slick',
        name: 'Banana Oil Slick',
        icon: '🍌',
        damage: 100,
        cost: 600,
        slideBack: 3,
        desc: 'Slips victim and flings them 3 tiles backwards'
    },
    EMP_GRID: {
        id: 'emp_grid',
        name: 'EMP Shock Grid',
        icon: '⚡',
        damage: 180,
        cost: 1200,
        drainEnergy: true,
        desc: 'Drains 100% Energy and locks power cards'
    },
};

// ── Mini-Games Catalog ──
export const MINI_GAMES = [
    {
        id: 'coin_rush',
        name: 'Meteor Coin Rush',
        icon: '🪙',
        subtitle: 'DODGE & COLLECT',
        desc: 'Dodge blazing meteors from the sky and scoop up gold coins!',
        duration: 10.0,
    },
    {
        id: 'laser_grid',
        name: 'Laser Grid Survival',
        icon: '⚡',
        subtitle: 'ELECTRIC DODGE',
        desc: 'Dodge sweeping high-voltage laser beams! Last standing takes the jackpot!',
        duration: 12.0,
    },
    {
        id: 'bumper_arena',
        name: 'Bumper KAME Arena',
        icon: '💥',
        subtitle: 'SUMO KNOCKOUT',
        desc: 'Ram opponents with high-impact momentum! Push rivals off the platform!',
        duration: 12.0,
    },
];

// ── Automated Defense Turrets ──
export const TURRET_TYPES = {
    GATLING: {
        id: 'gatling',
        name: 'Gatling Sentry',
        icon: '🔫',
        iconKey: 'turret_gatling',
        damage: 180,
        range: 1,
        cost: 1500,
        desc: 'Fires rapid bullets at enemies passing within 1 tile (-180 HP)',
    },
    TESLA: {
        id: 'tesla',
        name: 'Tesla Coil',
        icon: '⚡',
        iconKey: 'turret_tesla',
        damage: 280,
        range: 2,
        energyDrain: 50,
        cost: 2200,
        desc: 'Zaps enemies within 2 tiles (-280 HP & -50 Energy)',
    },
    FLAME: {
        id: 'flame',
        name: 'Hellfire Turret',
        icon: '🔥',
        iconKey: 'turret_flame',
        damage: 350,
        range: 1,
        cost: 2800,
        desc: 'Unleashes a torrent of molten fire (-350 HP)',
    },
    MORTAR: {
        id: 'mortar',
        name: 'Artillery Mortar',
        icon: '🚀',
        iconKey: 'turret_mortar',
        damage: 450,
        range: 3,
        goldBurn: 0.10,
        cost: 3500,
        desc: 'Long-range bombardment up to 3 tiles away (-450 HP & -10% gold)',
    },
};

// ── Emotes Catalog ──
export const EMOTES = [
    { id: 'crown', icon: '👑', iconKey: 'emote_crown', label: 'I Rule!' },
    { id: 'fire', icon: '🔥', iconKey: 'emote_fire', label: 'On Fire!' },
    { id: 'skull', icon: '💀', iconKey: 'emote_skull', label: 'RIP!' },
    { id: 'trophy', icon: '🏆', iconKey: 'emote_trophy', label: 'EZ Win!' },
    { id: 'rage', icon: '😡', iconKey: 'emote_rage', label: 'Salty!' },
    { id: 'heart', icon: '💖', iconKey: 'emote_heart', label: 'GG & Love!' },
];

// ── Game Modes ──
export const GAME_MODES = [
    {
        id: 'tycoon',
        name: 'Tycoon Conquest',
        subtitle: 'RICHEST EMPIRE WINS',
        icon: '🏆',
        desc: 'Amass the highest net worth through properties, cash, and investments after 20 turns!',
    },
    {
        id: 'star_hunter',
        name: 'Star Hunter',
        subtitle: 'FIRST TO 3 STARS WINS',
        icon: '⭐',
        desc: 'First tycoon to collect 3 Stars from vaults, events, and black markets wins immediately!',
    },
    {
        id: 'elimination',
        name: 'Last Mascot Standing',
        subtitle: 'BATTLE ROYALE SURVIVAL',
        icon: '💀',
        desc: 'Brutal elimination! HP does not regenerate automatically — last player alive wins!',
    },
];


