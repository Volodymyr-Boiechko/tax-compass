# Multi-stage production build — tax-compass
#
# To build for an x86 host (e.g. a Linux VPS or Vercel/Fly.io):
#   docker build --platform linux/amd64 -t tax-compass .
# On Apple Silicon building for arm64 (local preview), omit --platform.

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web/ ./
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist/web/browser /usr/share/nginx/html

RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
