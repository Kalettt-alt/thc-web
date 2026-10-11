export function createYouTubePlaybackController(getCallbacks) {
  let player;
  let loadedVideoId;
  let desired = { videoId: null, volume: 50, playRequested: false };
  let awaitingPlay = false;
  let endedHandled = false;

  const sync = () => {
    if (!player || !desired.videoId) return;
    player.setVolume(Math.max(0, Math.min(100, Number(desired.volume) || 0)));
    if (loadedVideoId !== desired.videoId) {
      loadedVideoId = desired.videoId;
      endedHandled = false;
      awaitingPlay = desired.playRequested;
      getCallbacks().onStateChange(desired.playRequested ? 'loading' : 'paused');
      if (desired.playRequested) player.loadVideoById(desired.videoId);
      else player.cueVideoById(desired.videoId);
      return;
    }
    const state = player.getPlayerState();
    if (desired.playRequested && state !== 1 && state !== 3) {
      awaitingPlay = true;
      player.playVideo();
    } else if (!desired.playRequested && (state === 1 || state === 3)) {
      awaitingPlay = false;
      player.pauseVideo();
    }
  };

  const failed = (state, message) => {
    desired.playRequested = false;
    awaitingPlay = false;
    const callbacks = getCallbacks();
    callbacks.onStateChange(state);
    callbacks.onPlaybackChange(false);
    callbacks.onError(message);
  };

  return {
    update(next) {
      desired = { ...desired, ...next };
      if (!desired.playRequested) awaitingPlay = false;
      sync();
    },
    attach(instance, initialVideoId) {
      player = instance;
      loadedVideoId = initialVideoId;
      getCallbacks().onStateChange(desired.playRequested ? 'loading' : 'paused');
      sync();
    },
    detach() {
      player = undefined;
      loadedVideoId = undefined;
      awaitingPlay = false;
      endedHandled = false;
    },
    setPlayback(playRequested) {
      desired.playRequested = Boolean(playRequested);
      if (!desired.playRequested) awaitingPlay = false;
      sync();
    },
    select(videoId) {
      desired = { ...desired, videoId, playRequested: true };
      sync();
    },
    restart() {
      if (!player || !desired.videoId) return;
      desired.playRequested = true;
      awaitingPlay = true;
      endedHandled = false;
      getCallbacks().onStateChange('loading');
      player.loadVideoById(desired.videoId);
    },
    seekToZero() {
      if (player) {
        endedHandled = false;
        player.seekTo(0, true);
      }
    },
    stateChanged(event) {
      if (!player) return;
      const videoId = event.target.getVideoData?.()?.video_id;
      if (videoId && videoId !== desired.videoId) return;
      const callbacks = getCallbacks();
      if (event.data === 1) {
        if (!desired.playRequested) { player.pauseVideo(); return; }
        awaitingPlay = false;
        endedHandled = false;
        callbacks.onStateChange('playing');
        callbacks.onPlaybackChange(true);
      } else if (event.data === 2) {
        if (awaitingPlay && desired.playRequested) return;
        desired.playRequested = false;
        callbacks.onStateChange('paused');
        callbacks.onPlaybackChange(false);
      } else if (event.data === 3) {
        callbacks.onStateChange('buffering');
      } else if (event.data === 5) {
        if (desired.playRequested) {
          awaitingPlay = true;
          callbacks.onStateChange('loading');
          player.playVideo();
        } else callbacks.onStateChange('paused');
      } else if (event.data === 0 && desired.playRequested && !awaitingPlay && !endedHandled) {
        endedHandled = true;
        callbacks.onStateChange('ended');
        callbacks.onEnded();
      }
    },
    fail(message) { failed('error', message); },
    blocked() {
      failed('blocked', 'El navegador bloqueó la música. Pulsa Activar música para volver a intentarlo.');
    },
    isReady() { return Boolean(player); },
  };
}