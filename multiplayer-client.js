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
    lastError: null,    // Most recent connection/auth error message (for UI)
    
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

    // Reconnect backoff state. We previously retried every 3 s forever, which
    // floods the console (and hammers a down server / reverse proxy) when the
    // backend is unreachable — exactly the symptom of code=1006 spam in the
    // browser. Use exponential backoff with a hard cap on attempts; user can
    // manually retry by clicking "Connect" again, which resets the counter.
    _reconnectAttempts: 0,
    _reconnectTimer: null,
    _giveUpReconnect: false,
    _maxReconnectAttempts: 8,
    _reconnectBaseDelay: 2000,   // 2s
    _reconnectMaxDelay: 60000,   // cap individual backoff at 60s

    connect(serverUrl) {
        if (this.ws && this.ws.readyState <= 1) {
            return; // Already connected or connecting
        }

        // A manual connect() (e.g. user pressed Connect, or first call from
        // the game) resets the give-up state so we will try again.
        this._giveUpReconnect = false;
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        this.serverUrl = serverUrl || this._getDefaultServerUrl();

        // file:// origins can't open ws:// to a real backend without a host;
        // surface a clear error instead of letting the browser fail silently.
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
            const msg = 'Multiplayer is unavailable when the page is opened directly from disk (file://). Please run the game from the deployed site or via "npm run dev:all".';
            console.error('[MP] ' + msg);
            this.lastError = msg;
            if (this.onError) this.onError(msg);
            return;
        }

        try {
            this.ws = new WebSocket(this.serverUrl);
        } catch (e) {
            console.error('[MP] Failed to create WebSocket:', e);
            const msg = `Failed to connect to ${this.serverUrl}: ${e && e.message ? e.message : e}`;
            this.lastError = msg;
            if (this.onError) this.onError(msg);
            return;
        }

        this.ws.onopen = () => {
            console.log('[MP] Connected to server');
            this.connected = true;
            this.lastError = null;
            // Successful connect — reset reconnect backoff
            this._reconnectAttempts = 0;
            this._giveUpReconnect = false;

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

        this.ws.onclose = (ev) => {
            const wasConnected = this.connected;
            console.log(`[MP] Disconnected from server (code=${ev && ev.code}, reason=${ev && ev.reason || ''}, wasClean=${ev && ev.wasClean})`);
            this.connected = false;
            this.authenticated = false;
            this.room = null;

            // If we never managed to connect, surface a clearer error so the
            // UI doesn't just say "Cant connect to the server" with no hint
            // about what's wrong, and kick off an HTTP health probe to tell
            // the user *what* is actually broken (proxy vs container down).
            if (!wasConnected) {
                let detail = '';
                if (ev && ev.code === 1006) {
                    detail = ' (network unreachable / handshake failed - is the multiplayer server running?)';
                } else if (ev && ev.reason) {
                    detail = ` (${ev.reason})`;
                } else if (ev && ev.code) {
                    detail = ` (code ${ev.code})`;
                }
                const msg = `Cannot connect to ${this.serverUrl}${detail}`;
                this.lastError = msg;
                if (this.onError) this.onError(msg);

                // Run an async HTTP health probe and replace lastError with a
                // more actionable diagnostic. We only do this on the *first*
                // failed handshake so we don't spam the network with probes
                // during the reconnect backoff loop.
                if (this._reconnectAttempts === 0) {
                    this._diagnoseAndReport(ev && ev.code).catch(() => {});
                }
            }

            if (this.onDisconnected) this.onDisconnected();

            // Auto-reconnect with exponential backoff so a permanently down
            // server (or misconfigured edge proxy) doesn't spam the console
            // with one connect attempt every 3 seconds forever.
            if (this._giveUpReconnect) {
                return;
            }
            if (this._reconnectAttempts >= this._maxReconnectAttempts) {
                this._giveUpReconnect = true;
                const giveUpMsg = `Cannot reach multiplayer server after ${this._reconnectAttempts} attempts. Please check your connection and use the Connect button to retry.`;
                console.warn('[MP] ' + giveUpMsg);
                this.lastError = giveUpMsg;
                if (this.onError) this.onError(giveUpMsg);
                return;
            }
            this._reconnectAttempts++;
            const backoff = Math.min(
                this._reconnectMaxDelay,
                this._reconnectBaseDelay * Math.pow(2, this._reconnectAttempts - 1)
            );
            if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
            this._reconnectTimer = setTimeout(() => {
                this._reconnectTimer = null;
                if (!this.connected && !this._giveUpReconnect) {
                    console.log(`[MP] Attempting reconnect (#${this._reconnectAttempts} of ${this._maxReconnectAttempts})...`);
                    this.connect(this.serverUrl);
                }
            }, backoff);
        };

        this.ws.onerror = (err) => {
            console.error('[MP] WebSocket error', err);
            const msg = `Connection error talking to ${this.serverUrl}`;
            this.lastError = msg;
            if (this.onError) this.onError(msg);
        };

        this.ws.onmessage = (event) => {
            this._handleMessage(event.data);
        };
    },

    disconnect() {
        // Clear pending reconnect timer + give up so we don't auto-reconnect
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        this._giveUpReconnect = true;
        this._reconnectAttempts = 0;
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

    // Probe the HTTP health endpoint that's deployed alongside the WS server
    // (nginx routes /api/health to the multiplayer server's /health). This is
    // used after a WebSocket failure to tell the user *what* is actually
    // broken: backend down vs. backend up but the reverse proxy isn't passing
    // WebSocket upgrade headers (the classic same-host wss:// 1006 cause).
    async _probeHealth() {
        if (typeof fetch !== 'function' || typeof window === 'undefined' || !window.location) {
            return { ok: false, reason: 'no-fetch' };
        }
        const httpProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const url = `${httpProtocol}//${window.location.host}/api/health`;
        try {
            const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            const timer = ctl ? setTimeout(() => ctl.abort(), 5000) : null;
            const resp = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
                signal: ctl ? ctl.signal : undefined,
            });
            if (timer) clearTimeout(timer);
            if (!resp.ok) {
                return { ok: false, reason: `http-${resp.status}`, url };
            }
            return { ok: true, url };
        } catch (e) {
            return { ok: false, reason: (e && e.name === 'AbortError') ? 'timeout' : 'network', url };
        }
    },

    // After a WS handshake failure, probe HTTP and produce an actionable
    // diagnostic message instead of the generic "code=1006 handshake failed".
    async _diagnoseAndReport(closeCode) {
        const probe = await this._probeHealth();
        let msg;
        if (probe.ok) {
            // Backend is healthy over HTTP, but WS upgrade failed → upstream
            // proxy is missing WebSocket Upgrade/Connection header forwarding.
            msg = `Multiplayer server is reachable over HTTPS but the WebSocket upgrade is failing (close code ${closeCode}). The reverse proxy in front of ${this.serverUrl} likely isn't configured to forward 'Upgrade: websocket' / 'Connection: upgrade' headers. See DEPLOYMENT.md → "Host Nginx WebSocket Setup".`;
        } else if (probe.reason && probe.reason.startsWith('http-')) {
            const code = probe.reason.replace('http-', '');
            msg = `Multiplayer backend returned HTTP ${code} from ${probe.url}. The container or upstream proxy is misconfigured.`;
        } else if (probe.reason === 'timeout') {
            msg = `Multiplayer server timed out (HTTP probe to ${probe.url} did not respond). The container is likely down or unreachable.`;
        } else {
            msg = `Multiplayer server is unreachable (cannot reach ${probe.url || this.serverUrl}). Check that the multiplayer container is running and that DNS / firewall allow the connection.`;
        }
        console.warn('[MP][diag] ' + msg);
        this.lastError = msg;
        if (this.onError) this.onError(msg);
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
