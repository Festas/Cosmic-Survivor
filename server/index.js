// Cosmic Survivor - Multiplayer WebSocket Server
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initMessageHandler, handleConnection, handleMessage, handleDisconnect } from './messageHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;
const HEARTBEAT_INTERVAL = 30000;

// Initialize systems
initMessageHandler();

// Create HTTP server for health checks
const httpServer = createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Heartbeat to detect stale connections
function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[WS] Client connected from ${clientIP}`);

    handleConnection(ws);

    ws.on('message', (data) => {
        try {
            handleMessage(ws, data.toString());
        } catch (err) {
            console.error('[WS] Message handling error:', err);
        }
    });

    ws.on('close', () => {
        console.log(`[WS] Client disconnected`);
        handleDisconnect(ws);
    });

    ws.on('error', (err) => {
        console.error('[WS] Client error:', err.message);
    });
});

// Heartbeat interval
const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            handleDisconnect(ws);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
    clearInterval(heartbeatTimer);
});

httpServer.listen(PORT, () => {
    console.log(`\n🚀 Cosmic Survivor Multiplayer Server`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Health:    http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    wss.clients.forEach(ws => ws.close());
    httpServer.close(() => {
        console.log('[Server] Closed.');
        process.exit(0);
    });
});
