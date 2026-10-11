import { memo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { getYouTubeThumbnail } from '../../utils/youtube';
import './MusicControlsUT.css';

const SongRow = memo(function SongRow({ song, index, active, isPlaying, onSelect }) {
  return <button type="button" onClick={() => onSelect(index)} className={`ut-music-quick__song ${active ? 'is-active' : ''}`} aria-label={`Reproducir ${song.title}`} aria-current={active ? 'true' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><span><strong>{song.title}</strong><small>{song.artist}</small></span>{active && <i className={isPlaying ? 'is-playing' : ''} aria-hidden="true" />}</button>;
});

export default function OverMusic({ playlist, currentIdx, onSelectSong, isPlaying, playRequested, setIsPlaying, volume, setVolume, handleNext, handlePrev }) {
  const currentSong = playlist[currentIdx];
  const selectSong = useCallback(index => onSelectSong(index), [onSelectSong]);
  return <div className="ut-music-quick">
    <div className="ut-music-quick__current">{currentSong && <img src={currentSong.thumbnail || getYouTubeThumbnail(currentSong.url)} alt="" />}<div><strong>{currentSong?.title || 'Sin pistas activas'}</strong><span>{currentSong?.artist || 'Tu banda sonora THC'}</span></div></div>
    <div className="ut-music-quick__transport"><button type="button" disabled={!currentSong} onClick={handlePrev} aria-label="Reiniciar canción"><SkipBack size={19} fill="currentColor" /></button><button type="button" disabled={!currentSong} onClick={() => setIsPlaying(previous => !previous)} aria-label={playRequested ? 'Pausar música' : 'Reproducir música'}>{playRequested ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button><button type="button" disabled={!currentSong} onClick={handleNext} aria-label="Siguiente canción"><SkipForward size={19} fill="currentColor" /></button></div>
    <label className="ut-music-quick__volume"><Volume2 size={16} aria-hidden="true" /><input aria-label="Volumen de música" type="range" min="0" max="100" value={volume} onChange={event => setVolume(Number(event.target.value))} /><output>{volume}%</output></label>
    <div className="ut-music-quick__list" aria-label="Canciones de tu playlist">{playlist.map((song, index) => <SongRow key={song.id} song={song} index={index} active={index === currentIdx} isPlaying={index === currentIdx && isPlaying} onSelect={selectSong} />)}</div>
  </div>;
}
