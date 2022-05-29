var socket = io();
var tag = document.createElement('script');
var searchInput = document.getElementsByClassName("searchNar")[0];
var player;
var lastTimeUpdate = 0;

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function searchUrl(e) {
  if (e.key === "Enter") {
    const searchVideoId = searchInput.value.split("v=")[1];
    player.loadVideoById(searchVideoId, 0);
    socket.emit("loadvideo", searchVideoId);
    searchInput.value = '';
  }
}

var msgInput = document.getElementById("userMsg");
var msgField = document.getElementById("message");

function stopRefreshOnMsg(e) {
  if (e.key === "Enter") {
    socket.emit("chat", msgInput.value);
    msgInput.value = '';
  }
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: 'M7lc1UVf-VE',
    playerVars: {
      'playsinline': 1
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });

  // This is the source "window" that will emit the events.
  var iframeWindow = player.getIframe().contentWindow;

  // Listen to events triggered by postMessage.
  window.addEventListener("message", function(event) {
    // Check that the event was sent from the YouTube IFrame.
    if (event.source === iframeWindow) {
      var data = JSON.parse(event.data);

      // The "infoDelivery" event is used by YT to transmit any
      // kind of information change in the player,
      // such as the current time or a playback quality change.
      if (
        data.event === "infoDelivery" &&
        data.info &&
        data.info.currentTime
      ) {
        // currentTime is emitted very frequently,
        // but we only care about whole second changes.
        var time = Math.floor(data.info.currentTime);

        if (time !== lastTimeUpdate) {
          // User updated timestamp
          if(Math.abs(time - lastTimeUpdate) > 1) {
              // Send the new time to the server, which then broadcasts to the lobby
              // NOTE: "var Time" is an integer, send the time as a double for better precision
              socket.emit("timestamp", data.info.currentTime);
          }
          lastTimeUpdate = time;
        }
      }
    }
  });
}

// EVENTS
function onPlayerReady(event) {
  player.playVideo();
}

function onPlayerStateChange(event) {
  // Update everyones state
  console.log("Changing state...");
  socket.emit("statechange", event.data);
}

msgInput.addEventListener("keypress", stopRefreshOnMsg);
searchInput.addEventListener("keypress", searchUrl);

// SOCKET IO CALLBACKS
// Called when someone changed timestamp
socket.on("timestamp", (arg) => {
  console.log("received");
  if((Math.floor(arg) - lastTimeUpdate) != 0) {
    console.log("Someone changed timestamp:");
    player.seekTo(arg, true);
  }
});

socket.on("statechange", (arg) => {
    if(arg == YT.PlayerState.PAUSED) {
      console.log("Someone paused");
      player.pauseVideo();
    } else if(arg == YT.PlayerState.PLAYING) {
      player.playVideo();
    }
});

socket.on("chat", function(msg) {
  var msgLog = document.createElement("li");
  msgLog.textContent = msg;
  msgField.appendChild(msgLog);
  msgField.scrollTop = msgField.scrollHeight;
});

socket.on("loadvideo", (arg) => {
  player.loadVideoById(arg, 0);
});