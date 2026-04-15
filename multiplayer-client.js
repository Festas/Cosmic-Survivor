// Cosmic Survivor - Client-side multiplayer networking module
// This module handles WebSocket communication with the game server

const MultiplayerClient = {
    ws: null,
    connected: false,
    authenticated: false,
    serverUrl: null,
    sessionToken: null,
    userId: null,
    profile: null,
    room: null,
    localPlayerId: null,
    _lastRoomCode: null, // Track last room for rejoin on reconnect
    
    // Callbacks (set by the game)
    onConnected: null,
    onDisconnected: null,
    onAuthSuccess: null,
    onAuthError: null,
    onRoomCreated: null,
    onRoomJoined: null,
    onRoomLeft: null,
    onPlayerJoined: null,
    onPlayerLeft: null,
    onLobbyUpdate: null,
    onGameStart: null,
    onPlayerStateUpdate: null,
    onGameEvent: null,
    onChatMessage: null,
    onError: null,
    onJoinError: null,
    onLeaderboard: null,
    onProfileUpdate: null,

    // State sync throttling
    _lastStateSend: 0,
    _stateSendInterval: 50, // Send state every 50ms (20 Hz)
    // Delay before attempting room rejoin after reconnect (allows session restore to complete)
    _sessionRestoreDelay: 500,

    connect(serverUrl) {
        if (this.ws && this.ws.readyState <= 1) {
            return; // Already connected or connecting
        }

        this.serverUrl = serverUrl || this._getDefaultServerUrl();
        
        try {
            this.ws = new WebSocket(this.serverUrl);
        } catch (e) {
            console.error('[MP] Failed to create WebSocket:', e);
            if (this.onError) this.onError('Failed to connect to server');
            return;
        }

        this.ws.onopen = () => {
            console.log('[MP] Connected to server');
            this.connected = true;
            
            // Try to restore session
            if (this.sessionToken) {
                this.send({ type: 'restore_session', token: this.sessionToken });
            }
            
            if (this.onConnected) this.onConnected();

            // Attempt to rejoin the last room after reconnect
            if (this._lastRoomCode && this.sessionToken) {
                setTimeout(() => {
                    if (this.authenticated && this._lastRoomCode && !this.room) {
                        console.log('[MP] Attempting to rejoin room:', this._lastRoomCode);
                        this.joinRoom(this._lastRoomCode);
                    }
                }, this._sessionRestoreDelay);
            }
        };

        this.ws.onclose = () => {
            console.log('[MP] Disconnected from server');
            this.connected = false;
            this.authenticated = false;
            this.room = null;
            if (this.onDisconnected) this.onDisconnected();
            
            // Auto-reconnect after 3 seconds
            setTimeout(() => {
                if (!this.connected) {
                    console.log('[MP] Attempting reconnect...');
                    this.connect(this.serverUrl);
                }
            }, 3000);
        };

        this.ws.onerror = (err) => {
            console.error('[MP] WebSocket error');
            if (this.onError) this.onError('Connection error');
        };

        this.ws.onmessage = (event) => {
            this._handleMessage(event.data);
        };
    },

    disconnect() {
        if (this.ws) {
            this.ws.onclose = null; // Prevent auto-reconnect
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.authenticated = false;
        this.room = null;
    },

    _getDefaultServerUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // includes port if non-standard
        return `${protocol}//${host}/ws`;
    },

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    },

    _handleMessage(rawData) {
        let msg;
        try {
            msg = JSON.parse(rawData);
        } catch {
            return;
        }

        switch (msg.type) {
            case 'connected':
                break;

            // Auth
            case 'auth_success':
                this.authenticated = true;
                this.sessionToken = msg.token;
                this.userId = msg.profile.userId;
                this.localPlayerId = msg.profile.userId;
                this.profile = msg.profile;
                // Save token to localStorage
                try { localStorage.setItem('cosmicSurvivor_mpToken', msg.token); } catch {}
                if (this.onAuthSuccess) this.onAuthSuccess(msg.profile);
                break;
            case 'auth_error':
                // Clear stale session data on auth failure to prevent repeated failed restores
                this.authenticated = false;
                this.sessionToken = null;
                this.userId = null;
                this.profile = null;
                try { localStorage.removeItem('cosmicSurvivor_mpToken'); } catch {}
                if (this.onAuthError) this.onAuthError(msg.message);
                break;

            // Rooms
            case 'room_created':
                this.room = msg.lobby;
                this._lastRoomCode = msg.roomCode;
                if (this.onRoomCreated) this.onRoomCreated(msg.roomCode, msg.lobby);
                break;
            case 'room_joined':
                this.room = msg.lobby;
                this._lastRoomCode = msg.roomCode;
                if (this.onRoomJoined) this.onRoomJoined(msg.roomCode, msg.lobby);
                break;
            case 'room_left':
                this.room = null;
                this._lastRoomCode = null;
                if (this.onRoomLeft) this.onRoomLeft();
                break;
            case 'player_joined':
                this.room = msg.lobby;
                if (this.onPlayerJoined) this.onPlayerJoined(msg.playerId, msg.displayName, msg.lobby);
                break;
            case 'player_left':
                this.room = msg.lobby;
                if (this.onPlayerLeft) this.onPlayerLeft(msg.playerId, msg.lobby);
                break;
            case 'lobby_update':
                this.room = msg.lobby;
                if (this.onLobbyUpdate) this.onLobbyUpdate(msg.lobby);
                break;
            case 'join_error':
                if (this.onJoinError) this.onJoinError(msg.message);
                break;

            // Game
            case 'game_start':
                if (this.onGameStart) this.onGameStart(msg);
                break;
            case 'player_state_update':
                if (this.onPlayerStateUpdate) this.onPlayerStateUpdate(msg.playerId, msg.state, msg.timestamp);
                break;
            case 'game_event':
                if (this.onGameEvent) this.onGameEvent(msg.event, msg.data, msg.playerId, msg.timestamp);
                break;
            case 'chat_message':
                if (this.onChatMessage) this.onChatMessage(msg);
                break;

            // Data
            case 'leaderboard':
                if (this.onLeaderboard) this.onLeaderboard(msg.entries);
                break;
            case 'profile':
                this.profile = msg.profile;
                if (this.onProfileUpdate) this.onProfileUpdate(msg.profile);
                break;
            case 'stats_synced':
                break;

            case 'error':
                if (this.onError) this.onError(msg.message);
                break;
        }
    },

    // ========== AUTH API ==========
    register(username, password, displayName) {
        this.send({ type: 'register', username, password, displayName });
    },

    login(username, password) {
        this.send({ type: 'login', username, password });
    },

    loginAsGuest() {
        this.send({ type: 'guest_login' });
    },

    restoreSession() {
        try {
            const token = localStorage.getItem('cosmicSurvivor_mpToken');
            if (token) {
                this.sessionToken = token;
                if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.send({ type: 'restore_session', token });
                }
                // If not connected yet, the token is stored and will be sent on ws.onopen
                return true;
            }
        } catch {}
        return false;
    },

    logout() {
        this.authenticated = false;
        this.sessionToken = null;
        this.userId = null;
        this.profile = null;
        try { localStorage.removeItem('cosmicSurvivor_mpToken'); } catch {}
    },

    // ========== ROOM API ==========
    createRoom(settings) {
        this.send({ type: 'create_room', settings });
    },

    joinRoom(roomCode) {
        this.send({ type: 'join_room', roomCode: roomCode.toUpperCase() });
    },

    leaveRoom() {
        this.send({ type: 'leave_room' });
        this.room = null;
        this._lastRoomCode = null;
    },

    setReady(ready, characterId) {
        this.send({ type: 'player_ready', ready, characterId });
    },

    startGame() {
        this.send({ type: 'start_game' });
    },

    updateRoomSettings(settings) {
        this.send({ type: 'room_settings', settings });
    },

    // ========== GAMEPLAY API ==========
    sendPlayerState(state) {
        const now = Date.now();
        if (now - this._lastStateSend < this._stateSendInterval) return;
        this._lastStateSend = now;
        this.send({ type: 'player_state', state });
    },

    sendGameEvent(event, data) {
        this.send({ type: 'game_event', event, data });
    },

    sendChatMessage(message) {
        this.send({ type: 'chat_message', message });
    },

    // ========== DATA SYNC API ==========
    syncStats(stats) {
        this.send({ type: 'sync_stats', stats });
    },

    syncAchievement(achievementId) {
        this.send({ type: 'sync_achievement', achievementId });
    },

    syncHighScore(score) {
        this.send({ type: 'sync_highscore', score });
    },

    getLeaderboard() {
        this.send({ type: 'get_leaderboard' });
    },

    getProfile() {
        this.send({ type: 'get_profile' });
    },

    // ========== HELPERS ==========
    isInRoom() {
        return this.room !== null;
    },

    isHost() {
        return this.room && this.room.hostId === this.localPlayerId;
    },

    isMultiplayerGame() {
        return this.room && this.room.state === 'playing';
    },

    getPlayerCount() {
        return this.room ? this.room.players.length : 0;
    },

    getRoomCode() {
        return this.room ? this.room.code : null;
    }
};

// Make globally available
window.MultiplayerClient = MultiplayerClient;
