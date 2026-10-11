import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function IntroPartido({ teamRed, teamBlue, onComplete }) {
  
  useEffect(() => {
                                                                                        
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[10000] bg-[#030303] flex items-center justify-center overflow-hidden"
    >
                               
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#030303_100%)] opacity-80 z-0"></div>
      
                                     
      <motion.div 
        initial={{ x: '-100vw', opacity: 0, rotate: -20 }} 
        animate={{ x: 0, opacity: 1, rotate: 0 }} 
        transition={{ type: "spring", bounce: 0.3, duration: 1.2 }}
        className="absolute left-[10%] md:left-[15%] w-48 h-48 md:w-72 md:h-72 flex flex-col items-center"
      >
        <div className="absolute inset-0 bg-[#F97316] blur-[100px] opacity-30 rounded-full"></div>
        <img src={teamRed.img} alt={teamRed.name} className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]" />
        <motion.span 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
          className="text-[#F97316] font-black uppercase tracking-[0.3em] text-xs mt-6 bg-[#F97316]/10 px-4 py-1.5 rounded-full border border-[#F97316]/20"
        >
          {teamRed.name}
        </motion.span>
      </motion.div>

                                   
      <motion.div 
        initial={{ scale: 0, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: "spring", bounce: 0.6, duration: 1, delay: 0.5 }}
        className="relative z-20 flex flex-col items-center"
      >
        <span className="text-7xl md:text-9xl font-black italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">VS</span>
        <motion.span 
          animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[#F97316] font-black tracking-[0.5em] text-[10px] uppercase mt-6"
        >
          El partido está por comenzar
        </motion.span>
      </motion.div>

                                         
      <motion.div 
        initial={{ x: '100vw', opacity: 0, rotate: 20 }} 
        animate={{ x: 0, opacity: 1, rotate: 0 }} 
        transition={{ type: "spring", bounce: 0.3, duration: 1.2 }}
        className="absolute right-[10%] md:right-[15%] w-48 h-48 md:w-72 md:h-72 flex flex-col items-center"
      >
        <div className="absolute inset-0 bg-[#3b82f6] blur-[100px] opacity-30 rounded-full"></div>
        <img src={teamBlue.img} alt={teamBlue.name} className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]" />
        <motion.span 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
          className="text-[#3b82f6] font-black uppercase tracking-[0.3em] text-xs mt-6 bg-[#3b82f6]/10 px-4 py-1.5 rounded-full border border-[#3b82f6]/20"
        >
          {teamBlue.name}
        </motion.span>
      </motion.div>

    </motion.div>
  );
}