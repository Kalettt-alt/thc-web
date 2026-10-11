import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const imageModules = import.meta.glob('./Imag/*.png', { eager: true });
const getImg = (imgPath) => {
  if (!imgPath) return '';
  const relativePath = imgPath.replace('/Imag/', './Imag/');
  return imageModules[relativePath]?.default || imgPath;
};

const FIRMAS_SVG = [
  <svg viewBox="0 0 200 80" className="absolute inset-0 w-full h-full pointer-events-none -mt-4">
    <motion.path d="M 20 60 C 40 10, 50 10, 70 50 S 90 80, 110 30 S 140 10, 180 50" fill="transparent" stroke="#001489" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
    <motion.path d="M 30 75 L 160 40" fill="transparent" stroke="#001489" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }} />
  </svg>,
  <svg viewBox="0 0 200 80" className="absolute inset-0 w-full h-full pointer-events-none -mt-4">
    <motion.path d="M 10 50 L 30 20 L 40 60 L 60 10 L 80 50 C 100 20, 120 70, 150 40 L 180 20" fill="transparent" stroke="#000044" strokeWidth="2" strokeLinejoin="bevel" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
    <motion.path d="M 40 70 C 80 80, 120 80, 160 60" fill="transparent" stroke="#000044" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 0.5 }} />
  </svg>,
  <svg viewBox="0 0 200 80" className="absolute inset-0 w-full h-full pointer-events-none -mt-4">
    <motion.path d="M 30 40 C 30 10, 70 10, 70 40 C 70 70, 50 70, 50 50 C 50 20, 150 20, 170 60" fill="transparent" stroke="#0a1b5c" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }} />
  </svg>,
  <svg viewBox="0 0 200 80" className="absolute inset-0 w-full h-full pointer-events-none -mt-4">
    <motion.path d="M 10 40 Q 20 20 30 40 T 50 40 T 70 40 T 90 40 T 110 40 T 130 40 T 150 40 L 180 10" fill="transparent" stroke="#001489" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: "linear" }} />
    <motion.circle cx="185" cy="15" r="2" fill="#001489" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} />
  </svg>
];

