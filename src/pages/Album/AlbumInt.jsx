import React, { useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap, X, LayoutGrid } from 'lucide-react';
import confetti from 'canvas-confetti';

const genIds = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}_${String(i + 1).padStart(3, '0')}`);

const U_CROMOS = genIds('U', 80);    
const V_CROMOS = genIds('V', 10);    
const JR_CROMOS = genIds('JR', 10);  
const BL_CROMOS = genIds('BL', 20);  
const ES_CROMOS = genIds('ES', 20);  
const S_CROMOS = genIds('S', 20);    
const M_CROMOS = genIds('M', 30);    

const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

const STICKERS_POR_PAGINA = [
  ...chunkArray(U_CROMOS, 5),   
  ...chunkArray(V_CROMOS, 5),   
  ...chunkArray(JR_CROMOS, 5),  
  ...chunkArray(BL_CROMOS, 5),  
  ...chunkArray(ES_CROMOS, 5),  
  ...chunkArray(S_CROMOS, 5),   
  ...chunkArray(M_CROMOS, 5)    
];

                                                                
const StickerSlot = ({ id, pegadas = [], inventario = [], onPegar }) => {
  const estaPegada = pegadas.includes(id);
  const laTengoSuelto = inventario.includes(id) && !estaPegada;

  const handlePegar = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (laTengoSuelto) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#F47A20', '#FFFFFF'] });
      onPegar(id);
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={estaPegada ? { scale: [0.8, 1.1, 1] } : {}}
      whileTap={laTengoSuelto ? { scale: 0.95 } : {}}
      onPointerDown={(e) => e.stopPropagation()} 
      onClick={handlePegar} 
      className={`relative w-full aspect-[3/4] flex flex-col items-center justify-center transition-all duration-300 rounded font-sans overflow-hidden ${laTengoSuelto ? 'cursor-pointer' : 'cursor-default'} ${
        estaPegada 
          ? 'shadow-[4px_4px_0px_rgba(0,0,0,0.8)] border-2 border-[#060606] z-10 bg-[#111]' 
          : laTengoSuelto 
            ? 'bg-[#F47A20]/10 border-2 border-[#F47A20] border-dashed hover:bg-[#F47A20]/20 shadow-[0_0_20px_rgba(244,122,32,0.6)] z-20 group' 
            : 'bg-[#0E0E0E] border-2 border-dashed border-[#2C2C2C] shadow-inner'
      }`}
    >
      {estaPegada ? (
                                                                                            
        <img 
          src={`/Album/Cromos/${id}.jpg`} 
          onError={(e) => { e.target.src = "/Album/Cromos/Cromo.jpg"; }} 
          className="absolute inset-0 w-full h-full object-cover z-0" 
          alt={`Cromo ${id}`} 
        />
      ) : (
        <>
          <div className={`absolute top-2 left-2 px-1.5 py-0.5 border rounded text-[8px] font-black ${laTengoSuelto ? 'bg-[#F47A20] text-[#060606] border-[#F47A20]' : 'bg-[#111111] text-[#666666] border-[#2C2C2C]'}`}>{id}</div>
          {laTengoSuelto ? (
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <Zap size={32} className="text-[#F47A20] fill-current drop-shadow-[0_0_10px_#F47A20]" />
            </motion.div>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-widest mt-4 text-[#444444]">VACÍO</span>
          )}
        </>
      )}
    </motion.div>
  );
};

const Page = React.forwardRef(({ pageIndex, bgImage, stickers = [], pegadas, inventario, onPegar, isCover = false }, ref) => {
  const isLeft = pageIndex % 2 !== 0;
  return (
    <div ref={ref} className={`bg-[#0A0A0A] h-full w-full relative overflow-hidden flex flex-col ${!isCover && 'border-y border-[#1A1A1A]'}`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none z-0"></div>
      {bgImage && <div className="absolute inset-0 z-0 pointer-events-none"><img src={bgImage} alt={`Pagina ${pageIndex}`} className="w-full h-full object-cover" /></div>}
      {!isCover && <div className={`absolute inset-y-0 ${isLeft ? 'right-0' : 'left-0'} w-10 bg-gradient-to-${isLeft ? 'l' : 'r'} from-black/90 via-black/20 to-transparent z-10 pointer-events-none`}></div>}
      
      <div className="relative z-20 w-full h-full p-6 flex flex-col justify-center">
        {!isCover && stickers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 place-items-center w-full max-w-[95%] mx-auto">
            {stickers.map((id) => <StickerSlot key={id} id={id} pegadas={pegadas} inventario={inventario} onPegar={onPegar} />)}
          </div>
        )}
      </div>
      
      {!isCover && pageIndex > 0 && pageIndex < 39 && (
        <div className={`absolute bottom-4 ${isLeft ? 'left-4' : 'right-4'} flex items-center gap-2 z-30`}>
          <div className="w-4 h-[2px] bg-[#F47A20]"></div>
          <span className="text-[9px] font-black text-[#666666] tracking-[0.2em]">PAG {pageIndex}</span>
        </div>
      )}
    </div>
  );
});

