// WebSocket message handler for Cosmic Survivor multiplayer server
import {
    createRoom, joinRoom, getRoom, getRoomByPlayerId,
    removeRoom, startRoomCleanup
} from './rooms.js';
import {
    initDatabase, createUser, loginUser, createGuestUser,
    getUserProfile, updateUserStats, addAchievement, addHighScore,
    getGlobalLeaderboard, closeDatabase,
    storeSession, getSession, deleteSession
} from './database.js';
import { v4 as uuidv4 } from 'uuid';

// Connected clients: ws -> { userId, playerId, roomCode }
const clients = new Map();

// ========== RATE LIMITING ==========
// Note on tuning: the client sends `player_state` at ~20 Hz (every 50 ms), and
// during heavy combat each kill / pickup / level-up emits its own `game_event`.
// The previous 30 msg/s ceiling was tight enough that intense moments tripped
// the limiter and disconnected players, so it's lifted here. Authentication
// messages still have their own much stricter bucket.
const RATE_LIMIT_WINDOW = 1000; // 1 second window
const RATE_LIMIT_MAX_MESSAGES = 120; // Max non-auth messages per window
const AUTH_RATE_LIMIT_WINDOW = 60000; // 1 minute window for auth
const AUTH_RATE_LIMIT_MAX = 5; // Max auth attempts per window
const rateLimitState = new WeakMap(); // ws -> { messages: [], authAttempts: [] }

function checkRateLimit(ws, isAuth = false) {
    let state = rateLimitState.get(ws);
    if (!state) {
        state = { messages: [], authAttempts: [] };
        rateLimitState.set(ws, state);
    }

    const now = Date.now();

    // General message rate limit
    state.messages = state.messages.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (state.messages.length >= RATE_LIMIT_MAX_MESSAGES) {
        return false;
    }
    state.messages.push(now);

    // Auth-specific rate limit
    if (isAuth) {
        state.authAttempts = state.authAttempts.filter(t => now - t < AUTH_RATE_LIMIT_WINDOW);
        if (state.authAttempts.length >= AUTH_RATE_LIMIT_MAX) {
            return false;
        }
        state.authAttempts.push(now);
    }

    return true;
}

// ========== TEXT SANITIZATION ==========
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

export function initMessageHandler() {
    initDatabase();
    startRoomCleanup();
    console.log('[Server] Message handler initialized');
}

export function handleConnection(ws) {
    const connectionId = uuidv4();
    clients.set(ws, { connectionId, userId: null, playerId: null, roomCode: null });
    
    send(ws, { type: 'connected', connectionId });
}

export function handleMessage(ws, rawMessage) {
    let message;
    try {
        message = JSON.parse(rawMessage);
    } catch {
        send(ws, { type: 'error', message: 'Invalid message format' });
        return;
    }

    const client = clients.get(ws);
    if (!client) return;

    // Rate limit check
    const isAuthMessage = ['register', 'login', 'guest_login'].includes(message.type);
    if (!checkRateLimit(ws, isAuthMessage)) {
        send(ws, { type: 'error', message: 'Rate limit exceeded. Please slow down.' });
        return;
    }

    switch (message.type) {
        // ========== AUTH ==========
        case 'register':
            handleRegister(ws, client, message);
            break;
        case 'login':
            handleLogin(ws, client, message);
            break;
        case 'guest_login':
            handleGuestLogin(ws, client, message);
            break;
        case 'restore_session':
            handleRestoreSession(ws, client, message);
            break;

        // ========== ROOMS ==========
        case 'create_room':
            handleCreateRoom(ws, client, message);
            break;
        case 'join_room':
            handleJoinRoom(ws, client, message);
            break;
        case 'leave_room':
            handleLeaveRoom(ws, client);
            break;
        case 'player_ready':
            handlePlayerReady(ws, client, message);
            break;
        case 'start_game':
            handleStartGame(ws, client);
            break;
        case 'room_settings':
            handleRoomSettings(ws, client, message);
            break;

        // ========== GAMEPLAY ==========
        case 'player_state':
            handlePlayerState(ws, client, message);
            break;
        case 'game_event':
            handleGameEvent(ws, client, message);
            break;
        case 'chat_message':
            handleChatMessage(ws, client, message);
            break;

        // ========== DATA SYNC ==========
        case 'sync_stats':
            handleSyncStats(ws, client, message);
            break;
        case 'sync_achievement':
            handleSyncAchievement(ws, client, message);
            break;
        case 'sync_highscore':
            handleSyncHighScore(ws, client, message);
            break;
        case 'get_leaderboard':
            handleGetLeaderboard(ws, client);
            break;
        case 'get_profile':
            handleGetProfile(ws, client);
            break;

        default:
            send(ws, { type: 'error', message: `Unknown message type: ${message.type}` });
    }
}

