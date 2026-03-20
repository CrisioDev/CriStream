export function generatePlayerHtml(overlayToken: string): string {
  const wsPath = "/ws";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CriStream Song Player</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: transparent;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  #player-wrapper {
    flex: 1;
    position: relative;
  }

  #player-wrapper iframe {
    width: 100%;
    height: 100%;
  }

  #now-playing {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    font-size: 14px;
    backdrop-filter: blur(4px);
    display: none;
    align-items: center;
    gap: 8px;
  }

  #now-playing.active {
    display: flex;
  }

  #now-playing .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: bold;
  }

  #now-playing .requester {
    font-size: 12px;
    opacity: 0.8;
    white-space: nowrap;
  }

  #idle-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(255,255,255,0.3);
    font-size: 18px;
    display: none;
  }

  #idle-message.active {
    display: block;
  }
</style>
</head>
<body>
<div id="player-wrapper">
  <div id="yt-player"></div>
  <div id="now-playing">
    <span>&#9835;</span>
    <span id="np-title" class="title"></span>
    <span id="np-requester" class="requester"></span>
  </div>
  <div id="idle-message" class="active">No song playing</div>
</div>

<script src="/ws/socket.io.js"></script>
<script>
(function() {
  const token = ${JSON.stringify(overlayToken)};
  const socket = io({ path: '${wsPath}', query: { overlayToken: token } });

  let player = null;
  let currentSong = null;
  let playerReady = false;

  const nowPlayingEl = document.getElementById('now-playing');
  const titleEl = document.getElementById('np-title');
  const requesterEl = document.getElementById('np-requester');
  const idleEl = document.getElementById('idle-message');

  // Load YouTube IFrame API
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = function() {
    player = new YT.Player('yt-player', {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: function() {
          playerReady = true;
          if (currentSong) playSong(currentSong);
        },
        onStateChange: function(event) {
          if (event.data === YT.PlayerState.ENDED) {
            socket.emit('songrequest:ended', { channelId: '' });
          }
        }
      }
    });
  };

  function extractVideoId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function playSong(song) {
    if (!song) {
      if (player && playerReady) player.stopVideo();
      nowPlayingEl.className = '';
      idleEl.className = 'active';
      currentSong = null;
      return;
    }

    currentSong = song;
    const videoId = extractVideoId(song.url);
    if (!videoId) {
      socket.emit('songrequest:ended', { channelId: '' });
      return;
    }

    if (player && playerReady) {
      player.loadVideoById(videoId);
    }

    titleEl.textContent = song.title;
    requesterEl.textContent = 'requested by ' + song.requestedBy;
    nowPlayingEl.className = 'active';
    idleEl.className = '';
  }

  socket.on('connect', () => console.log('Player connected'));

  socket.on('songrequest:play', (data) => {
    playSong(data.song);
  });

  socket.on('songrequest:volume', (data) => {
    if (player && playerReady) {
      player.setVolume(data.volume);
    }
  });
})();
</script>
</body>
</html>`;
}
