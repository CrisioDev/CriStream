import type { FastifyInstance } from "fastify";

/**
 * Public timer routes — no auth required.
 *
 * URL patterns:
 *   /timer/5m          → 5 minute countdown (restarts on refresh)
 *   /timer/1h30m       → 1 hour 30 minutes
 *   /timer/90s         → 90 seconds
 *   /timer/2h15m30s    → 2h 15m 30s
 *   /timer/2026-12-31  → countdown to date (midnight)
 *   /timer/2026-12-31T23:59 → countdown to date+time
 *
 * Query params for styling:
 *   color   — text color hex (no #), default: ffffff
 *   bg      — background hex or "transparent", default: transparent
 *   size    — font size px, default: 72
 *   font    — font family, default: Segoe UI
 *   labels  — 0 or 1, show d/h/m/s labels, default: 1
 *   sep     — separator, default: :
 *   text    — text when timer hits 0, default: TIME'S UP!
 *   title   — title text above timer, default: none
 */

function parseDuration(spec: string): number | null {
  // Try parsing as duration: 5m, 1h30m, 2h15m30s, 90s, etc.
  const re = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
  const match = spec.match(re);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  const s = parseInt(match[3] || "0");
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

function parseTarget(spec: string): string | null {
  // Try parsing as ISO date or datetime
  // Formats: 2026-12-31, 2026-12-31T23:59, 2026-12-31T23:59:00
  try {
    const d = new Date(spec.includes("T") ? spec : spec + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generatePublicTimerHtml(opts: {
  mode: "duration" | "target";
  durationSeconds?: number;
  targetIso?: string;
  color: string;
  bg: string;
  size: number;
  font: string;
  fontUrl?: string;
  labels: boolean;
  sep: string;
  completedText: string;
  title?: string;
}): string {
  const { mode, durationSeconds, targetIso, color, bg, size, font, labels, sep, completedText, title } = opts;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title ? escapeHtml(title) + " — " : ""}Countdown Timer</title>
${opts.fontUrl ? `<link rel="stylesheet" href="${escapeHtml(opts.fontUrl)}">` : ""}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: ${bg === "transparent" ? "transparent" : "#" + bg};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    overflow: hidden;
    font-family: '${escapeHtml(font)}', 'Segoe UI', system-ui, sans-serif;
  }
  #title {
    font-size: ${Math.round(size * 0.3)}px;
    color: #${color};
    opacity: 0.7;
    margin-bottom: ${Math.round(size * 0.15)}px;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  #timer {
    display: flex;
    align-items: baseline;
    gap: ${Math.round(size * 0.06)}px;
    user-select: none;
  }
  .segment {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .value {
    font-size: ${size}px;
    font-weight: 900;
    color: #${color};
    line-height: 1;
    font-variant-numeric: tabular-nums;
    min-width: ${Math.round(size * 1.2)}px;
    text-align: center;
  }
  .label {
    font-size: ${Math.round(size * 0.18)}px;
    color: #${color};
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: ${Math.round(size * 0.05)}px;
  }
  .sep {
    font-size: ${size}px;
    font-weight: 900;
    color: #${color};
    opacity: 0.7;
    line-height: 1;
  }
  #completed {
    display: none;
    font-size: ${size}px;
    font-weight: 900;
    color: #${color};
    text-align: center;
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  /* URL info (only shown standalone, hidden in OBS) */
  #info {
    position: fixed;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: #${color};
    opacity: 0.15;
  }
</style>
</head>
<body>
${title ? `<div id="title">${escapeHtml(title)}</div>` : ""}
<div id="timer"></div>
<div id="completed">${escapeHtml(completedText)}</div>
<div id="info">cristream timer</div>
<script>
(function() {
  var mode = "${mode}";
  var durationMs = ${(durationSeconds ?? 0) * 1000};
  var targetMs = ${targetIso ? `new Date("${targetIso}").getTime()` : "0"};
  var showLabels = ${labels};
  var separator = "${escapeHtml(sep)}";
  var startTime = Date.now();
  var timerEl = document.getElementById("timer");
  var completedEl = document.getElementById("completed");

  function pad(n) { return String(n).padStart(2, "0"); }

  function getRemaining() {
    if (mode === "target") return Math.max(0, targetMs - Date.now());
    return Math.max(0, durationMs - (Date.now() - startTime));
  }

  function render() {
    var ms = getRemaining();
    if (ms <= 0) {
      timerEl.style.display = "none";
      completedEl.style.display = "block";
      return;
    }
    var totalSec = Math.ceil(ms / 1000);
    var d = Math.floor(totalSec / 86400);
    var h = Math.floor((totalSec % 86400) / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;

    var parts = [];
    if (d > 0) parts.push({ v: pad(d), l: "Tage" });
    if (d > 0 || h > 0) parts.push({ v: pad(h), l: "Std" });
    parts.push({ v: pad(m), l: "Min" });
    parts.push({ v: pad(s), l: "Sek" });

    var html = "";
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) html += '<span class="sep">' + separator + '</span>';
      html += '<div class="segment"><span class="value">' + parts[i].v + '</span>';
      if (showLabels) html += '<span class="label">' + parts[i].l + '</span>';
      html += '</div>';
    }
    timerEl.innerHTML = html;
    requestAnimationFrame(render);
  }
  render();
})();
</script>
</body>
</html>`;
}

export async function publicTimerRoutes(app: FastifyInstance) {
  // /timer → default 5m
  app.get("/timer", async (_request, reply) => {
    return reply.redirect("/timer/5m");
  });

  // /timer/:spec
  app.get<{ Params: { spec: string }; Querystring: Record<string, string> }>(
    "/timer/:spec",
    async (request, reply) => {
      const { spec } = request.params;
      const q = request.query as Record<string, string>;

      // Parse spec
      const duration = parseDuration(spec);
      const target = !duration ? parseTarget(spec) : null;

      if (!duration && !target) {
        return reply.status(400).send(
          `Ungültiges Format. Beispiele:\n` +
          `  /timer/5m          — 5 Minuten\n` +
          `  /timer/1h30m       — 1 Stunde 30 Minuten\n` +
          `  /timer/90s         — 90 Sekunden\n` +
          `  /timer/2026-12-31T23:59 — Countdown bis Datum\n\n` +
          `Styling: ?color=ff0000&size=120&bg=000000&labels=0&sep=.&text=FERTIG&title=Mein%20Timer`
        );
      }

      // Resolve font URL — supports explicit fonturl param, or auto-tries CDNFonts/Google Fonts
      const fontName = q.font ?? "Segoe UI";
      let fontUrl = q.fonturl ?? undefined;
      if (!fontUrl && fontName !== "Segoe UI" && fontName !== "Arial" && fontName !== "monospace") {
        // Try CDNFonts first (works for Valken, etc.), then Google Fonts
        const encoded = encodeURIComponent(fontName);
        const cdnName = fontName.toLowerCase().replace(/\s+/g, "-");
        fontUrl = `https://fonts.cdnfonts.com/css/${cdnName}`;
      }

      const html = generatePublicTimerHtml({
        mode: duration ? "duration" : "target",
        durationSeconds: duration ?? undefined,
        targetIso: target ?? undefined,
        color: (q.color ?? "ffffff").replace(/^#/, ""),
        bg: (q.bg ?? "transparent").replace(/^#/, ""),
        size: Math.min(300, Math.max(16, parseInt(q.size ?? "72") || 72)),
        font: fontName,
        fontUrl,
        labels: q.labels !== "0",
        sep: q.sep ?? ":",
        completedText: q.text ?? "TIME'S UP!",
        title: q.title,
      });

      return reply.type("text/html").send(html);
    },
  );
}
