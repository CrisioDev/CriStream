# Installation & Setup

## Prerequisites

- **Docker & Docker Compose** (v2+)
- A **domain** pointing to your server (needed for Twitch OAuth & EventSub)
- A **Twitch Developer Application**
- (Optional) A **Discord Bot** for Discord integration

## Step 1: Create a Twitch Application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Click **Register Your Application**
3. Set **Name** to anything (e.g. "CriStream")
4. Set **OAuth Redirect URL** to `https://your-domain.com/api/auth/twitch/callback`
5. Set **Category** to "Chat Bot"
6. Note the **Client ID** and generate a **Client Secret**

## Step 2: Clone & Configure

```bash
git clone https://github.com/CrisioDev/CriStream.git
cd CriStream
cp .env.example .env
```

Edit `.env` with your values:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TWITCH_CLIENT_ID` | From Twitch Dev Console | `a6fxb...` |
| `TWITCH_CLIENT_SECRET` | From Twitch Dev Console | `ghqvv...` |
| `TWITCH_REDIRECT_URI` | Must match Twitch app settings | `https://bot.example.com/api/auth/twitch/callback` |
| `TWITCH_BOT_USERNAME` | The Twitch account your bot uses | `mycoolbot` |
| `JWT_SECRET` | Random string for auth tokens | Generate: `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 64-hex chars for encrypting OAuth tokens | Generate: `openssl rand -hex 32` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://cristream:cristream@postgres:5432/cristream` |
| `REDIS_URL` | Redis connection | `redis://redis:6379` |
| `CORS_ORIGIN` | Your domain with https | `https://bot.example.com` |
| `PUBLIC_URL` | Same as CORS_ORIGIN | `https://bot.example.com` |

### EventSub (for follow/sub/raid alerts)

| Variable | Description |
|----------|-------------|
| `EVENTSUB_SECRET` | Random string | Generate: `openssl rand -hex 16` |
| `EVENTSUB_CALLBACK_URL` | `https://your-domain.com/api/eventsub/webhook` |

### Optional

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Discord bot token (for Discord integration) |
| `DISCORD_CLIENT_ID` | Discord application client ID |
| `ANTHROPIC_API_KEY` | Claude API key (for AI chat summaries) |

## Step 3: Start

```bash
docker compose up -d
```

This starts three services:
- **app** — CriStream (API + frontend + bots)
- **postgres** — PostgreSQL 16 database
- **redis** — Redis 7 for caching and cooldowns

Database migrations run automatically on first start.

## Step 4: Reverse Proxy (HTTPS)

CriStream runs on port 3000. You need a reverse proxy with HTTPS for Twitch OAuth to work.

### Caddy (recommended)

```
bot.example.com {
    reverse_proxy localhost:3000
}
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name bot.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> **Important:** WebSocket support (`Upgrade` headers) is required for real-time features.

## Step 5: First Login

1. Open `https://your-domain.com` in your browser
2. Click **Login with Twitch**
3. Authorize the application
4. On the Dashboard, click **Join Channel** to activate the bot in your chat

## Step 6: Subscribe to EventSub (optional)

To receive follow, sub, raid, and other events:

1. Go to **Settings** in the dashboard
2. Click **Subscribe to EventSub**

This registers webhooks with Twitch. Your `EVENTSUB_CALLBACK_URL` must be publicly reachable.

## Updating

```bash
cd CriStream
git pull
docker compose up -d --build
```

Migrations run automatically on container start.

## Troubleshooting

### "Login with Twitch" fails
- Check that `TWITCH_REDIRECT_URI` in `.env` exactly matches what you set in the Twitch Dev Console
- Ensure HTTPS is working (Twitch requires HTTPS for OAuth)

### Bot doesn't respond in chat
- Make sure you clicked "Join Channel" on the Dashboard
- Check that `TWITCH_BOT_USERNAME` matches a valid Twitch account that has logged into your CriStream instance

### EventSub not working
- Verify `EVENTSUB_CALLBACK_URL` is publicly accessible
- Check container logs: `docker compose logs app --tail 50`

### View logs
```bash
docker compose logs app --tail 100 -f
```
