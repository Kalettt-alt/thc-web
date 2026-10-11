import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FixtureDF({ fixture, jornadaActual, ligaEquipos, club, nombreLiga, getImg }) {
  const [jornadaVista, setJornadaVista] = useState(jornadaActual);

  const irAnterior = () => { if (jornadaVista > 0) setJornadaVista(jornadaVista - 1); };
  const irSiguiente = () => { if (jornadaVista < fixture.length - 1) setJornadaVista(jornadaVista + 1); };

  const partidos = fixture[jornadaVista] || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto w-full flex flex-col gap-8 pb-12">
      
                                                  
      <div className="bg-[#050505] border-[2px] border-[#111] rounded-none p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-end shadow-2xl relative overflow-hidden gap-8">
        
        <div className="flex flex-col relative z-10 w-full md:w-auto">
          <span className="text-[#F47A20] font-black text-sm md:text-base tracking-[0.4em] uppercase mb-2">CALENDARIO OFICIAL</span>
          <h3 className="font-black text-5xl md:text-[80px] uppercase tracking-tighter italic text-white leading-none">{nombreLiga}</h3>
        </div>

                                    
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <button onClick={irAnterior} disabled={jornadaVista === 0} className="w-16 h-16 bg-[#111] hover:bg-[#F47A20] hover:text-[#060606] text-[#666] font-black text-2xl disabled:opacity-20 disabled:hover:bg-[#111] disabled:hover:text-[#666] transition-colors">
            &lt;
          </button>
          
          <div className="flex flex-col items-center min-w-[160px] text-center">
            <span className="text-white font-black text-3xl md:text-4xl uppercase tracking-tighter italic leading-none">FECHA {jornadaVista + 1}</span>
            <span className="text-[#F47A20] text-[10px] md:text-xs uppercase tracking-[0.3em] font-black mt-2">
              {jornadaVista === jornadaActual ? 'ACTUAL' : jornadaVista < jornadaActual ? 'DISPUTADA' : 'PENDIENTE'}
            </span>
          </div>

          <button onClick={irSiguiente} disabled={jornadaVista === fixture.length - 1} className="w-16 h-16 bg-[#111] hover:bg-[#F47A20] hover:text-[#060606] text-[#666] font-black text-2xl disabled:opacity-20 disabled:hover:bg-[#111] disabled:hover:text-[#666] transition-colors">
            &gt;
          </button>
        </div>
      </div>

                                  
      <div className="flex flex-col gap-4">
        {partidos.map((p, idx) => {
          const esMiPartido = p.local === club.id || p.visitante === club.id;
          const locObj = ligaEquipos.find(e => e.id === p.local);
          const visObj = ligaEquipos.find(e => e.id === p.visitante);
          
          return (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={idx} 
              className={`bg-[#0A0A0A] border-[2px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all group ${
                esMiPartido 
                  ? 'border-[#F47A20]/80 bg-[#111] shadow-[0_0_40px_rgba(244,122,32,0.1)] relative overflow-hidden' 
                  : 'border-[#1A1A1A] hover:bg-[#0F0F0F] hover:border-[#333]'
              }`}
            >
              {esMiPartido && <div className="absolute top-0 left-0 w-2 h-full bg-[#F47A20]"></div>}

                                                     
              <div className="w-full md:w-[150px] flex justify-between md:justify-start items-center border-b md:border-b-0 border-[#222] pb-4 md:pb-0 md:pl-4">
                {esMiPartido ? (
                   <span className="text-[#F47A20] text-xs md:text-sm font-black uppercase tracking-[0.3em]">TU CLUB</span>
                ) : (
                   <span className="text-[#444] text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">FECHA {jornadaVista + 1}</span>
                )}
              </div>
              
                                                
              <div className="flex-1 flex items-center justify-center w-full gap-4 md:gap-12">
                
                             
                <div className="flex-1 flex items-center justify-end gap-4 md:gap-6">
                  <span className={`font-black text-xl md:text-4xl italic uppercase tracking-tighter truncate ${esMiPartido && p.local === club.id ? 'text-white' : 'text-[#888]'}`}>
                    {locObj?.name}
                  </span>
                  {locObj?.img ? <img src={getImg(locObj.img)} className={`w-12 h-12 md:w-16 md:h-16 object-contain ${esMiPartido && p.local === club.id ? '' : 'grayscale opacity-50'}`} alt=""/> : <div className="text-[#333] font-black italic text-3xl">FC</div>}
                </div>

                                     
                <div className="shrink-0 w-[100px] md:w-[140px] flex justify-center">
                  {p.jugado ? (
                    <div className="bg-[#050505] border-[2px] border-[#222] px-6 py-3 md:px-8 md:py-4 flex items-center justify-center gap-3">
                      <span className={`font-black text-2xl md:text-4xl leading-none ${p.gl > p.gv ? "text-[#F47A20]" : "text-white"}`}>{p.gl}</span>
                      <span className="text-[#444] text-xl font-black">-</span>
                      <span className={`font-black text-2xl md:text-4xl leading-none ${p.gv > p.gl ? "text-[#F47A20]" : "text-white"}`}>{p.gv}</span>
                    </div>
                  ) : (
                    <span className="text-[#333] font-black text-3xl md:text-5xl uppercase italic tracking-tighter">VS</span>
                  )}
                </div>

                                 
                <div className="flex-1 flex items-center justify-start gap-4 md:gap-6">
                  {visObj?.img ? <img src={getImg(visObj.img)} className={`w-12 h-12 md:w-16 md:h-16 object-contain ${esMiPartido && p.visitante === club.id ? '' : 'grayscale opacity-50'}`} alt=""/> : <div className="text-[#333] font-black italic text-3xl">FC</div>}
                  <span className={`font-black text-xl md:text-4xl italic uppercase tracking-tighter truncate ${esMiPartido && p.visitante === club.id ? 'text-white' : 'text-[#888]'}`}>
                    {visObj?.name}
                  </span>
                </div>
              </div>

                                            
              <div className="w-full md:w-[150px] flex justify-center md:justify-end shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-[#222]">
                {p.jugado ? (
                  <span className="bg-[#EBEBEB] text-[#050505] px-4 py-2 font-black uppercase text-[10px] md:text-xs tracking-[0.3em]">FINALIZADO</span>
                ) : (
                  <span className="text-[#555] font-black uppercase text-[10px] md:text-xs tracking-[0.3em]">PENDIENTE</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}