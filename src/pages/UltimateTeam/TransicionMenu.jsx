import { motion } from 'framer-motion';

export default function TransicionMenu() {
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex">
                                  
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: ['-100%', '0%', '100%'] }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], times: [0, 0.4, 1] }}
        className="absolute inset-0 bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.8)]"
      ></motion.div>
      
                                                 
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: ['-100%', '0%', '100%'] }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], times: [0, 0.5, 1], delay: 0.1 }}
        className="absolute inset-0 bg-[#F97316]"
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-black font-black text-6xl italic tracking-tighter opacity-50">THC</span>
        </div>
      </motion.div>
    </div>
  );
}