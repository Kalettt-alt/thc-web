import { motion } from 'framer-motion';
import { ArrowLeft, Play, Layout, Swords, Activity, TrendingUp } from 'lucide-react';
import { DynamicHaxAvatar } from './SeleccionKits';
import { FORMATIONS, getEffectiveGrl } from './formationsUT'; 

export default function PizarraTacticas({ teamRed, teamBlue, kitCodeRed, kitCodeBlue, rosterRed, rosterBlue, formRed, formBlue, onVolver, onJugar, onTacticas }) {
  const coordsRed = FORMATIONS[formRed];
  const coordsBlue = FORMATIONS[formBlue];
  const teamGrlRed = Math.round(rosterRed.titulares.reduce((acc, p, i) => acc + getEffectiveGrl(p.pos, coordsRed[i].pos, p.grl), 0) / 11);
  const teamGrlBlue = Math.round(rosterBlue.titulares.reduce((acc, p, i) => acc + getEffectiveGrl(p.pos, coordsBlue[i].pos, p.grl), 0) / 11);
  const diff = teamGrlRed - teamGrlBlue;
  let probRed = 50 + (diff * 2.5);
  probRed = Math.max(15, Math.min(85, probRed)); 
  const probBlue = 100 - probRed;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full min-h-full flex flex-col relative z-10 p-6 md:p-8 max-w-[1600px] mx-auto">
      
      <div className="w-full flex flex-col items-center justify-center mb-8 shrink-0 relative z-20">
        <div className="flex items-center gap-4 mb-4">
          <Activity size={18} className="text-[#F97316] animate-pulse" />
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Pizarra Táctica</h2>
          <TrendingUp size={18} className="text-[#3b82f6] animate-pulse" />
        </div>
        
                                     
        <div className="w-full max-w-[600px] flex flex-col items-center">
          <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Probabilidad de Victoria Est.</span>
          <div className="w-full flex items-center gap-4">
            <span className="text-[#F97316] font-black text-sm w-12 text-right">{probRed.toFixed(0)}%</span>
            <div className="flex-1 h-2.5 bg-[#111] rounded-full overflow-hidden flex shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] border border-white/5">
              <motion.div initial={{ width: '50%' }} animate={{ width: `${probRed}%` }} transition={{ duration: 1.5, ease: "easeInOut" }} className="h-full bg-gradient-to-r from-[#F97316] to-[#ea580c] relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
              </motion.div>
              <motion.div initial={{ width: '50%' }} animate={{ width: `${probBlue}%` }} transition={{ duration: 1.5, ease: "easeInOut" }} className="h-full bg-gradient-to-l from-[#3b82f6] to-[#2563eb] relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
              </motion.div>
            </div>
            <span className="text-[#3b82f6] font-black text-sm w-12 text-left">{probBlue.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex w-full min-h-0 relative z-10 gap-6">
        
        <div className="w-[300px] bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col items-center py-10 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-[#F97316] shadow-[0_0_20px_#ea580c]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#F97316]/5 blur-[80px] rounded-full pointer-events-none z-0"></div>
          
          <img src={teamRed.img} className="w-16 h-16 object-contain drop-shadow-xl mb-4 relative z-10" alt="Local" />
          <span className="text-red-500 font-black tracking-[0.3em] text-[10px] uppercase bg-red-500/10 px-4 py-1 rounded-full border border-red-500/20 mb-2 relative z-10">Local</span>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white text-center px-4 relative z-10">{teamRed.name}</h3>

          <div className="mt-8 mb-6 flex flex-col items-center relative z-10 w-full">
            <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em]">GRL Global</span>
            <div className="relative flex items-center justify-center h-32 w-full mt-2">
              <span className="text-[120px] font-black text-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">{teamGrlRed}</span>
              <span className="text-[80px] font-black text-[#F97316] drop-shadow-[0_0_25px_rgba(249,115,22,0.6)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">{teamGrlRed}</span>
            </div>
            <div className="bg-[#111] px-5 py-1.5 rounded-full border border-white/10 mt-2 shadow-inner">
               <span className="text-[#F97316] text-[11px] font-black uppercase tracking-widest">{formRed}</span>
            </div>
          </div>

          <div className="mt-auto flex flex-col items-center relative z-10 w-full px-6">
            <DynamicHaxAvatar kitCode={kitCodeRed} text={teamRed.star} size={150} />
            <div className="mt-6 bg-[#050505] w-full py-3 rounded-2xl border border-white/10 flex flex-col items-center shadow-lg relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F97316]/5 to-transparent"></div>
               <span className="text-[#F97316] text-[8px] font-black uppercase tracking-[0.4em] mb-1 relative z-10">Jugador Clave</span>
               <span className="text-xl font-black text-white uppercase tracking-tight relative z-10">{teamRed.star}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] shadow-2xl flex min-h-0 relative overflow-hidden">
           
           <div className="flex-1 flex flex-col min-h-0 p-8 border-r border-white/5">
              <span className="text-[#F97316] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></div> 11 Titular</span>
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 pr-2">
                {rosterRed.titulares.map((p, i) => {
                  const effGrl = getEffectiveGrl(p.pos, coordsRed[i].pos, p.grl);
                  const isOutPos = effGrl < p.grl;
                  
                  return (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={i} className="flex items-center justify-between bg-[#111]/80 border-l-[3px] border-[#F97316] border-y border-r border-white/5 rounded-r-xl px-4 py-3 hover:bg-white/5 transition-colors group relative overflow-hidden">
                      {isOutPos && <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>}
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-inner ${isOutPos ? 'bg-[#1a0505] border-red-500/50' : 'bg-[#050505] border-[#22c55e]/30'}`}>
                           <span className={`text-[11px] font-black ${isOutPos ? 'text-red-500' : 'text-[#22c55e]'}`}>{effGrl}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className={`text-sm font-black uppercase tracking-tight ${p.name.includes(teamRed.star) ? 'text-[#F97316] drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'text-white/90'}`}>{p.name}</span>
                           {isOutPos && <span className="text-[8px] font-bold text-red-500/80 uppercase tracking-widest mt-0.5">Original: {p.pos}</span>}
                        </div>
                      </div>
                      <div className="bg-black/50 px-3 py-1.5 rounded-md border border-white/5 relative z-10">
                         <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{coordsRed[i].pos}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
           </div>

           <div className="flex-1 flex flex-col min-h-0 p-8">
              <span className="text-[#3b82f6] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center justify-end gap-2 text-right">11 Titular <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div></span>
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 pl-2">
                {rosterBlue.titulares.map((p, i) => {
                  const effGrl = getEffectiveGrl(p.pos, coordsBlue[i].pos, p.grl);
                  const isOutPos = effGrl < p.grl;

                  return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={i} className="flex items-center justify-between flex-row-reverse bg-[#111]/80 border-r-[3px] border-[#3b82f6] border-y border-l border-white/5 rounded-l-xl px-4 py-3 hover:bg-white/5 transition-colors group relative overflow-hidden">
                      {isOutPos && <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>}
                      <div className="flex items-center gap-4 flex-row-reverse relative z-10">
                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-inner ${isOutPos ? 'bg-[#1a0505] border-red-500/50' : 'bg-[#050505] border-[#22c55e]/30'}`}>
                           <span className={`text-[11px] font-black ${isOutPos ? 'text-red-500' : 'text-[#22c55e]'}`}>{effGrl}</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className={`text-sm font-black uppercase tracking-tight ${p.name.includes(teamBlue.star) ? 'text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-white/90'}`}>{p.name}</span>
                           {isOutPos && <span className="text-[8px] font-bold text-red-500/80 uppercase tracking-widest mt-0.5">Original: {p.pos}</span>}
                        </div>
                      </div>
                      <div className="bg-black/50 px-3 py-1.5 rounded-md border border-white/5 relative z-10">
                         <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{coordsBlue[i].pos}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
           </div>
        </div>

        <div className="w-[300px] bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col items-center py-10 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-[#3b82f6] shadow-[0_0_20px_#2563eb]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#3b82f6]/5 blur-[80px] rounded-full pointer-events-none z-0"></div>
          
          <img src={teamBlue.img} className="w-16 h-16 object-contain drop-shadow-xl mb-4 relative z-10" alt="Visitante" />
          <span className="text-blue-500 font-black tracking-[0.3em] text-[10px] uppercase bg-blue-500/10 px-4 py-1 rounded-full border border-blue-500/20 mb-2 relative z-10">Visitante</span>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white text-center px-4 relative z-10">{teamBlue.name}</h3>

                              
          <div className="mt-8 mb-6 flex flex-col items-center relative z-10 w-full">
            <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em]">GRL Global</span>
            <div className="relative flex items-center justify-center h-32 w-full mt-2">
              <span className="text-[120px] font-black text-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">{teamGrlBlue}</span>
              <span className="text-[80px] font-black text-[#3b82f6] drop-shadow-[0_0_25px_rgba(59,130,246,0.6)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">{teamGrlBlue}</span>
            </div>
            <div className="bg-[#111] px-5 py-1.5 rounded-full border border-white/10 mt-2 shadow-inner">
               <span className="text-[#3b82f6] text-[11px] font-black uppercase tracking-widest">{formBlue}</span>
            </div>
          </div>

          <div className="mt-auto flex flex-col items-center relative z-10 w-full px-6">
            <DynamicHaxAvatar kitCode={kitCodeBlue} text={teamBlue.star} size={150} />
            <div className="mt-6 bg-[#050505] w-full py-3 rounded-2xl border border-white/10 flex flex-col items-center shadow-lg relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3b82f6]/5 to-transparent"></div>
               <span className="text-[#3b82f6] text-[8px] font-black uppercase tracking-[0.4em] mb-1 relative z-10">Jugador Clave</span>
               <span className="text-xl font-black text-white uppercase tracking-tight relative z-10">{teamBlue.star}</span>
            </div>
          </div>
        </div>

      </div>

      <div className="w-full flex items-center justify-center mt-8 shrink-0 relative z-20 gap-6">
        <button onClick={onVolver} className="flex items-center justify-center gap-3 w-40 h-14 rounded-full border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-[0.2em] bg-[#111] hover:bg-white/10 hover:text-white transition-all group outline-none shadow-lg">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Volver
        </button>

        <button onClick={onTacticas} className="flex items-center justify-center gap-3 w-48 h-14 rounded-full border border-[#F97316]/50 text-[#F97316] text-[10px] font-black uppercase tracking-[0.2em] bg-[#F97316]/10 hover:bg-[#F97316]/20 transition-all outline-none shadow-[0_0_15px_rgba(249,115,22,0.2)]">
          <Layout size={14} /> Editar Táctica
        </button>

        <button onClick={onJugar} className="w-80 h-14 flex items-center justify-center gap-4 bg-gradient-to-r from-[#F97316] to-[#ea580c] text-black rounded-full font-black uppercase tracking-[0.3em] text-[12px] hover:scale-[1.02] transition-transform shadow-[0_15px_30px_rgba(249,115,22,0.4)] outline-none relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <Swords size={16} className="relative z-10" /> <span className="relative z-10">Al Campo</span> <Play size={14} fill="currentColor" className="relative z-10" />
        </button>
      </div>

    </motion.div>
  );
}