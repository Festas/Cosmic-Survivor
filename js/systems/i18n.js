// i18n System for Cosmic Survivor
// Provides translation lookups, language switching, and DOM translation.
// Exposes: window.i18n (instance), window.t(key, fallback?, vars?), window.translateDOM(root?)

const SUPPORTED_LANGS = ['en', 'de'];
const STORAGE_KEY = 'cosmicSurvivor_lang';

// Translation dictionary
// Keep keys flat & namespaced (e.g. menu.start)
const STRINGS = {
    en: {
        // Common
        'common.close': 'Close',
        'common.back': 'Back',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.confirm': 'Confirm',
        'common.continue': 'Continue',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.loading': 'Initializing…',
        'common.locked': 'Locked',
        'common.unlocked': 'Unlocked',
        'common.next': 'Next',
        'common.prev': 'Prev',
        'common.start': 'Start',
        'common.retry': 'Try Again',

        // Loading / Rotate
        'loading.title': '🚀 Cosmic Survivor 🚀',
        'loading.text': 'Initializing…',
        'rotate.text': 'Please rotate your device to landscape mode',

        // Top HUD
        'hud.wave': 'Wave',
        'hud.time': 'Time',
        'hud.credits': 'Credits',

        // Start menu
        'menu.title': '🚀 Cosmic Survivor 🚀',
        'menu.subtitle': 'Reworked Edition',
        'menu.intro': 'Survive waves of alien creatures in a perfectly balanced arena!',
        'menu.beginMission': 'Begin Mission',
        'menu.howToPlay': '❔ How to Play / Features',
        'menu.classic': '🎯 Classic Survival',
        'menu.story': '📖 Story Mode',
        'menu.daily': '☀️ Daily Challenge',
        'menu.multiplayer': '🎮 Co-op Multiplayer',
        'menu.settings': '⚙️ Settings',
        'menu.account': '👤 Account',
        'menu.achievements': '🏆 Achievements',
        'menu.starship': '🚀 Starship Upgrades',
        'menu.gameMode': 'Choose Your Mission',
        'menu.classicDesc': 'Endless waves. How long can you last?',
        'menu.storyDesc': 'Five themed chapters with their own bosses.',
        'menu.dailyDesc': 'A new shared challenge every day. Same seed for everyone!',
        'menu.multiplayerDesc': 'Up to 4 players online. Share XP, share glory.',

        // Features list
        'menu.features': '✨ Features:',
        'menu.controls': 'Controls:',
        'menu.controlMove': '🎮 WASD / Arrow Keys – Move',
        'menu.controlDash': 'SPACE – Dash (1.5s cooldown)',
        'menu.controlWeapons': '1-8 Keys – Switch Weapons',
        'menu.controlPause': 'ESC – Pause/Resume',
        'menu.controlTouch': '📱 Touch & Drag – Virtual Joystick',
        'menu.controlAuto': '🔫 Auto-aim & Auto-shoot',
        'menu.controlEmote': 'T – Emote Wheel (multiplayer)',
        'menu.controlPing': 'Q – Drop Ping (multiplayer)',
        'menu.controlRevive': 'F – Revive Teammate (hold near downed ally)',

        // Difficulty
        'difficulty.title': '⚙️ Select Difficulty',
        'difficulty.easy': '🟢 Easy',
        'difficulty.easyDesc': 'Enemies are weaker, more credits earned',
        'difficulty.easyStats': '-30% Enemy HP, -40% Enemy Damage, +30% Credits',
        'difficulty.normal': '🟡 Normal',
        'difficulty.normalDesc': 'The intended experience',
        'difficulty.normalStats': 'Standard enemies and rewards',
        'difficulty.hard': '🔴 Hard',
        'difficulty.hardDesc': 'For experienced survivors',
        'difficulty.hardStats': '+40% Enemy HP, +30% Enemy Damage, -15% Credits',
        'difficulty.nightmare': '💀 Nightmare',
        'difficulty.nightmareDesc': 'Only the strongest survive',
        'difficulty.nightmareStats': '+100% Enemy HP, +60% Enemy Damage, -30% Credits',

        // Character select
        'character.title': '🚀 Select Your Character 🚀',
        'character.intro': 'Choose your astronaut for this mission',

        // Shop
        'shop.title': 'Upgrade Station',
        'shop.waveComplete': 'Wave {wave} Complete!',
        'shop.next': 'Start Next Wave',
        'shop.complete': 'complete',
        'shop.pageFmt': 'Page {page} of {total}',

        // Game over
        'gameover.fail': 'Mission Failed',
        'gameover.legendary': '🌟 LEGENDARY SURVIVOR! 🌟',
        'gameover.success': '🏆 Mission Success! 🏆',
        'gameover.valiant': '⚔️ Valiant Effort ⚔️',
        'gameover.message': 'You survived {wave} waves',
        'gameover.retry': 'Try Again',
        'gameover.report': '📊 Mission Report',
        'gameover.combat': '⚔️ Combat',
        'gameover.progression': '📈 Progression',

        // Pause
        'pause.title': '⏸️ PAUSED',
        'pause.help': 'Press ESC or click Resume to continue',
        'pause.resume': 'Resume',
        'pause.openSettings': '⚙️ Settings',
        'pause.exitToMenu': '🏠 Exit to Menu',

        // Settings
        'settings.title': '⚙️ Settings',
        'settings.language': '🌐 Language',
        'settings.langEn': 'English',
        'settings.langDe': 'Deutsch',
        'settings.soundVol': '🔊 Sound Volume',
        'settings.musicVol': '🎵 Music Volume',
        'settings.screenShake': '📳 Screen Shake',
        'settings.reducedMotion': '♿ Reduced Motion',
        'settings.damageNumbers': '💢 Show Damage Numbers',
        'settings.showFps': '📊 Show FPS',
        'settings.colorblind': '🎨 Colorblind Mode',
        'settings.colorblindNone': 'None',
        'settings.colorblindProt': 'Protanopia (Red-Blind)',
        'settings.colorblindDeut': 'Deuteranopia (Green-Blind)',
        'settings.colorblindTrit': 'Tritanopia (Blue-Blind)',
        'settings.uiScale': '📏 UI Scale',
        'settings.saveClose': 'Save & Close',

        // Multiplayer
        'mp.title': '🎮 Co-op Multiplayer',
        'mp.intro': 'Play with up to 4 players on different devices!',
        'mp.create': '🏠 Create Room',
        'mp.createDesc': 'Host a game and invite friends',
        'mp.join': '🔗 Join Room',
        'mp.joinDesc': 'Enter a room code to join a friend',
        'mp.difficulty': 'Difficulty:',
        'mp.maxPlayers': 'Max Players:',
        'mp.sharedXp': 'Shared XP',
        'mp.createBtn': 'Create Room',
        'mp.joinBtn': 'Join Room',
        'mp.codePlaceholder': 'Enter room code',
        'mp.lobby': '🎮 Co-op Lobby',
        'mp.roomCode': 'Room Code:',
        'mp.copy': '📋 Copy',
        'mp.copied': 'Code copied!',
        'mp.players': 'Players',
        'mp.selectChar': 'Select Character',
        'mp.ready': 'Ready Up',
        'mp.notReady': 'Not Ready',
        'mp.startGame': 'Start Game',
        'mp.leave': 'Leave Room',
        'mp.selectCharFirst': 'Please select a character first!',
        'mp.cantConnect': '⚠️ Cannot connect to multiplayer server',
        'mp.connecting': 'Connecting to multiplayer server…',
        'mp.loginFirst': 'Please log in or create an account first',
        'mp.welcomeFmt': 'Welcome, {name}!',
        'mp.joined': '{name} joined the room!',
        'mp.disconnected': '{name} disconnected',
        'mp.eliminated': '💀 {name} has been eliminated!',
        'mp.disconnectedSrv': '⚠️ Disconnected from server!',
        'mp.startedFmt': '🎮 Co-op game started with {n} players!',
        'mp.bossDownFmt': '🏆 Boss defeated! Team strikes again!',

        // Emotes (multiplayer)
        'emote.wave': '👋 Hi!',
        'emote.lol': '😂 LOL',
        'emote.angry': '😡 Argh!',
        'emote.heart': '❤️ Thanks!',
        'emote.alert': '🚨 Watch out!',
        'emote.help': '🆘 Help!',
        'emote.celebrate': '🎉 GG!',
        'emote.teamup': '🤝 With me!',
        'emote.title': 'Emotes',
        'mp.openEmote': 'Open Emote Wheel (T)',

        // Quick chat
        'quickchat.help': 'Help!',
        'quickchat.push': 'Push!',
        'quickchat.defend': 'Defend!',
        'quickchat.gg': 'GG!',

        // Revive
        'revive.downed': '💔 {name} is down! Revive them!',
        'revive.downedYou': '💔 You are down! Hold on!',
        'revive.reviving': 'Reviving {name}…',
        'revive.revived': '💚 {name} is back in the fight!',
        'revive.revivedYou': '💚 You are back in the fight!',
        'revive.died': '💀 {name} could not be saved.',
        'revive.youDied': '💀 You could not be saved.',
        'revive.holdF': 'Hold F to revive',

        // Ping
        'ping.danger': '⚠️ Danger here!',
        'ping.rally': '📍 Rally here!',
        'ping.placed': 'Ping placed',

        // MVP screen
        'mvp.title': '🏆 Match Summary',
        'mvp.kills': 'Most Kills',
        'mvp.damage': 'Most Damage',
        'mvp.revives': 'Most Revives',
        'mvp.bosses': 'Boss Slayer',
        'mvp.continue': 'Continue',

        // Story mode
        'story.title': '📖 Story Mode',
        'story.intro': 'Earth is silent. The colonies were the last hope. Now even they are falling. Choose a chapter to begin your stand.',
        'story.chapter': 'Chapter {n}',
        'story.start': 'Start Chapter',
        'story.locked': '🔒 Complete the previous chapter to unlock',
        'story.complete': '✅ Completed',
        'story.victory': '🌟 CHAPTER COMPLETE 🌟',
        'story.defeat': 'Chapter failed — try again, survivor.',
        'story.allComplete': '🎖️ All chapters complete. You are the legend the cosmos needed.',
        'story.continueBtn': 'Continue',
        'story.skipBtn': 'Skip ▶',

        // Story chapters - intro/outro/title
        'story.ch1.title': 'Chapter 1 – Wake-up Call',
        'story.ch1.intro': 'Cryo-pod failure on the mining station Hephaestus. You crawl out into the dark. Something is breathing in the vents.',
        'story.ch1.outro': 'You torched the swarm and patched the breach. The station is yours — for now.',
        'story.ch2.title': 'Chapter 2 – The Crimson Reef',
        'story.ch2.intro': 'A drifting bio-reef has fused with an old freighter. Pulsing tentacles guard the cargo hold. Sound the recall horn.',
        'story.ch2.outro': 'The reef-mind shrieks and dies. The cargo holds star-charts to a place we should not visit.',
        'story.ch3.title': 'Chapter 3 – Voidborne',
        'story.ch3.intro': 'Out past the Kuiper line, things move that have never seen light. Your ship fell silent ten minutes ago. You did not.',
        'story.ch3.outro': 'You spit vacuum from your visor. The voidborne queen is gone. Something even older heard the fight.',
        'story.ch4.title': 'Chapter 4 – The Hollow Forge',
        'story.ch4.intro': 'A dyson forge, abandoned and humming. Reactivated drones think you are scrap to recycle. Disagree, loudly.',
        'story.ch4.outro': 'You crash the forge core. The drones go cold. The forge’s last broadcast was a single word: “Survive.”',
        'story.ch5.title': 'Chapter 5 – Last Light',
        'story.ch5.intro': 'You traced the signal to its source: a star-eating titan that calls itself origin. End it, or end with it.',
        'story.ch5.outro': 'The titan collapses inward, taking its hunger with it. Dawn rises on a sky that is finally, blessedly empty.',

        // Daily Challenge
        'daily.title': '☀️ Daily Challenge',
        'daily.seedFmt': "Today's seed: {seed}",
        'daily.intro': 'Same loadout, same modifiers, same enemies — for everyone, every day. How far can you push?',
        'daily.modifierFmt': 'Today\'s modifier: {mod}',
        'daily.start': 'Start Daily Run',
        'daily.alreadyDone': 'You already played today — go again!',

        // Account
        'account.title': '👤 Account',
        'account.name': 'Name:',
        'account.username': 'Username:',
        'account.career': '📊 Career Stats',
        'account.kills': '👾 Total Kills:',
        'account.maxWave': '🌊 Max Wave:',
        'account.totalCredits': '💰 Total Credits:',
        'account.gamesPlayed': '🎮 Games Played:',
        'account.logout': 'Logout',
        'account.login': 'Login',
        'account.register': 'Register',
        'account.guest': 'Play as Guest',
        'account.usernameP': 'Username',
        'account.passwordP': 'Password',
        'account.usernameRP': 'Username (3-20 chars)',
        'account.displayP': 'Display Name',
        'account.passwordRP': 'Password (6+ chars)',
        'account.divider': '— or —',
        'account.notConnected': 'Not connected to server. Please wait and try again.',
    },
    de: {
        // Common
        'common.close': 'Schließen',
        'common.back': 'Zurück',
        'common.cancel': 'Abbrechen',
        'common.save': 'Speichern',
        'common.confirm': 'Bestätigen',
        'common.continue': 'Weiter',
        'common.yes': 'Ja',
        'common.no': 'Nein',
        'common.loading': 'Initialisiere…',
        'common.locked': 'Gesperrt',
        'common.unlocked': 'Freigeschaltet',
        'common.next': 'Weiter',
        'common.prev': 'Zurück',
        'common.start': 'Start',
        'common.retry': 'Nochmal versuchen',

        'loading.title': '🚀 Cosmic Survivor 🚀',
        'loading.text': 'Initialisiere…',
        'rotate.text': 'Bitte drehe dein Gerät ins Querformat',

        'hud.wave': 'Welle',
        'hud.time': 'Zeit',
        'hud.credits': 'Credits',

        'menu.title': '🚀 Cosmic Survivor 🚀',
        'menu.subtitle': 'Überarbeitete Edition',
        'menu.intro': 'Überlebe Wellen von Alien-Kreaturen in einer perfekt ausbalancierten Arena!',
        'menu.beginMission': 'Mission starten',
        'menu.howToPlay': '❔ Spielanleitung / Features',
        'menu.classic': '🎯 Klassisches Survival',
        'menu.story': '📖 Story-Modus',
        'menu.daily': '☀️ Tägliche Challenge',
        'menu.multiplayer': '🎮 Koop-Multiplayer',
        'menu.settings': '⚙️ Einstellungen',
        'menu.account': '👤 Konto',
        'menu.achievements': '🏆 Erfolge',
        'menu.starship': '🚀 Raumschiff-Upgrades',
        'menu.gameMode': 'Wähle deine Mission',
        'menu.classicDesc': 'Endlose Wellen. Wie lange hältst du durch?',
        'menu.storyDesc': 'Fünf Kapitel mit eigenen Bossen und Geschichten.',
        'menu.dailyDesc': 'Jeden Tag eine neue Challenge — gleicher Seed für alle!',
        'menu.multiplayerDesc': 'Bis zu 4 Spieler online. XP teilen, Ruhm teilen.',

        'menu.features': '✨ Features:',
        'menu.controls': 'Steuerung:',
        'menu.controlMove': '🎮 WASD / Pfeiltasten – Bewegen',
        'menu.controlDash': 'LEERTASTE – Ausweichen (1,5s Cooldown)',
        'menu.controlWeapons': 'Tasten 1–8 – Waffe wechseln',
        'menu.controlPause': 'ESC – Pause/Fortsetzen',
        'menu.controlTouch': '📱 Tippen & Ziehen – Virtueller Joystick',
        'menu.controlAuto': '🔫 Auto-Zielen & Auto-Schießen',
        'menu.controlEmote': 'T – Emote-Rad (Multiplayer)',
        'menu.controlPing': 'Q – Markierung setzen (Multiplayer)',
        'menu.controlRevive': 'F – Mitspieler wiederbeleben (in der Nähe halten)',

        'difficulty.title': '⚙️ Schwierigkeit wählen',
        'difficulty.easy': '🟢 Leicht',
        'difficulty.easyDesc': 'Schwächere Gegner, mehr Credits',
        'difficulty.easyStats': '-30% HP, -40% Schaden, +30% Credits',
        'difficulty.normal': '🟡 Normal',
        'difficulty.normalDesc': 'Die beabsichtigte Erfahrung',
        'difficulty.normalStats': 'Standard-Gegner und Belohnungen',
        'difficulty.hard': '🔴 Schwer',
        'difficulty.hardDesc': 'Für erfahrene Überlebende',
        'difficulty.hardStats': '+40% HP, +30% Schaden, -15% Credits',
        'difficulty.nightmare': '💀 Albtraum',
        'difficulty.nightmareDesc': 'Nur die Stärksten überleben',
        'difficulty.nightmareStats': '+100% HP, +60% Schaden, -30% Credits',

        'character.title': '🚀 Wähle deinen Charakter 🚀',
        'character.intro': 'Wähle deinen Astronauten für diese Mission',

        'shop.title': 'Upgrade-Station',
        'shop.waveComplete': 'Welle {wave} abgeschlossen!',
        'shop.next': 'Nächste Welle starten',
        'shop.complete': 'abgeschlossen',
        'shop.pageFmt': 'Seite {page} von {total}',

        'gameover.fail': 'Mission fehlgeschlagen',
        'gameover.legendary': '🌟 LEGENDÄRER ÜBERLEBENDER! 🌟',
        'gameover.success': '🏆 Mission erfolgreich! 🏆',
        'gameover.valiant': '⚔️ Tapferer Versuch ⚔️',
        'gameover.message': 'Du hast {wave} Wellen überlebt',
        'gameover.retry': 'Nochmal versuchen',
        'gameover.report': '📊 Missionsbericht',
        'gameover.combat': '⚔️ Kampf',
        'gameover.progression': '📈 Fortschritt',

        'pause.title': '⏸️ PAUSIERT',
        'pause.help': 'Drücke ESC oder klicke auf Fortsetzen',
        'pause.resume': 'Fortsetzen',
        'pause.openSettings': '⚙️ Einstellungen',
        'pause.exitToMenu': '🏠 Zurück zum Menü',

        'settings.title': '⚙️ Einstellungen',
        'settings.language': '🌐 Sprache',
        'settings.langEn': 'English',
        'settings.langDe': 'Deutsch',
        'settings.soundVol': '🔊 Soundlautstärke',
        'settings.musicVol': '🎵 Musiklautstärke',
        'settings.screenShake': '📳 Bildschirm-Wackeln',
        'settings.reducedMotion': '♿ Reduzierte Bewegung',
        'settings.damageNumbers': '💢 Schadenszahlen anzeigen',
        'settings.showFps': '📊 FPS anzeigen',
        'settings.colorblind': '🎨 Farbenblindmodus',
        'settings.colorblindNone': 'Aus',
        'settings.colorblindProt': 'Protanopie (Rotblind)',
        'settings.colorblindDeut': 'Deuteranopie (Grünblind)',
        'settings.colorblindTrit': 'Tritanopie (Blaublind)',
        'settings.uiScale': '📏 UI-Größe',
        'settings.saveClose': 'Speichern & Schließen',

        'mp.title': '🎮 Koop-Multiplayer',
        'mp.intro': 'Spiele mit bis zu 4 Spielern auf verschiedenen Geräten!',
        'mp.create': '🏠 Raum erstellen',
        'mp.createDesc': 'Hoste ein Spiel und lade Freunde ein',
        'mp.join': '🔗 Raum beitreten',
        'mp.joinDesc': 'Gib einen Raum-Code ein, um beizutreten',
        'mp.difficulty': 'Schwierigkeit:',
        'mp.maxPlayers': 'Max. Spieler:',
        'mp.sharedXp': 'Geteilte XP',
        'mp.createBtn': 'Raum erstellen',
        'mp.joinBtn': 'Beitreten',
        'mp.codePlaceholder': 'Raum-Code eingeben',
        'mp.lobby': '🎮 Koop-Lobby',
        'mp.roomCode': 'Raum-Code:',
        'mp.copy': '📋 Kopieren',
        'mp.copied': 'Code kopiert!',
        'mp.players': 'Spieler',
        'mp.selectChar': 'Charakter wählen',
        'mp.ready': 'Bereit',
        'mp.notReady': 'Nicht bereit',
        'mp.startGame': 'Spiel starten',
        'mp.leave': 'Raum verlassen',
        'mp.selectCharFirst': 'Wähle zuerst einen Charakter!',
        'mp.cantConnect': '⚠️ Verbindung zum Server fehlgeschlagen',
        'mp.connecting': 'Verbinde mit Multiplayer-Server…',
        'mp.loginFirst': 'Bitte zuerst einloggen oder Konto erstellen',
        'mp.welcomeFmt': 'Willkommen, {name}!',
        'mp.joined': '{name} ist dem Raum beigetreten!',
        'mp.disconnected': '{name} hat das Spiel verlassen',
        'mp.eliminated': '💀 {name} wurde ausgeschaltet!',
        'mp.disconnectedSrv': '⚠️ Verbindung zum Server verloren!',
        'mp.startedFmt': '🎮 Koop-Spiel gestartet mit {n} Spielern!',
        'mp.bossDownFmt': '🏆 Boss besiegt! Das Team triumphiert!',

        'emote.wave': '👋 Hi!',
        'emote.lol': '😂 LOL',
        'emote.angry': '😡 Argh!',
        'emote.heart': '❤️ Danke!',
        'emote.alert': '🚨 Achtung!',
        'emote.help': '🆘 Hilfe!',
        'emote.celebrate': '🎉 GG!',
        'emote.teamup': '🤝 Mit mir!',
        'emote.title': 'Emotes',
        'mp.openEmote': 'Emote-Rad öffnen (T)',

        'quickchat.help': 'Hilfe!',
        'quickchat.push': 'Vor!',
        'quickchat.defend': 'Halten!',
        'quickchat.gg': 'GG!',

        'revive.downed': '💔 {name} liegt am Boden! Wiederbeleben!',
        'revive.downedYou': '💔 Du liegst am Boden! Halt durch!',
        'revive.reviving': 'Belebe {name} wieder…',
        'revive.revived': '💚 {name} ist zurück im Kampf!',
        'revive.revivedYou': '💚 Du bist zurück im Kampf!',
        'revive.died': '💀 {name} konnte nicht gerettet werden.',
        'revive.youDied': '💀 Du konntest nicht gerettet werden.',
        'revive.holdF': 'Halte F zum Wiederbeleben',

        'ping.danger': '⚠️ Gefahr hier!',
        'ping.rally': '📍 Sammeln hier!',
        'ping.placed': 'Markierung gesetzt',

        'mvp.title': '🏆 Match-Auswertung',
        'mvp.kills': 'Meiste Kills',
        'mvp.damage': 'Höchster Schaden',
        'mvp.revives': 'Meiste Revives',
        'mvp.bosses': 'Boss-Schlächter',
        'mvp.continue': 'Weiter',

        'story.title': '📖 Story-Modus',
        'story.intro': 'Die Erde schweigt. Die Kolonien waren die letzte Hoffnung. Jetzt fallen auch sie. Wähle ein Kapitel und beginne deinen Widerstand.',
        'story.chapter': 'Kapitel {n}',
        'story.start': 'Kapitel starten',
        'story.locked': '🔒 Schließe das vorherige Kapitel ab',
        'story.complete': '✅ Abgeschlossen',
        'story.victory': '🌟 KAPITEL ABGESCHLOSSEN 🌟',
        'story.defeat': 'Kapitel gescheitert — versuch es erneut, Überlebender.',
        'story.allComplete': '🎖️ Alle Kapitel abgeschlossen. Du bist die Legende, die der Kosmos brauchte.',
        'story.continueBtn': 'Weiter',
        'story.skipBtn': 'Überspringen ▶',

        'story.ch1.title': 'Kapitel 1 – Weckruf',
        'story.ch1.intro': 'Kryo-Kapsel-Ausfall auf der Bergbaustation Hephaistos. Du kriechst ins Dunkel. Etwas atmet in den Lüftungen.',
        'story.ch1.outro': 'Du hast den Schwarm vernichtet und das Leck geflickt. Die Station gehört dir — vorerst.',
        'story.ch2.title': 'Kapitel 2 – Das Karmesinriff',
        'story.ch2.intro': 'Ein driftendes Bio-Riff hat sich mit einem alten Frachter verbunden. Pulsierende Tentakel bewachen die Ladung. Lass die Sirene heulen.',
        'story.ch2.outro': 'Der Riffgeist kreischt und stirbt. Die Ladung enthält Sternenkarten zu einem Ort, den wir nicht besuchen sollten.',
        'story.ch3.title': 'Kapitel 3 – Leerengeboren',
        'story.ch3.intro': 'Hinter dem Kuipergürtel bewegen sich Dinge, die nie Licht gesehen haben. Dein Schiff verstummte vor zehn Minuten. Du nicht.',
        'story.ch3.outro': 'Du spuckst Vakuum aus dem Visier. Die Königin der Leeren ist tot. Etwas noch Älteres hat den Kampf gehört.',
        'story.ch4.title': 'Kapitel 4 – Die hohle Schmiede',
        'story.ch4.intro': 'Eine verlassene Dyson-Schmiede summt noch. Die reaktivierten Drohnen halten dich für Schrott. Widersprich laut.',
        'story.ch4.outro': 'Du sprengst den Kern der Schmiede. Die Drohnen erkalten. Die letzte Botschaft war ein einziges Wort: „Überlebe.“',
        'story.ch5.title': 'Kapitel 5 – Letztes Licht',
        'story.ch5.intro': 'Du hast das Signal zur Quelle verfolgt: ein sternenfressender Titan, der sich „Ursprung“ nennt. Beende ihn — oder ende mit ihm.',
        'story.ch5.outro': 'Der Titan kollabiert nach innen und nimmt seinen Hunger mit. Die Dämmerung steigt über einen endlich, gnädig leeren Himmel.',

        'daily.title': '☀️ Tägliche Challenge',
        'daily.seedFmt': 'Heutiger Seed: {seed}',
        'daily.intro': 'Gleicher Loadout, gleiche Modifier, gleiche Gegner — für alle, jeden Tag. Wie weit kommst du?',
        'daily.modifierFmt': 'Heutiger Modifier: {mod}',
        'daily.start': 'Tageslauf starten',
        'daily.alreadyDone': 'Heute schon gespielt — gleich nochmal!',

        'account.title': '👤 Konto',
        'account.name': 'Name:',
        'account.username': 'Benutzername:',
        'account.career': '📊 Karriere-Statistiken',
        'account.kills': '👾 Gesamt-Kills:',
        'account.maxWave': '🌊 Höchste Welle:',
        'account.totalCredits': '💰 Gesamt-Credits:',
        'account.gamesPlayed': '🎮 Spiele gespielt:',
        'account.logout': 'Abmelden',
        'account.login': 'Anmelden',
        'account.register': 'Registrieren',
        'account.guest': 'Als Gast spielen',
        'account.usernameP': 'Benutzername',
        'account.passwordP': 'Passwort',
        'account.usernameRP': 'Benutzername (3–20 Zeichen)',
        'account.displayP': 'Anzeigename',
        'account.passwordRP': 'Passwort (6+ Zeichen)',
        'account.divider': '— oder —',
        'account.notConnected': 'Keine Verbindung zum Server. Bitte warten und erneut versuchen.',
    },
};

