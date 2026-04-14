import WebSocket from 'ws';

function createClient(name) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3001');
        const client = { ws, name, messages: [] };
        ws.on('open', () => { console.log(`[${name}] Connected`); resolve(client); });
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            console.log(`[${name}] Received: ${msg.type}`, msg.type === 'auth_error' ? msg.message : '');
            client.messages.push(msg);
            if (client.onMessage) client.onMessage(msg);
        });
        ws.on('error', (err) => { console.log(`[${name}] Error:`, err.message); });
        ws.on('close', (code) => { console.log(`[${name}] Closed:`, code); });
        setTimeout(() => reject(new Error(`${name} connection timeout`)), 5000);
    });
}

function sendAndWait(client, data, expectedType, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${client.name} timeout waiting for ${expectedType}`)), timeout);
        client.onMessage = (msg) => {
            if (msg.type === expectedType) {
                clearTimeout(timer);
                client.onMessage = null;
                resolve(msg);
            }
        };
        // Check already received messages
        const existing = client.messages.find(m => m.type === expectedType && !m._processed);
        if (existing) { existing._processed = true; clearTimeout(timer); resolve(existing); return; }
        client.ws.send(JSON.stringify(data));
    });
}

async function test() {
    try {
        // Connect two clients
        const p1 = await createClient('Player1');
        const p2 = await createClient('Player2');

        // Register both
        const r1 = await sendAndWait(p1, { type: 'register', username: 'host_player', password: 'pass123', displayName: 'Host' }, 'auth_success');
        console.log('[Player1] Registered OK');
        
        const r2 = await sendAndWait(p2, { type: 'register', username: 'join_player', password: 'pass123', displayName: 'Joiner' }, 'auth_success');
        console.log('[Player2] Registered OK');

        // Player1 creates room
        const room = await sendAndWait(p1, { type: 'create_room', settings: { difficulty: 'normal', maxPlayers: 4 } }, 'room_created');
        console.log('[Player1] Room created:', room.roomCode);

        // Player2 joins room
        const join = await sendAndWait(p2, { type: 'join_room', roomCode: room.roomCode }, 'room_joined');
        console.log('[Player2] Joined room:', join.roomCode);

        // Both ready up
        await sendAndWait(p1, { type: 'player_ready', ready: true, characterId: 'marine' }, 'lobby_update');
        console.log('[Player1] Ready');
        
        await sendAndWait(p2, { type: 'player_ready', ready: true, characterId: 'engineer' }, 'lobby_update');
        console.log('[Player2] Ready');

        // Host starts game
        const gameStart = await sendAndWait(p1, { type: 'start_game' }, 'game_start');
        console.log('[Player1] Game started! Players:', gameStart.players.length);
        console.log('Players:', JSON.stringify(gameStart.players.map(p => p.displayName)));

        // Test player state sync
        p1.ws.send(JSON.stringify({ type: 'player_state', state: { x: 100, y: 200, health: 80, maxHealth: 100, isAlive: true } }));
        
        // Wait for Player2 to receive state update
        const stateUpdate = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('State update timeout')), 3000);
            p2.onMessage = (msg) => {
                if (msg.type === 'player_state_update') {
                    clearTimeout(timer);
                    resolve(msg);
                }
            };
        });
        console.log('[Player2] Received state update:', stateUpdate.state.x, stateUpdate.state.y);

        console.log('\n=== ALL TESTS PASSED ===');
        
        p1.ws.close();
        p2.ws.close();
        setTimeout(() => process.exit(0), 500);
    } catch (err) {
        console.error('TEST FAILED:', err.message);
        process.exit(1);
    }
}

test();