export function handleDisconnect(ws) {
    const client = clients.get(ws);
    if (!client) return;

    // Remove from room if in one
    if (client.roomCode) {
        const room = getRoom(client.roomCode);
        if (room) {
            room.removePlayer(client.playerId);
            if (room.isEmpty()) {
                removeRoom(room.code);
            } else {
                room.broadcast({
                    type: 'player_left',
                    playerId: client.playerId,
                    lobby: room.getLobbyState()
                });
            }
        }
    }

    clients.delete(ws);
}

// ========== AUTH HANDLERS ==========

function handleRegister(ws, client, msg) {
    const displayName = sanitizeText((msg.displayName || '').substring(0, 20));
    const result = createUser(msg.username, msg.password, displayName);
    if (result.error) {
        send(ws, { type: 'auth_error', message: result.error });
        return;
    }

    const token = uuidv4();
    storeSession(token, result.userId);
    client.userId = result.userId;
    client.playerId = result.userId;

    const profile = getUserProfile(result.userId);
    send(ws, {
        type: 'auth_success',
        token,
        profile
    });
}

function handleLogin(ws, client, msg) {
    const result = loginUser(msg.username, msg.password);
    if (result.error) {
        send(ws, { type: 'auth_error', message: result.error });
        return;
    }

    const token = uuidv4();
    storeSession(token, result.userId);
    client.userId = result.userId;
    client.playerId = result.userId;

    const profile = getUserProfile(result.userId);
    send(ws, {
        type: 'auth_success',
        token,
        profile
    });
}

function handleGuestLogin(ws, client) {
    const result = createGuestUser();
    if (result.error) {
        send(ws, { type: 'auth_error', message: result.error });
        return;
    }

    const token = uuidv4();
    storeSession(token, result.userId);
    client.userId = result.userId;
    client.playerId = result.userId;

    send(ws, {
        type: 'auth_success',
        token,
        profile: {
            userId: result.userId,
            username: result.username,
            displayName: result.displayName,
            isGuest: true,
            stats: { total_kills: 0, total_credits: 0, max_wave: 0, upgrades_purchased: 0, weapons_unlocked: 1 },
            achievements: [],
            highScores: []
        }
    });
}

function handleRestoreSession(ws, client, msg) {
    const userId = getSession(msg.token);
    if (!userId) {
        send(ws, { type: 'auth_error', message: 'Session expired' });
        return;
    }

    client.userId = userId;
    client.playerId = userId;

    const profile = getUserProfile(userId);
    if (!profile) {
        send(ws, { type: 'auth_error', message: 'User not found' });
        return;
    }

    send(ws, { type: 'auth_success', token: msg.token, profile });
}

// ========== ROOM HANDLERS ==========

function handleCreateRoom(ws, client, msg) {
    if (!client.userId) {
        send(ws, { type: 'error', message: 'Must be logged in to create a room' });
        return;
    }

    // Leave existing room first
    if (client.roomCode) {
        handleLeaveRoom(ws, client);
    }

    const profile = getUserProfile(client.userId);
    const displayName = sanitizeText(profile ? profile.displayName : 'Player');
    const room = createRoom(client.userId, displayName, msg.settings || {});
    
    // Set the WebSocket for the host
    const hostPlayer = room.players.get(client.userId);
    if (hostPlayer) hostPlayer.ws = ws;

    client.roomCode = room.code;

    send(ws, {
        type: 'room_created',
        roomCode: room.code,
        lobby: room.getLobbyState()
    });
}

