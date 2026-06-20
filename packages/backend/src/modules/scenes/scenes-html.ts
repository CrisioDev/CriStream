/**
 * Scene HTML generators — port of crisio-overlays-szenen.zip into per-channel
 * server-rendered overlays. Each function takes the channel's SceneSettings
 * and returns the full HTML for one scene.
 *
 * URL query parameters override DB values per render so the streamer can do
 * one-off tweaks in OBS without saving them (e.g. ?today=Bloodborne to flip
 * the "Heute live" caption for a single session).
 */

export interface SceneData {
  handle: string;
  twitchHandle: string;
  youtubeHandle: string;
  discordHandle: string;
  instagramHandle: string;
  brbNote: string;
  startingToday: string;
  defaultGame: string;
  defaultMode: string;
  streamPlan: Array<{ day: string; time: string; title: string }>;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function head(title: string, extraStyle = ""): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/scene-assets/fonts.css">
<link rel="stylesheet" href="/scene-assets/overlay.css">
${extraStyle ? `<style>${extraStyle}</style>` : ""}
</head>
<body>`;
}

// Cam-cutout CSS + inline SVG mask: cuts a real hole through every opaque
// parent so an OBS camera source layered UNDER the browser source shines
// through. We tried CSS mask-composite first — Chromium's implementation of
// the "subtract" composite gave incorrect results (entire mask erased rather
// than a hole), so we use an inline SVG mask instead. SVG masks are
// universally supported and behave the same in every engine.
//
// The mask: white rect over the whole viewport (= visible) minus a black
// rect at the cam position (= cut-through). JS measures the .ss-cam /
// .ig-cam-ph bounding rect on load and updates the SVG rect attributes.
const CAM_CUTOUT_CSS = `
.k-ph{background:transparent !important;background-image:none !important;}
.k-ph-label{
  position:absolute; top:8px; left:12px;
  font-size:11px !important; letter-spacing:.18em !important;
  color:rgba(255,255,255,.55) !important;
  background:rgba(0,0,0,.45); padding:3px 8px; border-radius:4px;
  pointer-events:none; z-index:5;
}
.ss-cam, .ig-cam-ph{position:relative;}
.k-ov, .ss-stripe { mask: url(#cam-hole-mask); -webkit-mask: url(#cam-hole-mask); }
`;

// Inline SVG mask element + the JS that resizes the hole rect to the cam's
// real pixel rect. The mask sits at 0×0 in the DOM (display:none would hide
// it from the rendering pipeline) but is referenced by the CSS above.
const CAM_CUTOUT_SVG_AND_JS = `
<svg width="0" height="0" style="position:absolute;left:-9999px;top:-9999px" aria-hidden="true">
  <defs>
    <mask id="cam-hole-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
      <rect width="1920" height="1080" fill="white"/>
      <rect id="cam-hole-rect" x="0" y="0" width="0" height="0" rx="20" ry="20" fill="black"/>
    </mask>
  </defs>
</svg>
<script>
(function() {
  function setCamHole() {
    const cam = document.querySelector('.ss-cam') || document.querySelector('.ig-cam-ph');
    const rect = document.getElementById('cam-hole-rect');
    if (!cam || !rect) return;
    const r = cam.getBoundingClientRect();
    rect.setAttribute('x', String(r.left));
    rect.setAttribute('y', String(r.top));
    rect.setAttribute('width', String(r.width));
    rect.setAttribute('height', String(r.height));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setCamHole);
  } else {
    setCamHole();
  }
  window.addEventListener('resize', setCamHole);
  // Run again after fonts settle in case the layout shifts late.
  setTimeout(setCamHole, 500);
})();
</script>`;

function socialBlock(d: SceneData): string {
  const items: Array<[string, string]> = [
    ["TWITCH", d.twitchHandle],
    ["YOUTUBE", d.youtubeHandle],
    ["DISCORD", d.discordHandle],
    ["INSTAGRAM", d.instagramHandle],
  ];
  return `<div class="k-soc">${items
    .filter(([, v]) => v.trim().length > 0)
    .map(
      ([net, han]) =>
        `<span class="k-soc-item"><span class="k-soc-net">${esc(net)}</span><span class="k-soc-han">${esc(han)}</span></span>`,
    )
    .join("")}</div>`;
}

// ── Starting Soon ────────────────────────────────────────────────────────────
export function generateStartingHtml(d: SceneData, query: Record<string, string | undefined>): string {
  const today = query.today ?? d.startingToday;
  const handle = query.handle ?? d.handle;
  // ?cam=guide reverts to the original opaque striped placeholder for users
  // who want to preview the layout without rigging a real cam source.
  const camCss = query.cam === "guide" ? "" : CAM_CUTOUT_CSS;
  return `${head("CRISIO · Starting Soon", camCss)}
<div class="k-ov">
  <div class="ss-stripe" aria-hidden="true"></div>
  <div class="k-pad ss">
    <div class="ss-top">
      <div class="k-kick" style="--ks:26px">// STREAM STARTET</div>
      <span class="k-pill ink"><span class="k-dot live"></span>LIVE IN KÜRZE</span>
    </div>
    <div class="ss-mid">
      <div class="ss-left">
        <h1 class="ss-h"><span class="mag">GLEICH</span><span>GEHT'S</span><span class="mag">LOS</span></h1>
        <div class="ss-today">
          <span class="k-sticker">HEUTE</span>
          <span class="ss-today-txt" id="today">${esc(today)}</span>
        </div>
      </div>
      <div class="ss-right">
        <div class="k-ph ss-cam"><span class="k-ph-label">WEBCAM<br>1280 × 720</span></div>
        <div class="ss-count"><span class="ss-count-lbl">START IN</span><span class="ss-count-num" id="count">05:00</span></div>
      </div>
    </div>
    <div class="ss-bot">
      <span class="k-pill">${esc(handle)}</span>
      ${socialBlock(d)}
    </div>
  </div>
</div>
${camCss ? CAM_CUTOUT_SVG_AND_JS : ""}
<script>
  const p = new URLSearchParams(location.search);
  let total = Math.max(0, Math.round((parseFloat(p.get('min')) || 5) * 60));
  const el = document.getElementById('count');
  (function tick(){
    const m = Math.floor(total/60), s = total%60;
    el.textContent = total > 0 ? String(m).padStart(2,'0')+':'+String(s).padStart(2,'0') : "GLEICH!";
    if (total > 0) { total--; setTimeout(tick, 1000); }
  })();
</script>
</body></html>`;
}

// ── BRB ──────────────────────────────────────────────────────────────────────
export function generateBrbHtml(d: SceneData, query: Record<string, string | undefined>): string {
  const handle = query.handle ?? d.handle;
  const note = query.note ?? d.brbNote;
  return `${head("CRISIO · BRB")}
<div class="k-ov">
  <div class="k-pad brb">
    <div class="brb-top">
      <div class="k-kick" style="--ks:26px">// KURZE PAUSE</div>
      <span class="k-pill ghost">${esc(handle)}</span>
    </div>
    <div class="brb-mid">
      <h1 class="brb-h"><span>BIN GLEICH</span><span class="mag">ZURÜCK</span></h1>
      <div class="brb-card">
        <div class="k-sticker">⏸ PAUSE</div>
        <p class="brb-note">${esc(note).replace(/\n/g, "<br>")}</p>
      </div>
    </div>
    <div class="brb-bot">
      ${socialBlock(d)}
      <div class="k-stamp"><i>MADE ON</i><div class="k-stamp-rule"></div><b>THERMOMIX</b><i>CTRL · v3</i></div>
    </div>
  </div>
</div>
</body></html>`;
}

// ── Offline ──────────────────────────────────────────────────────────────────
export function generateOfflineHtml(d: SceneData, query: Record<string, string | undefined>): string {
  const handle = query.handle ?? d.handle;
  const rows = (d.streamPlan ?? [])
    .map(
      (r) =>
        `<div class="off-row"><span class="off-row-d">${esc(r.day)}</span><span class="off-row-t">${esc(r.time)}</span><span class="off-row-g">${esc(r.title)}</span></div>`,
    )
    .join("");
  return `${head("CRISIO · Offline")}
<div class="k-ov">
  <div class="k-pad off">
    <div class="off-top">
      <span class="k-pill ink"><span class="k-dot"></span>GERADE OFFLINE</span>
      <div class="k-kick" style="--ks:26px">// FOLLOW FÜR DEN NÄCHSTEN STREAM</div>
    </div>
    <div class="off-mid">
      <div class="off-left">
        <h1 class="off-h"><span>NOCH</span><span class="mag">NICHT</span><span>LIVE</span></h1>
        <span class="k-pill">${esc(handle)}</span>
      </div>
      <div class="off-plan">
        <div class="off-plan-cap">STREAM-PLAN</div>
        ${rows || '<div class="off-row"><span class="off-row-g">Bald geht\'s weiter…</span></div>'}
      </div>
    </div>
    <div class="off-bot">${socialBlock(d)}</div>
  </div>
</div>
</body></html>`;
}

// ── In-Game HUD ──────────────────────────────────────────────────────────────
export function generateIngameHtml(
  d: SceneData,
  query: Record<string, string | undefined>,
  overlayToken: string,
): string {
  const handle = query.handle ?? d.handle;
  // game/mode: URL params win, else DB defaults. The Twitch poller below
  // updates #game live unless the URL provided a game (manual override mode).
  const game = query.game ?? d.defaultGame;
  const mode = query.mode ?? d.defaultMode;
  const camCss = query.cam === "guide" ? "" : CAM_CUTOUT_CSS;
  const gameLocked = !!query.game; // when user explicitly set ?game=, don't auto-update.
  return `${head("CRISIO · In-Game", camCss)}
<div class="k-ov ig">
  <div class="ig-now">
    <span class="ig-now-lbl">NOW PLAYING</span>
    <span class="ig-now-game" id="game">${esc(game)}</span>
    <span class="ig-now-mode" id="mode">${esc(mode)}</span>
  </div>

  <div class="ig-events" id="events"></div>

  <div class="ig-cam">
    <div class="ig-cam-bar">
      <span class="ig-cam-name"><span class="k-dot live"></span>${esc(handle.replace(/^@/, ""))}</span>
      <span class="ig-cam-mode">${esc(mode || "LIVE")}</span>
    </div>
    <div class="k-ph ig-cam-ph"><span class="k-ph-label">CAM</span></div>
  </div>

  <div class="ig-soc"><span class="ig-soc-han">${esc(handle)}</span><span class="ig-soc-net">· TWITCH · YT · DISCORD</span></div>
</div>
${camCss ? CAM_CUTOUT_SVG_AND_JS : ""}
<script>
  // Auto-pull current category from Twitch (cached 60s server-side) so the
  // NOW PLAYING line follows whatever the streamer set as the channel game.
  // Skipped when ?game= is on the URL (manual override mode).
  const LOCKED = ${JSON.stringify(gameLocked)};
  const TOKEN  = ${JSON.stringify(overlayToken)};
  async function syncGame() {
    if (LOCKED) return;
    try {
      const r = await fetch('/overlay/' + TOKEN + '/scene/state', { cache: 'no-store' });
      if (!r.ok) return;
      const s = await r.json();
      if (s && typeof s.game === 'string' && s.game.length > 0) {
        const el = document.getElementById('game');
        if (el && el.textContent !== s.game) el.textContent = s.game;
      }
    } catch (_) { /* offline / network blip — keep last value */ }
  }
  syncGame();
  setInterval(syncGame, 30000);
</script>
</body></html>`;
}

// ── Alerts ───────────────────────────────────────────────────────────────────
// This one is special: it connects to the StreamGuard WebSocket so live events
// drive the animation. The crisio TYPES dictionary is preserved verbatim and
// extended with the alertTypes StreamGuard actually emits.
export function generateAlertsHtml(overlayToken: string, _d: SceneData): string {
  return `${head("CRISIO · Alerts")}
<div class="al-stage" id="stage">
  <div class="al-card" id="card">
    <div class="al-icon" id="icon">+</div>
    <div class="al-text">
      <div class="al-kicker" id="kicker">NEUER FOLLOW</div>
      <div class="al-name" id="name"></div>
      <div class="al-msg" id="msg">ist jetzt am Start!</div>
    </div>
  </div>
</div>
<script src="/ws/socket.io.js"></script>
<script>
  const TYPES = {
    follow:    { tone:'',    icon:'+', kicker:'NEUER FOLLOW',  msg:'ist jetzt am Start!' },
    sub:       { tone:'ink', icon:'★', kicker:'NEUES ABO',     msg:'abonniert den Wahnsinn!' },
    resub:     { tone:'',    icon:'↻', kicker:'RESUB',         msg:'bleibt am Ball — Danke!' },
    giftsub:   { tone:'',    icon:'✦', kicker:'ABO-GESCHENK',  msg:'verschenkt Abos!' },
    bits:      { tone:'',    icon:'◆', kicker:'BITS',          msg:'haut Bits raus!' },
    raid:      { tone:'ink', icon:'→', kicker:'RAID!',         msg:'raidet rein!' },
    tip:       { tone:'',    icon:'€', kicker:'SPENDE',        msg:'füttert den Thermomix!' },
    hypetrain: { tone:'ink', icon:'⚡', kicker:'HYPE TRAIN',    msg:'rollt!' },
    command:   { tone:'',    icon:'!', kicker:'COMMAND',       msg:'' },
    sound:     { tone:'',    icon:'♪', kicker:'SOUND',         msg:'' },
  };

  const stage = document.getElementById('stage');
  const card = document.getElementById('card');
  const queue = [];
  let playing = false;

  function play(type, name, msg, kicker) {
    queue.push({ type, name, msg, kicker });
    if (!playing) tick();
  }

  function tick() {
    if (queue.length === 0) { playing = false; return; }
    playing = true;
    const { type, name, msg, kicker } = queue.shift();
    const t = TYPES[type] || TYPES.follow;
    card.className = 'al-card' + (t.tone ? ' ' + t.tone : '');
    document.getElementById('icon').textContent = t.icon;
    document.getElementById('kicker').textContent = kicker || t.kicker;
    document.getElementById('name').textContent = name || '';
    document.getElementById('msg').textContent = msg || t.msg;
    stage.classList.remove('play');
    void stage.offsetWidth;
    stage.classList.add('play');
    setTimeout(tick, 6500);
  }

  // URL params: ?type=follow&name=X — for manual testing in OBS preview.
  const p = new URLSearchParams(location.search);
  if (p.get('type')) {
    play(p.get('type'), p.get('name') || '', p.get('msg') || '', p.get('kicker') || '');
  }

  // Live socket — same /ws path the existing overlay uses, gated by overlayToken.
  const socket = io({ path: '/ws', query: { overlayToken: ${JSON.stringify(overlayToken)} } });

  // Map StreamGuard's "alert:trigger" payload onto the TYPES dictionary.
  // The payload shape: { channelId, payload: { alertType, text, ... } }
  socket.on('alert:trigger', (evt) => {
    const a = evt && evt.payload ? evt.payload : evt;
    if (!a) return;
    const t = a.alertType || 'follow';
    // Use the resolved text from the backend, falling back to the TYPES default.
    const text = a.text || '';
    // Heuristic split: "<name> ist jetzt am Start!" → name=first word, msg=rest.
    const firstSpace = text.indexOf(' ');
    const name = firstSpace > 0 ? text.slice(0, firstSpace) : text;
    const msg  = firstSpace > 0 ? text.slice(firstSpace + 1) : '';
    play(t, name, msg);
  });

  socket.on('connect', () => console.log('[scene/alerts] connected'));
  socket.on('disconnect', () => console.log('[scene/alerts] disconnected'));
</script>
</body></html>`;
}
