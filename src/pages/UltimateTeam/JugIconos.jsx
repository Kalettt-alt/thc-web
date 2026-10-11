import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../utils/supabase';

export default function JugIconos() {
  const [dbPlayers, setDbPlayers] = useState([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const { data, error } = await supabase.from('JugadoresUT').select('id, nombre, avatar').limit(10);
        if (error) throw error;
        if (data && data.length > 0) {
          setDbPlayers(data.map(p => ({ id: p.id, name: p.nombre || 'DESCONOCIDO', avatar: p.avatar || '??' })));
        } else {
          setDbPlayers([{ id: '00', name: "SIN DATOS", avatar: "TH" }]);
        }
      } catch {
        setDbPlayers([{ id: 'ERR', name: "ERROR BD", avatar: "XX" }]);
      } finally { setLoadingPlayers(false); }
    };
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (dbPlayers.length <= 1) return;
    const interval = setInterval(() => setPlayerIdx((prev) => (prev + 1) % dbPlayers.length), 5000);
    return () => clearInterval(interval);
  }, [dbPlayers.length]);

  const nextPlayer = () => setPlayerIdx((prev) => (prev + 1) % dbPlayers.length);
  const prevPlayer = () => setPlayerIdx((prev) => (prev - 1 + dbPlayers.length) % dbPlayers.length);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex-1 w-full h-full flex flex-col items-center justify-center relative min-h-[500px]"
    >
      <div className="absolute top-10 text-center">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic drop-shadow-2xl text-white">
          Leyendas de <span className="text-[#F97316]">THC</span>
        </h2>
        <p className="text-[#F97316] uppercase tracking-[0.4em] text-[10px] md:text-xs font-black mt-2 drop-shadow-md">
          Los pilares de la comunidad
        </p>
      </div>

      {loadingPlayers ? (
        <div className="w-12 h-12 border-[3px] border-white/10 border-t-[#F97316] rounded-full animate-spin mt-10"></div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full max-w-3xl relative mt-20">
          <AnimatePresence mode="wait">
            <motion.div 
              key={playerIdx} 
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }} 
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} 
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }} 
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center w-full"
            >
                                                                       
              <div className="relative w-40 h-40 md:w-56 md:h-56 mb-8 flex justify-center items-center">
                <div className="absolute inset-0 bg-[#F97316] blur-[60px] opacity-20 rounded-full"></div>
                <div className="w-full h-full rounded-full bg-[#080808] flex items-center justify-center relative z-10 border border-[#F97316]/10">
                  <span className="text-6xl md:text-[6rem] font-black text-white/90 drop-shadow-lg">
                    {dbPlayers[playerIdx]?.avatar}
                  </span>
                </div>
              </div>
              
              <h4 className="text-4xl md:text-5xl font-black uppercase tracking-tighter truncate w-full px-4 text-white mb-4">
                {dbPlayers[playerIdx]?.name}
              </h4>
              <span className="text-[#050505] text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] bg-[#F97316] px-5 py-2 shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                Jugador Destacado
              </span>
            </motion.div>
          </AnimatePresence>

                                                      
          <div className="absolute top-1/2 -translate-y-1/2 w-[90%] md:w-[120%] flex justify-between px-2 pointer-events-none">
            <button onClick={prevPlayer} className="pointer-events-auto p-4 rounded-full border border-white/5 text-white/30 hover:text-white hover:border-white/20 transition-all bg-black/20"><ChevronLeft className="w-6 h-6" /></button>
            <button onClick={nextPlayer} className="pointer-events-auto p-4 rounded-full border border-white/5 text-white/30 hover:text-white hover:border-white/20 transition-all bg-black/20"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>
      )}
    </motion.div>
  );
}