import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Repeat, X, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { DynamicHaxAvatar } from './SeleccionKits'; 

import { FORMATIONS, getEffectiveGrl } from './formationsUT';

const TeamEditorPanel = ({ teamCode, teamData, kitCode, roster, form, setForm, selectedSlot, handleSelect, isLocal }) => {
  const coords = FORMATIONS[form];
  const colorTema = isLocal ? '#F97316' : '#3B82F6';
  const teamGrl = Math.round(roster.titulares.reduce((acc, p, i) => acc + getEffectiveGrl(p.pos, coords[i].pos, p.grl), 0) / 11);

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A]/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-2xl relative group hover:border-white/10 transition-colors h-full">
      
      <div className="flex items-center justify-between mb-8 relative z-10 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <DynamicHaxAvatar kitCode={kitCode} text="" size={50} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 drop-shadow-md" style={{ color: colorTema }}>{isLocal ? 'Local' : 'Visitante'}</span>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white leading-none truncate max-w-[200px] md:max-w-full">{teamData.name}</h3>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">GRL Táctico</span>
            <span className="text-3xl font-black text-white">{teamGrl}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-8 relative z-10 w-full h-full">
        
        <div className="w-full xl:w-[45%] relative border-2 border-white/20 rounded-2xl overflow-hidden bg-[#9c9a97] shadow-[inset_0_0_50px_rgba(0,0,0,0.3)] shrink-0" style={{ minHeight: '600px' }}>
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10%, #000 10%, #000 20%)' }}></div>
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/50"></div> 
          <div className="absolute top-0 left-1/2 w-40 h-40 border-2 border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2"></div> 
          <div className="absolute bottom-0 left-1/2 w-[60%] h-[20%] border-x-2 border-t-2 border-white/50 -translate-x-1/2"></div> 
          <div className="absolute bottom-0 left-1/2 w-[25%] h-[6%] border-x-2 border-t-2 border-white/50 -translate-x-1/2"></div> 
          <div className="absolute bottom-[20%] left-1/2 w-20 h-20 border-2 border-white/50 rounded-full -translate-x-1/2 translate-y-1/2" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}></div>
          
          {coords.map((c, i) => {
            const player = roster.titulares[i];
            const effGrl = getEffectiveGrl(player.pos, c.pos, player.grl);
            const isSelected = selectedSlot?.team === teamCode && selectedSlot?.type === 'titulares' && selectedSlot?.index === i;
            const isOutPos = effGrl < player.grl;
            let color = effGrl >= player.grl ? 'text-[#22c55e]' : effGrl >= player.grl - 2 ? 'text-yellow-400' : 'text-red-500';
            
            return (
              <motion.div 
                key={i} 
                onClick={() => handleSelect(teamCode, 'titulares', i)} 
                whileHover={{ scale: 1.15, zIndex: 30 }}
                className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer ${isSelected ? 'z-40' : 'z-10'}`} 
                style={{ top: `${c.y}%`, left: `${c.x}%` }}
              >
                {isSelected && (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute w-14 h-14 rounded-full border-[3px] border-dashed border-[#F97316] opacity-90 shadow-[0_0_10px_#F97316]" />
                )}

                <div className={`w-9 h-9 rounded-full border-[3px] bg-[#111] flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.6)] transition-colors ${isSelected ? 'border-[#F97316] bg-[#2a1308]' : isOutPos ? 'border-red-500/80' : 'border-white/30'}`}>
                  <span className={`text-[12px] font-black ${color} drop-shadow-md`}>{effGrl}</span>
                </div>
                
                <div className={`mt-1.5 px-3 py-1 rounded border backdrop-blur-md max-w-[80px] truncate shadow-[0_5px_15px_rgba(0,0,0,0.5)] transition-colors ${isSelected ? 'bg-[#F97316] text-black border-[#F97316]' : 'bg-[#050505]/95 text-white border-white/10'}`}>
                   <span className="text-[9px] font-black uppercase tracking-tight block truncate text-center">{player.name}</span>
                </div>
                
                <div className="flex items-center gap-1 mt-1 bg-black/80 px-2.5 py-0.5 rounded-full border border-white/10 shadow-md">
                   {isOutPos && <ShieldAlert size={8} className="text-red-500" />}
                   <span className="text-[8px] font-black text-white drop-shadow-md">{c.pos}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="w-full xl:w-[55%] flex flex-col h-full">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4 shrink-0">
            <span className="text-white/30 font-black text-[9px] uppercase tracking-widest">Alineación</span>
            <select value={form} onChange={(e) => setForm(e.target.value)} className="bg-[#111] text-white font-black text-sm outline-none border border-white/20 rounded-lg px-4 py-2 cursor-pointer shadow-inner">
              {Object.keys(FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          
          <span className="text-white/30 font-black text-[9px] uppercase tracking-widest mb-3 shrink-0 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div> Banca de Suplentes</span>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 pr-2">
            {roster.banca.map((p, i) => {
              const isSelected = selectedSlot?.team === teamCode && selectedSlot?.type === 'banca' && selectedSlot?.index === i;
              return (
                <motion.div 
                  key={i} 
                  onClick={() => handleSelect(teamCode, 'banca', i)} 
                  whileHover={{ x: 4 }}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden group ${isSelected ? 'bg-[#F97316]/10 border-[#F97316] shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'bg-[#111] border-white/5 hover:border-white/20 hover:bg-[#1a1a1a]'}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F97316]"></div>}
                  
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-8 flex items-center justify-center">
                      <span className="text-[10px] font-black text-white/40 uppercase">{p.pos}</span>
                    </div>
                    <div className="w-[1px] h-6 bg-white/10"></div>
                    <span className={`text-xs md:text-sm font-black uppercase tracking-tight ${isSelected ? 'text-[#F97316] drop-shadow-md' : 'text-white/90 group-hover:text-white'}`}>{p.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="flex flex-col items-end leading-none">
                      <span className="text-[7px] text-white/30 uppercase font-black tracking-widest mb-1">Stamina</span>
                      <span className="text-[11px] text-[#22c55e] font-black">{p.stamina || 100}%</span>
                    </div>
                    <div className={`w-10 h-10 rounded-full border-[2px] flex items-center justify-center shadow-inner transition-colors ${isSelected ? 'border-[#F97316] bg-[#2a1308]' : 'border-white/10 bg-[#050505]'}`}>
                      <span className={`text-[12px] font-black ${isSelected ? 'text-[#F97316]' : 'text-white'}`}>{p.grl}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function GestionAlineacion({ rosterRed, setRosterRed, formRed, setFormRed, kitCodeRed, teamRed, rosterBlue, setRosterBlue, formBlue, setFormBlue, kitCodeBlue, teamBlue, onConfirm }) {
  const [selectedSlot, setSelectedSlot] = useState(null); 

  const handleSelect = (team, type, index) => {
    if (!selectedSlot) {
      setSelectedSlot({ team, type, index });
    } else {
      if (selectedSlot.team === team) {
        const source = team === 'red' ? rosterRed : rosterBlue;
        const newRoster = { ...source, titulares: [...source.titulares], banca: [...source.banca] };
        const setRoster = team === 'red' ? setRosterRed : setRosterBlue;
        const item1 = newRoster[selectedSlot.type][selectedSlot.index];
        const item2 = newRoster[type][index];
        newRoster[selectedSlot.type][selectedSlot.index] = item2;
        newRoster[type][index] = item1;
        setRoster(newRoster);
      }
      setSelectedSlot(null);
    }
  };

  const selectedPlayer = selectedSlot?.team === 'red' 
    ? rosterRed[selectedSlot.type][selectedSlot.index] 
    : selectedSlot?.team === 'blue' 
      ? rosterBlue[selectedSlot.type][selectedSlot.index] 
      : null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }} className="w-full min-h-screen flex flex-col relative px-6 py-8 max-w-[1800px] mx-auto z-20 pb-40">
      
      <div className="w-full flex flex-col md:flex-row justify-between items-center mb-10 shrink-0 gap-6 border-b border-white/10 pb-6">
        <div className="flex flex-col text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic text-white flex items-center justify-center md:justify-start gap-4">
            Editor de Plantilla <Repeat size={28} className="text-[#F97316]"/>
          </h2>
          <span className="text-white/40 font-black tracking-[0.2em] text-[10px] uppercase mt-1">Configura tu táctica y realiza los cambios necesarios</span>
        </div>
        <button onClick={onConfirm} className="relative group px-12 h-14 overflow-hidden shadow-[0_10px_30px_rgba(255,255,255,0.1)] rounded-full outline-none">
          <div className="absolute inset-0 bg-white group-hover:bg-[#F97316] transition-colors duration-300"></div>
          <span className="relative z-10 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] text-black h-full w-full group-hover:text-white transition-colors">
            Confirmar y Volver <Check size={16} />
          </span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 w-full h-auto">
        <TeamEditorPanel teamCode="red" teamData={teamRed} kitCode={kitCodeRed} roster={rosterRed} form={formRed} setForm={setFormRed} selectedSlot={selectedSlot} handleSelect={handleSelect} isLocal={true} />
        <TeamEditorPanel teamCode="blue" teamData={teamBlue} kitCode={kitCodeBlue} roster={rosterBlue} form={formBlue} setForm={setFormBlue} selectedSlot={selectedSlot} handleSelect={handleSelect} isLocal={false} />
      </div>

      <AnimatePresence>
        {selectedPlayer && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} transition={{ type: "spring", bounce: 0.4 }} 
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[500px]"
          >
            <div className="bg-[#050505]/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-[0_30px_60px_rgba(0,0,0,0.9)] flex items-center justify-between overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F97316] to-transparent animate-pulse"></div>
               
               <div className="flex items-center gap-5">
                 <div className="w-14 h-14 rounded-full border-2 border-white/10 bg-[#111] flex items-center justify-center shadow-inner shrink-0 relative">
                   <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#ea580c]"></span></span>
                   <span className="text-lg font-black text-white">{selectedPlayer.grl}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-[#F97316] font-black uppercase tracking-widest mb-0.5">Listo para cambio</span>
                    <span className="text-xl font-black text-white uppercase tracking-tight leading-none">{selectedPlayer.name}</span>
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Posición Natural: {selectedPlayer.pos}</span>
                 </div>
               </div>

               <div className="flex items-center gap-4 border-l border-white/10 pl-6 ml-2">
                 <div className="flex flex-col items-center justify-center animate-pulse opacity-60">
                    <ArrowRightLeft size={24} className="text-white mb-1" />
                    <span className="text-[7px] text-white uppercase font-black tracking-widest text-center">Elige un<br/>reemplazo</span>
                 </div>
                 <button onClick={() => setSelectedSlot(null)} className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors outline-none shrink-0"><X size={16}/></button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}