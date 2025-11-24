# 🚀 Cosmic Survivor 🚀

A top-down arena survival game inspired by Brotato, built with vanilla HTML5, CSS3, and JavaScript.

## 🎮 Game Description

You're a stranded astronaut on a hostile alien planet. Survive endless waves of alien creatures while collecting credits to upgrade your abilities. The game features auto-aiming mechanics, strategic upgrades, and increasingly challenging waves.

## ✨ Features

- **Auto-Aim Combat**: Your character automatically targets and shoots nearby enemies
- **Wave-Based Gameplay**: Survive 60-second waves with increasing difficulty
- **Shop System**: Purchase upgrades between waves to enhance your abilities
- **Multiple Upgrade Types**:
  - Health & Armor
  - Damage & Fire Rate
  - Movement Speed
  - Critical Chance & Damage
  - Life Steal & Dodge
  - Range & Projectile Count
  - And more!
- **Dynamic Enemy Spawning**: Different enemy types with varying speeds and health
- **Visual Effects**: Particle systems, damage numbers, and smooth animations
- **Responsive UI**: Clean, cyberpunk-inspired interface with real-time stats

## 🕹️ Controls

### Desktop
- **WASD** or **Arrow Keys**: Move your character
- **Auto-Aim**: Automatically targets nearest enemies within range
- **Auto-Shoot**: Fires automatically at targeted enemies
- **Auto-Collect**: Automatically picks up nearby credits
- **🔊 Button**: Toggle sound effects
- **🏆 Button**: View achievements and statistics

### Mobile
- **Touch & Drag**: Virtual joystick appears on the left side of the screen
- **Auto-Aim & Auto-Shoot**: Same as desktop
- All UI buttons are touch-enabled

## 🚀 How to Play

1. Open `index.html` in a modern web browser
2. Click "Begin Mission" to start
3. Survive waves of enemies for 60 seconds each
4. Collect credits dropped by defeated enemies
5. Between waves, visit the upgrade station to purchase improvements
6. Try to survive as many waves as possible!

## 💡 Strategy Tips

- **Balance Your Build**: Don't focus on just damage - health and defense matter!
- **Pickup Range**: Upgrade this early to collect credits more easily
- **Multiple Projectiles**: Very powerful for hitting multiple enemies
- **Life Steal**: Helps you survive longer waves
- **Fire Rate**: More shots = more damage = more life steal
- **Movement Speed**: Essential for dodging enemy attacks

## 🎯 Game Mechanics

### Player Stats
- **Health**: Your survival depends on this
- **Damage**: How much each bullet hurts
- **Fire Rate**: How often you shoot
- **Speed**: Movement speed
- **Range**: How far you can shoot
- **Critical Chance**: Chance for bonus damage
- **Armor**: Reduces incoming damage
- **Dodge**: Chance to completely avoid damage
- **Life Steal**: Heal when dealing damage

### Enemies
- **6 Enemy Types**: Each with unique stats and behaviors
  - Normal: Standard speed and health
  - Fast: Move faster but have less health  
  - Tank: Slow but heavily armored
  - Swarm: Small and weak but numerous
  - Teleporter: Can teleport near the player
  - Shooter: Ranged attacks from a distance
- **Boss Waves**: Massive enemies every 5 waves with special abilities
- Enemies get stronger and more numerous with each wave

### Credits
- Earned by defeating enemies
- Amount increases with wave number
- Used to purchase upgrades in the shop

## 🛠️ Technical Details

### Enhanced Edition
- **Engine**: Pure JavaScript with modular ES6 structure
- **Canvas API**: HTML5 Canvas for rendering
- **Sound**: Web Audio API for procedural sound generation
- **Storage**: LocalStorage for achievements, high scores, and persistent stats
- **Mobile**: Touch event handling with virtual joystick
- **No Dependencies**: No frameworks or external libraries needed
- **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Resolution**: 1200x800 canvas (responsive on mobile)

### Modular Architecture
- Separated concerns with dedicated modules for:
  - Game state management
  - Entity systems (Player, Enemy, Boss)
  - Weapon systems
  - Achievement tracking
  - High score system
  - Sound effects
  - Touch controls
- Easy to extend and maintain
- Clean code structure following best practices

## 📁 Project Structure

