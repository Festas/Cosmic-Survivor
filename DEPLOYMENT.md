# Deployment Configuration

This document explains the deployment setup for Cosmic Survivor to cs.festas-builds.com.

## Overview

The game is automatically deployed to a Hetzner server whenever changes are pushed to the `main` branch. The deployment uses:
- Docker for containerization (single container with nginx + Node.js)
- GitHub Container Registry (GHCR) for image storage
- GitHub Actions for CI/CD
- Nginx for serving static files and proxying WebSocket connections
- Node.js for the multiplayer WebSocket server
- Supervisord for process management inside the container
- Nginx (host) for reverse proxy and HTTPS

## Architecture

```
GitHub Repository (push to main)
    ↓
GitHub Actions Workflow
    ↓
Build Docker Image (nginx + Node.js multiplayer server)
    ↓
Push to GHCR (ghcr.io/festas/cosmic-survivor)
    ↓
SSH to Hetzner Server
    ↓
Pull Image & Deploy via Docker Compose
    ↓
Container runs:
  ├── nginx (port 80) → serves frontend + proxies /ws
  └── Node.js (port 3001 internal) → multiplayer WebSocket server
    ↓
Bind to 127.0.0.1:8200
    ↓
Nginx Reverse Proxy (managed by Link-in-Bio repo)
    ↓
cs.festas-builds.com (public access)
```

### Multiplayer Architecture

```
Browser Client
    ↓ wss://cs.festas-builds.com/ws
Host Nginx (TLS termination)
    ↓ http://127.0.0.1:8200/ws
Container Nginx (WebSocket proxy)
    ↓ http://127.0.0.1:3001
Node.js WebSocket Server
    ↓
SQLite Database (/data/cosmic_survivor.db)
```

The client connects via `wss://cs.festas-builds.com/ws` — the host nginx terminates TLS and proxies to the container's nginx, which then proxies WebSocket connections to the internal Node.js server. This means:
- No extra ports need to be exposed
- WebSocket connections share the same domain and TLS certificate
- The host nginx config in the Link-in-Bio repo needs WebSocket upgrade headers

## Files

### Dockerfile
Multi-stage build that:
1. **Builder Stage**: Uses Node.js 18 Alpine to build the Vite project and install server dependencies
2. **Runtime Stage**: Uses Node.js 18 Alpine with nginx and supervisord
   - Serves the built frontend via nginx on port 80
   - Runs the multiplayer WebSocket server via Node.js on port 3001 (internal)
   - Supervisord manages both processes

### supervisord.conf
Process manager configuration that runs:
- **nginx**: Serves static frontend files and proxies `/ws` to the multiplayer server
- **multiplayer-server**: Node.js WebSocket server for real-time multiplayer

### nginx.conf
Nginx configuration that:
- Serves files from `/usr/share/nginx/html`
- **Proxies `/ws` to the multiplayer WebSocket server** (port 3001) with upgrade headers
- Proxies `/api/health` to the server's health endpoint
- Handles SPA routing (fallback to index-enhanced.html)
- Enables gzip compression
- Sets cache headers:
  - **Service Worker (sw.js)**: `no-cache, no-store, must-revalidate` - ensures users always get the latest version
  - **Static assets (JS, CSS, images)**: 1 year with `immutable` - safe due to Vite's content hashing
  - **HTML files**: 1 hour with `must-revalidate`
- Adds security headers
- Provides a health check endpoint at `/health`

**Important**: The service worker must never be cached by browsers to ensure users receive updates immediately. The build process injects a unique timestamp into the service worker on each deployment, which invalidates the cache and ensures users get the latest version of the game.

### .github/workflows/deploy.yml
GitHub Actions workflow that:
- Triggers on push to main or manual dispatch
- Builds and pushes Docker image to GHCR
- SSHs to server and deploys via docker-compose
- Includes a `cosmic-data` Docker volume for SQLite database persistence
- Uses repository secrets: `HOST`, `SSH_PRIVATE_KEY`, `USERNAME`

