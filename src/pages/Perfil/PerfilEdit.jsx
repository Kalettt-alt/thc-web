import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { getLimites } from '../../utils/perfilLimites';
import { ArrowLeft, Save, UploadCloud, UserRound, Image as ImageIcon, Music, Palette, LayoutGrid, RotateCcw, Eye, Check } from 'lucide-react';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { safeHexColor, validateImageFile } from '../../utils/media';
import { canPersonalizeProfile, getProfileTheme, getProfileThemeStyle, saveProfileTheme } from '../../utils/profileThemes';
import { createProfileSettings, profileNicknameCooldown, profileSettingsUpdates, profileImageUrl, PROFILE_POSITIONS, PROFILE_WIDGETS, spotifyTrack } from '../../utils/profileSettings';
import { withAlbumTimeout } from '../../utils/albumAsync';
import { useHomeMotion } from '../../utils/homeMotion';
import PerfilThemePicker from './PerfilThemePicker';
import './PerfilThemes.css';
import './PerfilEdit.css';

const SECTIONS = [{ id: 'identity', label: 'Identidad', icon: UserRound }, { id: 'images', label: 'Imágenes', icon: ImageIcon }, { id: 'extras', label: 'Destacados', icon: LayoutGrid }];
const FALLBACK = '/imagenes/LogoTHC.png';
function imageFallback(event) { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = FALLBACK; } }

