import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Music, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractYouTubeId } from '../../utils/youtube';
import { readUtConfig } from './utValidation';
import YouTubePlayer from './YouTubePlayer';
import { supabase } from '../../utils/supabase'; 

import LogoUT from './LogoUT.png';
import MonedaUT from './MonedaUT.png'; 

import WidgetReproductor from './WidgetReproductor';
import MusicaUT from './MusicaUT';
import ConfUT from './ConfUT'; 
import ComingSoon from '../../components/ui/ComingSoon';
import EmptySectionUT from './EmptySectionUT';
import TransicionMenu from './TransicionMenu'; 
import OverMusic from './OverMusic';
import JugIconos from './JugIconos'; 
import HomeUT from './HomeUT';
import SobresUT from './SobresUT';
import TeamUT from './TeamUT';                                        

export default function MenuUT({ onVolver, onPlaySkill, initialClubData = null }) {
  const [activeTab, setActiveTab] = useState('inicio'); 
  const [activeGameMode, setActiveGameMode] = useState(null); 
  const [showTransition, setShowTransition] = useState(false);
  
  const [monedas, setMonedas] = useState(0);

           
  const [playRequested, setIsPlaying] = useState(false);
  const requestedPlaybackRef = useRef(false);
  const [playbackState, setPlaybackState] = useState('paused');
  const isPlaying = playbackState === 'playing';
  const [playlist, setPlaylist] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userId, setUserId] = useState(null);
  const [isShuffle, setIsShuffle] = useState(false); 
  const ytPlayerRef = useRef(null);
  const playerStateRef = useRef({ playlist, currentIdx, isShuffle, playedHistory: [] });
  const [showQuickMusic, setShowQuickMusic] = useState(false);

  const [volume, setVolume] = useState(() => readUtConfig().volMaster);

  const NAV_TABS = [
    { id: 'inicio', label: 'INICIO' },
    { id: 'iconicos', label: 'ICÓNICOS' },
    { id: 'musica', label: 'MÚSICA' },
    { id: 'config', label: 'AJUSTES' },
  ];

  const [clubInfo, setClubInfo] = useState(initialClubData);
  const [clubSquad, setClubSquad] = useState(null);
  const transitionTimers = useRef([]);
  const transitionLock = useRef(false);
  useEffect(() => () => transitionTimers.current.forEach(clearTimeout), []);

  useEffect(() => {
    let cancelled = false;
    const fetchUTData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user || cancelled) return;
        setUserId(user.id);
        const [currency, music, club, squad] = await Promise.all([
          supabase.from('perfiles_ut').select('monedas').eq('user_id', user.id).maybeSingle(),
          supabase.from('PlaylistUT').select('id,url,title,artist,thumbnail,source,created_at').eq('user_id', user.id).order('created_at', { ascending: true }).limit(20),
          supabase.from('equipos_ut').select('user_id,nombre,abreviatura,logo_url').eq('user_id',user.id).maybeSingle(),
          supabase.from('plantillas_ut').select('*').eq('user_id',user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        if (currency.data) setMonedas(currency.data.monedas ?? 0);
        if (club.data) setClubInfo(club.data);
        if (squad.data) setClubSquad(squad.data);
        if (!music.error) setPlaylist(music.data ?? []);
        const failed = [
          currency.error && 'tus monedas',
          club.error && 'tu club',
          squad.error && 'tu plantilla',
          music.error && 'tu música',
        ].filter(Boolean);
        if (failed.length) toast.error(`No se pudo cargar ${failed.join(', ')}. Comprueba tu conexión e inténtalo de nuevo.`, { id: 'ut-data-load' });
      } catch {
        if (!cancelled) toast.error('No se pudo cargar Ultimate Team. Comprueba tu conexión e inténtalo de nuevo.', { id: 'ut-data-load' });
      }
    };
    fetchUTData();
    return () => { cancelled = true; };
  }, []);

  const executeTransition = useCallback((action) => {
    if (transitionLock.current) return;
    transitionLock.current = true;
    setShowTransition(true);
    transitionTimers.current.push(setTimeout(action, 400));
    transitionTimers.current.push(setTimeout(() => { setShowTransition(false); transitionLock.current = false; }, 1000));
  }, []);

  const handleExecuteAction = useCallback((mode) => {
    if (mode === 'entrenamiento') executeTransition(() => onPlaySkill());
    else if (['jugar', 'equipo', 'sobres', 'tienda', 'mercado', 'camino'].includes(mode)) executeTransition(() => setActiveGameMode(mode));
  }, [executeTransition, onPlaySkill]);

  useEffect(() => {
    const previous = playerStateRef.current;
    playerStateRef.current = { playlist, currentIdx, isShuffle, playedHistory: previous.playlist === playlist && previous.isShuffle === isShuffle ? previous.playedHistory : [] };
  }, [playlist, currentIdx, isShuffle]);
  
  const requestPlayback = useCallback(value => {
    const requested = typeof value === 'function' ? Boolean(value(requestedPlaybackRef.current)) : Boolean(value);
    requestedPlaybackRef.current = requested;
    setIsPlaying(requested);
    ytPlayerRef.current?.setPlayback(requested);
  }, []);

  const selectSong = useCallback(index => {
    const song = playerStateRef.current.playlist[index];
    const videoId = extractYouTubeId(song?.url, true);
    if (!videoId) {
      toast.error('Esta canción no contiene un enlace válido de YouTube.');
      return;
    }
    setCurrentIdx(index);
    requestedPlaybackRef.current = true;
    setIsPlaying(true);
    ytPlayerRef.current?.select(videoId);
  }, []);

  const confirmPlayback = useCallback(playing => {
    requestedPlaybackRef.current = playing;
    setIsPlaying(playing);
  }, []);

  const retryPlayback = useCallback(() => {
    requestedPlaybackRef.current = true;
    setIsPlaying(true);
    ytPlayerRef.current?.retry();
  }, []);

  const handleNextSong = useCallback(() => {
    const { playlist: p, isShuffle: s, currentIdx: c, playedHistory: h } = playerStateRef.current;
    if (p.length === 0) return;
    requestedPlaybackRef.current = true;
    setIsPlaying(true);
    if (p.length === 1) { ytPlayerRef.current?.restart(); return; }
    if (s) {
      const newHistory = [...h, c];
      if (newHistory.length >= p.length) newHistory.length = 0;
      const available = p.map((_, i) => i).filter(i => !newHistory.includes(i) && i !== c);
      const nextIdx = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : Math.floor(Math.random() * p.length);
      playerStateRef.current.playedHistory = newHistory; selectSong(nextIdx);
    } else { selectSong((c + 1) % p.length); }
  }, [selectSong]);
  const handlePrevClick = useCallback(() => { ytPlayerRef.current?.seekToZero(); }, []);
  const handlePlayerError = useCallback(message => {
    toast.error(message, { id: 'youtube-player' });
    setShowQuickMusic(true);
  }, []);

  const currentSong = playlist.length > 0 ? playlist[currentIdx] : null;
  const ytVideoId = extractYouTubeId(currentSong?.url, true);
  const playbackLabel = { playing: 'Reproduciendo', paused: 'Pausado', loading: 'Cargando', buffering: 'Cargando vídeo', ended: 'Finalizado', error: 'Error de reproducción', blocked: 'Activa la música' }[playbackState];

  return (
    <div className="w-full min-h-screen bg-[#050505] font-sans text-white flex flex-col relative z-0 select-none overflow-x-hidden overflow-y-auto">
      
      {showTransition && <TransicionMenu />}

      {currentSong && ytVideoId && (
        <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 h-[200px] w-[288px] overflow-hidden opacity-0">
          <YouTubePlayer ref={ytPlayerRef} videoId={ytVideoId} volume={volume} onEnded={handleNextSong} playRequested={playRequested} onStateChange={setPlaybackState} onPlaybackChange={confirmPlayback} onError={handlePlayerError} />
        </div>
      )}
      {showQuickMusic && currentSong && !activeGameMode && (
        <section aria-label="Controles de música" className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] w-[288px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0A0A0A] shadow-2xl z-[var(--z-floating)]">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="truncate text-white/70" aria-live="polite">{playbackLabel}</span>
            <button type="button" onClick={() => setShowQuickMusic(false)} className="shrink-0 rounded p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Cerrar controles de música"><X size={15} /></button>
          </div>
          {['error', 'blocked'].includes(playbackState) && <button type="button" onClick={retryPlayback} className="w-full py-3 text-xs font-bold text-[#F97316] hover:bg-white/5">Activar música</button>}
          <OverMusic playlist={playlist} currentIdx={currentIdx} setCurrentIdx={setCurrentIdx} onSelectSong={selectSong} isPlaying={isPlaying} playRequested={playRequested} setIsPlaying={requestPlayback} volume={volume} setVolume={setVolume} handleNext={handleNextSong} handlePrev={handlePrevClick} />
        </section>
      )}
      {!activeGameMode && !showQuickMusic && <WidgetReproductor currentSong={currentSong} isPlaying={isPlaying} onOpen={()=>setShowQuickMusic(true)} />}

                            
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
        <AnimatePresence mode="wait">
          {activeTab === 'iconicos' && (
            <motion.div
              key="fondo-iconicos"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.12)_0%,_#050505_100%)]"
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/80 to-transparent w-full md:w-[60%]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent h-[40%] mt-auto"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.1] mix-blend-overlay"></div>
      </div>

                             
      <header inert={Boolean(activeGameMode)} className="w-full h-20 md:h-24 shrink-0 relative z-50 flex items-center justify-between px-4 sm:px-8 md:px-12 bg-transparent">
        <div className="flex items-center gap-3 shrink-0">
          <img src={LogoUT} alt="THC UT" className="h-10 md:h-12 object-contain" />
          <h1 className="text-sm md:text-xl font-black italic tracking-tighter uppercase leading-none text-white hidden sm:block">
            THC: <span className="text-[#F97316]">ULTIMATE TEAM</span>
          </h1>
        </div>

        <nav className="absolute left-1/2 -translate-x-1/2 h-full hidden md:flex items-center gap-8 lg:gap-14">
          {NAV_TABS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative h-full flex items-center justify-center text-[10px] lg:text-[11px] font-black uppercase tracking-[0.3em] transition-colors outline-none ${isActive ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
              >
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="navbarTopLine"
                    className="absolute top-0 left-0 w-full h-[3px] bg-[#F97316] shadow-[0_0_10px_#F97316]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 sm:gap-6 z-50 shrink-0">
          <button type="button" onClick={() => { if (currentSong) setShowQuickMusic(previous => !previous); else setActiveTab('musica'); }} aria-label="Abrir reproductor de música" className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-[#F97316]"><Music size={18} /></button>
          <div className="flex items-center gap-2">
            <img src={MonedaUT} alt="Monedas" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
            <span className="text-xs md:text-sm font-black text-white">{monedas.toLocaleString()}</span>
          </div>
          <div className="w-[1px] h-4 bg-white/20 hidden sm:block"></div>
          <button 
            onClick={() => executeTransition(onVolver)}
            className="flex items-center gap-2 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors outline-none"
          >
            <span className="hidden sm:inline">SALIR</span> <LogOut size={14} className="sm:hidden" />
          </button>
        </div>
      </header>
      <nav inert={Boolean(activeGameMode)} className="ut-menu-mobile-tabs" aria-label="Ultimate Team">{NAV_TABS.map(tab => <button key={tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>

                                 
      <main inert={Boolean(activeGameMode)} className="flex-1 w-full flex flex-col relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'inicio' && <HomeUT key="inicio" club={clubInfo} squad={clubSquad} onSelect={handleExecuteAction}/> }

          {activeTab === 'iconicos' && <JugIconos key="iconicos" />}
          {activeTab === 'config' && <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full h-full p-4 sm:p-8"><ConfUT /></motion.div>}
          {activeTab === 'musica' && <motion.div key="musica" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full h-full p-4 sm:p-8">
            <MusicaUT playlist={playlist} setPlaylist={setPlaylist} currentIdx={currentIdx} setCurrentIdx={setCurrentIdx} userId={userId} onSelectSong={selectSong} onActivateMusic={retryPlayback} isShuffle={isShuffle} setIsShuffle={setIsShuffle} handleNext={handleNextSong} handlePrev={handlePrevClick} isPlaying={isPlaying} playRequested={playRequested} playbackState={playbackState} setIsPlaying={requestPlayback} volume={volume} setVolume={setVolume} />
          </motion.div>}
        </AnimatePresence>
      </main>

                                                             
      <AnimatePresence>
        {activeGameMode === 'jugar' && (
          <ComingSoon key="jugar" name="Jugar · Ultimate Team" overlay onBack={() => executeTransition(() => setActiveGameMode(null))} />
        )}
        {['mercado','camino'].includes(activeGameMode) && <EmptySectionUT key={activeGameMode} section={activeGameMode} onVolver={() => executeTransition(() => setActiveGameMode(null))}/>}
        
                                                    
        {['sobres','tienda'].includes(activeGameMode) && <SobresUT key={activeGameMode} initialView={activeGameMode === 'tienda' ? 'catalogo' : 'sobres'} onVolver={() => executeTransition(() => setActiveGameMode(null))}/>}
        {activeGameMode === 'equipo' && (
          <TeamUT clubData={clubInfo} onSaved={setClubSquad} onVolver={() => executeTransition(() => setActiveGameMode(null))} />
        )}
      </AnimatePresence>


    </div>
  );
}
