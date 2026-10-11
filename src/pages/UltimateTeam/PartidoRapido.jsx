import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight, Zap, X } from 'lucide-react';
import { EQUIPOS_DATA } from './JugadoresUT';
import CargaPartido from './CargaPartido';
import PizarraTacticas from './PizarraTacticas'; 
import SeleccionKits from './SeleccionKits';
import { getTeamKits } from './kitsData'; 
import GestionAlineacion from './GestionAlineacion'; 
import IntroPartido from './PartidaRapida/IntroPartido'; 
import CanchaPartido from './PartidaRapida/CanchaPartido'; 

const getStats = (grl) => ({ ata: Math.min(99, grl + 3), med: grl, def: Math.max(50, grl - 2) });
const getTruenos = (grl) => { if (grl >= 95) return 5; if (grl >= 85) return 4; if (grl >= 75) return 3; if (grl >= 65) return 2; return 1; };
const getDefaultForm = (teamId) => {
  if(teamId === 'boca') return '4-4-2';
  if(teamId === 'river') return '4-2-3-1';
  if(teamId === 'racing') return '3-4-3';
  if(teamId === 'alianza') return '5-3-2';
  return '4-3-3'; 
};

const CornerSparks = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
    <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#F97316] blur-[100px] opacity-20"></div>
    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#F97316] blur-[100px] opacity-20"></div>
    <svg className="absolute top-0 left-0 w-48 h-48 text-[#F97316] opacity-30" viewBox="0 0 100 100" fill="none"><path d="M0,0 L40,0 L20,30 L50,30 L10,80 L25,45 L0,45 Z" fill="currentColor" opacity="0.5"/></svg>
    <svg className="absolute bottom-0 right-0 w-48 h-48 text-[#F97316] opacity-30 rotate-180" viewBox="0 0 100 100" fill="none"><path d="M0,0 L40,0 L20,30 L50,30 L10,80 L25,45 L0,45 Z" fill="currentColor" opacity="0.5"/></svg>
  </div>
);

