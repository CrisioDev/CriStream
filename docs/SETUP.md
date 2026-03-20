# CriStream Setup Guide

## Prerequisites
- Docker & Docker Compose
- A domain pointing to your server (for HTTPS)
- A Twitch Developer Application

## 1. Create Twitch Application

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Click "Register Your Application"
3. Set name to "CriStream" (or similar)
4. Set OAuth Redirect URL to `https://your-domain.com/api/auth/twitch/callback`
5. Set Category to "Chat Bot"
6. Note the **Client ID** and generate a **Client Secret**

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|---|---|
| `TWITCH_CLIENT_ID` | From Twitch Dev Console |
| `TWITCH_CLIENT_SECRET` | From Twitch Dev Console |
| `TWITCH_REDIRECT_URI` | `https://your-domain.com/api/auth/twitch/callback` |
| `TWITCH_BOT_USERNAME` | Your bot's Twitch username |
| `JWT_SECRET` | Random 64-char string (`openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Random 64-hex string (`openssl rand -hex 32`) |
| `DATABASE_URL` | `postgresql://cristream:cristream@postgres:5432/cristream` |
| `REDIS_URL` | `redis://redis:6379` |
| `DOMAIN` | Your domain (e.g., `bot.example.com`) |
| `CORS_ORIGIN` | `https://your-domain.com` |

## 3. Deploy

```bash
docker compose up -d
```

This starts 4 services:
- **app** - CriStream backend + frontend
- **postgres** - PostgreSQL database
- **redis** - Redis for caching/cooldowns
- **caddy** - Reverse proxy with auto-HTTPS

## 4. First Login

1. Navigate to `https://your-domain.com`
2. Click "Login with Twitch"
3. Authorize the application
4. Click "Join Channel" on the Dashboard

## Development

Start only database services:
```bash
docker compose -f docker-compose.dev.yml up -d
```

Run backend and frontend:
```bash
pnpm install
pnpm db:migrate
pnpm dev          # Backend on :3000
pnpm dev:frontend # Frontend on :5173
```

## Architecture

```
Browser <-> Caddy (HTTPS) <-> Fastify (API + Static) <-> PostgreSQL
                                    |                  <-> Redis
                                    |
                               Twitch IRC
```
