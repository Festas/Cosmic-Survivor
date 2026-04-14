# Multi-stage build for Cosmic Survivor (Frontend + Multiplayer Server)

# Stage 1: Build the frontend and install server dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install frontend dependencies
# Note: npm strict-ssl is disabled to work around certificate chain issues
# that can occur in some Docker build environments with Alpine Linux.
# The packages are still downloaded from the official npm registry.
RUN npm config set strict-ssl false && npm install

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Install server dependencies
RUN cd server && npm config set strict-ssl false && npm install

# Stage 2: Runtime with nginx + Node.js
FROM node:18-alpine

# Install nginx and supervisord
RUN apk add --no-cache nginx supervisor \
    && mkdir -p /run/nginx

# Copy built frontend files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy multiplayer server
COPY --from=builder /app/server /app/server

# Copy supervisord configuration
COPY supervisord.conf /etc/supervisord.conf

# Create directory for SQLite database (volume mount point)
RUN mkdir -p /data

# Expose port 80 (nginx handles both HTTP and WebSocket proxy)
EXPOSE 80

# Start both services via supervisord
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
