# Deployment Configuration

This document explains the deployment setup for Cosmic Survivor to cs.festas-builds.com.

## Overview

The game is automatically deployed to a Hetzner server whenever changes are pushed to the `main` branch. The deployment uses:
- Docker for containerization
- GitHub Container Registry (GHCR) for image storage
- GitHub Actions for CI/CD
- Nginx for serving static files
- Caddy (external) for reverse proxy and HTTPS

## Architecture

```
GitHub Repository (push to main)
    ↓
GitHub Actions Workflow
    ↓
Build Docker Image
    ↓
Push to GHCR (ghcr.io/festas/cosmic-survivor)
    ↓
SSH to Hetzner Server
    ↓
Pull Image & Deploy via Docker Compose
    ↓
Join caddy-network
    ↓
Caddy Reverse Proxy (managed by Link-in-Bio repo)
    ↓
cs.festas-builds.com (public access)
```

## Files

### Dockerfile
Multi-stage build that:
1. **Builder Stage**: Uses Node.js 18 Alpine to build the Vite project
2. **Server Stage**: Uses nginx:alpine to serve the static files on port 80

### nginx.conf
Nginx configuration that:
- Serves files from `/usr/share/nginx/html`
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
    networks:
      - caddy-network

networks:
  caddy-network:
    external: true
```

## Caddy Configuration

The reverse proxy is managed by the Link-in-Bio repository. Add this to the Caddyfile:

```caddyfile
cs.festas-builds.com {
    tls eric@festas-builds.com
    encode gzip zstd
    reverse_proxy cosmic-survivor:80
}
```

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

### Restart the container
```bash
docker compose restart
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
```