export default function FirmaContratoDF({ club, apodo, onFirmado }) {
  const [fase, setFase] = useState('intro_jefe'); 
  const [firmaIndex] = useState(() => Math.floor(Math.random() * FIRMAS_SVG.length));

  useEffect(() => {

    const t1 = setTimeout(() => setFase('dialogo'), 2000);
    const t2 = setTimeout(() => setFase('entregando'), 4000);
    const t3 = setTimeout(() => setFase('leyendo'), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const ejecutarFirma = () => {
    if (fase !== 'leyendo') return;
    setFase('firmando');
    
    setTimeout(() => {
      setFase('aprobado');
      setTimeout(() => {
        setFase('fin');
        setTimeout(onFirmado, 1000); 
      }, 2500);
    }, 1500); 
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020202] flex flex-col justify-between font-sans overflow-hidden" style={{ perspective: "1200px" }}>
      
      <div className="absolute top-0 w-full h-[60%] bg-[#020202] flex flex-col items-center justify-start z-0">
        <div className="absolute top-10 w-[70%] h-[80%] bg-gradient-to-b from-[#1a202c] to-transparent blur-[80px] opacity-40"></div>
        
        <motion.div 
          animate={fase === 'entregando' ? { scale: 1.05, y: 10 } : { scale: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute top-[15%] flex flex-col items-center pointer-events-none"
        >
          <div className="w-20 h-28 bg-[#050505] rounded-[40%] blur-[2px] shadow-[0_0_40px_rgba(255,255,255,0.05)] z-10"></div>
          <div className="w-72 h-32 bg-[#050505] rounded-t-[100px] -mt-6 blur-[3px] shadow-[0_0_50px_rgba(255,255,255,0.02)] z-10"></div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 w-full h-[45%] bg-gradient-to-b from-[#0a0a0a] to-[#000] border-t-2 border-[#111] z-10 shadow-[inset_0_50px_100px_rgba(0,0,0,0.9)]" style={{ transform: "rotateX(20deg)", transformOrigin: "bottom" }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,122,32,0.03)_0%,transparent_60%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none"></div>
      </div>

      <AnimatePresence mode="wait">
        {fase === 'intro_jefe' && (
          <motion.div 
            key="d1"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-[40%] w-full text-center z-20"
          >
            <p className="text-white font-serif italic text-2xl md:text-3xl drop-shadow-2xl">"Toma asiento, {apodo}."</p>
          </motion.div>
        )}
        
        {fase === 'dialogo' && (
          <motion.div 
            key="d2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-[40%] w-full text-center z-20"
          >
            <p className="text-white font-serif italic text-2xl md:text-3xl drop-shadow-2xl">"La directiva confía en ti. Aquí tienes el contrato."</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(fase === 'entregando' || fase === 'leyendo' || fase === 'firmando' || fase === 'aprobado') && (
          <motion.div 
            key="contrato"
            initial={{ y: -600, scale: 0.3, rotateX: 60, opacity: 0 }} 
            animate={{ y: -20, scale: 1, rotateX: 5, opacity: 1 }} 
            exit={{ y: '150vh', opacity: 0, rotateX: -20 }}
            transition={{ duration: 1.2, type: "spring", bounce: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-[#EBEBEB] rounded shadow-[0_50px_100px_rgba(0,0,0,0.95)] flex flex-col p-8 md:p-14 text-[#111] z-30"
            style={{ 
              minHeight: '650px', 
              backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
              bottom: '5%'
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
              <img src={getImg(club.img)} className="w-96 h-96 object-contain grayscale" alt="" />
            </div>

            <div className="flex justify-between items-start border-b-2 border-black/40 pb-6 mb-8 relative z-10">
              <div className="flex items-center gap-5">
                <img src={getImg(club.img)} className="w-16 h-16 object-contain grayscale contrast-150 brightness-50" alt=""/>
                <div>
                  <h3 className="font-serif font-black text-2xl uppercase leading-none tracking-tight">{club.name}</h3>
                  <span className="font-mono text-[9px] text-[#555] uppercase tracking-[0.2em] block mt-1">Dirección Deportiva y Legal</span>
                </div>
              </div>
              <div className="text-right font-mono text-[9px] text-[#444] flex flex-col font-bold">
                <span>EXP: THC-2026-MGR</span>
                <span>FOJA: 01/01</span>
                <span className="text-red-800 mt-1">ESTRICTAMENTE CONFIDENCIAL</span>
              </div>
            </div>

            <h2 className="text-center font-serif font-black text-xl md:text-2xl uppercase tracking-tighter mb-8 text-[#000]">
              ACUERDO VINCULANTE DE GESTIÓN TÁCTICA
            </h2>

            <div className="font-serif text-sm md:text-[15px] leading-relaxed text-justify space-y-4 mb-10 text-[#1a1a1a] relative z-10">
              <p>
                En la ciudad sede, con fecha de vigencia inmediata, la Junta Directiva de <strong>{club.name}</strong> resuelve de forma unánime la destitución del cuerpo técnico anterior encabezado por <strong>{club.dt}</strong>.
              </p>
              <p>
                En dicho acto, se otorga potestad absoluta a <span className="font-bold uppercase font-sans border-b border-black">{apodo}</span> para ejercer como <strong>Mánager General y Director Técnico Principal</strong> del primer equipo profesional.
              </p>
              
              <div className="mt-6 border border-black/20 p-5 bg-black/5 relative">
                <div className="absolute -top-3 left-4 bg-[#EBEBEB] px-2 font-mono text-[9px] font-bold tracking-widest uppercase">
                  Cláusulas de Rendimiento
                </div>
                <ul className="space-y-3 font-mono text-xs text-[#222]">
                  <li className="flex gap-3"><span className="font-black text-black">I.</span> Disposición de un presupuesto de fichajes inicial de <strong>${(club.presupuesto / 1000000).toFixed(0)} Millones</strong>.</li>
                  <li className="flex gap-3"><span className="font-black text-black">II.</span> Obligatoriedad de mantener la Media Global (GRL) base de <strong>{club.grl}</strong> durante la temporada.</li>
                  <li className="flex gap-3 text-red-800 font-bold"><span className="text-red-800">III.</span> El fracaso o eliminación prematura en el <strong>Mundial THC 2026</strong> resultará en destitución fulminante sin derecho a indemnización.</li>
                </ul>
              </div>
            </div>

            <div className="mt-auto flex justify-between items-end relative z-10">
              <div className="w-40 flex flex-col items-center">
                <div className="w-full h-16 relative opacity-60 pointer-events-none mb-1">
                  <svg viewBox="0 0 100 40" className="w-full h-full">
                    <path d="M 10 20 Q 30 5 50 20 T 90 20" fill="transparent" stroke="#111" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="w-full border-t border-black/40 pt-2 text-center font-mono text-[9px] text-[#444] uppercase">
                  El Presidente
                </div>
              </div>
              
              <div className="w-56 relative flex flex-col items-center">
                <div 
                  onClick={ejecutarFirma}
                  className={`w-full h-24 border-b border-black/40 flex items-center justify-center relative transition-colors ${fase === 'leyendo' ? 'cursor-pointer hover:bg-black/5' : ''}`}
                >
                  {fase === 'leyendo' && (
                    <motion.div 
                      animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }} 
                      className="absolute inset-0 bg-[#001489]/5 pointer-events-none flex items-center justify-center"
                    >
                      <span className="font-mono text-[#001489] text-[9px] font-bold uppercase tracking-widest">
                        [ CLICK AQUÍ PARA FIRMAR ]
                      </span>
                    </motion.div>
                  )}

                  {(fase === 'firmando' || fase === 'aprobado') && FIRMAS_SVG[firmaIndex]}

                  <AnimatePresence>
                    {fase === 'aprobado' && (
                      <motion.div 
                        initial={{ scale: 4, opacity: 0 }} animate={{ scale: 1, opacity: 0.85 }} 
                        transition={{ type: "spring", stiffness: 400, damping: 12 }}
                        className="absolute -top-8 -left-8 -rotate-12 border-4 border-red-700 rounded-sm px-4 py-1 z-20 pointer-events-none mix-blend-multiply"
                      >
                        <span className="font-black text-4xl text-red-700 tracking-widest uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
                          OFICIALIZADO
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <span className="font-mono font-bold text-[9px] text-[#444] uppercase tracking-widest mt-2">
                  Firma del Mánager
                </span>
              </div>
            </div>

            {fase === 'aprobado' && (
              <motion.div animate={{ y: [0, 10, -5, 5, 0] }} transition={{ duration: 0.3 }} className="absolute inset-0 pointer-events-none"></motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}