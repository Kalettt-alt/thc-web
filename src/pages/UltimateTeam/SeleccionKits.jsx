import { motion } from 'framer-motion';
import { ArrowLeft, Play, ChevronLeft, ChevronRight, Shirt } from 'lucide-react';

import { getTeamKits, parseKit } from './kitsData';

export const DynamicHaxAvatar = ({ kitCode, text, size = 200 }) => {
  const { angle, textColor, colors } = parseKit(kitCode);
  const cssAngle = angle + 90; 
  
  let background = colors[0];
  if (colors.length === 2) background = `linear-gradient(${cssAngle}deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  else if (colors.length === 3) background = `linear-gradient(${cssAngle}deg, ${colors[0]} 33.33%, ${colors[1]} 33.33% 66.66%, ${colors[2]} 66.66%)`;
  else if (colors.length === 4) background = `linear-gradient(${cssAngle}deg, ${colors[0]} 25%, ${colors[1]} 25% 50%, ${colors[2]} 50% 75%, ${colors[3]} 75%)`;

  return (
    <div className="rounded-full border-[6px] border-[#050505] flex items-center justify-center relative overflow-hidden shrink-0" style={{ width: size, height: size, background }}>
      <div className="absolute inset-0 rounded-full shadow-[inset_0_-12px_25px_rgba(0,0,0,0.6),inset_0_4px_12px_rgba(255,255,255,0.2)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
      <span className="font-black relative z-10 font-sans tracking-tighter" style={{ fontSize: size * 0.35, color: textColor, textShadow: '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0px 5px 10px rgba(0,0,0,0.6)' }}>
        {text}
      </span>
    </div>
  );
};

export default function SeleccionKits({ teamRed, teamBlue, kitIdxRed, setKitIdxRed, kitIdxBlue, setKitIdxBlue, onVolver, onContinuar }) {
  const kitsRed = getTeamKits(teamRed.name);
  const kitsBlue = getTeamKits(teamBlue.name);

  const nextKitRed = () => setKitIdxRed((prev) => (prev + 1) % kitsRed.length);
  const prevKitRed = () => setKitIdxRed((prev) => (prev - 1 + kitsRed.length) % kitsRed.length);
  const nextKitBlue = () => setKitIdxBlue((prev) => (prev + 1) % kitsBlue.length);
  const prevKitBlue = () => setKitIdxBlue((prev) => (prev - 1 + kitsBlue.length) % kitsBlue.length);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }} className="w-full min-h-full flex flex-col relative px-6 py-10">
      <div className="w-full flex flex-col items-center justify-center shrink-0 mb-16 relative z-20">
        <span className="text-white/20 font-black tracking-[0.4em] text-[7px] uppercase mb-2">Vestuario</span>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-white drop-shadow-2xl flex items-center gap-3">
          <Shirt className="text-[#F97316]" size={32} /> Equipaciones
        </h2>
        <span className="text-[#F97316] font-black tracking-[0.4em] text-[7px] uppercase mt-2">Selecciona la piel</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1000px] mx-auto min-h-0 relative z-10 items-center justify-center">
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 flex-col items-center justify-center">
          <span className="text-3xl font-black italic text-white/10 tracking-tighter drop-shadow-2xl" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.05)' }}>VS</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 mb-16 md:mb-0 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#F97316]/5 blur-[80px] rounded-full pointer-events-none z-0"></div>
          <div className="flex flex-col items-center mb-10 relative z-10">
            <span className="text-red-500 font-black tracking-[0.2em] text-[9px] uppercase mb-1">Local</span>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white drop-shadow-xl text-center h-10 flex items-center justify-center">{teamRed.name}</h3>
          </div>
          <div className="flex items-center justify-center w-full gap-8 mb-10 relative z-10">
            <button onClick={prevKitRed} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 transition-all outline-none group"><ChevronLeft size={20} className="text-white/30 group-hover:text-white" /></button>
            <div className="relative"><DynamicHaxAvatar kitCode={kitsRed[kitIdxRed].code} text={teamRed.star} size={240} /></div>
            <button onClick={nextKitRed} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 transition-all outline-none group"><ChevronRight size={20} className="text-white/30 group-hover:text-white" /></button>
          </div>
          <div className="border border-white/10 px-6 py-2 rounded-full relative z-10">
            <span className="text-white/70 font-black uppercase tracking-[0.2em] text-[9px]">{kitsRed[kitIdxRed].name}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 relative z-10 mt-16 md:mt-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#3b82f6]/5 blur-[80px] rounded-full pointer-events-none z-0"></div>
          <div className="flex flex-col items-center mb-10 relative z-10">
            <span className="text-[#3b82f6] font-black tracking-[0.2em] text-[9px] uppercase mb-1">Visitante</span>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white drop-shadow-xl text-center h-10 flex items-center justify-center">{teamBlue.name}</h3>
          </div>
          <div className="flex items-center justify-center w-full gap-8 mb-10 relative z-10">
            <button onClick={prevKitBlue} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 transition-all outline-none group"><ChevronLeft size={20} className="text-white/30 group-hover:text-white" /></button>
            <div className="relative"><DynamicHaxAvatar kitCode={kitsBlue[kitIdxBlue].code} text={teamBlue.star} size={240} /></div>
            <button onClick={nextKitBlue} className="w-10 h-10 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/5 transition-all outline-none group"><ChevronRight size={20} className="text-white/30 group-hover:text-white" /></button>
          </div>
          <div className="border border-white/10 px-6 py-2 rounded-full relative z-10">
            <span className="text-white/70 font-black uppercase tracking-[0.2em] text-[9px]">{kitsBlue[kitIdxBlue].name}</span>
          </div>
        </div>
      </div>

      <div className="w-full flex items-center justify-center gap-6 mt-16 pb-6 relative z-50">
          <button onClick={onVolver} className="flex items-center gap-3 px-8 h-12 rounded-full border border-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all outline-none">
            <ArrowLeft size={14} /> Equipos
          </button>
          <button onClick={onContinuar} className="relative group px-16 h-14 overflow-hidden shadow-[0_10px_30px_rgba(249,115,22,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F97316] to-[#ea580c] skew-x-[-20deg] scale-110 group-hover:bg-[#ea580c] transition-colors"></div>
            <span className="relative z-10 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] text-black h-full w-full">
              Ir a Pizarra <Play size={14} fill="currentColor" />
            </span>
          </button>
      </div>
    </motion.div>
  );
}