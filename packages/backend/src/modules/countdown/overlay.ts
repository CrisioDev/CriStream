import type { CountdownTimer } from "./service.js";

/**
 * Generates a self-contained HTML overlay page for a countdown timer.
 * Pure client-side — no WebSocket needed.
 */
export function generateCountdownOverlayHtml(timer: CountdownTimer): string {
  const s = timer.style;
  const escapedFont = s.fontFamily.replace(/"/g, "&quot;");
  const isTarget = timer.mode === "target";
  const durationMs = timer.durationSeconds ? timer.durationSeconds * 1000 : 0;
  const targetMs = timer.targetDate ? new Date(timer.targetDate).getTime() : 0;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${timer.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: ${s.backgroundColor === "transparent" ? "transparent" : s.backgroundColor};
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    overflow: hidden;
    font-family: ${escapedFont};
  }
  #timer {
    display: flex;
    align-items: baseline;
    gap: 4px;
    user-select: none;
  }
  .segment {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .value {
    font-size: ${s.fontSize}px;
    font-weight: 900;
    color: ${s.color};
    line-height: 1;
    font-variant-numeric: tabular-nums;
    min-width: ${Math.round(s.fontSize * 1.2)}px;
    text-align: center;
  }
  .label {
    font-size: ${Math.round(s.fontSize * 0.2)}px;
    color: ${s.color};
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 4px;
  }
  .separator {
    font-size: ${s.fontSize}px;
    font-weight: 900;
    color: ${s.color};
    opacity: 0.4;
    line-height: 1;
  }
  #completed {
    display: none;
    font-size: ${s.fontSize}px;
    font-weight: 900;
    color: ${s.color};
    text-align: center;
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
</style>
</head>
<body>
<div id="timer"></div>
<div id="completed">${s.completedText.replace(/</g, "&lt;")}</div>
<script>
(function() {
  const mode = "${timer.mode}";
  const durationMs = ${durationMs};
  const targetMs = ${targetMs};
  const showLabels = ${s.showLabels};
  const showDays = ${s.showDays};
  const showHours = ${s.showHours};
  const showMinutes = ${s.showMinutes};
  const showSeconds = ${s.showSeconds};
  const separator = "${s.separator.replace(/"/g, '\\"')}";

  const startTime = Date.now();
  const timerEl = document.getElementById("timer");
  const completedEl = document.getElementById("completed");

  function pad(n) { return String(n).padStart(2, "0"); }

  function getRemaining() {
    if (mode === "target") {
      return Math.max(0, targetMs - Date.now());
    } else {
      return Math.max(0, durationMs - (Date.now() - startTime));
    }
  }

  function render() {
    const ms = getRemaining();
    if (ms <= 0) {
      timerEl.style.display = "none";
      completedEl.style.display = "block";
      return;
    }

    const totalSec = Math.ceil(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;

    let parts = [];
    if (showDays && (d > 0 || mode === "target")) parts.push({ value: pad(d), label: "Tage" });
    if (showHours) parts.push({ value: pad(h), label: "Std" });
    if (showMinutes) parts.push({ value: pad(m), label: "Min" });
    if (showSeconds) parts.push({ value: pad(sec), label: "Sek" });

    // Hide leading zero segments for duration mode
    if (mode === "duration") {
      while (parts.length > 1 && parts[0].value === "00") parts.shift();
    }

    let html = "";
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) html += '<span class="separator">' + separator + '</span>';
      html += '<div class="segment"><span class="value">' + parts[i].value + '</span>';
      if (showLabels) html += '<span class="label">' + parts[i].label + '</span>';
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
