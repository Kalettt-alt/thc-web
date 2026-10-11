import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { extractYouTubeId, getYouTubeThumbnail } from '../../utils/youtube';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, Pause, Trash2, SkipBack, SkipForward, Volume2, Edit2, Check, X, Shuffle, ArrowDownUp, Music, Plus, Headphones } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { deletePlaylistTrack, playlistAfterDeletion } from './playlistUTActions';
import './MusicaUT.css';

const PLAYBACK_LABELS = { playing: 'Reproduciendo', paused: 'En pausa', loading: 'Conectando', buffering: 'Cargando audio', ended: 'Finalizado', error: 'No disponible', blocked: 'Activa la música' };

export default function MusicaUT({
  playlist, setPlaylist, currentIdx, setCurrentIdx, userId, onSelectSong, onActivateMusic,
  handleNext, handlePrev, isPlaying, playRequested, playbackState, setIsPlaying, volume, setVolume,
  isShuffle, setIsShuffle,
}) {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState(null);
  const [isMutating, setIsMutating] = useState(false);
  const mutationRef = useRef(false);
  const selectionRef = useRef({ playlist, currentIdx });
  useEffect(() => { selectionRef.current = { playlist, currentIdx }; }, [playlist, currentIdx]);
  const [sortBy, setSortBy] = useState('added');
  const [sortDesc, setSortDesc] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const currentSong = playlist.length > 0 ? playlist[currentIdx] : null;
  const playlistIndices = useMemo(() => new Map(playlist.map((song, index) => [song.id, index])), [playlist]);
  const sortedPlaylist = useMemo(() => [...playlist].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'title') { valA = (a.title || 'Z').toLowerCase(); valB = (b.title || 'Z').toLowerCase(); }
    else if (sortBy === 'artist') { valA = (a.artist || 'Z').toLowerCase(); valB = (b.artist || 'Z').toLowerCase(); }
    else { valA = new Date(a.created_at || 0).getTime(); valB = new Date(b.created_at || 0).getTime(); }
    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  }), [playlist, sortBy, sortDesc]);

  const handleAddSong = async (event) => {
    event.preventDefault();
    if (mutationRef.current || !query.trim()) return;
    if (!userId) return toast.error('Inicia sesión para guardar música.');
    if (playlist.length >= 20) return toast.error('Tu playlist admite hasta 20 canciones.');
    const videoId = extractYouTubeId(query);
    if (!videoId) return toast.error('Pega un enlace válido de YouTube.');
    if (playlist.some(song => extractYouTubeId(song.url) === videoId)) return toast.error('Esta canción ya está en tu playlist.');
    mutationRef.current = true;
    setIsSearching(true);
    setIsMutating(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let metadataLoaded = false;
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: controller.signal });
      if (!response.ok) throw new Error('Este vídeo no está disponible o es privado.');
      const metadata = await response.json();
      metadataLoaded = true;
      const newSong = {
        user_id: userId, url: `https://www.youtube.com/watch?v=${videoId}`,
        title: (metadata.title || 'Track de YouTube').slice(0, 160),
        artist: (metadata.author_name || 'YouTube').slice(0, 100),
        thumbnail: getYouTubeThumbnail(videoId), source: 'youtube',
      };
      const { data, error } = await supabase.from('PlaylistUT').insert(newSong).select().single();
      if (error) throw error;
      setPlaylist(previous => [...previous, data]);
      setQuery('');
      toast.success('Canción añadida a la playlist.');
    } catch (error) {
      toast.error(metadataLoaded ? 'No se pudo guardar la canción. Comprueba tu conexión e inténtalo de nuevo.' : error.name === 'AbortError' ? 'YouTube tardó demasiado en responder. Vuelve a intentarlo.' : 'No se pudo consultar este vídeo. Comprueba el enlace y tu conexión.');
    } finally {
      clearTimeout(timeout);
      mutationRef.current = false;
      setIsSearching(false);
      setIsMutating(false);
    }
  };

  const confirmDelete = async () => {
    if (!trackToDelete || mutationRef.current) return;
    if (!userId) return toast.error('Inicia sesión para eliminar esta canción.');
    mutationRef.current = true;
    setIsMutating(true);
    try {
      await deletePlaylistTrack(supabase, { trackId: trackToDelete, userId });
      const latest = selectionRef.current;
      const next = playlistAfterDeletion(latest.playlist, latest.currentIdx, trackToDelete);
      setPlaylist(previous => previous.filter(song => song.id !== trackToDelete));
      setCurrentIdx(next.currentIdx);
      if (next.removedCurrent) setIsPlaying(false);
      setTrackToDelete(null);
      toast.success('Canción eliminada.');
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar la canción. Tu playlist se ha conservado.');
    } finally {
      mutationRef.current = false;
      setIsMutating(false);
    }
  };

  const saveEdit = async (id, event) => {
    event.stopPropagation();
    if (mutationRef.current || !userId) return;
    const finalTitle = editTitle.trim();
    const finalArtist = editArtist.trim();
    if (!finalTitle || !finalArtist) return toast.error('Escribe el título y el artista.');
    mutationRef.current = true;
    setIsMutating(true);
    try {
      const { error } = await supabase.from('PlaylistUT').update({ title: finalTitle, artist: finalArtist }).eq('id', id).eq('user_id', userId).select('id').single();
      if (error) throw error;
      setPlaylist(previous => previous.map(song => song.id === id ? { ...song, title: finalTitle, artist: finalArtist } : song));
      setEditingId(null);
      toast.success('Canción actualizada.');
    } catch {
      toast.error('No se pudieron guardar los cambios. Puedes volver a intentarlo.');
    } finally {
      mutationRef.current = false;
      setIsMutating(false);
    }
  };

  return (
    <section className="ut-music" aria-label="Música de Ultimate Team">
      <header className="ut-music__heading">
        <div><p><Headphones size={17} aria-hidden="true" /> El sonido de tu club</p><h2>SUBE EL <span>VOLUMEN.</span></h2></div>
        <span className="ut-music__edition">THC / MUSIC</span>
      </header>
      <div className="ut-music__layout">
        <section className="ut-music__deck" aria-label="Reproductor de música">
          <div className={`ut-music__art ${isPlaying ? 'is-playing' : ''}`}>
            <span className="ut-music__art-word" aria-hidden="true">THC</span>
            <div className="ut-music__record" aria-hidden="true"><i /><i /><i /><b /></div>
            <AnimatePresence mode="wait">
              <motion.div key={currentSong?.id || 'empty'} className="ut-music__cover" initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -12 }} transition={{ duration: .22 }}>
                {currentSong ? <img src={currentSong.thumbnail || getYouTubeThumbnail(currentSong.url)} alt={`Portada de ${currentSong.title}`} /> : <Headphones size={66} strokeWidth={1.25} aria-hidden="true" />}
                <span aria-hidden="true">THC ULTIMATE TEAM</span>
              </motion.div>
            </AnimatePresence>
            <span className="ut-music__playback" role="status"><i className={isPlaying ? 'is-playing' : ''} />{currentSong ? PLAYBACK_LABELS[playbackState] || 'En pausa' : 'Tu próxima canción'}</span>
            <div className="ut-music__equalizer" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--bar': i }} />)}</div>
          </div>
          <div className="ut-music__now">
            <p>{currentSong ? 'Ahora suena' : 'Hazla tuya'}</p>
            <h3 title={currentSong?.title}>{currentSong?.title || 'TU PROPIA BANDA SONORA.'}</h3>
            <span>{currentSong?.artist || 'Añade una canción de YouTube para empezar.'}</span>
          </div>
          <div className="ut-music__transport">
            <button type="button" onClick={handlePrev} disabled={!currentSong} aria-label="Reiniciar canción"><SkipBack size={21} fill="currentColor" /></button>
            <button type="button" className="ut-music__play" disabled={!currentSong} onClick={() => setIsPlaying(previous => !previous)} aria-label={playRequested ? 'Pausar música' : 'Reproducir música'}>{playRequested ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}</button>
            <button type="button" onClick={handleNext} disabled={!currentSong} aria-label="Siguiente canción"><SkipForward size={21} fill="currentColor" /></button>
            <button type="button" className="ut-music__shuffle" aria-pressed={isShuffle} onClick={() => setIsShuffle(!isShuffle)} aria-label="Reproducción aleatoria"><Shuffle size={20} /></button>
          </div>
          <label className="ut-music__volume"><Volume2 size={19} aria-hidden="true" /><span className="ut-music__sr-only">Volumen de música</span><input type="range" min="0" max="100" value={volume} onChange={event => setVolume(Number(event.target.value))} style={{ '--volume': `${volume}%` }} /><output>{volume}%</output></label>
          {['blocked', 'error'].includes(playbackState) && <div role="status" className="ut-music__retry"><p>{playbackState === 'blocked' ? 'Activa la música para continuar.' : 'Esta canción no pudo empezar.'}</p><button type="button" onClick={onActivateMusic}>Activar música <Play size={14} /></button></div>}
        </section>

        <section className="ut-music__library" aria-label="Tu playlist">
          <header><h3>Tu playlist<span>{playlist.length}<small>/20</small></span></h3></header>
          <form onSubmit={handleAddSong} className="ut-music__add"><label className="ut-music__sr-only" htmlFor="ut-music-link">Enlace de YouTube</label><input id="ut-music-link" type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pega un enlace de YouTube" /><button type="submit" disabled={isSearching || isMutating || !query.trim()}><Plus size={18} />{isSearching ? 'Añadiendo' : 'Añadir'}</button></form>
          <div className="ut-music__sort"><label>Ordenar <select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="added">Por fecha</option><option value="title">Por nombre</option><option value="artist">Por artista</option></select></label><button type="button" onClick={() => setSortDesc(!sortDesc)} aria-label={sortDesc ? 'Ordenar de menor a mayor' : 'Ordenar de mayor a menor'} title={sortDesc ? 'Orden descendente' : 'Orden ascendente'}><ArrowDownUp size={18} className={sortDesc ? '' : 'is-reversed'} /></button></div>
          <div className="ut-music__tracks">
            {!sortedPlaylist.length ? <div className="ut-music__empty"><Music size={32} strokeWidth={1.5} /><h4>Aún no hay canciones.</h4><p>Tu playlist empieza con un enlace.</p></div> : sortedPlaylist.map((song, index) => {
              const realIndex = playlistIndices.get(song.id);
              const isActive = realIndex === currentIdx;
              const isEditing = editingId === song.id;
              return <div key={song.id} className={`ut-music__track ${isActive ? 'is-active' : ''} ${isEditing ? 'is-editing' : ''}`} style={{ '--track-index': Math.min(index, 6) }}>
                {isEditing ? <div className="ut-music__edit"><label className="ut-music__sr-only" htmlFor={`ut-title-${song.id}`}>Título de canción</label><input id={`ut-title-${song.id}`} autoFocus type="text" maxLength={160} value={editTitle} onChange={event => setEditTitle(event.target.value)} /><label className="ut-music__sr-only" htmlFor={`ut-artist-${song.id}`}>Artista</label><input id={`ut-artist-${song.id}`} type="text" maxLength={100} value={editArtist} onChange={event => setEditArtist(event.target.value)} /></div> : <button type="button" className="ut-music__track-select" disabled={isMutating} onClick={() => onSelectSong(realIndex)} aria-label={`Reproducir ${song.title}`} aria-current={isActive ? 'true' : undefined}><span className="ut-music__track-number">{String(index + 1).padStart(2, '0')}</span><span className="ut-music__track-art"><img src={song.thumbnail || getYouTubeThumbnail(song.url)} alt="" loading="lazy" decoding="async" />{isActive && isPlaying && <span className="ut-music__mini-eq" aria-hidden="true"><i /><i /><i /></span>}</span><span className="ut-music__track-title"><strong>{song.title}</strong><span>{song.artist}</span></span></button>}
                <div className="ut-music__track-actions">{isEditing ? <><button type="button" disabled={isMutating} aria-label="Guardar canción" onClick={event => saveEdit(song.id, event)}><Check size={17} /></button><button type="button" disabled={isMutating} aria-label="Cancelar edición" onClick={() => setEditingId(null)}><X size={17} /></button></> : <><button type="button" disabled={isMutating} aria-label={`Editar ${song.title}`} onClick={() => { setEditingId(song.id); setEditTitle(song.title); setEditArtist(song.artist); }}><Edit2 size={16} /></button><button type="button" disabled={isMutating} aria-label={`Eliminar ${song.title}`} onClick={() => setTrackToDelete(song.id)}><Trash2 size={16} /></button></>}</div>
              </div>;
            })}
          </div>
        </section>
      </div>
      {createPortal(<AnimatePresence>{trackToDelete && <motion.div key="delete-track" className="ut-music__modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Eliminar canción" onKeyDown={event => { if (event.key === 'Escape' && !isMutating) setTrackToDelete(null); }}><motion.div initial={{ scale: reducedMotion ? 1 : .96, y: reducedMotion ? 0 : 12 }} animate={{ scale: 1, y: 0 }} exit={{ opacity: 0 }}><Trash2 size={27} /><h3>¿Eliminar canción?</h3><p>{playlist.find(song => song.id === trackToDelete)?.title}</p><div><button autoFocus type="button" disabled={isMutating} onClick={() => setTrackToDelete(null)}>Cancelar</button><button type="button" disabled={isMutating} onClick={confirmDelete}>{isMutating ? 'Eliminando…' : 'Eliminar'}</button></div></motion.div></motion.div>}</AnimatePresence>, document.body)}
    </section>
  );
}
