export function generateSandboxHtml(overlayToken: string): string {
  const wsPath = "/ws";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CriStream Sandbox</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: transparent;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 100vw;
    height: 100vh;
  }
  #sandbox {
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    transform-origin: top left;
  }
  .sb-el {
    position: absolute;
    transition: left 0.15s ease, top 0.15s ease, width 0.15s ease, height 0.15s ease, opacity 0.15s ease;
  }
  .sb-el video, .sb-el img {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
<div id="sandbox"></div>
<script src="/ws/socket.io.js"></script>
<script>
(function() {
  var token = ${JSON.stringify(overlayToken)};
  var socket = io({ path: '${wsPath}', query: { overlayToken: token } });
  var container = document.getElementById("sandbox");
  var currentElements = {}; // id -> { div, type, src }

  function scaleCanvas() {
    var sx = window.innerWidth / 1920;
    var sy = window.innerHeight / 1080;
    container.style.transform = 'scale(' + Math.min(sx, sy) + ')';
  }
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);

  socket.on('connect', function() { console.log('Sandbox overlay connected'); });

  socket.on("sandbox:update", function(data) {
    if (!data.elements) return;

    var newIds = {};
    data.elements.forEach(function(el) { newIds[el.id] = true; });

    // Remove elements no longer present
    Object.keys(currentElements).forEach(function(id) {
      if (!newIds[id]) {
        currentElements[id].div.remove();
        delete currentElements[id];
      }
    });

    // Update or create elements
    data.elements
      .slice()
      .sort(function(a, b) { return a.zIndex - b.zIndex; })
      .forEach(function(el) {
        var existing = currentElements[el.id];

        if (!el.visible) {
          if (existing) {
            existing.div.style.display = 'none';
          }
          return;
        }

        var div;
        var needsRebuild = false;

        if (existing) {
          div = existing.div;
          div.style.display = '';
          // Rebuild if type changed or media src changed
          if (existing.type !== el.type || existing.src !== (el.src || '')) {
            needsRebuild = true;
          }
        } else {
          needsRebuild = true;
        }

        if (needsRebuild) {
          if (existing) existing.div.remove();
          div = document.createElement('div');
          div.className = 'sb-el';
          div.dataset.id = el.id;
          buildContent(div, el);
          container.appendChild(div);
          currentElements[el.id] = { div: div, type: el.type, src: el.src || '' };
        }

        // Update position/size (always)
        div.style.left = el.x + 'px';
        div.style.top = el.y + 'px';
        div.style.width = el.width + 'px';
        div.style.height = el.height + 'px';
        div.style.zIndex = el.zIndex;

        // Update text content without rebuild
        if (el.type === 'text' && !needsRebuild) {
          updateText(div, el);
        }
      });
  });

  function buildContent(div, el) {
    // Clear children
    div.innerHTML = '';

    if (el.type === 'text') {
      updateText(div, el);
    } else if (el.type === 'image' && el.src) {
      var img = document.createElement('img');
      img.src = el.src;
      img.style.objectFit = el.objectFit || 'contain';
      img.style.borderRadius = (el.borderRadius || 0) + 'px';
      if (el.borderWidth) {
        img.style.border = el.borderWidth + 'px solid ' + (el.borderColor || '#fff');
      }
      img.draggable = false;
      div.appendChild(img);
    } else if (el.type === 'video' && el.src) {
      var vid = document.createElement('video');
      vid.src = el.src;
      vid.autoplay = true;
      vid.loop = el.videoLoop !== false;
      vid.muted = el.videoMuted !== false;
      vid.playsInline = true;
      vid.style.objectFit = el.objectFit || 'contain';
      vid.style.borderRadius = (el.borderRadius || 0) + 'px';
      if (el.borderWidth) {
        vid.style.border = el.borderWidth + 'px solid ' + (el.borderColor || '#fff');
      }
      div.appendChild(vid);
    }
  }

  function updateText(div, el) {
    div.style.fontFamily = (el.fontFamily || 'Segoe UI') + ', sans-serif';
    div.style.fontSize = (el.fontSize || 24) + 'px';
    div.style.fontWeight = el.fontWeight || 'normal';
    div.style.fontStyle = el.fontStyle || 'normal';
    div.style.color = el.color || '#ffffff';
    div.style.textAlign = el.textAlign || 'left';
    div.style.textShadow = el.textShadow || 'none';
    div.style.background = el.backgroundColor || 'transparent';
    div.style.padding = (el.padding || 0) + 'px';
    div.style.borderRadius = (el.borderRadius || 0) + 'px';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = el.textAlign === 'right' ? 'flex-end' : el.textAlign === 'center' ? 'center' : 'flex-start';
    div.style.overflow = 'hidden';
    div.style.wordBreak = 'break-word';
    div.style.whiteSpace = 'pre-wrap';
    // Only update text if it changed (avoid cursor reset)
    if (div.childNodes.length === 0 || div.childNodes[0].nodeType !== 3) {
      div.textContent = el.content || '';
    } else if (div.textContent !== (el.content || '')) {
      div.textContent = el.content || '';
    }
  }

  socket.on("sandbox:clear", function() {
    container.innerHTML = '';
    currentElements = {};
  });
})();
</script>
</body>
</html>`;
}