export default function PerfilEdit({ perfil, session, onBack, onUpdate }) {
  const limites = getLimites(perfil.nivel_rol);
  const cooldownDias = profileNicknameCooldown(perfil);
  const [form, setForm] = useState(() => createProfileSettings(perfil));
  const [baseline] = useState(() => createProfileSettings(perfil));
  const [section, setSection] = useState('identity');
  const [preview, setPreview] = useState(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);
  const identity = useRef({ userId: session?.user?.id, profileId: perfil.id });
  const canCustomize = canPersonalizeProfile({ userId: session?.user?.id, profileId: perfil.id, level: perfil.nivel_rol });
  const pickerVisible = selectorAbierto && canCustomize;
  const visiblePreview = pickerVisible ? preview : null;
  const theme = getProfileTheme(visiblePreview?.tema_perfil ?? perfil.tema_perfil, visiblePreview?.color_pixel ?? perfil.color_pixel);
  const color = safeHexColor(visiblePreview?.color_pixel ?? perfil.color_pixel);
  const { motionEnabled } = useHomeMotion();
  const reducedMotion = useReducedMotion();
  const animate = motionEnabled && !reducedMotion;
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const change = (key, value) => { setForm(previous => ({ ...previous, [key]: value })); setError(''); };
  const song = spotifyTrack(form.cancion_url);

  useEffect(() => {
    mounted.current = true;
    identity.current = { userId: session?.user?.id, profileId: perfil.id };
    return () => { mounted.current = false; };
  }, [session?.user?.id, perfil.id]);

  async function ensureSession() {
    const expected = session?.user?.id;
    const { data, error: authError } = await withAlbumTimeout(supabase.auth.getSession());
    if (authError || !expected || expected !== perfil.id || data?.session?.user?.id !== expected || !mounted.current || identity.current.userId !== expected || identity.current.profileId !== perfil.id) throw new Error('Tu sesión cambió. Vuelve a entrar antes de guardar.');
    return expected;
  }

  async function guardarPerfil() {
    if (lock.current || pickerVisible) return;
    lock.current = true;
    setBusy('save'); setError('');
    const toastId = toast.loading('Guardando perfil…', { id: 'profile-settings' });
    try {
      const updates = profileSettingsUpdates(form, perfil);
      const actor = await ensureSession();
      const { data, error: writeError } = await withAlbumTimeout(supabase.from('perfiles').update(updates).eq('id', actor).select('*').single());
      if (writeError || !data || data.id !== actor) throw new Error('No pudimos confirmar el guardado. Tu borrador sigue aquí.');
      if (!mounted.current || identity.current.userId !== actor) { toast.dismiss(toastId); return; }
      onUpdate?.(data);
      toast.success('Perfil guardado.', { id: toastId });
      onBack();
    } catch (problem) {
      const message = problem.code === 'NETWORK_TIMEOUT' ? 'La conexión tardó demasiado. Revisa tu perfil antes de reintentar; el borrador se conserva.' : problem.message || 'No se pudo guardar. Tu borrador se conserva.';
      if (mounted.current) { setError(message); toast.error(message, { id: toastId }); } else toast.dismiss(toastId);
    } finally { lock.current = false; if (mounted.current) setBusy(''); }
  }

  async function guardarTema(selection) {
    if (lock.current || !canCustomize) throw new Error('No puedes modificar este estilo.');
    lock.current = true; setBusy('theme');
    try {
      const actor = await ensureSession();
      const data = await saveProfileTheme({ client: supabase, userId: actor, themeId: selection.tema_perfil, color: selection.color_pixel });
      if (!mounted.current || identity.current.userId !== actor) return;
      onUpdate?.({ tema_perfil: data.tema_perfil, color_pixel: data.color_pixel });
      setPreview(null); setSelectorAbierto(false);
      toast.success('Estilo guardado.', { id: 'profile-style' });
    } finally { lock.current = false; if (mounted.current) setBusy(''); }
  }

  async function uploadImage(event, type) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || lock.current) return;
    lock.current = true; setBusy(type); setError('');
    const toastId = toast.loading('Subiendo imagen…', { id: 'profile-image' });
    try {
      const extension = await validateImageFile(file, { allowGif: limites.bannerGif });
      const actor = await ensureSession();
      const bucket = type === 'avatar' ? 'avatars' : 'banners';
      const filename = `${actor}_${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await withAlbumTimeout(supabase.storage.from(bucket).upload(filename, file, { contentType: file.type, upsert: false }));
      if (uploadError) throw new Error('No se pudo subir la imagen. Inténtalo de nuevo.');
      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      if (!data?.publicUrl) throw new Error('No llegó la dirección de la imagen.');
      if (!mounted.current || identity.current.userId !== actor) { toast.dismiss(toastId); return; }
      setForm(previous => type === 'avatar' ? { ...previous, avatar_url: data.publicUrl, avatar_scale: 1, avatar_pos_x: 50, avatar_pos_y: 50 } : { ...previous, banner_url: data.publicUrl, banner_pos_y: 50 });
      toast.success('Imagen lista. Guarda el perfil para publicarla.', { id: toastId });
    } catch (problem) {
      const message = problem.code === 'NETWORK_TIMEOUT' ? 'La subida tardó demasiado. Tus cambios se conservan.' : problem.message || 'No se pudo subir la imagen.';
      if (mounted.current) { setError(message); toast.error(message, { id: toastId }); } else toast.dismiss(toastId);
    } finally { lock.current = false; if (mounted.current) setBusy(''); }
  }

  const closePicker = () => { if (!lock.current) { setPreview(null); setSelectorAbierto(false); } };
  const resetCrop = () => setForm(previous => ({ ...previous, avatar_scale: 1, avatar_pos_x: 50, avatar_pos_y: 50, banner_pos_y: 50 }));
  const acceptedImages = `image/png,image/jpeg,image/webp${limites.bannerGif ? ',image/gif' : ''}`;

  function moveSection(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = SECTIONS.findIndex(item => item.id === section);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? SECTIONS.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + SECTIONS.length) % SECTIONS.length;
    setSection(SECTIONS[next].id);
    event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
  }

  return <MotionConfig reducedMotion={animate ? 'user' : 'always'}>
    <div className={`edit-master-container ${theme.className}`} data-profile-theme={theme.id} data-motion={animate ? 'on' : 'off'} style={getProfileThemeStyle(theme.id, color)}>
      <header className="profile-edit-header" inert={pickerVisible}>
        <button type="button" className="profile-edit-back" onClick={onBack} disabled={Boolean(busy)}><ArrowLeft size={19} /><span>Volver</span></button>
        <div className="profile-edit-title"><h1>Tu perfil<span>.</span></h1><p>{dirty ? 'Cambios sin guardar' : 'Todo en su lugar'}</p></div>
        <button type="button" className="theme-btn-primary" onClick={guardarPerfil} disabled={Boolean(busy) || pickerVisible || !dirty}><Save size={17} /> {busy === 'save' ? 'Guardando…' : 'Guardar perfil'}</button>
      </header>
      <main className="profile-edit-layout" inert={pickerVisible}>
        <section className="profile-edit-workspace" aria-label="Configuración de tu perfil">
          <div className="profile-edit-tabs" role="tablist" aria-label="Ajustes del perfil" onKeyDown={moveSection}>{SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" tabIndex={section === id ? 0 : -1} aria-selected={section === id} aria-controls={`profile-edit-${id}`} id={`profile-tab-${id}`} onClick={() => setSection(id)}><Icon size={17} /> {label}</button>)}</div>
          {error && <div className="profile-edit-error" role="alert">{error}</div>}
          <motion.div key={section} initial={animate ? { opacity: 0, y: 9 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }} role="tabpanel" id={`profile-edit-${section}`} aria-labelledby={`profile-tab-${section}`} className="theme-panel profile-edit-panel">
            {section === 'identity' && <>
              <h2>Identidad</h2>
              <label className="profile-edit-field" htmlFor="profile-nickname"><span>Apodo</span><input id="profile-nickname" className="theme-input" type="text" maxLength={20} value={form.apodo} onChange={event => change('apodo', event.target.value)} disabled={cooldownDias > 0 || Boolean(busy)} placeholder={perfil.discord_nombre} /></label>
              <p className="profile-edit-note">{cooldownDias > 0 ? `Puedes cambiarlo en ${cooldownDias} ${cooldownDias === 1 ? 'día' : 'días'}.` : `Un cambio cada ${limites.apodoDias} días.`}</p>
              <fieldset className="profile-edit-position"><legend>Posición</legend><div>{PROFILE_POSITIONS.map(position => <button type="button" key={position} aria-pressed={form.posicion === position} onClick={() => change('posicion', position)} disabled={Boolean(busy)}>{position === 'Cualquiera' ? 'Libre' : position}</button>)}</div></fieldset>
              <label className="profile-edit-field" htmlFor="profile-bio"><span>Tu estado <small>{form.bio.length}/{limites.bio}</small></span><textarea id="profile-bio" className="theme-input" rows={5} maxLength={limites.bio} value={form.bio} onChange={event => change('bio', event.target.value)} disabled={Boolean(busy)} placeholder="Algo que diga quién eres…" /></label>
              {canCustomize && <button type="button" className="profile-edit-style-card" onClick={() => setSelectorAbierto(true)} disabled={Boolean(busy)}><Palette size={23} /><span><strong>{theme.name}</strong><small>Elegir entre 10 estilos</small></span><span aria-hidden="true">↗</span></button>}
            </>}
            {section === 'images' && <>
              <h2>Imágenes</h2>
              <div className="profile-edit-upload"><div className="profile-edit-avatar theme-avatar-container"><img src={profileImageUrl(form.avatar_url) || FALLBACK} alt="Encuadre del avatar" onError={imageFallback} style={{ objectPosition: `${form.avatar_pos_x}% ${form.avatar_pos_y}%`, transform: `scale(${form.avatar_scale})` }} /></div><label className="theme-btn-secondary profile-upload-button"><UploadCloud size={17} /> {busy === 'avatar' ? 'Subiendo…' : 'Cambiar avatar'}<input type="file" aria-label="Subir avatar" accept={acceptedImages} onChange={event => uploadImage(event, 'avatar')} disabled={Boolean(busy)} /></label></div>
              <div className="profile-edit-sliders">{[{ id: 'avatar_scale', label: 'Zoom', min: 1, max: 2.5, step: .1, suffix: '×' }, { id: 'avatar_pos_x', label: 'Horizontal', min: 0, max: 100, step: 1, suffix: '%' }, { id: 'avatar_pos_y', label: 'Vertical', min: 0, max: 100, step: 1, suffix: '%' }].map(control => <label key={control.id} htmlFor={`profile-${control.id}`}><span>{control.label}<output>{form[control.id]}{control.suffix}</output></span><input id={`profile-${control.id}`} type="range" min={control.min} max={control.max} step={control.step} value={form[control.id]} onChange={event => change(control.id, Number(event.target.value))} disabled={Boolean(busy)} /></label>)}</div>
              <div className="profile-edit-banner-upload">{form.banner_url && <img src={profileImageUrl(form.banner_url) || FALLBACK} alt="Encuadre del banner" style={{ objectPosition: `50% ${form.banner_pos_y}%` }} />}<label className="theme-btn-secondary profile-upload-button"><UploadCloud size={17} /> {busy === 'banner' ? 'Subiendo…' : 'Cambiar banner'}<input type="file" aria-label="Subir banner" accept={acceptedImages} onChange={event => uploadImage(event, 'banner')} disabled={Boolean(busy)} /></label></div>
              <div className="profile-edit-sliders"><label htmlFor="profile-banner-y"><span>Encuadre del banner<output>{form.banner_pos_y}%</output></span><input id="profile-banner-y" type="range" min="0" max="100" value={form.banner_pos_y} onChange={event => change('banner_pos_y', Number(event.target.value))} disabled={Boolean(busy)} /></label></div>
              <div className="profile-edit-images-footer"><span className="profile-edit-note">PNG, JPG, WebP{limites.bannerGif ? ' o GIF' : ''} · hasta 5 MB</span><button type="button" onClick={resetCrop} disabled={Boolean(busy)}><RotateCcw size={14} /> Centrar</button></div>
            </>}
            {section === 'extras' && <>
              <h2>Destacados</h2>
              <label className="profile-edit-field" htmlFor="profile-widget-1"><span>Primera sección</span><select id="profile-widget-1" className="theme-input" value={form.widget_1} onChange={event => change('widget_1', event.target.value)} disabled={Boolean(busy)}>{PROFILE_WIDGETS.map(widget => <option key={widget}>{widget}</option>)}</select></label>
              <label className="profile-edit-field" htmlFor="profile-widget-2"><span>Segunda sección {limites.widgets < 2 && <small>VIP · nivel 10</small>}</span><select id="profile-widget-2" className="theme-input" value={form.widget_2} onChange={event => change('widget_2', event.target.value)} disabled={Boolean(busy) || limites.widgets < 2}>{PROFILE_WIDGETS.map(widget => <option key={widget}>{widget}</option>)}</select></label>
              <label className="profile-edit-field" htmlFor="profile-spotify"><span><Music size={16} /> Tu canción</span><input id="profile-spotify" className="theme-input" type="url" value={form.cancion_url} onChange={event => change('cancion_url', event.target.value)} disabled={Boolean(busy)} placeholder="https://open.spotify.com/track/…" /></label>
              <p className="profile-edit-note">Pega el enlace de una canción de Spotify.</p>
              {song && <p className="profile-edit-song-valid"><Check size={15} /> Canción lista para tu perfil</p>}
            </>}
          </motion.div>
        </section>
        <aside className="profile-edit-preview" aria-label="Vista previa del perfil">
          <div className="profile-edit-preview-top"><span><Eye size={16} /> Vista previa</span>{canCustomize && <button type="button" onClick={() => setSelectorAbierto(true)} disabled={Boolean(busy)}><Palette size={16} /> Estilo</button>}</div>
          <div className="theme-panel profile-preview-card">
            <div className="profile-preview-banner">{form.banner_url && <img src={profileImageUrl(form.banner_url) || FALLBACK} alt="" style={{ objectPosition: `50% ${form.banner_pos_y}%` }} />}</div>
            <div className="profile-preview-body"><div className="theme-avatar-container profile-preview-avatar"><img src={profileImageUrl(form.avatar_url) || FALLBACK} onError={imageFallback} alt="Avatar en el perfil" style={{ objectPosition: `${form.avatar_pos_x}% ${form.avatar_pos_y}%`, transform: `scale(${form.avatar_scale})` }} /></div><span className="profile-preview-theme">{theme.name}</span><h2 className="theme-h1">{form.apodo || perfil.discord_nombre}</h2><span className="profile-preview-handle">@{perfil.discord_nombre} · {form.posicion}</span><p>{form.bio || 'Sin estado...'}</p><div className="profile-preview-widgets">{[form.widget_1, limites.widgets > 1 ? form.widget_2 : 'Ninguno'].filter(widget => widget !== 'Ninguno').map((widget, index) => <div key={`${index}-${widget}`}><LayoutGrid size={17} /><span>{widget}</span><span>↗</span></div>)}</div>{song && <div className="profile-preview-song"><Music size={16} /> Canción favorita</div>}</div>
          </div>
          <p className="profile-edit-note">Los cambios del perfil se publican al guardar.</p>
        </aside>
      </main>
      {pickerVisible && <PerfilThemePicker themeId={perfil.tema_perfil} color={perfil.color_pixel} onPreview={setPreview} onSave={guardarTema} onCancel={closePicker} disabled={Boolean(busy)} />}
    </div>
  </MotionConfig>;
}
