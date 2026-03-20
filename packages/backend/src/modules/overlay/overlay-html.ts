import { config } from "../../config/index.js";

interface PollPredictionSettings {
  pollEnabled: boolean;
  predictionEnabled: boolean;
  resultDuration: number;
  position: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  barHeight: number;
  width: number;
  fontSize: number;
}

const DEFAULT_PP_SETTINGS: PollPredictionSettings = {
  pollEnabled: true,
  predictionEnabled: true,
  resultDuration: 60,
  position: "top-left",
  backgroundColor: "rgba(0,0,0,0.8)",
  textColor: "#ffffff",
  accentColor: "#9147FF",
  barHeight: 28,
  width: 400,
  fontSize: 16,
};

export function generateOverlayHtml(overlayToken: string, ppSettings?: PollPredictionSettings | null): string {
  const wsPath = "/ws";
  const pp = ppSettings ?? DEFAULT_PP_SETTINGS;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StreamGuard Overlay</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: transparent;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 100vw;
    height: 100vh;
  }

  #alert-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    z-index: 9999;
  }

  .alert {
    display: none;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .alert.active {
    display: flex;
  }

  .alert-image {
    max-width: 300px;
    max-height: 300px;
    border-radius: 12px;
  }

  .alert-text {
    font-size: 32px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(100,65,255,0.5);
    padding: 12px 24px;
    border-radius: 12px;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
  }

  /* Custom layout canvas */
  #custom-alert-wrapper {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 9999;
  }

  #custom-alert-wrapper.active {
    display: flex;
  }

  #custom-alert-container {
    pointer-events: none;
  }

  /* Animations */
  @keyframes slideIn {
    from { transform: translateY(-100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(100px); opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes bounceIn {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.1); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes bounceOut {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.3); opacity: 0; }
  }
  @keyframes zoomIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes zoomOut {
    from { transform: scale(1); opacity: 1; }
    to { transform: scale(0); opacity: 0; }
  }

  .anim-slide-in { animation: slideIn 0.5s ease-out forwards; }
  .anim-slide-out { animation: slideOut 0.5s ease-in forwards; }
  .anim-fade-in { animation: fadeIn 0.5s ease-out forwards; }
  .anim-fade-out { animation: fadeOut 0.5s ease-in forwards; }
  .anim-bounce-in { animation: bounceIn 0.6s ease-out forwards; }
  .anim-bounce-out { animation: bounceOut 0.4s ease-in forwards; }
  .anim-zoom-in { animation: zoomIn 0.4s ease-out forwards; }
  .anim-zoom-out { animation: zoomOut 0.4s ease-in forwards; }

  /* ── Poll / Prediction Widget ── */
  #pp-widget {
    position: fixed;
    z-index: 8000;
    pointer-events: none;
    width: var(--pp-width);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: var(--pp-font-size);
    color: var(--pp-text-color);
    transition: opacity 0.5s ease, transform 0.5s ease;
    opacity: 0;
    transform: translateX(50px);
  }
  #pp-widget.visible {
    opacity: 1;
    transform: translateX(0);
  }
  #pp-widget.pos-top-right { top: 20px; right: 20px; }
  #pp-widget.pos-top-left { top: 20px; left: 20px; }
  #pp-widget.pos-bottom-right { bottom: 20px; right: 20px; }
  #pp-widget.pos-bottom-left { bottom: 20px; left: 20px; }
  #pp-widget.pos-center { top: 50%; left: 50%; transform: translate(-50%, -50%); }
  #pp-widget.pos-center.visible { transform: translate(-50%, -50%); }
  #pp-widget.pos-top-left, #pp-widget.pos-bottom-left {
    transform: translateX(-50px);
  }
  #pp-widget.pos-top-left.visible, #pp-widget.pos-bottom-left.visible {
    transform: translateX(0);
  }
  .pp-card {
    background: var(--pp-bg-color);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .pp-title {
    font-weight: 700;
    font-size: calc(var(--pp-font-size) + 2px);
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pp-timer {
    font-size: calc(var(--pp-font-size) - 2px);
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
  }
  .pp-status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: calc(var(--pp-font-size) - 4px);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .pp-status-locked { background: #e74c3c; color: #fff; }
  .pp-status-ended { background: #2ecc71; color: #fff; }
  .pp-choice {
    margin-bottom: 6px;
  }
  .pp-choice-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 3px;
    font-size: calc(var(--pp-font-size) - 1px);
  }
  .pp-bar-bg {
    width: 100%;
    height: var(--pp-bar-height);
    background: rgba(255,255,255,0.15);
    border-radius: calc(var(--pp-bar-height) / 2);
    overflow: hidden;
    position: relative;
  }
  .pp-bar-fill {
    height: 100%;
    border-radius: calc(var(--pp-bar-height) / 2);
    transition: width 0.6s ease;
    display: flex;
    align-items: center;
    padding: 0 8px;
    font-size: calc(var(--pp-font-size) - 3px);
    font-weight: 600;
    min-width: 0;
  }
  .pp-choice.winner .pp-bar-fill {
    box-shadow: 0 0 12px rgba(46, 204, 113, 0.6);
  }
  .pp-choice.loser {
    opacity: 0.4;
  }
  .pp-prediction-color-BLUE { background: #387AFF; }
  .pp-prediction-color-PINK { background: #F5009B; }
  .pp-prediction-color-default { background: var(--pp-accent-color); }
</style>
</head>
<body>
<!-- Legacy alert container -->
<div id="alert-container">
  <div id="alert" class="alert">
    <img id="alert-image" class="alert-image" src="" alt="" style="display:none" />
    <div id="alert-text" class="alert-text"></div>
  </div>
</div>

<!-- Custom layout alert container -->
<div id="custom-alert-wrapper"><div id="custom-alert-container"></div></div>

<!-- Poll / Prediction Widget -->
<div id="pp-widget" class="pos-${pp.position}" style="
  --pp-width: ${pp.width}px;
  --pp-font-size: ${pp.fontSize}px;
  --pp-text-color: ${pp.textColor};
  --pp-bg-color: ${pp.backgroundColor};
  --pp-accent-color: ${pp.accentColor};
  --pp-bar-height: ${pp.barHeight}px;
"></div>

<audio id="alert-audio" preload="auto"></audio>

<script src="/ws/socket.io.js"></script>
<script>
(function() {
  const token = ${JSON.stringify(overlayToken)};
  const socket = io({ path: '${wsPath}', query: { overlayToken: token } });

  const alertQueue = [];
  let isPlaying = false;
  const loadedFonts = new Set();

  // Preload voices for TTS
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }

  const alertEl = document.getElementById('alert');
  const textEl = document.getElementById('alert-text');
  const imageEl = document.getElementById('alert-image');
  const audioEl = document.getElementById('alert-audio');
  const alertContainer = document.getElementById('alert-container');
  const customWrapper = document.getElementById('custom-alert-wrapper');
  const customContainer = document.getElementById('custom-alert-container');

  socket.on('connect', () => console.log('Overlay connected'));
  socket.on('disconnect', () => console.log('Overlay disconnected'));

  socket.on('alert:trigger', (data) => {
    alertQueue.push(data.payload);
    if (!isPlaying) playNext();
  });

  socket.on('sound:play', (data) => {
    const audio = new Audio(data.soundUrl);
    audio.volume = (data.volume ?? 80) / 100;
    audio.play().catch(() => {});
  });

  function speakTts(alert, onEnd) {
    if (!alert.ttsEnabled || !('speechSynthesis' in window) || !alert.text) {
      onEnd();
      return;
    }
    const utter = new SpeechSynthesisUtterance(alert.text);
    if (alert.ttsVoice) {
      const voices = speechSynthesis.getVoices();
      const match = voices.find(v => v.name === alert.ttsVoice);
      if (match) utter.voice = match;
    }
    utter.rate = alert.ttsRate || 1.0;
    utter.volume = (alert.ttsVolume ?? 80) / 100;
    utter.onend = onEnd;
    utter.onerror = onEnd;
    speechSynthesis.speak(utter);
  }

  function playNext() {
    if (alertQueue.length === 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const alert = alertQueue.shift();

    if (alert.layoutConfig && alert.layoutConfig.elements) {
      showCustomAlert(alert);
    } else {
      showLegacyAlert(alert);
    }
  }

  function isVideoUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.webm') || lower.endsWith('.mp4');
  }

  function createMediaElement(url, styles, muted, loop) {
    if (isVideoUrl(url)) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.autoplay = true;
      vid.loop = !!loop;
      vid.muted = !!muted;
      vid.playsInline = true;
      Object.assign(vid.style, styles);
      return vid;
    } else {
      const img = document.createElement('img');
      img.src = url;
      Object.assign(img.style, styles);
      return img;
    }
  }

  function loadGoogleFont(family) {
    if (loadedFonts.has(family)) return;
    const webSafe = ['Segoe UI','Arial','Georgia','Impact','Comic Sans MS'];
    if (webSafe.includes(family)) return;
    loadedFonts.add(family);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family) + ':wght@400;700&display=swap';
    document.head.appendChild(link);
  }

  function showCustomAlert(alert) {
    const lc = alert.layoutConfig;
    const canvas = lc.canvas;

    // Hide legacy, show custom
    alertContainer.style.display = 'none';

    // Build canvas div
    const canvasDiv = document.createElement('div');
    canvasDiv.style.position = 'relative';
    canvasDiv.style.width = canvas.width + 'px';
    canvasDiv.style.height = canvas.height + 'px';
    canvasDiv.style.background = canvas.background || 'transparent';

    // Sort elements by zIndex
    const sorted = [...lc.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    sorted.forEach(el => {
      if (el.type === 'image') {
        if (!alert.imageUrl) return;
        const mediaStyles = {
          position: 'absolute',
          left: el.x + 'px',
          top: el.y + 'px',
          width: el.width + 'px',
          height: el.height + 'px',
          zIndex: String(el.zIndex || 1),
          borderRadius: (el.borderRadius || 0) + 'px',
          objectFit: el.objectFit || 'contain',
        };
        if (el.borderWidth) {
          mediaStyles.border = el.borderWidth + 'px solid ' + (el.borderColor || '#fff');
        }
        const media = createMediaElement(alert.imageUrl, mediaStyles, alert.videoMuted, alert.videoLoop);
        canvasDiv.appendChild(media);
      } else if (el.type === 'text') {
        loadGoogleFont(el.fontFamily || 'Segoe UI');
        const div = document.createElement('div');
        div.textContent = alert.text;
        div.style.position = 'absolute';
        div.style.left = el.x + 'px';
        div.style.top = el.y + 'px';
        div.style.width = el.width + 'px';
        div.style.height = el.height + 'px';
        div.style.zIndex = String(el.zIndex || 1);
        div.style.fontFamily = "'" + (el.fontFamily || 'Segoe UI') + "', sans-serif";
        div.style.fontSize = (el.fontSize || 32) + 'px';
        div.style.fontWeight = el.fontWeight || 'bold';
        div.style.fontStyle = el.fontStyle || 'normal';
        div.style.color = el.color || '#ffffff';
        div.style.textAlign = el.textAlign || 'center';
        if (el.textShadow) div.style.textShadow = el.textShadow;
        if (el.textStroke) div.style.webkitTextStroke = el.textStroke;
        if (el.backgroundColor) div.style.background = el.backgroundColor;
        div.style.padding = (el.padding || 0) + 'px';
        div.style.borderRadius = (el.borderRadius || 0) + 'px';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center';
        div.style.overflow = 'hidden';
        div.style.wordBreak = 'break-word';
        canvasDiv.appendChild(div);
      }
    });

    // Scale canvas to fit viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = vw / canvas.width;
    const sy = vh / canvas.height;
    const canvasScale = Math.min(sx, sy, 1);
    canvasDiv.style.transform = 'scale(' + canvasScale + ')';
    canvasDiv.style.transformOrigin = 'center center';

    customContainer.innerHTML = '';
    customContainer.appendChild(canvasDiv);
    customContainer.style.width = (canvas.width * canvasScale) + 'px';
    customContainer.style.height = (canvas.height * canvasScale) + 'px';

    const anim = alert.animationType || 'fade';
    customWrapper.className = 'active';
    customContainer.className = 'anim-' + anim + '-in';

    // Play sound
    if (alert.soundUrl) {
      audioEl.src = alert.soundUrl;
      audioEl.volume = (alert.volume ?? 80) / 100;
      audioEl.play().catch(() => {});
    }

    const duration = (alert.duration || 5) * 1000;
    function hideCustomAlert() {
      speechSynthesis.cancel();
      customContainer.className = 'anim-' + anim + '-out';
      setTimeout(() => {
        customWrapper.className = '';
        customContainer.className = '';
        customContainer.innerHTML = '';
        alertContainer.style.display = '';
        playNext();
      }, 600);
    }
    setTimeout(() => {
      if (alert.ttsEnabled) {
        speakTts(alert, hideCustomAlert);
      } else {
        hideCustomAlert();
      }
    }, duration);
  }

  // ── Poll / Prediction Widget ──
  const ppWidget = document.getElementById('pp-widget');
  const ppConfig = {
    pollEnabled: ${pp.pollEnabled},
    predictionEnabled: ${pp.predictionEnabled},
    resultDuration: ${pp.resultDuration},
  };
  let ppHideTimer = null;

  function ppRenderPoll(data) {
    if (!ppConfig.pollEnabled) return;
    const total = data.totalVotes || 1;
    let timerHtml = '';
    if (data.status === 'active' && data.endsAt) {
      timerHtml = '<span class="pp-timer" id="pp-countdown"></span>';
    }
    let statusBadge = '';
    if (data.status === 'ended') {
      statusBadge = '<span class="pp-status-badge pp-status-ended">Ended</span>';
    }
    const maxVotes = Math.max(...data.choices.map(c => c.votes));
    const choicesHtml = data.choices.map((c, i) => {
      const pct = Math.round((c.votes / total) * 100);
      const isWinner = data.status === 'ended' && c.votes === maxVotes;
      const cls = data.status === 'ended' ? (isWinner ? 'winner' : 'loser') : '';
      return '<div class="pp-choice ' + cls + '">'
        + '<div class="pp-choice-header"><span>' + escHtml(c.title) + '</span><span>' + c.votes + ' (' + pct + '%)</span></div>'
        + '<div class="pp-bar-bg"><div class="pp-bar-fill pp-prediction-color-default" style="width:' + pct + '%">' + (pct > 10 ? pct + '%' : '') + '</div></div>'
        + '</div>';
    }).join('');
    ppWidget.innerHTML = '<div class="pp-card"><div class="pp-title"><span>📊 ' + escHtml(data.title) + '</span>' + statusBadge + timerHtml + '</div>' + choicesHtml + '</div>';
    ppWidget.classList.add('visible');
    ppStartCountdown(data.endsAt);
    if (data.status === 'ended') {
      ppScheduleHide();
    }
  }

  function ppRenderPrediction(data) {
    if (!ppConfig.predictionEnabled) return;
    const totalPoints = data.outcomes.reduce((s, o) => s + o.channelPoints, 0) || 1;
    let timerHtml = '';
    if (data.status === 'active' && data.locksAt) {
      timerHtml = '<span class="pp-timer" id="pp-countdown"></span>';
    }
    let statusBadge = '';
    if (data.status === 'locked') statusBadge = '<span class="pp-status-badge pp-status-locked">Locked</span>';
    if (data.status === 'ended') statusBadge = '<span class="pp-status-badge pp-status-ended">Resolved</span>';
    const outcomesHtml = data.outcomes.map(o => {
      const pct = Math.round((o.channelPoints / totalPoints) * 100);
      const colorCls = o.color === 'BLUE' ? 'pp-prediction-color-BLUE' : o.color === 'PINK' ? 'pp-prediction-color-PINK' : 'pp-prediction-color-default';
      let cls = '';
      if (data.status === 'ended') {
        cls = o.id === data.winningOutcomeId ? 'winner' : 'loser';
      }
      return '<div class="pp-choice ' + cls + '">'
        + '<div class="pp-choice-header"><span>' + escHtml(o.title) + '</span><span>' + o.channelPoints.toLocaleString() + ' pts (' + pct + '%)</span></div>'
        + '<div class="pp-bar-bg"><div class="pp-bar-fill ' + colorCls + '" style="width:' + pct + '%">' + (pct > 10 ? pct + '%' : '') + '</div></div>'
        + '</div>';
    }).join('');
    ppWidget.innerHTML = '<div class="pp-card"><div class="pp-title"><span>🔮 ' + escHtml(data.title) + '</span>' + statusBadge + timerHtml + '</div>' + outcomesHtml + '</div>';
    ppWidget.classList.add('visible');
    ppStartCountdown(data.locksAt);
    if (data.status === 'ended') {
      ppScheduleHide();
    }
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  let ppCountdownInterval = null;
  function ppStartCountdown(isoDate) {
    if (ppCountdownInterval) clearInterval(ppCountdownInterval);
    if (!isoDate) return;
    const el = document.getElementById('pp-countdown');
    if (!el) return;
    const end = new Date(isoDate).getTime();
    function tick() {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((end - now) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      const cel = document.getElementById('pp-countdown');
      if (cel) cel.textContent = m + ':' + String(s).padStart(2, '0');
      if (diff <= 0 && ppCountdownInterval) clearInterval(ppCountdownInterval);
    }
    tick();
    ppCountdownInterval = setInterval(tick, 1000);
  }

  function ppScheduleHide() {
    if (ppHideTimer) clearTimeout(ppHideTimer);
    ppHideTimer = setTimeout(() => {
      ppWidget.classList.remove('visible');
      setTimeout(() => { ppWidget.innerHTML = ''; }, 600);
    }, ppConfig.resultDuration * 1000);
  }

  socket.on('poll:update', (data) => ppRenderPoll(data));
  socket.on('prediction:update', (data) => ppRenderPrediction(data));

  function showLegacyAlert(alert) {
    textEl.textContent = alert.text;

    // Remove previous video if any
    const oldVid = alertEl.querySelector('video.alert-media');
    if (oldVid) oldVid.remove();

    if (alert.imageUrl && isVideoUrl(alert.imageUrl)) {
      imageEl.style.display = 'none';
      const vid = document.createElement('video');
      vid.src = alert.imageUrl;
      vid.className = 'alert-image alert-media';
      vid.autoplay = true;
      vid.loop = !!alert.videoLoop;
      vid.muted = !!alert.videoMuted;
      vid.playsInline = true;
      alertEl.insertBefore(vid, textEl);
    } else if (alert.imageUrl) {
      imageEl.src = alert.imageUrl;
      imageEl.style.display = 'block';
    } else {
      imageEl.style.display = 'none';
    }

    if (alert.soundUrl) {
      audioEl.src = alert.soundUrl;
      audioEl.volume = (alert.volume ?? 80) / 100;
      audioEl.play().catch(() => {});
    }

    const anim = alert.animationType || 'fade';
    alertEl.className = 'alert active anim-' + anim + '-in';

    const duration = (alert.duration || 5) * 1000;

    function hideLegacyAlert() {
      speechSynthesis.cancel();
      alertEl.className = 'alert active anim-' + anim + '-out';
      setTimeout(() => {
        alertEl.className = 'alert';
        const vid = alertEl.querySelector('video.alert-media');
        if (vid) vid.remove();
        playNext();
      }, 600);
    }
    setTimeout(() => {
      if (alert.ttsEnabled) {
        speakTts(alert, hideLegacyAlert);
      } else {
        hideLegacyAlert();
      }
    }, duration);
  }
})();
</script>
</body>
</html>`;
}
