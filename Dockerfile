# ---- Build stage: assemble the static site (zero runtime deps) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm run build

# ---- Serve stage: tiny nginx image serving the static files ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