export default function AlbumInt({ onBack, pegadas = [], inventario = [], onPegar }) {
  const bookRef = useRef(null);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  
  const irPaginaAnterior = () => bookRef.current?.pageFlip()?.flipPrev();
  const irPaginaSiguiente = () => bookRef.current?.pageFlip()?.flipNext();

  const tieneParaPegar = (prefix) => inventario.some(id => id.startsWith(`${prefix}_`) && !pegadas.includes(id));

  const SECCIONES_DIR = [
    { label: 'Jugadores', prefix: 'U', page: 1 },
    { label: 'Vips', prefix: 'V', page: 17 },
    { label: 'Reconocidos', prefix: 'JR', page: 19 },
    { label: 'Blacklisteados', prefix: 'BL', page: 21 },
    { label: 'Ex-Staff', prefix: 'ES', page: 25 },
    { label: 'Staff THC', prefix: 'S', page: 29 },
    { label: 'Momentos', prefix: 'M', page: 33 },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center font-sans overflow-hidden bg-[#030303]">
      
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] bg-[#F47A20] rounded-full mix-blend-screen filter blur-[150px]"></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] bg-[#3B82F6] rounded-full mix-blend-screen filter blur-[200px]"></motion.div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] opacity-80"></div>
      </div>

      <div className="absolute top-6 left-6 md:top-10 md:left-10 z-50">
        <button onClick={onBack} className="bg-[#111111]/80 backdrop-blur-xl border border-[#2C2C2C] hover:border-[#F47A20] text-white px-5 py-2.5 rounded-full flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all group">
          <div className="bg-[#2C2C2C] group-hover:bg-[#F47A20] rounded-full p-1.5 transition-colors text-white group-hover:text-[#060606]"><X size={14} className="stroke-[3px]" /></div>
          Cerrar Álbum
        </button>
      </div>

      <div className="absolute top-6 right-6 md:top-10 md:right-10 z-50">
        <button onClick={() => setIsJumpOpen(true)} className="bg-[#111111]/80 backdrop-blur-xl border border-[#2C2C2C] hover:border-[#F47A20] text-white px-5 py-2.5 rounded-full flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all group">
          Directorio
          <div className="bg-[#2C2C2C] group-hover:bg-[#F47A20] rounded-full p-1.5 transition-colors text-white group-hover:text-[#060606] relative">
            {SECCIONES_DIR.some(s => tieneParaPegar(s.prefix)) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#060606] animate-pulse"></span>}
            <LayoutGrid size={14} className="stroke-[3px]" />
          </div>
        </button>
      </div>

      <div className="absolute left-0 top-0 w-20 md:w-40 h-full flex items-center justify-start group cursor-pointer z-40 pointer-events-auto" onClick={irPaginaAnterior}>
        <div className="w-full h-full bg-gradient-to-r from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
           <ChevronLeft size={48} className="text-[#F47A20] ml-4 md:ml-8 transform -translate-x-4 group-hover:translate-x-0 transition-transform drop-shadow-[0_0_10px_#F47A20]" />
        </div>
      </div>
      <div className="absolute right-0 top-0 w-20 md:w-40 h-full flex items-center justify-end group cursor-pointer z-40 pointer-events-auto" onClick={irPaginaSiguiente}>
        <div className="w-full h-full bg-gradient-to-l from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-end">
           <ChevronRight size={48} className="text-[#F47A20] mr-4 md:mr-8 transform translate-x-4 group-hover:translate-x-0 transition-transform drop-shadow-[0_0_10px_#F47A20]" />
        </div>
      </div>

      <div className="w-full flex justify-center items-center z-30 select-none drop-shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <HTMLFlipBook width={400} height={550} size="stretch" minWidth={300} maxWidth={480} minHeight={400} maxHeight={650} usePortrait={false} showCover={true} showPageCorners={false} disableFlipByClick={true} ref={bookRef} className="rounded-r-lg">
          <Page pageIndex={0} bgImage="/Album/Paginas/PortadaAlbum.jpg" isCover={true} />
          {STICKERS_POR_PAGINA.map((stickersGroup, index) => <Page key={index + 1} pageIndex={index + 1} stickers={stickersGroup} pegadas={pegadas} inventario={inventario} onPegar={onPegar} />)}
          <Page pageIndex={39} isCover={true}>
            <div className="h-full flex flex-col items-center justify-center text-center bg-[#060606] border-l border-[#1A1A1A]">
              <img src="/imagenes/LogoTHC.png" className="w-24 h-24 opacity-20 grayscale mb-6" alt="THC" />
              <h2 className="text-[#333333] font-black text-3xl tracking-tighter uppercase italic">Leyendas<br/>Inmortales</h2>
              <div className="w-12 h-[2px] bg-[#F47A20]/30 my-6"></div>
              <p className="text-[#444444] font-black tracking-[0.4em] uppercase text-[8px]">T.H.C. 2026</p>
            </div>
          </Page>
        </HTMLFlipBook>
      </div>

      <AnimatePresence>
        {isJumpOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-sans">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0A0A0A] border border-[#2C2C2C] shadow-[0_0_50px_rgba(244,122,32,0.1)] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col">
              <div className="p-6 md:p-8 flex justify-between items-center border-b border-[#1A1A1A]">
                <h3 className="font-black uppercase tracking-widest text-white text-lg flex items-center gap-3">
                  <LayoutGrid size={18} className="text-[#F47A20]" /> Índice de Colección
                </h3>
                <button onClick={() => setIsJumpOpen(false)} className="text-[#666666] hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <div className="p-6 md:p-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {SECCIONES_DIR.map((sec) => {
                  const hasStickers = tieneParaPegar(sec.prefix);
                  return (
                    <button key={sec.label} onClick={() => {bookRef.current.pageFlip().turnToPage(sec.page); setIsJumpOpen(false)}} className="bg-[#111] border border-[#2C2C2C] hover:border-[#F47A20] text-white p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors group relative overflow-hidden">
                      {hasStickers && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                      <span className="font-black text-xs uppercase tracking-widest text-[#666666] group-hover:text-white relative z-10">{sec.label}</span>
                      <span className="text-[9px] text-[#F47A20] font-bold uppercase relative z-10">Página {sec.page}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}