## Repository Secrets

The following secrets must be configured in the GitHub repository:
- `HOST`: IP address of the Hetzner server
- `SSH_PRIVATE_KEY`: SSH private key for authentication
- `USERNAME`: SSH username (typically `deploy`)

Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

## Docker Compose Configuration

The workflow generates this docker-compose.yml on the server:

```yaml
version: '3.8'

services:
  cosmic-survivor:
    container_name: cosmic-survivor
    image: ghcr.io/festas/cosmic-survivor:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:8200:80"
    volumes:
      - cosmic-data:/data

volumes:
  cosmic-data:
```

The `cosmic-data` volume persists the SQLite database (`/data/cosmic_survivor.db`) across container restarts and deployments.

## Reverse Proxy Configuration

The reverse proxy is centrally managed in the [Link-in-Bio repository](https://github.com/Festas/Link-in-Bio) via `nginx/sites-available/cs.festas-builds.com.conf`. It proxies requests from `cs.festas-builds.com` to `127.0.0.1:8200` on the host.

**Important**: The host nginx config must include WebSocket upgrade headers for the `/ws` path. See the "Host Nginx WebSocket Setup" section below.

### Host Nginx WebSocket Setup

The `cs.festas-builds.com.conf` in the Link-in-Bio repo needs a location block for WebSocket:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8200;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

## Local Development

To run both the frontend dev server and multiplayer server locally:

```bash
# Install all dependencies
npm install
npm run server:install

# Run both servers concurrently
npm run dev:all
```

This starts:
- Vite dev server on `http://localhost:3000` (with WebSocket proxy to the multiplayer server)
- Multiplayer server on `ws://localhost:3001`

The Vite dev server is configured to proxy `/ws` requests to the multiplayer server, so the client code works the same way in development and production.

## Deployment Directory

All deployment files are located at `/home/deploy/cosmic-survivor` on the server.

## Manual Deployment

To manually trigger a deployment:
1. Go to Actions tab in GitHub
2. Select "Deploy to Hetzner" workflow
3. Click "Run workflow"
4. Select the branch (usually main)
5. Click "Run workflow" button

## Troubleshooting

### Service Worker Issues

If users report seeing "page cannot be opened" errors after deployments:

1. **Clear Service Worker Cache**: Users can hard-refresh (Ctrl+F5 or Cmd+Shift+R) to force fetch the new service worker
2. **Check Service Worker Version**: Open browser DevTools → Application → Service Workers and verify the version matches the build timestamp
3. **Verify Update Notification**: After a new deployment, users should see a green notification banner prompting them to refresh
4. **Manual Update**: Users can go to DevTools → Application → Service Workers and click "Update" or "Unregister"

The service worker automatically:
- Uses network-first strategy for HTML files (always tries to fetch fresh version)
- Uses cache-first strategy for static assets (JS, CSS, images)
- Checks for updates every minute when the page is open
- Notifies users when a new version is available
- Cleans up old caches on activation

### Check container status
```bash
ssh deploy@SERVER_IP
cd /home/deploy/cosmic-survivor
docker compose ps
docker compose logs
```

### View nginx logs
```bash
docker compose logs cosmic-survivor
```

### Check multiplayer server status
```bash
# Check if both processes are running inside the container
docker exec cosmic-survivor supervisorctl status

# View multiplayer server logs
docker exec cosmic-survivor supervisorctl tail multiplayer-server

# Check multiplayer server health
curl http://localhost:8200/api/health
```

### Restart the container
```bash
docker compose restart
```

### Restart just the multiplayer server (without restarting nginx)
```bash
docker exec cosmic-survivor supervisorctl restart multiplayer-server
```

### Pull latest image manually
```bash
docker compose pull
docker compose up -d
```

### Health check
```bash
curl http://localhost/health
# or from outside
curl https://cs.festas-builds.com/health

# Multiplayer server health
curl https://cs.festas-builds.com/api/health
```
