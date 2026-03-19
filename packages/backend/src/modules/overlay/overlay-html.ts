import { config } from "../../config/index.js";

export function generateOverlayHtml(overlayToken: string): string {
  const wsPath = "/ws";
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
  #custom-alert-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
    display: none;
  }

  #custom-alert-container.active {
    display: block;
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
<div id="custom-alert-container"></div>

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
        const img = document.createElement('img');
        img.src = alert.imageUrl;
        img.style.position = 'absolute';
        img.style.left = el.x + 'px';
        img.style.top = el.y + 'px';
        img.style.width = el.width + 'px';
        img.style.height = el.height + 'px';
        img.style.zIndex = String(el.zIndex || 1);
        img.style.borderRadius = (el.borderRadius || 0) + 'px';
        img.style.objectFit = el.objectFit || 'contain';
        if (el.borderWidth) {
          img.style.border = el.borderWidth + 'px solid ' + (el.borderColor || '#fff');
        }
        canvasDiv.appendChild(img);
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

    customContainer.innerHTML = '';
    customContainer.appendChild(canvasDiv);
    customContainer.style.width = canvas.width + 'px';
    customContainer.style.height = canvas.height + 'px';

    const anim = alert.animationType || 'fade';
    customContainer.className = 'active anim-' + anim + '-in';

    // Play sound
    if (alert.soundUrl) {
      audioEl.src = alert.soundUrl;
      audioEl.volume = (alert.volume ?? 80) / 100;
      audioEl.play().catch(() => {});
    }

    const duration = (alert.duration || 5) * 1000;
    function hideCustomAlert() {
      speechSynthesis.cancel();
      customContainer.className = 'active anim-' + anim + '-out';
      setTimeout(() => {
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

  function showLegacyAlert(alert) {
    textEl.textContent = alert.text;

    if (alert.imageUrl) {
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
