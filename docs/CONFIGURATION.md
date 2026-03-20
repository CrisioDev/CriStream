# Configuration Guide

After installation, configure CriStream features through the web dashboard.

## Commands

**Dashboard → Commands**

Create custom chat commands that respond to messages.

| Field | Description |
|-------|-------------|
| Trigger | The command keyword (e.g. `hello`) — used as `!hello` |
| Response | The bot's reply. Supports [variables](#variables) |
| Cooldown | Seconds between uses |
| Per-User Cooldown | Cooldown applies per user instead of globally |
| User Level | Who can use it: `everyone`, `subscriber`, `vip`, `moderator`, `broadcaster` |
| Aliases | Alternative triggers for the same command |
| Chain | Trigger other commands after this one |

### Variables

Use these in command responses:

| Variable | Output | Example |
|----------|--------|---------|
| `$(user)` | Username of who triggered the command | `TheCrisio` |
| `$(channel)` | Channel name | `thecrisio` |
| `$(count)` | How many times this command has been used | `42` |
| `$(points)` | User's loyalty points | `1500` |
| `$(watchtime)` | User's total watch time | `3h 20m` |
| `$(game)` | Current game/category | `Minecraft` |
| `$(title)` | Current stream title | `Chill Stream` |
| `$(viewers)` | Current viewer count | `127` |
| `$(random)` | Random number 1-100 | `73` |
| `$(customapi.URL)` | Fetches a URL and inserts the response | — |
| `$(urlfetch.URL)` | Alias for customapi | — |

**Example:** `!followage` → Response: `$(user) has been watching for $(watchtime)!`

## Timers

**Dashboard → Timers**

Automatically send messages at regular intervals.

| Field | Description |
|-------|-------------|
| Name | Timer identifier |
| Message | What to send. Supports variables |
| Interval | Minutes between messages |
| Min Chat Lines | Minimum chat activity before timer fires (prevents spam in dead chat) |
| Twitch Enabled | Send on Twitch |
| Discord Enabled | Send on Discord |

## Moderation

**Dashboard → Moderation**

Auto-moderate chat with configurable filters:

| Filter | What it catches |
|--------|----------------|
| **Links** | URLs in chat (timeout duration configurable) |
| **Caps** | Excessive caps (threshold: % of message that's caps) |
| **Symbols** | Excessive symbols/special characters |
| **Emotes** | Too many emotes in one message |
| **Spam** | Repeated messages within a time window |
| **Banned Words** | Custom word/regex blacklist |

All filters respect user levels — moderators and above are exempt.

## Loyalty Points

**Dashboard → Points**

Viewers earn points by chatting and watching.

| Setting | Description |
|---------|-------------|
| Points per Message | Points earned per chat message |
| Points per Interval | Points earned passively |
| Interval Minutes | How often passive points are awarded |

Points can be spent on **Sound Alerts** and **Song Requests**.

## Song Requests

**Dashboard → Song Requests**

Viewers use `!sr <youtube-url>` to add songs to the queue.

| Setting | Description |
|---------|-------------|
| Max Queue Size | Maximum songs in queue |
| Max Duration | Maximum song length in seconds |
| User Cooldown | Seconds between requests per user |

The queue plays through the **Song Request Player** OBS overlay.

## Alerts

**Dashboard → Alerts**

Configure visual/audio alerts for stream events:

| Alert Type | Trigger |
|------------|---------|
| Follow | New follower |
| Sub | New subscription |
| Gift Sub | Gifted subscriptions |
| Raid | Incoming raid |
| Hype Train | Hype train event |

Each alert has:
- **Text template** with variables (`{user}`, `{amount}`)
- **Image/Video** (upload or URL)
- **Sound** (upload)
- **Animation** (slide, fade, bounce, zoom)
- **Duration** (seconds)
- **TTS** (text-to-speech, optional)
- **Custom Layout** — WYSIWYG editor for precise positioning

## Channel Points

**Dashboard → Channel Points**

Create custom Twitch Channel Point rewards with automated actions:

| Action Type | What it does |
|-------------|-------------|
| Sound | Plays a sound on stream |
| Alert | Shows a custom overlay alert |
| Command | Triggers a chat command |
| Chat Message | Sends a message in chat |
| TTS | Text-to-speech of user input |
| Webhook | Calls an external URL |

Multiple actions can be chained on a single reward.

## OBS Overlays

**Dashboard → Overlay**

Three overlay types, each a separate OBS Browser Source:

### Alert Overlay
Shows alerts (follow, sub, raid) with animations and sounds.
- **Resolution:** 1920x1080
- **URL:** `https://your-domain.com/overlay/{token}`

### Song Request Player
YouTube player for song requests.
- **URL:** `https://your-domain.com/overlay/{token}/player`

### Live Sandbox
Persistent overlay layer controlled in real-time from the dashboard.
- **URL:** `https://your-domain.com/overlay/{token}/sandbox`

### OBS Browser Source Settings
| Setting | Value |
|---------|-------|
| Width | 1920 |
| Height | 1080 |
| Custom CSS | `body { background-color: rgba(0,0,0,0); }` |
| Shutdown source when not visible | Disabled |

## Live Sandbox

**Dashboard → Sandbox**

A real-time WYSIWYG editor for placing persistent elements on your stream:

- **Text** — custom fonts, colors, shadows, backgrounds
- **Images** — upload or URL, with border/fit options
- **Videos** — upload or URL, loop/mute controls

Every change appears **instantly** on the OBS overlay — no save button needed.

Features:
- Drag & drop positioning
- Resize handles
- Layer ordering (z-index)
- Visibility toggle per element
- Duplicate/delete
- **Stream Preview** — toggle your live stream as the editor background for precise placement

## Discord Integration

**Dashboard → Discord**

Connect a Discord bot to mirror features:

| Feature | Description |
|---------|-------------|
| Commands | Bot commands work in Discord too |
| Timers | Timer messages sent to a Discord channel |
| Summaries | AI-generated chat summaries (requires Anthropic API key) |
| Notifications | Stream events (go live, new follower, sub) posted to Discord |

### Setup
1. Create a Discord bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Add `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID` to `.env`
3. Invite the bot to your server using the OAuth2 URL from the Discord page in the dashboard
4. Configure channel mappings in **Dashboard → Discord**

## Multi-Channel & Editors

CriStream supports managing **multiple Twitch channels** from one instance.

### Adding Channels
Use the channel switcher in the sidebar to add channels.

### Editors (RBAC)
Invite other users to help manage your channel:

| Role | Read | Write | Delete Channel |
|------|------|-------|----------------|
| Owner | Yes | Yes | Yes |
| Editor | Yes | Yes | No |
| Viewer | Yes | No | No |

Go to **Settings → Channel Editors** to invite users by their Twitch username.