export default function PartidoRapido({ onVolver }) {
  const [matchPhase, setMatchPhase] = useState('setup'); 
  const [step, setStep] = useState('select_teams'); 
  const [idxRed, setIdxRed] = useState(0); 
  const [idxBlue, setIdxBlue] = useState(1); 
  const [kitIdxRed, setKitIdxRed] = useState(0);
  const [kitIdxBlue, setKitIdxBlue] = useState(0);
  const [formRed, setFormRed] = useState(getDefaultForm(EQUIPOS_DATA[0].id));
  const [formBlue, setFormBlue] = useState(getDefaultForm(EQUIPOS_DATA[1].id));
  const [rosterRed, setRosterRed] = useState({ titulares: [...EQUIPOS_DATA[0].titulares], banca: [...EQUIPOS_DATA[0].suplentes] });
  const [rosterBlue, setRosterBlue] = useState({ titulares: [...EQUIPOS_DATA[1].titulares], banca: [...EQUIPOS_DATA[1].suplentes] });

  const teamRed = EQUIPOS_DATA[idxRed];
  const teamBlue = EQUIPOS_DATA[idxBlue];
  const statsRed = getStats(teamRed.grl);
  const statsBlue = getStats(teamBlue.grl);
  const kitCodeRed = getTeamKits(teamRed.name)[kitIdxRed]?.code || getTeamKits(teamRed.name)[0].code;
  const kitCodeBlue = getTeamKits(teamBlue.name)[kitIdxBlue]?.code || getTeamKits(teamBlue.name)[0].code;
  const selectTeamRed = index => {
    setIdxRed(index);
    setRosterRed({ titulares: [...EQUIPOS_DATA[index].titulares], banca: [...EQUIPOS_DATA[index].suplentes] });
    setFormRed(getDefaultForm(EQUIPOS_DATA[index].id));
    setKitIdxRed(0);
  };
  const selectTeamBlue = index => {
    setIdxBlue(index);
    setRosterBlue({ titulares: [...EQUIPOS_DATA[index].titulares], banca: [...EQUIPOS_DATA[index].suplentes] });
    setFormBlue(getDefaultForm(EQUIPOS_DATA[index].id));
    setKitIdxBlue(0);
  };
  const nextTeamRed = () => selectTeamRed((idxRed + 1) % EQUIPOS_DATA.length);
  const prevTeamRed = () => selectTeamRed((idxRed - 1 + EQUIPOS_DATA.length) % EQUIPOS_DATA.length);
  const nextTeamBlue = () => selectTeamBlue((idxBlue + 1) % EQUIPOS_DATA.length);
  const prevTeamBlue = () => selectTeamBlue((idxBlue - 1 + EQUIPOS_DATA.length) % EQUIPOS_DATA.length);
  const handleStartLoading = () => setMatchPhase('loading');
  const handleLoadingComplete = () => setMatchPhase('intro');
  const handleIntroComplete = () => setMatchPhase('playing');
  
  const handleExitMatch = () => {
    setMatchPhase('setup');
    setStep('select_teams');
  };

  const transitionVariants = { initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1, transition: { duration: 0.4 } }, exit: { opacity: 0, scale: 1.02, transition: { duration: 0.3 } } };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505] z-[200] flex flex-col font-sans text-white overflow-hidden selection:bg-[#F97316] selection:text-white">
      
      {matchPhase === 'setup' && (
        <div className="absolute inset-0 pointer-events-none flex overflow-hidden z-0">
          <div className="w-1/2 h-full relative overflow-hidden">
            <motion.div animate={{ backgroundColor: teamRed.colorGlow || '#F97316' }} transition={{ duration: 0.8 }} className="absolute inset-0 opacity-[0.03]"></motion.div>
            <AnimatePresence mode="wait"><motion.img key={idxRed} src={teamRed.img} initial={{ opacity: 0, scale: 1.2, x: '-60%' }} animate={{ opacity: 0.03, scale: 1.8, x: '-40%' }} exit={{ opacity: 0, scale: 1.2, x: '-60%' }} transition={{ duration: 0.6 }} className="absolute top-1/2 -translate-y-1/2 left-0 w-[120%] h-auto object-contain grayscale-[80%] mix-blend-screen" /></AnimatePresence>
          </div>
          <div className="w-1/2 h-full relative overflow-hidden">
            <motion.div animate={{ backgroundColor: teamBlue.colorGlow || '#3b82f6' }} transition={{ duration: 0.8 }} className="absolute inset-0 opacity-[0.03]"></motion.div>
            <AnimatePresence mode="wait"><motion.img key={idxBlue} src={teamBlue.img} initial={{ opacity: 0, scale: 1.2, x: '60%' }} animate={{ opacity: 0.03, scale: 1.8, x: '40%' }} exit={{ opacity: 0, scale: 1.2, x: '60%' }} transition={{ duration: 0.6 }} className="absolute top-1/2 -translate-y-1/2 right-0 w-[120%] h-auto object-contain grayscale-[80%] mix-blend-screen" /></AnimatePresence>
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#030303_100%)] opacity-80"></div>
        </div>
      )}

      {matchPhase === 'setup' && (step === 'select_teams' || step === 'select_kits') && <CornerSparks />}
      {matchPhase === 'setup' && (
        <div className="flex-1 w-full h-full overflow-y-auto relative z-10 custom-scrollbar-global">
          <AnimatePresence mode="wait">
            
            {step === 'select_teams' && (
              <motion.div key="select" variants={transitionVariants} initial="initial" animate="animate" exit="exit" className="w-full min-h-full flex flex-col relative px-6 py-12 md:py-16">
                <div className="w-full flex flex-col items-center justify-center shrink-0 mb-12 relative z-20">
                  <span className="text-[#F97316] font-black tracking-[0.4em] text-[8px] uppercase mb-2">Amistoso Global</span>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-white drop-shadow-2xl">Partido Rápido</h2>
                  <span className="text-[#F97316] font-black tracking-[0.4em] text-[8px] uppercase mt-2">Elige tu equipo</span>
                </div>

                <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1200px] mx-auto min-h-0 relative z-10 items-center justify-center">
                  <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 flex-col items-center justify-center">
                    <span className="text-4xl font-black italic text-white/40 tracking-tighter drop-shadow-2xl">VS</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center w-full px-4 mb-16 md:mb-0 relative z-10">
                    <span className="text-[#F97316] font-black tracking-[0.2em] text-[10px] italic uppercase mb-2">Local</span>
                    <AnimatePresence mode="wait"><motion.h3 key={idxRed} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white drop-shadow-xl text-center mb-6 h-10 flex items-center justify-center">{teamRed.name}</motion.h3></AnimatePresence>
                    <div className="flex items-center justify-center w-full gap-6 md:gap-12 mb-10">
                      <button onClick={prevTeamRed} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 hover:scale-110 transition-all outline-none group"><ChevronLeft size={20} className="text-white/50 group-hover:text-white" /></button>
                      <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                        <AnimatePresence mode="wait"><motion.img key={idxRed} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, y: [-10, 10, -10] }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.5, y: { repeat: Infinity, duration: 4 } }} src={teamRed.img} alt={teamRed.name} className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] relative z-10" /></AnimatePresence>
                        <motion.div animate={{ scale: [1, 0.8, 1], opacity: [0.6, 0.3, 0.6] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute -bottom-10 w-48 h-6 bg-black rounded-[100%] blur-[12px]" />
                      </div>
                      <button onClick={nextTeamRed} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 hover:scale-110 transition-all outline-none group"><ChevronRight size={20} className="text-white/50 group-hover:text-white" /></button>
                    </div>
                    <div className="flex items-center gap-1.5 mb-8">
                      {[...Array(5)].map((_, i) => { const isActive = i < getTruenos(teamRed.grl); return <Zap key={i} size={22} fill={isActive ? "currentColor" : "none"} className={isActive ? "text-[#F97316] drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" : "text-white/10"} />; })}
                    </div>
                    <div className="flex items-center justify-center gap-6 w-full">
                      <div className="flex flex-col items-center w-16"><span className="text-[9px] text-[#F97316] font-black uppercase tracking-widest mb-1">ATA</span><span className="text-3xl font-black text-white">{statsRed.ata}</span></div><span className="text-white/20 text-3xl font-light mb-1">|</span>
                      <div className="flex flex-col items-center w-16"><span className="text-[9px] text-[#F97316] font-black uppercase tracking-widest mb-1">MED</span><span className="text-3xl font-black text-white">{statsRed.med}</span></div><span className="text-white/20 text-3xl font-light mb-1">|</span>
                      <div className="flex flex-col items-center w-16"><span className="text-[9px] text-[#F97316] font-black uppercase tracking-widest mb-1">DEF</span><span className="text-3xl font-black text-white">{statsRed.def}</span></div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center w-full px-4 relative z-10 mt-16 md:mt-0">
                    <span className="text-[#3b82f6] font-black tracking-[0.2em] text-[10px] italic uppercase mb-2">Visitante</span>
                    <AnimatePresence mode="wait"><motion.h3 key={idxBlue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white drop-shadow-xl text-center mb-6 h-10 flex items-center justify-center">{teamBlue.name}</motion.h3></AnimatePresence>
                    <div className="flex items-center justify-center w-full gap-6 md:gap-12 mb-10">
                      <button onClick={prevTeamBlue} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 hover:scale-110 transition-all outline-none group"><ChevronLeft size={20} className="text-white/50 group-hover:text-white" /></button>
                      <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                        <AnimatePresence mode="wait"><motion.img key={idxBlue} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, y: [-10, 10, -10] }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.5, y: { repeat: Infinity, duration: 4 } }} src={teamBlue.img} alt={teamBlue.name} className="w-full h-full object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.9)] relative z-10" /></AnimatePresence>
                        <motion.div animate={{ scale: [1, 0.8, 1], opacity: [0.6, 0.3, 0.6] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute -bottom-10 w-48 h-6 bg-black rounded-[100%] blur-[12px]" />
                      </div>
                      <button onClick={nextTeamBlue} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 hover:scale-110 transition-all outline-none group"><ChevronRight size={20} className="text-white/50 group-hover:text-white" /></button>
                    </div>
                    <div className="flex items-center gap-1.5 mb-8">
                      {[...Array(5)].map((_, i) => { const isActive = i < getTruenos(teamBlue.grl); return <Zap key={i} size={22} fill={isActive ? "currentColor" : "none"} className={isActive ? "text-[#3b82f6] drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "text-white/10"} />; })}
                    </div>
                    <div className="flex items-center justify-center gap-6 w-full">
                      <div className="flex flex-col items-center w-16"><span className="text-[9px] text-[#3b82f6] font-black uppercase tracking-widest mb-1">ATA</span><span className="text-3xl font-black text-white">{statsBlue.ata}</span></div><span className="text-white/20 text-3xl font-light mb-1">|</span>
                      <div className="flex flex-col items-center w-16"><span className="text-[9px] text-[#3b82f6] font-black uppercase tracking-widest mb-1">MED</span><span className="text-3xl font-black text-white">{statsBlue.med}</span></div><span className="text-white/20 text-3xl font-light mb-1">|</span>
                      <div className="flex flex-col items-center w-16"><span className="text-[9px] text-[#3b82f6] font-black uppercase tracking-widest mb-1">DEF</span><span className="text-3xl font-black text-white">{statsBlue.def}</span></div>
                    </div>
                  </div>
                </div>

                <div className="w-full flex items-center justify-center gap-6 mt-16 pb-8 relative z-50">
                   <button onClick={onVolver} className="flex items-center gap-2 px-6 h-12 rounded-full border border-transparent text-white/50 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-all outline-none"><X size={14} /> Salir</button>
                   <button onClick={() => setStep('select_kits')} className="relative group px-16 h-12 overflow-hidden shadow-[0_10px_30px_rgba(249,115,22,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#F97316] to-[#ea580c] skew-x-[-20deg] scale-110 group-hover:bg-[#ea580c] transition-colors"></div>
                      <span className="relative z-10 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] text-black h-full w-full">Continuar <Play size={12} fill="currentColor" /></span>
                   </button>
                </div>
              </motion.div>
            )}

            {step === 'select_kits' && (
              <SeleccionKits 
                key="kits" teamRed={teamRed} teamBlue={teamBlue} 
                kitIdxRed={kitIdxRed} setKitIdxRed={setKitIdxRed} kitIdxBlue={kitIdxBlue} setKitIdxBlue={setKitIdxBlue}
                onVolver={() => setStep('select_teams')} onContinuar={() => setStep('management')}
              />
            )}

            {step === 'management' && (
              <PizarraTacticas 
                key="tactics" teamRed={teamRed} teamBlue={teamBlue} 
                kitCodeRed={kitCodeRed} kitCodeBlue={kitCodeBlue} 
                rosterRed={rosterRed} rosterBlue={rosterBlue} formRed={formRed} formBlue={formBlue}
                onVolver={() => setStep('select_kits')} onTacticas={() => setStep('edit_lineup')} 
                onJugar={handleStartLoading}                                   
              />
            )}

            {step === 'edit_lineup' && (
              <GestionAlineacion 
                rosterRed={rosterRed} setRosterRed={setRosterRed} formRed={formRed} setFormRed={setFormRed}
                kitCodeRed={kitCodeRed} teamRed={teamRed}
                rosterBlue={rosterBlue} setRosterBlue={setRosterBlue} formBlue={formBlue} setFormBlue={setFormBlue}
                kitCodeBlue={kitCodeBlue} teamBlue={teamBlue}
                onConfirm={() => setStep('management')} 
              />
            )}

          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {matchPhase === 'loading' && <CargaPartido onComplete={handleLoadingComplete} />}
      </AnimatePresence>

      <AnimatePresence>
        {matchPhase === 'intro' && <IntroPartido teamRed={teamRed} teamBlue={teamBlue} onComplete={handleIntroComplete} />}
      </AnimatePresence>

      <AnimatePresence>
        {matchPhase === 'playing' && (
          <CanchaPartido 
            teamRed={teamRed} 
            teamBlue={teamBlue} 
            kitCodeRed={kitCodeRed} 
            kitCodeBlue={kitCodeBlue} 
            onVolver={handleExitMatch} 
          />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar-global::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-global::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-global::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar-global:hover::-webkit-scrollbar-thumb { background: rgba(249, 115, 22, 0.4); }
      `}</style>
    </div>
  );
}