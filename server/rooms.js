// Room management for multiplayer co-op
import { v4 as uuidv4 } from 'uuid';

const MAX_PLAYERS_PER_ROOM = 4;
const ROOM_CODE_LENGTH = 6;
const ROOM_CLEANUP_INTERVAL = 60000; // 1 minute
const ROOM_IDLE_TIMEOUT = 300000; // 5 minutes idle before auto-close

// Active rooms map: roomCode -> Room
const rooms = new Map();

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)
    let code;
    do {
        code = '';
        for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (rooms.has(code));
    return code;
}

export class Room {
    constructor(hostId, hostName, settings = {}) {
        this.id = uuidv4();
        this.code = generateRoomCode();
        this.hostId = hostId;
        this.state = 'lobby'; // lobby, playing, gameOver
        this.players = new Map(); // playerId -> PlayerInfo
        this.settings = {
            difficulty: settings.difficulty || 'normal',
            maxPlayers: Math.min(settings.maxPlayers || 4, MAX_PLAYERS_PER_ROOM),
            sharedXP: settings.sharedXP !== false,
            friendlyFire: settings.friendlyFire || false,
        };
        this.gameState = null; // Set when game starts
        this.createdAt = Date.now();
        this.lastActivity = Date.now();

        // Add host as first player
        this.addPlayer(hostId, hostName, null, true);
    }

    addPlayer(playerId, displayName, ws, isHost = false) {
        if (this.players.has(playerId)) {
            // Player already in room - update their ws reference and return success
            const existing = this.players.get(playerId);
            existing.ws = ws;
            return { success: true, playerIndex: existing.playerIndex, color: existing.color };
        }
        if (this.players.size >= this.settings.maxPlayers) {
            return { error: 'Room is full' };
        }
        if (this.state !== 'lobby') {
            return { error: 'Game already in progress' };
        }

        // Find first unused player index to avoid color collisions after leave/rejoin
        const playerColors = ['#00ff88', '#ff6b6b', '#4ecdc4', '#ffd93d'];
        const usedIndices = new Set();
        for (const p of this.players.values()) {
            usedIndices.add(p.playerIndex);
        }
        let playerIndex = 0;
        while (usedIndices.has(playerIndex)) {
            playerIndex++;
        }
        
        this.players.set(playerId, {
            id: playerId,
            displayName,
            ws,
            isHost,
            ready: isHost, // Host is always ready
            characterId: null,
            playerIndex,
            color: playerColors[playerIndex],
            // Game state (updated during play)
            x: 0,
            y: 0,
            health: 0,
            maxHealth: 0,
            isAlive: true,
            facingRight: true,
            aimAngle: 0,
            isMoving: false,
            walkFrame: 0,
            isDashing: false,
            activeWeaponSlot: 0,
            weaponSlots: [],
            level: 1,
        });

        this.lastActivity = Date.now();
        return { success: true, playerIndex, color: playerColors[playerIndex] };
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        this.players.delete(playerId);
        this.lastActivity = Date.now();

        // If host left, assign new host
        if (player.isHost && this.players.size > 0) {
            const newHost = this.players.values().next().value;
            newHost.isHost = true;
            this.hostId = newHost.id;
        }

        return true;
    }

    setPlayerReady(playerId, ready, characterId) {
        const player = this.players.get(playerId);
        if (!player) return false;
        player.ready = ready;
        player.characterId = characterId;
        this.lastActivity = Date.now();
        return true;
    }

    allPlayersReady() {
        if (this.players.size < 1) return false;
        for (const player of this.players.values()) {
            if (!player.ready || !player.characterId) return false;
        }
        return true;
    }

    startGame() {
        if (!this.allPlayersReady()) {
            return { error: 'Not all players are ready' };
        }
        this.state = 'playing';
        this.lastActivity = Date.now();
        
        // Initialize game state
        this.gameState = {
            wave: 1,
            timeLeft: 60,
            enemies: [],
            bullets: [],
            pickups: [],
            xpOrbs: [],
            powerups: [],
            stats: {
                enemiesKilled: 0,
                damageDealt: 0,
                bossesDefeated: 0,
            }
        };

        return { success: true };
    }