```
Cosmic-Survivor/
├── index.html              # Classic version
├── index-enhanced.html     # Enhanced version with all new features
├── styles.css              # Game styling and UI (shared)
├── game.js                 # Classic game logic
├── main.js                 # Enhanced game with all features
├── js/                     # Modular code structure
│   ├── config.js           # Game configuration and character definitions
│   ├── game.js             # Main game state management
│   ├── entities/           # Entity classes
│   │   ├── player.js       # Player entity
│   │   ├── enemyTypes.js   # Enemy type definitions
│   │   └── bossTypes.js    # Boss type definitions
│   ├── systems/            # Game systems
│   │   ├── achievements.js # Achievement tracking
│   │   ├── highscore.js    # High score system
│   │   ├── sound.js        # Sound effects system
│   │   └── touchControls.js # Mobile touch controls
│   └── weapons/            # Weapon system
│       └── weaponSystem.js # Weapon types and projectiles
└── README.md               # This file
```

## 🎨 Theme & Design

Instead of a potato, you play as a cosmic astronaut with:
- Cyberpunk-inspired color scheme (cyan, green, purple)
- Space/alien aesthetic
- Smooth particle effects
- Professional UI design

## ✨ Enhanced Edition Features

**All future enhancements have been implemented!**

### 🎭 Character Selection
Choose from 8 unique characters with different starting stats:
- **⚖️ Balanced Astronaut**: Well-rounded stats for any playstyle
- **🛡️ Tank**: High health (150 HP) and armor, slower movement
- **⚡ Speedster**: Fast movement and fire rate, lower health
- **🎯 Sniper**: Long range with high critical damage
- **🔫 Gunslinger**: Multi-shot specialist with rapid fire
- **🧛 Vampire**: Drains life from enemies with each hit
- **⚔️ Berserker**: High damage but risky - glass cannon
- **🔧 Engineer**: Defensive specialist with armor and range

### 👾 Enemy Types
Face 6 different enemy types with unique behaviors:
- **Normal Aliens**: Standard enemies with balanced stats
- **Fast Aliens**: Quick movement but fragile
- **Tank Aliens**: Heavily armored with high health
- **Swarm Aliens**: Small, weak enemies in large numbers
- **Teleporter Aliens**: Can teleport near the player (unlocked at wave 7)
- **Shooter Aliens**: Ranged attackers that fire projectiles (unlocked at wave 10)

### 👹 Boss System
- **Boss waves every 5 waves** with massive health and unique abilities
- **The Destroyer**: Melee boss that can charge and summon minions
- **Brood Mother**: Spawns swarm minions during battle
- **Void Walker**: Teleports around and uses void beam attacks

### 🔫 Weapon Types
Multiple weapon options for different playstyles:
- **🔫 Basic Blaster**: Standard energy weapon
- **⚡ Laser Gun**: Continuous beam with high fire rate
- **🚀 Rocket Launcher**: Explosive area damage
- **🌟 Spread Shot**: Fires multiple projectiles in a spread pattern

### 🏆 Achievements System
Unlock 10 achievements by completing challenges:
- 🎯 First Blood - Defeat your first enemy
- 🌊 Wave Warrior - Survive to wave 5
- 🏆 Wave Master - Survive to wave 10
- 👑 Legend - Survive to wave 20
- 💀 Slayer - Defeat 100 enemies total
- ☠️ Exterminator - Defeat 500 enemies total
- 👹 Boss Killer - Defeat your first boss
- 💰 Wealthy - Collect 1000 total credits
- 🔫 Weapon Master - Use all weapon types
- 🛒 Big Spender - Purchase 50 upgrades

### 📊 High Score Tracking
- Top 10 high scores saved locally
- Scores based on waves survived, enemies killed, and bosses defeated
- Persistent across game sessions

### 🔊 Sound System
- Dynamic sound effects using Web Audio API
- Procedurally generated sounds (no external files needed)
- Sound effects for: shooting, hits, enemy deaths, pickups, wave completion, boss spawn, and more
- Toggle sound on/off with the 🔊 button

### 📱 Mobile Touch Controls
- Virtual joystick for mobile devices
- Touch and drag on the left side of the screen to move
- Automatic detection of mobile devices
- Fully playable on smartphones and tablets

## 🎮 How to Play

### Enhanced Edition
1. Open `index-enhanced.html` in a modern web browser
2. Click "Begin Mission" to start
3. Choose your character from 4 unique options
4. Survive waves of enemies for 60 seconds each
5. Face boss challenges every 5 waves
6. Collect credits and purchase upgrades between waves
7. Unlock achievements and climb the high score leaderboard!

### Classic Edition
- The original version is still available in `index.html`

## 📝 License

This is a learning project. Feel free to use and modify as you wish!

## 🎮 Enjoy the Game!

Good luck, astronaut! May you survive the cosmic onslaught! 🌟