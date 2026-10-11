import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadYouTubeAPI } from '../../utils/youtube';
import { createYouTubePlaybackController } from '../../utils/youtubePlayback';

const PLAYER_ERRORS = {
  2: 'El enlace de este vídeo no es válido.',
  5: 'YouTube no pudo reproducir este vídeo. Prueba otra pista.',
  100: 'Este vídeo ya no está disponible o es privado.',
  101: 'El autor no permite reproducir este vídeo fuera de YouTube.',
  150: 'El autor no permite reproducir este vídeo fuera de YouTube.',
  153: 'YouTube no pudo verificar el origen del reproductor.',
};

const YouTubePlayer = forwardRef(function YouTubePlayer({ videoId, volume, playRequested, onEnded, onStateChange, onError, onPlaybackChange }, ref) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const propsRef = useRef({ videoId, volume, playRequested, onEnded, onStateChange, onError, onPlaybackChange });
  const [controller] = useState(() => createYouTubePlaybackController(() => propsRef.current));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    propsRef.current = { videoId, volume, playRequested, onEnded, onStateChange, onError, onPlaybackChange };
    controller.update({ videoId, volume, playRequested });
  }, [videoId, volume, playRequested, onEnded, onStateChange, onError, onPlaybackChange, controller]);

  useImperativeHandle(ref, () => ({
    setPlayback: value => controller.setPlayback(value),
    select: nextId => controller.select(nextId),
    seekToZero: () => controller.seekToZero(),
    restart: () => controller.restart(),
    retry() {
      if (controller.isReady()) controller.restart();
      else setAttempt(previous => previous + 1);
    },
  }), [controller]);

  useEffect(() => {
    let cancelled = false;
    let readyTimeout;
    const host = hostRef.current;
    propsRef.current.onStateChange('loading');
    loadYouTubeAPI().then(YT => {
      if (cancelled || !host) return;
      const mount = document.createElement('div');
      const initialVideoId = propsRef.current.videoId;
      host.replaceChildren(mount);
      readyTimeout = setTimeout(() => {
        if (!cancelled && !controller.isReady()) controller.fail('El reproductor tardó demasiado en iniciar. Pulsa Activar música para reintentar.');
      }, 15000);
      playerRef.current = new YT.Player(mount, {
        videoId: initialVideoId,
        width: '288', height: '200',
        playerVars: { autoplay: 0, controls: 1, rel: 0, origin: window.location.origin, playsinline: 1 },
        events: {
          onReady(event) {
            if (cancelled) return;
            clearTimeout(readyTimeout);
            playerRef.current = event.target;
            controller.attach(event.target, initialVideoId);
          },
          onStateChange(event) {
            if (!cancelled) controller.stateChanged(event);
          },
          onError(event) {
            if (!cancelled) controller.fail(PLAYER_ERRORS[event.data] || 'No se pudo reproducir el vídeo. Prueba otra pista.');
          },
          onAutoplayBlocked() {
            if (!cancelled) controller.blocked();
          },
        },
      });
      const iframe = playerRef.current.getIframe?.();
      if (iframe) {
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
        iframe.setAttribute('title', 'Reproductor de música THC');
        iframe.setAttribute('tabindex', '-1');
      }
    }).catch(error => {
      if (!cancelled) controller.fail(error.message);
    });

    return () => {
      cancelled = true;
      clearTimeout(readyTimeout);
      controller.detach();
      playerRef.current?.destroy();
      playerRef.current = null;
      host?.replaceChildren();
    };
  }, [attempt, controller]);

  return <div ref={hostRef} className="h-full w-full bg-black" />;
});

export default YouTubePlayer;