    updatePlayerState(playerId, state) {
        const player = this.players.get(playerId);
        if (!player) return false;

        // Update position and visual state
        if (state.x !== undefined) player.x = state.x;
        if (state.y !== undefined) player.y = state.y;
        if (state.health !== undefined) player.health = state.health;
        if (state.maxHealth !== undefined) player.maxHealth = state.maxHealth;
        if (state.isAlive !== undefined) player.isAlive = state.isAlive;
        if (state.facingRight !== undefined) player.facingRight = state.facingRight;
        if (state.aimAngle !== undefined) player.aimAngle = state.aimAngle;
        if (state.isMoving !== undefined) player.isMoving = state.isMoving;
        if (state.walkFrame !== undefined) player.walkFrame = state.walkFrame;
        if (state.isDashing !== undefined) player.isDashing = state.isDashing;
        if (state.characterId !== undefined) player.characterId = state.characterId;
        if (state.activeWeaponSlot !== undefined) player.activeWeaponSlot = state.activeWeaponSlot;
        if (state.weaponSlots !== undefined) player.weaponSlots = state.weaponSlots;
        if (state.level !== undefined) player.level = state.level;

        this.lastActivity = Date.now();
        return true;
    }

    // Get state to broadcast to all players
    getPlayersState() {
        const states = [];
        for (const [id, player] of this.players) {
            states.push({
                id: player.id,
                displayName: player.displayName,
                playerIndex: player.playerIndex,
                color: player.color,
                characterId: player.characterId,
                isHost: player.isHost,
                ready: player.ready,
                x: player.x,
                y: player.y,
                health: player.health,
                maxHealth: player.maxHealth,
                isAlive: player.isAlive,
                facingRight: player.facingRight,
                aimAngle: player.aimAngle,
                isMoving: player.isMoving,
                walkFrame: player.walkFrame,
                isDashing: player.isDashing,
                activeWeaponSlot: player.activeWeaponSlot,
                weaponSlots: player.weaponSlots,
                level: player.level,
            });
        }
        return states;
    }

    getLobbyState() {
        const players = [];
        for (const [id, player] of this.players) {
            players.push({
                id: player.id,
                displayName: player.displayName,
                playerIndex: player.playerIndex,
                color: player.color,
                isHost: player.isHost,
                ready: player.ready,
                characterId: player.characterId,
            });
        }
        return {
            code: this.code,
            state: this.state,
            hostId: this.hostId,
            settings: this.settings,
            players,
        };
    }

    broadcast(message, excludePlayerId = null) {
        const data = typeof message === 'string' ? message : JSON.stringify(message);
        for (const [id, player] of this.players) {
            if (id !== excludePlayerId && player.ws && player.ws.readyState === 1) {
                player.ws.send(data);
            }
        }
    }

    broadcastAll(message) {
        this.broadcast(message);
    }

    isEmpty() {
        return this.players.size === 0;
    }

    isIdle() {
        return Date.now() - this.lastActivity > ROOM_IDLE_TIMEOUT;
    }
}

// Room management functions
export function createRoom(hostId, hostName, settings) {
    const room = new Room(hostId, hostName, settings);
    rooms.set(room.code, room);
    return room;
}

export function joinRoom(code, playerId, displayName, ws) {
    const room = rooms.get(code.toUpperCase());
    if (!room) {
        return { error: 'Room not found' };
    }
    const result = room.addPlayer(playerId, displayName, ws);
    if (result.error) return result;
    return { success: true, room };
}

export function getRoom(code) {
    return rooms.get(code.toUpperCase()) || null;
}

export function getRoomByPlayerId(playerId) {
    for (const room of rooms.values()) {
        if (room.players.has(playerId)) {
            return room;
        }
    }
    return null;
}

export function removeRoom(code) {
    rooms.delete(code.toUpperCase());
}

// Periodic cleanup of empty/idle rooms
export function startRoomCleanup() {
    setInterval(() => {
        for (const [code, room] of rooms) {
            if (room.isEmpty() || room.isIdle()) {
                rooms.delete(code);
                console.log(`[Rooms] Cleaned up room ${code}`);
            }
        }
    }, ROOM_CLEANUP_INTERVAL);
}

export function getActiveRoomCount() {
    return rooms.size;
}
