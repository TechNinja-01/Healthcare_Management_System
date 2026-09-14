# Edge image: builds the React static bundle, then serves it + proxies the
# API/WebSocket via Caddy (automatic HTTPS). Build context = repo root.

# ---- Stage 1: build the frontend ----
FROM node:22-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# The public API base URL is baked in at build time. It points at the same
# domain under /api so the app is same-origin (no CORS headaches).
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_MAPS_API_KEY
RUN printf "VITE_API_BASE_URL=%s\nVITE_GOOGLE_MAPS_API_KEY=%s\n" \
    "$VITE_API_BASE_URL" "$VITE_GOOGLE_MAPS_API_KEY" > .env.production.local
RUN npm run build

# ---- Stage 2: Caddy serves static + reverse-proxies ----
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
