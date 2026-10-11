import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TODOS_LOS_EQUIPOS } from './equiposFantasy';
import { Search, ShieldAlert, Globe, ArrowRight, Wallet, Activity, ClipboardList } from 'lucide-react';

                                      

                               
const imageModules = import.meta.glob('./Imag/*.{png,jpg,jpeg,webp}', { eager: true });
const getImg = (imgPath) => {
  if (!imgPath) return '';
  const fileName = imgPath.split('/').pop();
  const matchKey = Object.keys(imageModules).find(key => key.includes(fileName));
  return matchKey ? (imageModules[matchKey].default || imageModules[matchKey]) : imgPath;
};

                                                              
const LIGAS_FILTRO = [
  { id: 'ALL', name: 'GLOBAL', img: null },
  { id: 'ARG', name: 'ARGENTINA', img: './Imag/LogoArgentina.png' },
  { id: 'ESP', name: 'ESPAÑA', img: './Imag/LogoEspana.png' },
  { id: 'BRS', name: 'BRASIL', img: './Imag/LogoBrasil.png' },
  { id: 'PER', name: 'PERÚ', img: './Imag/LogoPeru.png' },
  { id: 'COL', name: 'COLOMBIA', img: './Imag/LogoColombia.png' },
  { id: 'URU', name: 'URUGUAY', img: './Imag/LogoUruguay.png' },
  { id: 'CHL', name: 'CHILE', img: './Imag/LogoChile.png' },
  { id: 'ECU', name: 'ECUADOR', img: './Imag/LogoEcuador.png' },
  { id: 'BOL', name: 'BOLIVIA', img: './Imag/LogoBolivia.png' }
];

export default function SeleccionClubDF({ onSelectClub, apodo }) {
  const [filtroLiga, setFiltroLiga] = useState('ALL');
  const [busqueda, setBusqueda] = useState('');

                                                             
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

                         
  const equiposFiltrados = useMemo(() => {
    return TODOS_LOS_EQUIPOS.filter(eq => {
      const pasaLiga = filtroLiga === 'ALL' ? true : eq.liga === filtroLiga;
      const pasaBusqueda = eq.name.toLowerCase().includes(busqueda.toLowerCase());
      return pasaLiga && pasaBusqueda;
    });
  }, [filtroLiga, busqueda]);

                          
  const onDragStart = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const onDragEnd = () => setIsDragging(false);
  const onDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
      className="fixed inset-0 bg-[#050505] z-50 flex flex-col pt-12 md:pt-20 max-w-[100vw] overflow-hidden font-sans text-white selection:bg-[#F47A20] selection:text-black"
    >
                          
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,122,32,0.05)_0%,transparent_60%)] pointer-events-none z-0"></div>

                              
      <div className="flex flex-col gap-6 shrink-0 relative z-50 max-w-[1600px] mx-auto w-full px-6 md:px-12 mb-6">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-[#888] font-black text-[10px] md:text-xs uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
              <ClipboardList size={14} className="text-[#F47A20]" /> Mánager {apodo}
            </h2>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white leading-none drop-shadow-md">
              SELECCIONA <span className="text-[#F47A20]">CLUB</span>
            </h1>
          </div>

                          
          <div className="bg-[#0A0A0A] border-2 border-[#1A1A1A] rounded-2xl flex items-center px-5 py-1 h-[56px] w-full md:w-[350px] focus-within:border-[#F47A20] transition-all shadow-lg group">
            <Search size={20} className="text-[#555] group-focus-within:text-[#F47A20] shrink-0 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar institución..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm font-bold w-full pl-4 placeholder:text-[#444]"
            />
          </div>
        </div>

                                                                                
        <div 
          ref={scrollRef}
          onMouseDown={onDragStart}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          onMouseMove={onDragMove}
          className={`w-full overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-white/5 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <div className="flex gap-3 w-max">
            {LIGAS_FILTRO.map(liga => {
              const isActivo = filtroLiga === liga.id;
              return (
                <button
                  key={liga.id}
                  onClick={() => setFiltroLiga(liga.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest transition-all select-none ${
                    isActivo 
                      ? 'bg-[#F47A20] text-[#060606] shadow-[0_0_15px_rgba(244,122,32,0.4)]' 
                      : 'bg-[#0A0A0A] border border-[#222] text-[#888] hover:border-[#F47A20]/50 hover:text-white'
                  }`}
                >
                  {liga.img ? (
                    <img src={getImg(liga.img)} draggable="false" className={`w-5 h-5 object-contain ${isActivo ? 'brightness-0' : 'grayscale opacity-50'}`} alt=""/>
                  ) : (
                    <Globe size={18} className={isActivo ? 'text-[#060606]' : 'text-[#555]'} />
                  )}
                  {liga.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
                                                                           
      <div className="flex-1 overflow-y-auto pb-24 w-full max-w-[1600px] mx-auto px-6 md:px-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-10 relative">
        {equiposFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-[#444] font-black uppercase tracking-widest text-sm md:text-lg">
            <ShieldAlert size={60} className="mb-6 opacity-30" />
            No hay clubes que coincidan
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6 pt-2">
            <AnimatePresence>
              {equiposFiltrados.map((eq, i) => (
                <motion.div 
                  key={eq.liga + ":" + eq.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: (i % 10) * 0.03 }}
                  onClick={() => onSelectClub(eq)}
                  className="bg-[#0A0A0A] border-[3px] border-[#111] hover:border-[#F47A20] rounded-[2rem] p-6 cursor-pointer flex flex-col items-center relative overflow-hidden group transition-all duration-300 shadow-xl hover:shadow-[0_15px_40px_rgba(244,122,32,0.15)] hover:-translate-y-2"
                >
                                                       
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,122,32,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  
                                                         
                  <div className="absolute top-4 right-4 bg-[#111] border border-white/5 text-white px-3 py-1.5 rounded-xl font-black text-[10px] tracking-widest shadow-md z-10 flex items-center gap-1.5">
                    <Activity size={12} className="text-[#F47A20]" /> {eq.grl}
                  </div>

                                                    
                  <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center mb-6 mt-4 relative z-10">
                    <img 
                      src={getImg(eq.img)} 
                      alt={eq.name} 
                      className="w-full h-full object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                  
                                                
                  <div className="flex flex-col items-center text-center relative z-10 w-full">
                    <h3 className="font-black text-xl md:text-2xl uppercase italic tracking-tighter text-white truncate w-full mb-3 group-hover:text-[#F47A20] transition-colors">
                      {eq.name}
                    </h3>
                    
                    <div className="w-full flex justify-between items-center bg-[#050505] border border-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-[#888]">
                        <Wallet size={14} className="text-[#F47A20]" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Presup.</span>
                      </div>
                      <span className="text-white font-black text-xs tracking-wider">
                        ${(eq.presupuesto / 1000000).toFixed(0)}M
                      </span>
                    </div>
                  </div>

                                                                  
                  <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
                    <div className="bg-[#F47A20] text-[#060606] font-black uppercase text-[10px] tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                      Firmar Contrato <ArrowRight size={14} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}