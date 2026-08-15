# StreamGuard / CriStream

Twitch-Stream-Support: Chat-Bot, Moderation, Points, Song Requests, Alerts, OBS-Overlays/Szenen, Casino, Discord-Notifications.

Monorepo (pnpm workspaces):
- `packages/shared` — Types, Konstanten (u.a. `TWITCH_SCOPES`)
- `packages/backend` — Fastify, Prisma (PostgreSQL), Redis (ioredis), socket.io, @twurple/*, discord.js
- `packages/frontend` — React 18, Vite, Tailwind, Zustand

## Entwicklung
- `pnpm install`, dev via `docker-compose.dev.yml` (Postgres/Redis) + `pnpm dev`
- Shared muss vor Backend gebaut werden (`pnpm --filter @cristream/shared build`)
- Migrationen: `prisma migrate dev` im Backend-Package

## Deploy (Produktion)
- `git push production main` — post-receive-Hook auf dem Server macht checkout, `docker compose build`, `up -d`, Health-Check
- Health: `GET /api/health`; Watchdog auf dem Server prüft alle 2 min und restartet die App bei Fehlschlag
- `.env` und `uploads/` existieren nur auf dem Server — niemals überschreiben oder committen
- Server-spezifische Pfade/Details stehen bewusst NICHT im Repo, sondern in `CLAUDE.local.md` auf dem Server (untracked)

## Robustheit (eingebaut — nicht entfernen)
- `packages/backend/src/server.ts`: `uncaughtException`/`unhandledRejection`-Guards; transiente Netzwerkfehler werden überlebt, alles andere → sauberer Exit + Docker-Restart
- Discord-Client (`src/discord/discord-client.ts`): Login-Retry mit Backoff (Netz-Blip beim Boot deaktiviert Discord nicht mehr dauerhaft), `shardError`-Handler, 50013 (Missing Permissions) wird kompakt als Warning geloggt
- `docker-compose.yml`: Log-Rotation (10m × 3), `init: true`, Healthchecks, `restart: unless-stopped`

## Bekannte externe Konfig-Punkte (nicht im Code fixbar)
- Discord: Der Bot braucht "Send Messages" im konfigurierten Notification-Channel, sonst 50013-Warnings und die Notification geht verloren
- Twitch: Nach Scope-Änderungen in `TWITCH_SCOPES` (zuletzt: `moderator:manage:shoutouts` für Auto-Shoutouts) muss der Broadcaster sich einmal neu übers Dashboard einloggen, damit der gespeicherte Token den Scope bekommt

## TypeScript-Eigenheiten
- ioredis braucht `new (IORedis as any)(...)` (ESM-Kompatibilität)
- jsonwebtoken: `expiresIn` braucht `as any` mit neueren @types
- Backend `"module": "Node16"`, Frontend ESNext/bundler