function handleJoinRoom(ws, client, msg) {
    if (!client.userId) {
        send(ws, { type: 'error', message: 'Must be logged in to join a room' });
        return;
    }

    // Leave existing room first
    if (client.roomCode) {
        handleLeaveRoom(ws, client);
    }

    const profile = getUserProfile(client.userId);
    const displayName = sanitizeText(profile ? profile.displayName : 'Player');
    const result = joinRoom(msg.roomCode, client.userId, displayName, ws);

    if (result.error) {
        send(ws, { type: 'join_error', message: result.error });
        return;
    }

    client.roomCode = result.room.code;

    // Notify joiner
    send(ws, {
        type: 'room_joined',
        roomCode: result.room.code,
        lobby: result.room.getLobbyState()
    });

    // Notify other players
    result.room.broadcast({
        type: 'player_joined',
        playerId: client.userId,
        displayName,
        lobby: result.room.getLobbyState()
    }, client.userId);
}

function handleLeaveRoom(ws, client) {
    if (!client.roomCode) return;

    const room = getRoom(client.roomCode);
    if (room) {
        room.removePlayer(client.playerId);
        if (room.isEmpty()) {
            removeRoom(room.code);
        } else {
            room.broadcast({
                type: 'player_left',
                playerId: client.playerId,
                lobby: room.getLobbyState()
            });
        }
    }

    client.roomCode = null;
    send(ws, { type: 'room_left' });
}

function handlePlayerReady(ws, client, msg) {
    if (!client.roomCode) return;

    const room = getRoom(client.roomCode);
    if (!room) return;

    room.setPlayerReady(client.playerId, msg.ready, msg.characterId);

    room.broadcastAll({
        type: 'lobby_update',
        lobby: room.getLobbyState()
    });
}

function handleStartGame(ws, client) {
    if (!client.roomCode) return;

    const room = getRoom(client.roomCode);
    if (!room) return;

    // Only host can start
    if (room.hostId !== client.playerId) {
        send(ws, { type: 'error', message: 'Only the host can start the game' });
        return;
    }

    const result = room.startGame();
    if (result.error) {
        send(ws, { type: 'error', message: result.error });
        return;
    }

    // Determine spawn positions spread around center
    const playerCount = room.players.size;
    const spawnPositions = [];
    for (let i = 0; i < playerCount; i++) {
        const angle = (i / playerCount) * Math.PI * 2;
        spawnPositions.push({
            x: 1500 + Math.cos(angle) * 100, // World center + offset
            y: 1000 + Math.sin(angle) * 100,
        });
    }

    let idx = 0;
    const playersData = [];
    for (const [id, player] of room.players) {
        playersData.push({
            id: player.id,
            displayName: player.displayName,
            characterId: player.characterId,
            playerIndex: player.playerIndex,
            color: player.color,
            spawnX: spawnPositions[idx].x,
            spawnY: spawnPositions[idx].y,
        });
        idx++;
    }

    room.broadcastAll({
        type: 'game_start',
        players: playersData,
        settings: room.settings,
        playerCount: room.players.size,
    });
}

function handleRoomSettings(ws, client, msg) {
    if (!client.roomCode) return;

    const room = getRoom(client.roomCode);
    if (!room || room.hostId !== client.playerId) return;

    if (msg.settings) {
        if (msg.settings.difficulty) room.settings.difficulty = msg.settings.difficulty;
        if (msg.settings.sharedXP !== undefined) room.settings.sharedXP = msg.settings.sharedXP;
        if (msg.settings.friendlyFire !== undefined) room.settings.friendlyFire = msg.settings.friendlyFire;
    }

    room.broadcastAll({
        type: 'lobby_update',
        lobby: room.getLobbyState()
    });
}

// ========== GAMEPLAY HANDLERS ==========

