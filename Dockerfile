# Multi-stage build for Cosmic Survivor

# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Note: npm strict-ssl is disabled to work around certificate chain issues
# that can occur in some Docker build environments with Alpine Linux.
# The packages are still downloaded from the official npm registry.
RUN npm config set strict-ssl false && npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
