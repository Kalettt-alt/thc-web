import { motion } from 'framer-motion';

const getLogoLiga = (sigla) => {
  const logos = {
    'ESP': '/Imag/LogoEspana.png',
    'ARG': '/Imag/LogoArgentina.png',
    'BRS': '/Imag/LogoBrasil.png',
    'PER': '/Imag/LogoPeru.png',
    'COL': '/Imag/LogoColombia.png',
    'URU': '/Imag/LogoUruguay.png',
    'CHL': '/Imag/LogoChile.png',
    'ECU': '/Imag/LogoEcuador.png',
    'BOL': '/Imag/LogoBolivia.png'
  };
  return logos[sigla] || '/Imag/LogoTHC.png';
};

export default function TablaDF({ standings, club, jornada, totalJornadas, nombreLiga, getImg }) {
  const logoLigaUrl = getLogoLiga(club.liga);
  const equiposOrdenados = Object.values(standings).sort((a,b) => b.pts - a.pts || b.dg - a.dg);

                                        
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-[1400px] mx-auto w-full flex flex-col gap-10 pb-12"
    >
                                               
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-[4px] border-[#111] pb-8 bg-[#050505] p-10 shadow-2xl relative overflow-hidden">
                             
        <div className="absolute top-0 right-0 w-[50%] h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none"></div>

        <div className="flex items-center gap-8 relative z-10 w-full md:w-auto">
          <motion.img 
            initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }}
            src={getImg(logoLigaUrl)} 
            alt="Logo Liga" 
            className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] grayscale opacity-50" 
          />
          <div className="flex flex-col">
            <span className="text-[#F47A20] font-black text-xs md:text-sm uppercase tracking-[0.4em] mb-2">CLASIFICACIÓN GENERAL</span>
            <h1 className="font-black text-5xl md:text-7xl italic uppercase text-white tracking-tighter leading-none">
              {nombreLiga}
            </h1>
          </div>
        </div>
        
        <div className="bg-[#111] border-[2px] border-[#222] px-10 py-6 flex flex-col items-end shadow-2xl shrink-0">
          <span className="text-[#555] text-[10px] font-black uppercase tracking-[0.4em] mb-2">JORNADA ACTUAL</span>
          <span className="text-white text-5xl font-black italic tracking-tighter leading-none">
            {jornada + 1} <span className="text-[#444] text-3xl">/ {totalJornadas}</span>
          </span>
        </div>
      </div>

                                                           
      <div className="w-full flex flex-col">
        
                                
        <div className="flex items-center px-8 py-4 bg-[#050505] border-[2px] border-[#111] text-[#666] text-[10px] uppercase tracking-widest font-black mb-4">
          <div className="w-16 text-center">POS</div>
          <div className="flex-1 pl-8">CLUB</div>
          <div className="w-16 text-center hidden sm:block">PJ</div>
          <div className="w-16 text-center hidden md:block">G</div>
          <div className="w-16 text-center hidden md:block">E</div>
          <div className="w-16 text-center hidden md:block">P</div>
          <div className="w-20 text-center">DG</div>
          <div className="w-32 text-center text-[#AAA]">PTS</div>
        </div>

                                        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {equiposOrdenados.map((data, rank) => {
            const esMiClub = data.id === club.id;
            const isTop4 = rank < 4;                 
            const isRelegation = rank > equiposOrdenados.length - 4;                     
            
            return (
              <motion.div 
                key={data.id}
                variants={itemVariants}
                className={`flex items-center px-6 py-4 md:py-5 transition-colors group relative overflow-hidden ${
                  esMiClub 
                    ? 'bg-[#111] border-[3px] border-[#F47A20] shadow-[0_0_40px_rgba(244,122,32,0.15)] z-10' 
                    : 'bg-[#0A0A0A] border-[2px] border-[#111] hover:bg-[#0F0F0F] hover:border-[#222]'
                }`}
              >
                                                                 
                {!esMiClub && isTop4 && <div className="absolute top-0 left-0 w-1.5 h-full bg-[#10B981]"></div>}
                {!esMiClub && isRelegation && <div className="absolute top-0 left-0 w-1.5 h-full bg-[#EF4444]"></div>}

                                
                <div className="w-16 flex justify-center items-center">
                  <span className={`font-black text-3xl italic tracking-tighter ${esMiClub ? 'text-[#F47A20]' : 'text-[#444] group-hover:text-white transition-colors'}`}>
                    {rank + 1}
                  </span>
                </div>

                                       
                <div className="flex-1 pl-8 flex items-center gap-6 font-black text-white italic text-2xl md:text-3xl uppercase tracking-tighter">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center shrink-0">
                    {data.img ? (
                      <img src={getImg(data.img)} className={`w-full h-full object-contain transition-all duration-300 ${esMiClub ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`} alt=""/>
                    ) : (
                      <div className="w-full h-full bg-[#111] border border-[#222] flex items-center justify-center text-[#444]">FC</div>
                    )}
                  </div>
                  <span className={`truncate ${esMiClub ? 'text-white' : 'text-[#888] group-hover:text-white transition-colors'}`}>{data.name}</span>
                </div>

                                    
                <div className={`w-16 text-center text-xl md:text-2xl font-black italic hidden sm:block ${esMiClub ? 'text-white' : 'text-[#555]'}`}>{data.pj}</div>
                <div className={`w-16 text-center text-xl md:text-2xl font-black italic hidden md:block ${esMiClub ? 'text-white' : 'text-[#555]'}`}>{data.pg}</div>
                <div className={`w-16 text-center text-xl md:text-2xl font-black italic hidden md:block ${esMiClub ? 'text-white' : 'text-[#555]'}`}>{data.pe}</div>
                <div className={`w-16 text-center text-xl md:text-2xl font-black italic hidden md:block ${esMiClub ? 'text-white' : 'text-[#555]'}`}>{data.pp}</div>
                
                                           
                <div className="w-20 text-center flex justify-center">
                   <div className={`px-3 py-1 font-black text-sm uppercase tracking-widest ${
                     data.dg > 0 ? 'text-[#10B981] bg-[#10B981]/10' : 
                     data.dg < 0 ? 'text-[#EF4444] bg-[#EF4444]/10' : 'text-[#555] bg-[#111]'
                   }`}>
                     {data.dg > 0 ? `+${data.dg}` : data.dg}
                   </div>
                </div>
                
                                      
                <div className="w-32 text-center flex justify-center pl-4">
                   <div className={`px-4 py-2 flex items-center justify-center font-black text-4xl md:text-5xl italic tracking-tighter leading-none ${
                     esMiClub ? 'bg-[#F47A20] text-[#050505]' : 'text-white bg-[#111] border border-[#222]'
                   }`}>
                     {data.pts}
                   </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}