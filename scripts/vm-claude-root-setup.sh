#!/bin/bash
# One-time setup: permanent Claude Code root session on the production VM.
#
# Usage (from the dev machine):
#   1. Claude-Abo-Login auf die VM kopieren (Claude Code dort nutzt das User-Abo,
#      NICHT den ANTHROPIC_API_KEY der App — der ist nur für Discord-Summaries):
#      cat ~/.claude/.credentials.json | ssh <user>@<vm> \
#        'sudo install -d -m 700 /root/.claude && sudo tee /root/.claude/.credentials.json >/dev/null && sudo chmod 600 /root/.claude/.credentials.json'
#   2. ssh <user>@<vm> 'sudo bash -s' < scripts/vm-claude-root-setup.sh
#
# Result: systemd service "claude-root" keeps a tmux session (socket -L claude-root,
# session "claude") running Claude Code as root in the deploy work-tree.
# Attach with: claude-attach   (detach: Ctrl+B, then D)
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

DEPLOY_DIR=/home/crisio/streamguard
CRED_FILE=/root/.claude/.credentials.json

if [ ! -f "$CRED_FILE" ]; then
  echo "WARN: $CRED_FILE missing — run /login once after attaching to the session." >&2
fi

echo "== Installing tmux =="
apt-get update -qq
apt-get install -y -qq tmux unzip >/dev/null

echo "== Installing Claude Code (native build) =="
mkdir -p /root/.local/bin
if [ ! -x /root/.local/bin/claude ]; then
  # root install is intentional here — the session runs as root by design
  curl -fsSL https://claude.ai/install.sh | CLAUDE_INSTALL_ALLOW_SUDO=1 HOME=/root bash
fi
if [ ! -x /root/.local/bin/claude ]; then
  ALT=$(command -v claude || true)
  if [ -n "$ALT" ]; then
    ln -sf "$ALT" /root/.local/bin/claude
  else
    echo "ERROR: claude binary not found after install" >&2
    exit 1
  fi
fi
/root/.local/bin/claude --version

echo "== Seeding Claude config (skip onboarding, trust work-tree) =="
if [ ! -f /root/.claude.json ]; then
  cat > /root/.claude.json <<JSON
{
  "hasCompletedOnboarding": true,
  "theme": "dark",
  "projects": { "${DEPLOY_DIR}": { "hasTrustDialogAccepted": true } }
}
JSON
fi
git config --global --add safe.directory "$DEPLOY_DIR" 2>/dev/null || true

echo "== systemd unit claude-root.service =="
cat > /etc/systemd/system/claude-root.service <<UNIT
[Unit]
Description=Permanent Claude Code root session (tmux -L claude-root, session "claude")
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=forking
Environment=HOME=/root
Environment=TERM=xterm-256color
WorkingDirectory=${DEPLOY_DIR}
ExecStart=/usr/bin/tmux -L claude-root new-session -d -s claude -x 200 -y 50 -c ${DEPLOY_DIR} /root/.local/bin/claude
ExecStop=/usr/bin/tmux -L claude-root kill-session -t claude
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT

cat > /usr/local/bin/claude-attach <<'EOS'
#!/bin/bash
# Attach to the permanent Claude Code root session (detach: Ctrl+B, then D)
exec sudo tmux -L claude-root attach -t claude
EOS
chmod +x /usr/local/bin/claude-attach

echo "== CLAUDE.local.md (VM-specific notes, untracked) =="
cat > "$DEPLOY_DIR/CLAUDE.local.md" <<'MD'
# Produktions-VM (lokale Notizen — nicht im Repo)

Du läufst als ROOT in einer permanenten tmux-Session (systemd: `claude-root.service`)
auf der Produktions-VM. Workdir = deployter Work-Tree.

- Container: `streamguard-app-1`, `streamguard-postgres-1`, `streamguard-redis-1`
  (`docker compose` hier im Verzeichnis). Zusätzlich läuft der questdnd-Stack
  (questdnd-*-Container) auf dieser VM — NICHT anfassen.
- Deploys kommen per `git push production main` vom Dev-Rechner:
  Bare-Repo `~crisio/streamguard.git`, post-receive baut + startet, Log: `~crisio/deploy.log`
- Watchdog: `~crisio/watchdog.sh` (cron */2, prüft /api/health, restartet app)
- `.env` hier im Verzeichnis enthält alle Secrets — nie committen/überschreiben
- Auth dieser Claude-Session: Abo-Login (`/root/.claude/.credentials.json`).
  Der `ANTHROPIC_API_KEY` in `.env` gehört der App (Discord-Zusammenfassungen)
  und ist NICHT für Claude Code gedacht.
- Logs: `docker logs streamguard-app-1 --since 30m`
- DB: `docker exec -it streamguard-postgres-1 psql -U cristream cristream`
- Redis: `docker exec -it streamguard-redis-1 redis-cli`

WICHTIG als root:
- Nach Datei-Änderungen im Work-Tree: `chown -R crisio:crisio /home/crisio/streamguard`
  — sonst scheitert der nächste Deploy (git checkout läuft als crisio).
- Direkte Hotfixes hier gehen beim nächsten Deploy verloren; echte Fixes gehören
  ins Repo auf dem Dev-Rechner.
- Es läuft ggf. gerade ein Live-Stream: Container-Restarts kurz halten und nur
  wenn nötig.
MD
chown crisio:crisio "$DEPLOY_DIR/CLAUDE.local.md"

systemctl daemon-reload
systemctl enable --now claude-root.service
sleep 6

echo "== Status =="
systemctl --no-pager status claude-root.service | head -8 || true
tmux -L claude-root ls || true
echo "== Screen =="
tmux -L claude-root capture-pane -pt claude | tail -25 || true
echo "== DONE — attach with: claude-attach  (or: ssh -t crisio@<vm> claude-attach) =="
