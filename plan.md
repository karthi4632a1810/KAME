# 🎮 KAME — Game Design Document

> **"Roll. Build. Sabotage. Conquer."**

---

## 📋 Table of Contents

1. [Game Overview](#1-game-overview)
2. [Platform & Tech Stack](#2-platform--tech-stack)
3. [Core Game Loop](#3-core-game-loop)
4. [Board & Path System](#4-board--path-system)
5. [Biomes & Zones](#5-biomes--zones)
6. [Tile Types & Symbols](#6-tile-types--symbols)
7. [Combat System](#7-combat-system)
8. [Trap System](#8-trap-system)
9. [Property & Economy](#9-property--economy)
10. [Transport Network](#10-transport-network)
11. [Power Cards](#11-power-cards)
12. [Characters & Cosmetics](#12-characters--cosmetics)
13. [UI & HUD](#13-ui--hud)
14. [Multiplayer & Networking](#14-multiplayer--networking)
15. [Game Events & Disasters](#15-game-events--disasters)
16. [World Interaction & Mechanics](#16-world-interaction--mechanics)
17. [Win Conditions & Game Modes](#17-win-conditions--game-modes)
18. [Development Phases](#18-development-phases)
19. [Asset Inventory](#19-asset-inventory)

---

## 1. Game Overview

| Field | Detail |
|---|---|
| **Title** | **KAME** |
| **Genre** | Online Multiplayer Board Game (Party / Strategy) |
| **Inspiration** | Pummel Party + Monopoly + Mario Party — with unique path, power, and trap mechanics |
| **Players** | 2–6 players (online multiplayer) |
| **Perspective** | Top-down / Isometric board view |
| **Tone** | Competitive, chaotic, fun — dark-gold premium aesthetic |
| **Target** | Browser-based (accessible to everyone, no install required) |

### Elevator Pitch

KAME is a **browser-based online multiplayer board game** where 2–6 players roll dice, navigate a massive world map spanning **9 unique biomes**, buy properties, set traps, use weapons, trigger disasters, and compete to become the richest and most powerful player. Think Pummel Party meets a sprawling world board with deep strategy, brutal sabotage, and chaotic fun.

---

## 2. Platform & Tech Stack

### Why Browser?
- ✅ **Zero friction** — anyone can play by clicking a link
- ✅ **Cross-platform** — PC, Mac, tablet, phone
- ✅ **Easy to share** — send a room link to friends
- ✅ **No download/install** — instant play

### Recommended Stack

| Layer | Technology | Reason |
|---|---|---|
| **Frontend / Renderer** | **Phaser 3** (or PixiJS) | Mature 2D game framework, WebGL + Canvas fallback, huge community, perfect for board games |
| **Game UI** | **HTML/CSS + Phaser DOM** | HUD overlays, menus, lobby using web tech on top of the game canvas |
| **Backend / Server** | **Node.js + Colyseus** | Real-time multiplayer game server, room management, state sync, built for browser games |
| **Networking** | **WebSocket (via Colyseus)** | Low-latency real-time communication |
| **Database** | **PostgreSQL + Redis** | Player accounts, leaderboards, match history (Redis for session/room state) |
| **Auth** | **Firebase Auth** or **Supabase Auth** | Google/Discord login, guest accounts |
| **Hosting** | **Vercel** (frontend) + **Railway/Render** (game server) | Easy deployment, scalable |
| **Assets** | **Sprite sheets from your PNGs** | Slice the existing design sheets into individual sprites |

### Why NOT Unity/Unreal?

| Engine | Problem for This Game |
|---|---|
| **Unity (WebGL)** | Heavy build size (50–200 MB), slow load times, mobile WebGL is unreliable, overkill for 2D board game |
| **Unreal Engine** | No viable browser export, designed for AAA 3D games, extreme overkill |
| **Phaser 3 (Browser)** | ✅ Lightweight (<5 MB), instant load, perfect for 2D, built-in animation/tween/input, huge plugin ecosystem |

> **IMPORTANT:** Phaser 3 + Colyseus is the industry-standard combo for browser multiplayer games like this. It gives you the best balance of visual quality, performance, and ease of development.

---

## 3. Core Game Loop

### Turn Flow Diagram

```
🎲 Roll Dice
    ↓
🚶 Move on Path
    ↓
Land on Tile? ──→ Property → Buy / Pay Rent
              ──→ Shop → Buy Items / Weapons
              ──→ Trap → Trigger Trap Effect
              ──→ Event → Random Event Card
              ──→ Danger → Hazard Damage
              ──→ Transport → Teleport (Air/Sea/Rail/Tunnel)
              ──→ Heal → Restore HP / Remove Debuffs
              ──→ Weapon → Acquire Combat Weapon
              ──→ Black Market → Illegal Deals & Rare Items
              ──→ Snow Ground → Biome-Specific Effect
    ↓
⚔️ Actions Phase
    ↓
Choose Action ──→ Attack → Use Weapon on Nearby Player
              ──→ Use Power → Play Power Card
              ──→ Build → Place Trap / Upgrade Property
              ──→ Items → Use Consumable Item
              ──→ End Turn → 🔄 Next Player's Turn
```

### Turn Structure

Each player's turn has **3 phases**:

1. **🎲 Roll Phase** — Roll dice (1–6), move that many tiles along the path
2. **🏠 Landing Phase** — Resolve the tile you landed on (buy property, trigger trap, pick up item, etc.)
3. **⚔️ Action Phase** — Optional actions: Attack, Use Power Card, Build/Place Trap, Use Items, or End Turn

### Turn Economy

| Resource | Description |
|---|---|
| 💰 **Gold** | Primary currency — buy properties, shops, weapons, traps |
| 🏢 **Properties** | Owned tiles that generate rental income |
| ❤️ **HP (Health)** | Each player has health — reach 0 and you lose a turn + drop gold |
| ⚡ **Energy** | Powers and special abilities consume energy |
| 🎴 **Power Cards** | Single-use abilities (Teleport, Lightning Strike, Ice Prison, etc.) |
| ⭐ **Stars** | Victory points — earn through achievements, quests, property empires |

---

## 4. Board & Path System

### Path Tile Types

The board is built from modular path tiles that snap together:

| Tile | File | Description |
|---|---|---|
| **Straight Path** | `Board Tile - Straight Path Sheet.png` | Standard 1x1 forward path |
| **Curved Path** | `Board Tile - Curved Path Sheet.png` | 90° turn tile |
| **Split Junction** | `Board Tile - Split Junction Sheet.png` | Fork in the road — player chooses direction |
| **Narrow Bridge** | `Board Tile - Narrow Bridge Sheet.png` | Risky crossing — chance to fall |
| **Ramp Tile** | `Board Tile - Ramp Tile Sheet.png` | Elevation change between levels |
| **Elevated Tile** | `Board Tile - Elevated Tile Sheet.png` | High ground — defensive advantage |
| **Tunnel Entry** | `Board Tile - Tunnel Entry Sheet.png` | Enter underground tunnel |
| **Tunnel Exit** | `Board Tile - Tunnel Exit Sheet.png` | Exit underground tunnel |

### Board Layout

The world map is a massive spiral/interconnected track spanning all 9 biomes:

```
                    ┌─── FROZEN TUNDRA ───┐
                    │                      │
    METROPOLIS ─────┤                      ├──── FIRELANDS
    (START)         │    ANCIENT JUNGLE    │
                    │      (CENTER)        │
    TOXIC SWAMP ────┤                      ├──── SAND KINGDOM
                    │    PIRATE COVE       │
                    │                      │
    DARK FOREST ────┤                      ├──── SKY ARCHIPELAGO
                    │                      │
                    └── MECHANICAL WASTES ─┘
```

- **Total Tiles**: ~300–500 tiles across the entire board
- **Path Numbers**: Each tile has a number (visible on the map) for identification
- **Interconnections**: Biomes connect via land paths, plus transport shortcuts (air, sea, rail, tunnel)

---

## 5. Biomes & Zones

### 9 Unique Biomes

Each biome has its own **terrain, structures, props, hazards, and atmosphere VFX**:

| # | Biome | Theme | Hazard Effect | Income Modifier |
|---|---|---|---|---|
| 1 | 🏙️ **Metropolis** | Urban cityscape, neon lights | Traffic / Construction zones | High rent, high prices |
| 2 | ❄️ **Frozen Tundra** | Ice, snow, blizzards | Slippery paths (–1 movement), cracking ice | Low rent, cheap to buy |
| 3 | 🔥 **Firelands** | Volcanoes, lava, fire | Lava tiles deal damage, eruptions | Medium rent |
| 4 | 🐸 **Toxic Swamp** | Poison, murky waters | Poison damage over time, movement slow | Low rent |
| 5 | 🌿 **Ancient Jungle** | Temples, vines, wildlife | Vine traps, beast ambushes | Medium rent, treasure |
| 6 | 🏜️ **Sand Kingdom** | Pyramids, sand, oasis | Sandstorm (reduces vision), quicksand | Medium rent |
| 7 | 🌑 **Dark Forest** | Cursed woods, purple fog | Curse effects, ghost ambush | Low rent, cursed tiles |
| 8 | ☁️ **Sky Archipelago** | Floating islands, clouds | Lightning strikes, falling off edges | High rent |
| 9 | ⚙️ **Mechanical Wastes** | Steampunk, gears, lasers | Laser grids, EMP zones | High rent, tech bonuses |
| 10 | 🏴‍☠️ **Pirate Cove** | Ships, docks, treasure | Cannon fire, whirlpools | Treasure loot |

### Biome Asset Breakdown

Each biome has **5 asset sheets**:

1. **Terrain Pack Blocks** — Ground tiles and terrain variations
2. **Structures** — Buildings, ruins, landmarks
3. **Props** — Environmental objects (trees, rocks, barrels, etc.)
4. **Hazards** — Biome-specific dangers
5. **Atmosphere & VFX** — Fog, particles, weather effects

---

## 6. Tile Types & Symbols

Each board tile has a **type** that determines what happens when a player lands on it:

| Symbol | Tile Type | Effect | Asset Sheet |
|---|---|---|---|
| 🏠 **Property** | Property Tile | Buy if unowned / Pay rent if owned | `Symbols - Property Tile Symbols Sheet.png` |
| 🛒 **Shop** | Shop Tile | Browse and buy items, weapons, power-ups | `Symbols - Shop Tile Symbols Sheet.png` |
| ❓ **Event** | Event Tile | Draw a random event card (good or bad) | `Symbols - Event Tile Symbols Sheet.png` |
| 💀 **Trap** | Trap Tile | Hidden trap activated when landed on | `Symbols - Trap Tile Symbols Sheet.png` |
| 🚗 **Transport** | Transport Tile | Access vehicle transport hub | `Symbols - Transport Tile Symbols Sheet.png` |
| ✈️ **Airport** | Airport Tile | Fly to any unlocked airport | `Symbols - Airport Tile Symbols Sheet.png` |
| ⚓ **Harbor** | Harbor Tile | Sail to any harbor | `Symbols - Harbor Tile Symbols Sheet.png` |
| 🚂 **Train** | Train Station | Ride the rails to another station | `Symbols - Train Tile Symbols Sheet.png` |
| ⚠️ **Danger** | Danger Tile | Environmental hazard — take damage | `Symbols - Danger Tile Symbols Sheet.png` |
| 💚 **Heal** | Heal Tile | Restore HP, cure debuffs | `Symbols - Heal Tile Symbols Sheet.png` |
| ⚔️ **Weapon** | Weapon Tile | Pick up a random weapon | `Symbols - Weapon Tile Symbols Sheet.png` |
| 🏴 **Black Market** | Black Market Tile | Buy rare/illegal items at premium prices | `Symbols - Black Market Tile Symbols Sheet.png` |
| ❄️ **Snow Ground** | Snow Ground Tile | Frozen Tundra-specific biome tile | `Symbols - Snow Ground Tile Symbols Sheet.png` |

---

## 7. Combat System

### Weapons

Players can acquire weapons from **Weapon Tiles**, **Shops**, or **Black Market** tiles:

| Weapon | Type | Damage | Range | Speed | Special |
|---|---|---|---|---|---|
| 🏏 **Bat** | Melee | ███░░ | █░░░░ | ███░░ | Simple but effective |
| 🔨 **Hammer** | Melee | █████ | █░░░░ | ██░░░ | Heavy knockback |
| 🍳 **Frying Pan** | Shield | ████░ | █░░░░ | ████░ | Blocks bullets! |
| 🔫 **Pistol** | Ammo | ███░░ | ████░ | ████░ | Reliable sidearm |
| 🔫 **Shotgun** | Shells | █████ | █░░░░ | ██░░░ | Devastating up close |
| 🎯 **Sniper** | Ammo | █████ | █████ | █░░░░ | One shot, one kill |
| 🚀 **Rocket Launcher** | Explosive | ██████ | ███░░ | ██░░░ | Big splash damage |
| 🌀 **Gravity Gun** | Gravity | ██░░░ | ███░░ | ███░░ | Grab, lift, throw |
| 🐝 **Bee Launcher** | Special | ██░░░ | ███░░ | ███░░ | Unleash the swarm! |

### Turrets & Defenses

Players can build **static defenses** on owned tiles:

- **Auto-Turret** — Shoots nearby enemies automatically
- **Shield Generator** — Protects owned properties
- **Missile Battery** — Long-range area denial

### Combat Rules

1. **Attack Range** — Each weapon has a tile range (how many tiles away you can target)
2. **Damage Calculation** — Weapon damage – target defense = final damage
3. **Knockback** — Some weapons push targets backward on the path
4. **Counter-Attack** — If attacked player has a weapon, they can fire back (reduced accuracy)
5. **Death Penalty** — HP reaches 0 → lose 1 turn + drop 25% of gold on the tile

---

## 8. Trap System

Players can buy and place traps on tiles to sabotage opponents:

| Trap | Trigger | Damage | Disruption | Duration | Effect |
|---|---|---|---|---|---|
| 🍌 **Banana Trap** | High | Low | High | Low | Slip backward 1–3 tiles |
| 🔵 **Glue Trap** | Med | Low | Max | Max | Stuck for 1 turn, can't move |
| 🔺 **Spike Trap** | High | High | Med | Low | Direct damage, destroys 1 item |
| 🌀 **Teleport Trap** | Med | Med | Max | Low | Random teleport to another tile |
| 📦 **Fake Treasure** | Max | Low | Med | Low | Looks like loot — triggers explosion |
| ⚡ **EMP Mine** | High | Med | Max | Med | Disables items for 2 turns |
| 💀 **Curse Trap** | Med | Max | Max | High | Curses target — halved income for 3 turns |

### Trap Rules

1. Traps are **invisible** to other players (hidden tiles)
2. A player can have max **3 active traps** on the board
3. Traps trigger when **any opponent** lands on the tile
4. Your own traps **don't trigger** on you
5. Some items can **reveal** hidden traps (Trap Detector)

---

## 9. Property & Economy

### Property Types

| Property | Category | Buy Cost | Rent (base) | Upgrade Levels | Asset Sheet |
|---|---|---|---|---|---|
| 🏪 **Retail Shop** | Commercial | 2,000 | 200/turn | 3 (Stall → Shop → Mall) | `Property System - Commercial & Retail Shops.png` |
| 🏨 **Hotel** | Lodging | 5,000 | 500/turn | 3 (Inn → Hotel → Resort) | `Property System - Hotels & Lodging.png` |
| 🏭 **Factory** | Production | 8,000 | 800/turn | 3 (Workshop → Factory → Megaplant) | `Property System - Factories & Production.png` |
| 🏦 **Bank** | Finance | 12,000 | 1,200/turn | 3 (Lender → Bank → Treasury) | `Property System - Banks & Finance.png` |

### Economy Rules

1. **Passive Income** — Properties generate rent whenever ANY player lands on your tile
2. **Monopoly Bonus** — Own all properties in a biome → 2x rent
3. **Upgrades** — Each property has 3 upgrade tiers, increasing rent exponentially
4. **Destruction** — Properties can be damaged by weapons, disasters, or the NUKE power card
5. **Auctions** — If a player can't afford rent, their property goes to auction

### Resource Icons

From the UI, the game tracks multiple resources:

| Icon | Resource | Description |
|---|---|---|
| 💰 | **Gold** | Primary currency |
| 🏢 | **Buildings** | Total owned properties |
| 💎 | **Gems** | Premium currency (cosmetics) |
| 🧪 | **Potion** | Consumable healing items |
| 🥇 | **Gold Bars** | Investment / trade resource |
| 💧 | **Oil** | Factory fuel / upgrade material |
| 💠 | **Crystals** | Power card enhancement |

---

## 10. Transport Network

The board has **4 transport systems** for fast travel across biomes:

| Transport | Route Type | Mechanic | Asset Sheet |
|---|---|---|---|
| ✈️ **Airport** | Air Route (dashed blue) | Fly to any unlocked airport tile | `Transport System - Airports & Aircraft.png` |
| 🚢 **Harbor** | Sea Route (dotted blue) | Sail to any harbor tile | `Transport System - Ships & Harbors.png` |
| 🚂 **Train Station** | Train Route (dashed gold) | Ride rail to next station on the line | `Transport System - Trains & Rail.png` |
| 🕳️ **Tunnel** | Underground (green icon) | Shortcut tunnel entry/exit pairs | `Underground Assets - Tunnels & Secret Hatches.png` |

### Transport Rules

1. **Airports** — Cost gold to use, unlock more destinations over time
2. **Harbors** — Free to use between connected harbors
3. **Trains** — One-way travel following the rail line direction
4. **Tunnels** — Free, instant teleport between entry/exit pairs, but 20% chance of underground hazard

---

## 11. Power Cards

Special ability cards that players collect throughout the game:

| Power Card | Effect | Rarity |
|---|---|---|
| 🌀 **Teleport** | Move to any unlocked airport instantly | Common |
| ⚡ **Lightning Strike** | Attack all players within range 4 | Rare |
| ❄️ **Ice Prison** | Freeze target player for 1 turn | Common |
| 🛡️ **Shield Barrier** | Block next 2 incoming attacks | Uncommon |
| 💰 **Money Storm** | Steal 10% gold from ALL players | Rare |
| ☢️ **Nuke** | Destroy all buildings in range 6 tiles | Legendary |

### How to Get Power Cards

- Land on **Event tiles** (random draw)
- Buy from **Shops** or **Black Market**
- Earn through **achievements** during the game
- Steal from opponents via certain trap effects

---

## 12. Characters & Cosmetics

### Playable Characters

6 unique characters, each with a **passive ability**:

| Character | Role | Passive Ability |
|---|---|---|
| 👔 **Capital King** | Business Mogul | +10% property income |
| 💜 **Viper** | Rogue Assassin | Traps deal +25% damage |
| 💪 **Tank** | Heavy Hitter | +500 starting HP, slower movement |
| 🧓 **The Baron** | Old Money | Starts with 1 free property |
| 🤖 **Nova** | Tech Specialist | EMP/Gravity weapons cost 50% less |
| 🥷 **Shadow** | Infiltrator | Can see hidden traps within 3 tiles |

### Mascots

4 team mascots for team modes:

- 🔴 **Red Mascot**
- 🔵 **Blue Mascot**
- 🟢 **Green Mascot**
- 🟡 **Yellow Mascot**

### Cosmetics System

| Category | Examples | Earned Via |
|---|---|---|
| 🎩 **Hats** | Crown, Viking Helmet, Wizard Hat | Shop, achievements |
| 🎨 **Skins** | Gold, Neon, Steampunk variants | Premium currency |
| 💬 **Emotes** | Laugh, Taunt, Dance, Cry | Unlocked by level |

---

## 13. UI & HUD

### Main HUD Elements

| Element | Position | Info Displayed |
|---|---|---|
| **Player Card** | Top-Left | Avatar, name, level, HP bar, energy bar, gold, buildings, gems |
| **Dice UI** | Top-Right | 3D dice with roll animation, faces 1–6 |
| **Health Bars** | Left Panel | All 4–6 players' HP bars with icons |
| **Resource Icons** | Top Bar | Gold, Buildings, Gems, Potions, Gold Bars, Oil, Crystals |
| **Mini Map** | Bottom-Left | Zoomed-out board overview with player positions |
| **Turn Indicator** | Bottom-Right | Current turn player, next player, upcoming order, Turn X/Y counter |

### Action Bar (Bottom)

```
[ MOVE ] [ ATTACK ] [ USE POWER ] [ BUILD ] [ ITEMS ] [ END TURN ]
```

### Legend Bar (Bottom)

```
[ PROPERTY ] [ SHOP ] [ EVENT ] [ DANGER ] [ AIRPORT ] [ TRAIN STATION ] [ TUNNEL ] [ SPECIAL ]
```

### Top Navigation Bar

```
[ MAP ] [ SHOP ] [ EVENTS ] [ WEAPONS ] [ TRANSPORT ] [ BUILD ] [ POWER-UPS ] [ ACHIEVEMENTS ]
```

### Zone Info Panel (Right Side)

Shows current biome info:
- Biome name and description
- Environmental effects
- Owned properties count
- Income per turn in this zone

---

## 14. Multiplayer & Networking

### Room System

| Feature | Detail |
|---|---|
| **Room Creation** | Host creates room, gets shareable link |
| **Room Size** | 2–6 players |
| **Matchmaking** | Quick match (random) or private rooms |
| **Spectators** | Up to 10 spectators can watch |
| **Reconnection** | Auto-reconnect if disconnected |

### Network Architecture

```
Player 1 Browser ──┐
Player 2 Browser ──┤──→ WebSocket ──→ Colyseus Game Server ──→ Game State
Player 3 Browser ──┤                                        ──→ PostgreSQL (persist)
Player 4 Browser ──┘                                        ──→ Redis (cache)
```

### State Synchronization

- **Authoritative Server** — All game logic runs on the server (anti-cheat)
- **Delta Sync** — Only send changes, not full state, to minimize bandwidth
- **Turn-Based** — No need for 60fps network sync, turn-based messages are lightweight
- **Rollback** — Server resolves conflicts if two players act simultaneously

---

## 15. Game Events & Disasters

Random global events that affect ALL players:

| Event | Effect | Frequency |
|---|---|---|
| 🌋 **Volcanic Eruption** | Firelands biome tiles deal 2x damage for 3 turns | Rare |
| 🌪️ **Tornado** | Randomly swaps 2 players' positions | Uncommon |
| 💸 **Tax Day** | All players lose 10% of gold | Common |
| 🎁 **Gold Rush** | All property income doubled for 2 turns | Uncommon |
| 🌊 **Tsunami** | Pirate Cove properties destroyed | Rare |
| ⚡ **EMP Blast** | All traps on the board are revealed | Rare |
| 🦠 **Plague** | All players in Toxic Swamp lose HP each turn | Uncommon |
| 🎰 **Lucky Stars** | Random player receives 3 free power cards | Rare |

---

## 16. World Interaction & Mechanics

Interactive world objects and devices:

| Mechanic | Description |
|---|---|
| **Pressure Plates** | Step on to activate/deactivate bridges, doors |
| **Elevators** | Move between board levels |
| **Teleport Pads** | Instant warp between paired pads |
| **Destructible Walls** | Blow open shortcuts with explosives |
| **Treasure Chests** | Random loot (gold, items, power cards) |
| **NPC Merchants** | Buy/sell at special locations |
| **Boss Tiles** | Encounter AI boss — defeat for huge reward |

---

## 17. Win Conditions & Game Modes

### Game Modes

| Mode | Win Condition | Turns | Players |
|---|---|---|---|
| 🏆 **Richest Wins** | Highest net worth (gold + property value) at turn limit | 20–500 turns (configurable) | 2–6 |
| ⭐ **Star Hunter** | First to collect X stars | Unlimited | 2–6 |
| 💀 **Last Standing** | Last player alive (elimination) | Unlimited | 3–6 |
| 👥 **Team Battle** | 2v2 or 3v3 — combined team net worth | 20–100 turns | 4 or 6 |
| ⚡ **Speed Run** | First player to complete full board circuit | Unlimited | 2–6 |

### Scoring

```
Net Worth = Gold + (Property Values x Upgrade Multiplier) + (Stars x 5,000) + Inventory Value
```

---

## 18. Development Phases

### Phase 1: Foundation (Weeks 1–4)

- [x] Asset design & organization (DONE — 119 image assets renamed)
- [x] Set up Phaser 3 project with Vite bundler (DONE)
- [x] Implement board rendering with 40-tile rectangular layout across 10 biomes (DONE)
- [x] Dice roll mechanic with animations + step-by-step player movement (DONE)
- [x] Turn management + single-player Bot AI for instant playability (DONE)
- [ ] Colyseus WebSocket multiplayer server for online rooms

### Phase 2: Core Systems (Weeks 5–10)

- [x] All 14 tile mechanics active (Property, Shop, Event, Trap, Danger, Heal, Weapon, Airport, Harbor, Train, Tunnel, Black Market) (DONE)
- [x] Sliced real assets extracted & integrated (transparent category icons, isometric tiles, mascot portraits) (DONE)
- [x] 6 Character Mascots with unique passive perks (Cyber Ronin, Mecha Aegis, Jungle Drake, Volt Ninja, Void Sorcerer, Pyro Brawler) (DONE)
- [x] Tactical Power Cards system (Speed Surge, Aegis Shield, Proximity Mine, Midas Siphon, Warp Jump, Double Dice) with interactive card drawer modal (DONE)
- [x] Pummel Party PvP combat system: Melee & ranged weapons, damage calculation, Aegis Shield block, gold looting, and knockouts (DONE)
- [x] Property acquisition, rent payment, and upgrade level system with visual badges (DONE)
- [x] Procedural Web Audio API sound synthesis (dice ticks, steps, cash, hazard, heal, fanfare) (DONE)
- [x] Complete HUD overlay scene with live status cards, health bars, action buttons, and activity feed (DONE)

### Phase 3: Biomes & World (Weeks 11–16)

- [x] Branching path system with interactive Split Junction forks (Firelands Fork, Mech Subway Fork) (DONE)
- [x] Interior shortcuts (Volcano Ravine lava bridge & Mech Subway star vault) with colored glowing path lines (DONE)
- [x] Tactical Trap Arsenal system (Landmines, Bear Traps with Rooting, Oil Slick slides, EMP grids) with mid-step detonation (DONE)
- [x] Interactive Trap Drawer modal in HUD with live gold purchase and tile arming (DONE)
- [x] 3 Rotating Pummel Party Mini-Games: "Meteor Coin Rush", "Laser Grid Survival", and "Bumper KAME Arena" (DONE)
- [x] Real-time WebSocket Multiplayer Server running on port 3001 with 4-letter room codes (DONE)
- [x] Online Room Lobby modal in Main Menu with Room Code generation & host/join flow (DONE)
- [x] World interaction mechanics (pressure plates, springboard catapults, imperial secret vaults) (DONE)
- [x] Full multi-biome branching path network with shortcut junctions & portal hops (DONE)

### Phase 4: Combat & Powers (Weeks 17–22)

- [x] All tactical weapons with damage and loot mechanics (DONE)
- [x] Tactical traps with rooting and status effects (DONE)
- [x] Power cards system (Speed Surge, Shield, Mines, Siphon, Warp, Double Dice) (DONE)
- [x] Game events & disasters (Volcano, Tornado, Gold Rush, Tax Audit, EMP, Tsunami) (DONE)
- [x] Turrets & automated defense placements (Gatling, Tesla, Flame, Mortar, Laser, Shield) (DONE)
- [x] Mid-step defense firing tracers & radar scanning rings (DONE)

### Phase 5: Polish & Content (Weeks 23–28)

- [x] All 6 mascots with unique passive perks (Cyber Ronin, Mecha Aegis, Jungle Drake, Volt Ninja, Void Sorcerer, Solar Phoenix) (DONE)
- [x] Cosmetics & emote wheel system with animated pop-in speech bubbles & bot reactions (DONE)
- [x] Procedural Web Audio synthesizer engine (cash, victory, heal, hazard, click, step, roll) (DONE)
- [x] Interactive human drawers for Property acquisition/workshop, Item shop, and Black market contraband (DONE)
- [x] 3 Core Game Modes with distinct win conditions (🏆 Tycoon Conquest, ⭐ Star Hunter, 💀 Last Mascot Standing) (DONE)
- [x] Mode-specific victory ceremonies and stat breakdowns (DONE)

### Phase 6: Launch Readiness & Polish (Weeks 29–32)

- [x] Dual-tab Online Matchmaking & Room Lobby (Host & Join with 4-letter room codes) (DONE)
- [x] Live WebSocket multiplayer synchronization (rolls, movement, emotes, combat, traps) (DONE)
- [x] Audio SFX engine with in-HUD mute/unmute toggle (`[M]` hotkey) (DONE)
- [x] Interactive Master Guide & Rules Tutorial (`[H]` hotkey) (DONE)
- [x] Performance optimization (<2 MB total production bundle, instant browser loading) (DONE)
- [x] Full browser automated verification with zero console errors (DONE)
- [x] Public browser game ready for player deployment 🚀 (DONE)

---

## 19. Asset Inventory

### Board Tiles (16 files)

| Asset | File |
|---|---|
| Straight Path Sheet | `Board Tile - Straight Path Sheet.png` |
| Straight Path Variants | `Board Tile - Straight Path Variants.png` |
| Curved Path Sheet | `Board Tile - Curved Path Sheet.png` |
| Curved Path Variants | `Board Tile - Curved Path Variants.png` |
| Split Junction Sheet | `Board Tile - Split Junction Sheet.png` |
| Split Junction Variants | `Board Tile - Split Junction Variants.png` |
| Narrow Bridge Sheet | `Board Tile - Narrow Bridge Sheet.png` |
| Narrow Bridge Variants | `Board Tile - Narrow Bridge Variants.png` |
| Ramp Tile Sheet | `Board Tile - Ramp Tile Sheet.png` |
| Ramp Tile Variants | `Board Tile - Ramp Tile Variants.png` |
| Elevated Tile Sheet | `Board Tile - Elevated Tile Sheet.png` |
| Elevated Tile Variants | `Board Tile - Elevated Tile Variants.png` |
| Tunnel Entry Sheet | `Board Tile - Tunnel Entry Sheet.png` |
| Tunnel Entry Variants | `Board Tile - Tunnel Entry Variants.png` |
| Tunnel Exit Sheet | `Board Tile - Tunnel Exit Sheet.png` |
| Tunnel Exit Path (Cropped) | `Board Tile - Tunnel Exit Path Sheet (Cropped).png` |

### Single Tiles (5 files)

| Asset | File |
|---|---|
| Straight Path | `Single Tile - Straight Path.png` |
| Curved Path | `Single Tile - Curved Path.png` |
| Split Junction | `Single Tile - Split Junction.png` |
| Straight Ramp | `Single Tile - Straight Ramp.png` |
| Curved Bridge | `Single Tile - Curved Bridge.png` |

### Symbols & Tile Icons (26 files)

| Category | Sheet | Icons |
|---|---|---|
| Property | `Symbols - Property Tile Symbols Sheet.png` | `Symbols - Property Categories Icons.png` |
| Shop | `Symbols - Shop Tile Symbols Sheet.png` | `Symbols - Shop Categories Icons.png` |
| Event | `Symbols - Event Tile Symbols Sheet.png` | — |
| Trap | `Symbols - Trap Tile Symbols Sheet.png` | `Symbols - Trap Categories Icons.png` |
| Transport | `Symbols - Transport Tile Symbols Sheet.png` | `Symbols - Transport Categories Icons.png` |
| Airport | `Symbols - Airport Tile Symbols Sheet.png` | `Symbols - Airport Categories Icons.png` |
| Harbor | `Symbols - Harbor Tile Symbols Sheet.png` | `Symbols - Harbor Service Categories Icons.png` |
| Train | `Symbols - Train Tile Symbols Sheet.png` | `Symbols - Train Service Categories Icons.png` |
| Danger | `Symbols - Danger Tile Symbols Sheet.png` | `Symbols - Danger Categories Icons.png` |
| Heal | `Symbols - Heal Tile Symbols Sheet.png` | `Symbols - Heal Categories Icons.png` |
| Weapon | `Symbols - Weapon Tile Symbols Sheet.png` | `Symbols - Weapon Categories Icons.png` |
| Black Market | `Symbols - Black Market Tile Symbols Sheet.png` | `Symbols - Black Market Categories Icons.png` |
| Snow Ground | `Symbols - Snow Ground Tile Symbols Sheet.png` | `Symbols - Snow Ground Categories Icons.png` |

### Biome Assets (51 files)

Each of the 9+ biomes has 5–6 asset sheets covering terrain, structures, props, hazards, and atmosphere VFX.

**Frozen Tundra** (8 files):
`Ground Terrain Sheet`, `Isometric Terrain Blocks`, `Structures`, `Props`, `Hazards (Cracking Ice)`, `Hazards Overview`, `Atmosphere & Snow VFX`

**Firelands** (8 files):
`Ground Terrain Sheet`, `Terrain Pack Blocks`, `Structures Full Pack`, `Structures Showcase Quad`, `Hazards (Isometric)`, `Hazards (Environment)`, `Props`, `Atmosphere & Fire VFX`

**Toxic Swamp** (5 files):
`Terrain Pack Blocks`, `Structures`, `Props`, `Hazards`, `Atmosphere & Toxic Fog VFX`

**Ancient Jungle** (5 files):
`Terrain Pack Blocks`, `Structures`, `Props`, `Hazards`, `Atmosphere & Fog VFX`

**Sand Kingdom** (5 files):
`Terrain Pack Blocks`, `Structures`, `Props`, `Hazards`, `Atmosphere & Sandstorm VFX`

**Dark Forest** (5 files):
`Terrain Pack Blocks`, `Structures`, `Props`, `Hazards & Curse Zone`, `Atmosphere & Purple Fog VFX`

**Sky Archipelago** (6 files):
`Showcase Overview`, `Terrain Pack Blocks`, `Structures`, `Props`, `Hazards & Lightning Zone`, `Atmosphere & Clouds VFX`

**Mechanical Wastes** (5 files):
`Terrain Pack Blocks`, `Structures`, `Props`, `Hazards & Laser Grid`, `Atmosphere & Sparks VFX`

**Pirate Cove** (5 files):
`Terrain Pack Blocks`, `Structures`, `Props`, `Hazards & Cannons`, `Atmosphere & Ocean Waves VFX`

### Game Systems (13 files)

| Category | Files |
|---|---|
| **Transport** | `Transport System - Airports & Aircraft.png`, `Transport System - Ships & Harbors.png`, `Transport System - Trains & Rail.png` |
| **Underground** | `Underground Assets - Tunnels & Secret Hatches.png` |
| **Property** | `Property System - Commercial & Retail Shops.png`, `Property System - Hotels & Lodging.png`, `Property System - Factories & Production.png`, `Property System - Banks & Finance.png` |
| **Combat** | `Combat Assets - Weapons.png`, `Combat Assets - Turrets & Defenses.png`, `Combat Assets - Traps.png` |
| **Events** | `Game Events - Disaster Assets.png` |
| **World** | `World Interaction - Mechanics & Devices.png` |

### UI & Characters (6 files)

| Category | Files |
|---|---|
| **UI** | `UI - HUD, Dice, Health Bars & Turn Tracker.png`, `UI - Resource & Status Icons.png` |
| **Characters** | `Characters - Player Avatars & Mascots.png` |
| **Cosmetics** | `Cosmetics - Hats, Skins & Emotes.png` |
| **Game Board** | `Game Board - Gameplay Screen (Pummel Party UI).png`, `Game Board - World Map Track Overview.png` |

### Vector Assets (2 files)

| Asset | File |
|---|---|
| Board Spiral Track | `Vector Mask - Game Board Spiral Track.png` |
| Splash Graphic | `Vector Mask - Splash Graphic Shape.png` |

---

**Total Assets: 119 files** — All renamed and organized by category. Ready for sprite slicing and implementation.

---

## Next Steps

1. **Initialize the Phaser 3 + Vite project** in the KAME directory
2. **Set up the Colyseus multiplayer server**
3. **Slice sprite sheets** into individual game-ready sprites
4. **Build the basic board** using the path tile system
5. **Implement dice rolling + player movement** as the first playable prototype

---

*Document created for KAME game project*
*Last updated: October 2026*
