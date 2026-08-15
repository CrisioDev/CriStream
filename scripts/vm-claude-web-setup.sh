#!/bin/bash
# Web terminal for the permanent Claude root session.
#
# ttyd (with HTTP basic auth) attaches to the tmux session (-L claude-root,
# session "claude"); the StreamGuard backend proxies /claude/* including the
# WebSocket to it (CLAUDE_TERMINAL_TARGET), so the terminal is reachable on
# the same origin as the dashboard: https://<domain>/claude/
#
# Run as root:  ssh <user>@<vm> 'sudo bash -s' < scripts/vm-claude-web-setup.sh
# Afterwards deploy the app (git push production main) so the proxy code and
# the CLAUDE_TERMINAL_TARGET env var take effect (container recreate).
set -euo pipefail

DEPLOY_DIR=/home/crisio/streamguard
CRED_FILE=/root/.claude/web-terminal-credentials
TTYD_BIN=/usr/local/bin/ttyd
TTYD_VERSION=1.7.7

echo "== ttyd =="
if [ ! -x "$TTYD_BIN" ]; then
  curl -fsSL -o "$TTYD_BIN" "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64"
  chmod +x "$TTYD_BIN"
fi
"$TTYD_BIN" --version

echo "== credentials =="
if [ ! -f "$CRED_FILE" ]; then
  PASS=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-20)
  printf 'TTYD_CREDENTIAL=crisio:%s\n' "$PASS" > "$CRED_FILE"
  chmod 600 "$CRED_FILE"
fi

echo "== systemd unit claude-web.service =="
cat > /etc/systemd/system/claude-web.service <<UNIT
[Unit]
Description=Claude web terminal (ttyd -> tmux claude-root session)
After=network-online.target claude-root.service
Wants=claude-root.service

[Service]
EnvironmentFile=${CRED_FILE}
ExecStart=${TTYD_BIN} -p 7681 -i 0.0.0.0 -W -P 30 -b /claude -c \${TTYD_CREDENTIAL} tmux -L claude-root attach -t claude
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now claude-web.service
systemctl restart claude-web.service

echo "== app .env =="
if ! grep -q '^CLAUDE_TERMINAL_TARGET=' "$DEPLOY_DIR/.env"; then
  printf '\nCLAUDE_TERMINAL_TARGET=http://host.docker.internal:7681\n' >> "$DEPLOY_DIR/.env"
  echo "CLAUDE_TERMINAL_TARGET appended — takes effect on next deploy/recreate"
fi

sleep 2
systemctl --no-pager status claude-web.service | head -6 || true
echo "== local check (expect 401 without credentials) =="
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7681/claude/ || true
echo "== DONE — credentials in ${CRED_FILE} =="