function handlePlayerState(ws, client, msg) {
    if (!client.roomCode) return;

    const room = getRoom(client.roomCode);
    if (!room || room.state !== 'playing') return;

    room.updatePlayerState(client.playerId, msg.state);

    // Broadcast to other players
    room.broadcast({
        type: 'player_state_update',
        playerId: client.playerId,
        state: msg.state,
        timestamp: Date.now()
    }, client.playerId);
}

// Allow-list of relayed game events. Unknown events are dropped to prevent
// clients from spamming arbitrary types. Each entry is the max JSON-serialized
// length (in chars) accepted for the `data` payload — small for cheap chatter,
// larger for genuine gameplay events.
const GAME_EVENT_LIMITS = {
    // Existing core events
    'enemy_killed': 256,
    'player_damaged': 256,
    'wave_complete': 128,
    'wave_start': 128,
    'game_over': 256,
    'player_died': 128,
    'enemy_spawned': 512,
    'pickup_collected': 256,
    'xp_collected': 128,
    'level_up': 256,
    // New additive events for emote/ping/quickchat/revive/MVP
    'emote': 64,
    'ping': 128,
    'quickchat': 64,
    'downed': 128,
    'revive_complete': 128,
    'boss_down': 128,
    'match_stats': 256,
    // Phase 6 rework — co-op aura buff notifications (small VFX-only payload).
    'coop_buff': 64,
};

function handleGameEvent(ws, client, msg) {
    if (!client.roomCode) return;

    const room = getRoom(client.roomCode);
    if (!room) return;

    // Validate event type against whitelist
    if (typeof msg.event !== 'string' || !(msg.event in GAME_EVENT_LIMITS)) {
        return; // silently drop unknown events
    }

    // Validate payload size to stop spam / oversized broadcasts
    let dataPayload = msg.data;
    if (dataPayload !== undefined && dataPayload !== null) {
        let serialized;
        try { serialized = JSON.stringify(dataPayload); } catch { return; }
        if (serialized.length > GAME_EVENT_LIMITS[msg.event]) {
            return; // drop oversized payloads
        }
    }

    // Relay game events to all players
    room.broadcast({
        type: 'game_event',
        event: msg.event,
        data: dataPayload,
        playerId: client.playerId,
        timestamp: Date.now()
    }, client.playerId);

    // Handle specific events server-side
    if (msg.event === 'game_over') {
        room.state = 'lobby';
        room.gameState = null; // Clear stale game state for next game
        // Reset ready states and player alive status
        for (const [, player] of room.players) {
            player.ready = player.isHost;
            player.isAlive = true;
        }
    }
}

function handleChatMessage(ws, client, msg) {
    if (!client.roomCode) return;

    const room = getRoom(client.roomCode);
    if (!room) return;

    const player = room.players.get(client.playerId);
    if (!player) return;

    const sanitizedMessage = sanitizeText((msg.message || '').substring(0, 200));
    if (!sanitizedMessage) return;

    room.broadcastAll({
        type: 'chat_message',
        playerId: client.playerId,
        displayName: sanitizeText(player.displayName),
        message: sanitizedMessage,
        timestamp: Date.now()
    });
}

// ========== DATA SYNC HANDLERS ==========

function handleSyncStats(ws, client, msg) {
    if (!client.userId) return;
    updateUserStats(client.userId, msg.stats || {});
    send(ws, { type: 'stats_synced' });
}

function handleSyncAchievement(ws, client, msg) {
    if (!client.userId) return;
    addAchievement(client.userId, msg.achievementId);
}

function handleSyncHighScore(ws, client, msg) {
    if (!client.userId) return;
    addHighScore(client.userId, msg.score || {});
}

function handleGetLeaderboard(ws, client) {
    const leaderboard = getGlobalLeaderboard();
    send(ws, { type: 'leaderboard', entries: leaderboard });
}

function handleGetProfile(ws, client) {
    if (!client.userId) {
        send(ws, { type: 'error', message: 'Not logged in' });
        return;
    }
    const profile = getUserProfile(client.userId);
    send(ws, { type: 'profile', profile });
}

// Helper
function send(ws, data) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}
