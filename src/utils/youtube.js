const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);

export function extractYouTubeId(value, allowBareId = false) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (allowBareId && VIDEO_ID.test(input)) return input;

  try {
    const legacyHost = /^(?:(?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\//i.test(input);
    const url = new URL(allowBareId && legacyHost ? `https://${input}` : input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    let id;
    if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
      id = url.pathname.split('/')[1];
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      const [, route, pathId] = url.pathname.split('/');
      id = route === 'watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live', 'v'].includes(route) ? pathId : null;
    }
    return typeof id === 'string' && VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnail(url, quality = 'hqdefault') {
  const id = extractYouTubeId(url, true);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : '/imagenes/LogoTHC.png';
}

let apiPromise;

export function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    let script = document.getElementById('yt-api-script');
    const previousCallback = window.onYouTubeIframeAPIReady;
    const cleanup = () => {
      clearTimeout(timeout);
      script?.removeEventListener('error', onError);
      if (window.onYouTubeIframeAPIReady === onReady) window.onYouTubeIframeAPIReady = previousCallback;
    };
    const onReady = () => {
      cleanup();
      resolve(window.YT);
      if (typeof previousCallback === 'function') previousCallback();
    };
    const onError = () => {
      cleanup();
      script?.remove();
      apiPromise = undefined;
      reject(new Error('No se pudo conectar con YouTube. Comprueba tu conexión y vuelve a intentarlo.'));
    };
    const timeout = window.setTimeout(onError, 15000);
    window.onYouTubeIframeAPIReady = onReady;

    if (!script) {
      script = document.createElement('script');
      script.id = 'yt-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('error', onError, { once: true });
  });

  return apiPromise;
}