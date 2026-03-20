export function generateSandboxHtml(overlayToken: string): string {
  const wsPath = "/ws";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StreamGuard Sandbox</title>
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
  const token = ${JSON.stringify(overlayToken)};
  const socket = io({ path: '${wsPath}', query: { overlayToken: token } });
  const container = document.getElementById("sandbox");

  // Scale 1920x1080 canvas to viewport
  function scaleCanvas() {
    var sx = window.innerWidth / 1920;
    var sy = window.innerHeight / 1080;
    var s = Math.min(sx, sy);
    container.style.transform = 'scale(' + s + ')';
  }
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);

  socket.on('connect', function() { console.log('Sandbox overlay connected'); });

  socket.on("sandbox:update", function(data) {
    container.innerHTML = "";
    if (!data.elements || !data.elements.length) return;

    data.elements
      .slice()
      .sort(function(a, b) { return a.zIndex - b.zIndex; })
      .forEach(function(el) {
        if (!el.visible) return;

        var div = document.createElement("div");
        div.className = "sb-el";
        div.style.left = el.x + "px";
        div.style.top = el.y + "px";
        div.style.width = el.width + "px";
        div.style.height = el.height + "px";
        div.style.zIndex = el.zIndex;

        if (el.type === "text") {
          div.style.fontFamily = (el.fontFamily || "Segoe UI") + ", sans-serif";
          div.style.fontSize = (el.fontSize || 24) + "px";
          div.style.fontWeight = el.fontWeight || "normal";
          div.style.fontStyle = el.fontStyle || "normal";
          div.style.color = el.color || "#ffffff";
          div.style.textAlign = el.textAlign || "left";
          div.style.textShadow = el.textShadow || "none";
          div.style.background = el.backgroundColor || "transparent";
          div.style.padding = (el.padding || 0) + "px";
          div.style.borderRadius = (el.borderRadius || 0) + "px";
          div.style.display = "flex";
          div.style.alignItems = "center";
          div.style.justifyContent = el.textAlign === "right" ? "flex-end" : el.textAlign === "center" ? "center" : "flex-start";
          div.style.overflow = "hidden";
          div.style.wordBreak = "break-word";
          div.style.whiteSpace = "pre-wrap";
          div.textContent = el.content || "";
        } else if (el.type === "image" && el.src) {
          var img = document.createElement("img");
          img.src = el.src;
          img.style.objectFit = el.objectFit || "contain";
          img.style.borderRadius = (el.borderRadius || 0) + "px";
          if (el.borderWidth) {
            img.style.border = el.borderWidth + "px solid " + (el.borderColor || "#fff");
          }
          img.draggable = false;
          div.appendChild(img);
        } else if (el.type === "video" && el.src) {
          var vid = document.createElement("video");
          vid.src = el.src;
          vid.autoplay = true;
          vid.loop = el.videoLoop !== false;
          vid.muted = el.videoMuted !== false;
          vid.playsInline = true;
          vid.style.objectFit = el.objectFit || "contain";
          vid.style.borderRadius = (el.borderRadius || 0) + "px";
          if (el.borderWidth) {
            vid.style.border = el.borderWidth + "px solid " + (el.borderColor || "#fff");
          }
          div.appendChild(vid);
        }

        container.appendChild(div);
      });
  });

  socket.on("sandbox:clear", function() {
    container.innerHTML = "";
  });
})();
</script>
</body>
</html>`;
}