export class I18n {
    constructor() {
        this.lang = this._loadLang();
        this.listeners = new Set();
    }

    _loadLang() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
        } catch {}
        // Detect from browser
        const nav = (navigator.language || 'en').toLowerCase();
        if (nav.startsWith('de')) return 'de';
        return 'en';
    }

    getLanguage() { return this.lang; }
    getSupportedLanguages() { return [...SUPPORTED_LANGS]; }

    setLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) return;
        this.lang = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
        this.translateDOM();
        this.listeners.forEach(fn => { try { fn(lang); } catch {} });
    }

    onChange(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    /**
     * Translate a key.
     * @param {string} key - dot-separated key
     * @param {string|object} [fallbackOrVars] - fallback string OR variables object
     * @param {object} [vars] - {placeholder: value}
     */
    t(key, fallbackOrVars, vars) {
        let fallback = key;
        if (typeof fallbackOrVars === 'string') {
            fallback = fallbackOrVars;
        } else if (fallbackOrVars && typeof fallbackOrVars === 'object') {
            vars = fallbackOrVars;
        }
        const dict = STRINGS[this.lang] || STRINGS.en;
        let s = dict[key];
        if (s === undefined) s = STRINGS.en[key];
        if (s === undefined) s = fallback;
        if (vars && typeof s === 'string') {
            s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
        }
        return s;
    }

    /**
     * Translate all data-i18n attributes within `root` (default: document).
     * Supported attributes:
     *   data-i18n="key"               -> sets textContent
     *   data-i18n-html="key"          -> sets innerHTML (use carefully, only with trusted keys)
     *   data-i18n-placeholder="key"   -> sets placeholder
     *   data-i18n-title="key"         -> sets title
     *   data-i18n-aria-label="key"    -> sets aria-label
     */
    translateDOM(root) {
        const r = root || document;
        const apply = (el, attr, setter) => {
            const key = el.getAttribute(attr);
            if (!key) return;
            setter(this.t(key));
        };
        r.querySelectorAll('[data-i18n]').forEach(el => apply(el, 'data-i18n', v => { el.textContent = v; }));
        r.querySelectorAll('[data-i18n-html]').forEach(el => apply(el, 'data-i18n-html', v => { el.innerHTML = v; }));
        r.querySelectorAll('[data-i18n-placeholder]').forEach(el => apply(el, 'data-i18n-placeholder', v => { el.setAttribute('placeholder', v); }));
        r.querySelectorAll('[data-i18n-title]').forEach(el => apply(el, 'data-i18n-title', v => { el.setAttribute('title', v); }));
        r.querySelectorAll('[data-i18n-aria-label]').forEach(el => apply(el, 'data-i18n-aria-label', v => { el.setAttribute('aria-label', v); }));
        // Also update html lang attribute
        if (document.documentElement) document.documentElement.lang = this.lang;
    }
}

// Auto-init on import & expose globally so non-module scripts (main.js) can use it
const _instance = new I18n();
if (typeof window !== 'undefined') {
    window.i18n = _instance;
    window.t = (key, fallback, vars) => _instance.t(key, fallback, vars);
    window.translateDOM = (root) => _instance.translateDOM(root);
}

export default _instance;
