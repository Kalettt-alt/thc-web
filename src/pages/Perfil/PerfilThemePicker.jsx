import { useEffect, useRef, useState } from 'react';
import { Check, LockKeyhole, Save, X } from 'lucide-react';
import { PROFILE_THEMES, canUseProfileTheme, getAvailableThemes, getProfileThemeStyle } from '../../utils/profileThemes';
import { safeHexColor, safeProfileTheme } from '../../utils/media';
import './PerfilThemes.css';

export default function PerfilThemePicker({ themeId, color, level = 0, onPreview, onSave, onCancel, disabled = false, effectsMode = 'calm' }) {
  const [selectedDraftId, setDraftId] = useState(() => canUseProfileTheme(safeProfileTheme(themeId), level) ? safeProfileTheme(themeId) : 'default');
  const draftId = canUseProfileTheme(selectedDraftId, level) ? selectedDraftId : 'default';
  const [draftColor, setDraftColor] = useState(() => safeHexColor(color));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const panel = useRef(null);
  const active = useRef(true);
  const savingLock = useRef(false);
  const onCancelRef = useRef(onCancel);
  const isDirty = draftId !== safeProfileTheme(themeId) || draftColor.toLowerCase() !== safeHexColor(color).toLowerCase();
  const selectedTheme = PROFILE_THEMES.find(theme => theme.id === draftId);
  const availableThemes = getAvailableThemes(level);
  const canSave = canUseProfileTheme(draftId, level) && Number(level) >= 10;

  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => {
    active.current = true;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('button')?.focus();
    return () => {
      active.current = false;
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  function preview(id, nextColor = draftColor) {
    if (!canUseProfileTheme(id, level)) return;
    setDraftId(id);
    setDraftColor(nextColor);
    setError('');
    onPreview?.({ tema_perfil: id, color_pixel: nextColor });
  }

  async function save() {
    if (disabled || savingLock.current || !isDirty || !canSave) return;
    savingLock.current = true;
    setSaving(true);
    setError('');
    try { await onSave({ tema_perfil: draftId, color_pixel: draftColor }); }
    catch (reason) { if (active.current) setError(reason?.code === 'NETWORK_TIMEOUT' ? 'La conexión tardó demasiado. Revisa tu perfil antes de reintentar.' : reason?.message || 'No se pudo guardar el estilo.'); }
    finally {
      savingLock.current = false;
      if (active.current) setSaving(false);
    }
  }

  function handleKeys(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!savingLock.current && !disabled) onCancelRef.current?.();
    }
    if (event.key !== 'Tab') return;
    const focusable = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]:not(:disabled)')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  function moveSelection(event) {
    if (saving || disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = availableThemes.findIndex(theme => theme.id === draftId);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? availableThemes.length - 1 : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + availableThemes.length) % availableThemes.length;
    if (!availableThemes[next]) return;
    const nextId = availableThemes[next].id;
    preview(nextId);
    event.currentTarget.querySelector(`[data-theme-option="${nextId}"]`)?.focus();
  }

  return (
    <div className="profile-picker-backdrop" onKeyDown={handleKeys} data-effects={effectsMode}>
      <section ref={panel} className="profile-picker" role="dialog" aria-modal="true" aria-labelledby="profile-picker-title">
        <header className="profile-picker-heading">
          <div><span>PERSONALIZA TU PERFIL</span><h2 id="profile-picker-title">Elige tu estilo.</h2></div>
          <button type="button" className="profile-picker-close" aria-label="Cerrar estilos y descartar vista previa" onClick={onCancel} disabled={saving || disabled}><X size={22} /></button>
        </header>
        <p className="profile-picker-hint">Así te verá la comunidad.</p>
        <div className="profile-picker-collections" role="radiogroup" aria-label="Diseño del perfil" onKeyDown={moveSelection}>
          {[{ name: 'VIP', requiredLevel: 10, themes: PROFILE_THEMES.filter(theme => theme.minLevel <= 10) }, { name: 'VIP Trueno', requiredLevel: 15, themes: PROFILE_THEMES.filter(theme => theme.minLevel === 15) }].map(collection => (
            <section key={collection.name} className="profile-picker-collection" aria-label={`Estilos ${collection.name}`}>
              <div className="profile-picker-collection-heading"><h3>{collection.name}</h3><span>{Number(level) >= collection.requiredLevel ? `${collection.themes.length} estilos` : `Nivel ${collection.requiredLevel}`}</span></div>
              <div className="profile-picker-options">
          {collection.themes.map(theme => (
            <button key={theme.id} type="button" data-theme-option={theme.id} data-locked={!canUseProfileTheme(theme.id, level)} role="radio" aria-checked={draftId === theme.id} aria-label={`${theme.name}${canUseProfileTheme(theme.id, level) ? '' : ` · requiere ${theme.minLevel === 15 ? 'VIP Trueno' : 'VIP'}`}`} tabIndex={draftId === theme.id ? 0 : -1} className="profile-picker-option" onClick={() => preview(theme.id)} disabled={saving || disabled || !canUseProfileTheme(theme.id, level)}>
              <div className="profile-theme-mini" data-preview-theme={theme.id} style={getProfileThemeStyle(theme.id, draftColor)} aria-hidden="true">
                <div className="profile-mini-banner" />
                <div className="profile-mini-avatar"><span>THC</span></div>
                <div className="profile-mini-name" />
                <div className="profile-mini-line" />
                <div className="profile-mini-card" /><div className="profile-mini-card profile-mini-card-second" />
                {theme.id === 'club' && <strong className="profile-mini-number">10</strong>}
                {theme.id === 'terminal' && <span className="profile-mini-code">$ thc --profile</span>}
                {theme.animated && <span className={`profile-mini-motion profile-mini-motion--${theme.id}`} />}
              </div>
              <span className="profile-picker-option-name">{theme.name}{!canUseProfileTheme(theme.id, level) ? <LockKeyhole size={14} /> : draftId === theme.id ? <Check size={16} /> : theme.animated && <span className="profile-option-motion" aria-label="Animado"><i /><i /><i /></span>}</span>
            </button>
          ))}
              </div>
            </section>
          ))}
        </div>
        <div className="profile-picker-selection"><strong>{selectedTheme.name}</strong><span>{selectedTheme.description}</span>{selectedTheme.animated && <span className="profile-picker-motion-label">En movimiento</span>}</div>
        {draftId === 'pixel' && <label className="profile-picker-color"><span>Tu color</span><input type="color" aria-label="Color de Pixel Art" value={draftColor} disabled={saving || disabled} onChange={event => preview('pixel', safeHexColor(event.target.value))} /><span>{draftColor.toUpperCase()}</span></label>}
        <div className="profile-picker-status" role="status">{error || (isDirty ? 'Vista previa · todavía sin guardar' : 'Este es tu estilo guardado')}</div>
        <footer className="profile-picker-footer">
          <button type="button" className="theme-btn-secondary" onClick={onCancel} disabled={saving || disabled}>Cancelar</button>
          <button type="button" className="theme-btn-primary" onClick={save} disabled={!isDirty || saving || disabled || !canSave}><Save size={16} /> {saving ? 'Guardando…' : 'Guardar estilo'}</button>
        </footer>
      </section>
    </div>
  );
}
