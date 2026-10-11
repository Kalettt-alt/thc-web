import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { supabase } from '../../utils/supabase';
import { ArrowLeft, Play, LayoutGrid, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import toast from 'react-hot-toast';
import { TODOS_LOS_CROMOS, CROMOS_DATA } from '../../utils/UsuariosTHC';
import { groupAlbumInventory, albumErrorMessage } from '../../utils/albumCollection';
import { withAlbumTimeout } from '../../utils/albumAsync';
import { useHomeMotion } from '../../utils/homeMotion';
import './Album.css';

import OptionWheel from './OptionWheel'; 
import AlbumInt from './AlbumInt';
import Sobres from './Sobres';
import Inventario from './Inventario';
import Intercambio from './Intercambio';

const SECCIONES = ['ÁLBUM', 'SOBRES', 'INVENTARIO', 'MERCADO'];

const SHOWCASE_DATA = {
  0: { id: 'album', img: '/Album/Paginas/PortadaAlbum.jpg', desc: 'Pega tus figuras, completa tu legado y pasa a la eternidad.', glow: '#F47A20', btnText: 'Ingresar a la Colección', categoryName: 'ÁLBUM 2026' },
  1: { id: 'sobres', img: '/Album/SobresMenu.png', desc: 'Abre un sobre, descubre sus cromos y haz crecer tu colección.', glow: '#ff7f11', btnText: 'Abrir sobres', categoryName: 'NUEVAS SORPRESAS' },
  2: { id: 'inventario', img: '/Album/InventarioMenu.png', desc: 'Encuentra lo que tienes, lo que vas a pegar y tus repetidas.', glow: '#ee8f36', btnText: 'Ver inventario', categoryName: 'TODO EN ORDEN' },
  3: { id: 'mercado', img: '/Album/IntercambioMenu.png', desc: 'Cambia tus repetidas por los cromos que te faltan. Tu primera copia queda protegida.', glow: '#ff7f11', btnText: 'Ver intercambios', categoryName: 'COMPLETA TU COLECCIÓN' }
};

async function obtenerCromos(userId) {
  const { data, error } = await withAlbumTimeout(supabase.from('inventario_cromos').select('cromo_id, pegada, cantidad').eq('user_id', userId));
  if (error) throw error;
  const inventory = groupAlbumInventory(data || []).filter(item => Object.hasOwn(CROMOS_DATA, item.id));
  return { pegadas: inventory.filter(item => item.pegada).map(item => item.id), inventario: inventory.filter(item => item.libres > 0).map(item => item.id) };
}
export default function AlbumExperiencia({ session }) {
  const { motionEnabled } = useHomeMotion();
  const [vista, setVista] = useState('menu');
  const pegandoRef = useRef(new Set());
  const userId = session?.user?.id;
  const account = useRef(userId);
  const requests = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [wheelFontSize, setWheelFontSize] = useState(5.5);
  
  const [collection, setCollection] = useState({ userId: null, pegadas: [], inventario: [] });
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const pegadasIds = collection.userId === userId ? collection.pegadas : [];
  const inventarioIds = collection.userId === userId ? collection.inventario : [];
  
  const faltantes = TODOS_LOS_CROMOS.length - pegadasIds.length;
  const progreso = Math.round((pegadasIds.length / TODOS_LOS_CROMOS.length) * 100) || 0;

  useEffect(() => {
    const handleResize = () => setWheelFontSize(window.innerWidth < 768 ? 3.5 : 5.5);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    const number = ++requests.current;
    obtenerCromos(userId).then(datos => {
      if (!activo || number !== requests.current) return;
      setCollection({ userId, ...datos });
      setErrorCarga(false);
    }).catch(() => { if (activo && number === requests.current) setErrorCarga(true); });
    return () => { activo = false; };
  }, [userId, vista, recarga]);

  useEffect(() => {
    account.current = userId;
    return () => { account.current = null; };
  }, [userId]);

  const handlePegarCromo = async cromoId => {
    const actor = userId;
    const key = `${actor}:${cromoId}`;
    if (!actor || pegandoRef.current.has(key) || pegadasIds.includes(cromoId) || !inventarioIds.includes(cromoId)) return;
    pegandoRef.current.add(key);
    try {
      const { data: auth, error: authError } = await withAlbumTimeout(supabase.auth.getSession());
      if (authError) throw authError;
      if (account.current !== actor) return;
      if (auth?.session?.user?.id !== actor) throw { details: 'ALBUM_AUTH_REQUIRED' };
      const { data, error } = await withAlbumTimeout(supabase.rpc('pegar_cromo_v2', { p_cromo_id: cromoId }));
      if (error) throw error;
      if (data?.success !== true || data.cromo_id !== cromoId || data.pegada !== true || !Number.isSafeInteger(data.cantidad) || data.cantidad < 1) throw new Error('Invalid receipt');
      if (account.current !== actor) return;
      requests.current += 1;
      setCollection(prev => prev.userId !== actor ? prev : {
        ...prev, pegadas: [...new Set([...prev.pegadas, cromoId])],
        inventario: data.cantidad > 1 ? [...new Set([...prev.inventario, cromoId])] : prev.inventario.filter(id => id !== cromoId),
      });
      toast.success('¡Cromo pegado!');
    } catch (error) {
      if (account.current === actor) toast.error(albumErrorMessage(error, 'No se pudo confirmar el pegado. Actualiza tu álbum o reintenta.'), { id: 'album-paste' });
    } finally {
      pegandoRef.current.delete(key);
    }
  };
  const currentShowcase = SHOWCASE_DATA[activeIdx] || SHOWCASE_DATA[0];

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
    <div data-motion={motionEnabled ? 'on' : 'off'} className="album-menu-page fixed inset-0 z-40 bg-[#040404] font-sans selection:bg-[#F47A20] selection:text-[#060606] flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
      <AnimatePresence mode="wait">
        
                                                              
        {vista === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col w-full min-h-[100dvh] relative">
            
                                              
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                                         
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
              
                                                     
              <motion.div 
                animate={{ backgroundPosition: motionEnabled ? ['0px 0px', '200px 200px'] : '0px 0px' }}
                transition={{ repeat: motionEnabled ? Infinity : 0, duration: 30, ease: "linear" }}
                className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"
              />

                                                       
              <motion.div 
                animate={{ background: `radial-gradient(circle at 75% 50%, ${currentShowcase.glow}15 0%, transparent 60%)` }} 
                transition={{ duration: 0.8 }} 
                className="absolute inset-0"
              />
                                                      
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020202_100%)] opacity-90"></div>
            </div>

                                   
            <div className="w-full p-6 md:px-12 z-50 flex justify-between items-start relative shrink-0">
              <Link to={RUTAS.INICIO} className="flex items-center gap-2 text-[#888888] hover:text-white transition-colors bg-transparent border border-transparent hover:border-current px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: currentShowcase.glow }}>
                <ArrowLeft size={14} /> <span className="hidden md:inline">Volver a Inicio</span><span className="inline md:hidden">Atrás</span>
              </Link>
              
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} style={{ color: currentShowcase.glow }} />
                  <span className="text-white/60 text-xs font-bold">Tu colección THC</span>
                </div>
                <h2 className="text-sm md:text-lg font-black uppercase tracking-widest text-white">CATEGORÍA</h2>
                <div className="h-[2px] w-12 my-1 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: currentShowcase.glow, color: currentShowcase.glow }}></div>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/50">{currentShowcase.categoryName}</span>
              </div>
            </div>

                                     
            {errorCarga && <div className="album-menu-notice" role="alert"><span>No se pudo sincronizar el progreso. Tu colección se conserva.</span><button type="button" onClick={() => setRecarga(prev => prev + 1)}>Reintentar</button></div>}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center w-full max-w-[1600px] mx-auto relative z-10 py-6 md:py-0">
              
                                           
              <div className="w-full md:w-[45%] flex items-center justify-center pl-0 h-[250px] md:h-[60vh] min-h-[30vh] relative z-20">
                <OptionWheel 
                  items={SECCIONES} 
                  defaultSelected={activeIdx} 
                  textColor="#222222" 
                  activeColor={currentShowcase.glow} 
                  side="left" 
                  fontSize={wheelFontSize} 
                  spacing={1.8} 
                  curve={1.5} 
                  tilt={5} 
                  inset={window.innerWidth < 768 ? 40 : 80} 
                  onChange={(idx) => setActiveIdx(idx)} 
                  className="w-full h-full" 
                />
              </div>

                                                                             
              <div className="w-full md:w-[55%] flex flex-col items-center justify-center relative mt-4 md:mt-0 z-10 p-4 min-h-[40vh]">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentShowcase.id} 
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)', y: 20 }} 
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)', y: -20 }} 
                    transition={{ duration: 0.4 }} 
                    className="flex flex-col items-center text-center w-full relative"
                  >
                    
                                               
                    <div 
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none"
                      style={{ backgroundColor: currentShowcase.glow }}
                    ></div>

                                                     
                    <button type="button" aria-label={currentShowcase.btnText} className="album-menu-preview relative flex flex-col items-center justify-center w-full cursor-pointer group" onClick={() => setVista(currentShowcase.id)}>
                      <motion.div animate={{ y: motionEnabled ? [-8, 8, -8] : 0 }} transition={{ repeat: motionEnabled ? Infinity : 0, duration: 4, ease: "easeInOut" }} className="relative z-10">
                        <img 
                          src={currentShowcase.img} 
                          alt={currentShowcase.id} 
                          className="w-auto h-[35vh] max-h-[450px] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-500" 
                        />
                      </motion.div>
                    </button>

                                                 
                    <div className="mt-10 flex flex-col items-center z-20 px-6">
                      <p className="album-menu-description text-[#bbb4a8] mb-6 max-w-sm">
                        {currentShowcase.desc}
                      </p>
                      
                      <button 
                        onClick={() => setVista(currentShowcase.id)} 
                        className="album-menu-enter bg-transparent border-2 px-7 py-3.5 rounded-full font-bold text-sm flex items-center gap-4 transition-all hover:bg-white hover:text-black hover:border-white hover:scale-105"
                        style={{ borderColor: currentShowcase.glow, color: currentShowcase.glow }}
                      >
                        <Play size={14} className="fill-current" /> {currentShowcase.btnText}
                      </button>
                    </div>

                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

                                         
            <div className="w-full bg-[#040404]/80 backdrop-blur-md border-t border-[#111111] px-6 md:px-16 py-6 z-30 shrink-0 sticky bottom-0">
              <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-12">
                <div className="w-full md:w-3/4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[#afa698] font-bold text-sm flex items-center gap-2">
                      <LayoutGrid size={12}/> Progreso Global
                    </span>
                    <span className="text-white font-black text-lg md:text-xl">{progreso}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#111111] rounded-full overflow-hidden relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progreso}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full rounded-full absolute left-0 top-0" style={{ background: `linear-gradient(90deg, #F47A20, ${currentShowcase.glow})`, boxShadow: `0 0 10px ${currentShowcase.glow}80` }}/>
                  </div>
                </div>
                <div className="flex justify-between md:justify-end w-full md:w-1/4 gap-8 md:gap-12 text-sm font-bold text-[#afa698]">
                  <div className="flex flex-col text-left md:text-right">
                    <span className="text-white text-lg mb-0.5">{pegadasIds.length}</span>
                    <span>Pegadas</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-white text-lg mb-0.5">{faltantes}</span>
                    <span>Faltantes</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

                                                                   
        {vista === 'album' && <AlbumInt key="album-int" onBack={() => setVista('menu')} pegadas={pegadasIds} inventario={inventarioIds} onPegar={handlePegarCromo} />}
        {vista === 'sobres' && <Sobres key={`sobres-${userId}`} userId={userId} onNavigate={setVista} onBack={() => setVista('menu')} />}
        {vista === 'inventario' && <Inventario key={`inventario-${userId}`} userId={userId} onBack={() => setVista('menu')} />}
        {vista === 'mercado' && <Intercambio key={`mercado-${userId}`} userId={userId} onBack={() => setVista('menu')} />}

      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
