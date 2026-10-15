import { useEffect, useRef } from 'react';
import { ambientThemeId, createProfileAmbientRuntime } from './profileAmbientEngine.js';
import './ProfileAmbient.css';

/** Decoration only: profile content keeps all focus, clicks and data ownership. */
export default function ProfileAmbient({ themeId, effectsMode = 'full' }) {
  const canvasRef = useRef(null);
  const ambientId = ambientThemeId(themeId);

  useEffect(() => {
    if (!ambientId || !canvasRef.current) return undefined;
    const runtime = createProfileAmbientRuntime({ canvas: canvasRef.current, themeId, mode: effectsMode });
    return runtime.destroy;
  }, [ambientId, themeId, effectsMode]);

  if (!ambientId) return null;
  return (
    <div className="profile-ambient" data-ambient-theme={ambientId} data-ambient-mode={effectsMode} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
