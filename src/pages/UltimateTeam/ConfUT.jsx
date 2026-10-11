import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readUtConfig, normalizeUtConfig, UT_DEFAULT_CONFIG } from './utValidation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../utils/supabase';

export default function ConfUT() {
  const [activeTab, setActiveTab] = useState('interfaz');
  const [isSaving, setIsSaving] = useState(false);
  const [listeningKey, setListeningKey] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteLock = useRef(false);
  const [config, setConfig] = useState(readUtConfig);

  const handleChange = useCallback((key, value) => setConfig(previous => ({ ...previous, [key]: value })), []);

  useEffect(() => {
    if (!listeningKey) return;
    const handleKeyDown = (e) => {
      e.preventDefault();
      if (['Escape', 'Tab', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        setListeningKey(null); return;
      }
      const keyName = e.code === 'Space' ? 'Space' : e.key.toUpperCase();
      if (listeningKey.startsWith('kickKeys_')) {
        const index = parseInt(listeningKey.split('_')[1]);
        const newKeys = [...(Array.isArray(config.kickKeys) ? config.kickKeys : ['Space', 'C', 'V'])];
        newKeys[index] = keyName;
        handleChange('kickKeys', newKeys);
      }
      setListeningKey(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningKey, config.kickKeys, handleChange]);

  
  const handleColorChange = (index, value) => {
    const newColors = [...config.colors];
    newColors[index] = value;
    handleChange('colors', newColors);
  };

  const handleNumberChange = (key, value, max = null) => {
    let val = value.replace(/\D/g, ''); 
    val = val.replace(/^0+(?=\d)/, ''); 
    if (val === '') val = '0'; 
    let num = parseInt(val, 10);
    if (max !== null && num > max) num = max;
    handleChange(key, num);
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('thc_config', JSON.stringify(normalizeUtConfig(config)));
      window.dispatchEvent(new Event('thc_config_updated'));
      toast.success('Configuración guardada.');
    } catch {
      toast.error('No se pudo guardar la configuración en este dispositivo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultConf = normalizeUtConfig(UT_DEFAULT_CONFIG);
    try {
      localStorage.setItem('thc_config', JSON.stringify(defaultConf));
      setConfig(defaultConf);
      window.dispatchEvent(new Event('thc_config_updated'));
      toast.success('Configuración restablecida.');
    } catch {
      toast.error('No se pudo restablecer la configuración en este dispositivo.');
    }
  };

  const handleDeleteClub = async () => {
    if (deleteLock.current) return;
    deleteLock.current = true;
    setIsDeleting(true);
    const toastId = toast.loading('Eliminando tu club...');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
      const reset = await supabase.rpc('thc_ut_reset');
      if (reset.error?.code === 'PGRST202') {
        for (const table of ['club_ut', 'plantillas_ut', 'PlaylistUT', 'equipos_ut', 'perfiles_ut']) {
          const { data, error } = await supabase.from(table).delete().eq('user_id', user.id).select('user_id');
          if (error) throw error;
          if (table === 'perfiles_ut' && !data?.length) throw new Error('No se pudo confirmar el borrado del club. Comprueba los permisos de tu cuenta.');
        }
      } else {
        if (reset.error) throw reset.error;
        if (reset.data !== user.id) throw new Error('No se pudo confirmar el borrado del club.');
      }
      try { localStorage.removeItem('thc_config'); } catch (storageError) { console.error('No se pudo limpiar la configuración local:', storageError); }
      toast.success('Club eliminado.', { id: toastId });
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'No se pudo completar el borrado. Algunos datos podrían haberse eliminado; vuelve a intentarlo.', { id: toastId });
    } finally {
      deleteLock.current = false;
      setIsDeleting(false);
    }
  };

  const generateGradient = () => {
    const cssAngle = (config.angle || 0) + 90; 
    const validColors = Array.isArray(config.colors) ? config.colors : ['#E56E56', '#C14B3A', '#9E3222']; 
    const c = config.colorCount || 3;
    if (c === 1) return validColors[0];
    if (c === 2) return `linear-gradient(${cssAngle}deg, ${validColors[0]} 50%, ${validColors[1]} 50%)`;
    return `linear-gradient(${cssAngle}deg, ${validColors[0]} 33.33%, ${validColors[1]} 33.33% 66.66%, ${validColors[2] || validColors[0]} 66.66%)`;
  };

  const TABS = [
    { id: 'interfaz', label: 'INTERFAZ Y CONTROLES' }, 
    { id: 'diseno', label: 'DISEÑO Y GRÁFICOS' }, 
    { id: 'audio', label: 'VOLUMEN' }
  ];

  return (
    <>
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#050505] border border-white/10 p-10 rounded-2xl max-w-md w-full flex flex-col items-center text-center shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
              <AlertTriangle size={40} className="text-red-500 mb-6" />
              <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-4 italic">¿ELIMINAR CLUB?</h3>
              <p className="text-white/50 text-[10px] uppercase tracking-widest mb-8 leading-relaxed font-bold">Esta acción borrará todas tus monedas, plantillas, música y progreso de forma permanente. No se puede deshacer y serás enviado a la pantalla de inicio.</p>
              <div className="flex w-full gap-4">
                <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="flex-1 py-4 rounded bg-[#111] text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50">CANCELAR</button>
                <button onClick={handleDeleteClub} disabled={isDeleting} className="flex-1 py-4 rounded bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 flex justify-center items-center">
                  {isDeleting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'ELIMINAR DEFINITIVO'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1200px] mx-auto h-[70vh] flex flex-col md:flex-row gap-12 font-sans text-white relative z-10 pt-4">
        
        <div className="w-full md:w-[300px] flex flex-col shrink-0 relative">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-8">AJUSTES</h2>

          <div className="flex flex-col gap-2 flex-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`text-left px-5 py-4 font-black uppercase tracking-[0.2em] text-[10px] transition-all border-l-2 outline-none ${isActive ? 'bg-[#111]/60 border-[#F97316] text-[#F97316]' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 mt-auto pt-8">
            <button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="w-full py-4 bg-[#F97316] text-[#050505] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white transition-all disabled:opacity-50"
            >
              {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
            <button onClick={handleReset} className="w-full py-3 font-bold uppercase tracking-[0.2em] text-[9px] text-white/30 hover:text-white transition-all">
              RESTABLECER VALORES
            </button>

            <div className="w-full h-[1px] bg-white/5 my-1"></div>
            <button 
              onClick={() => setShowDeleteModal(true)} 
              className="w-full py-3 font-bold uppercase tracking-[0.2em] text-[9px] text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              ELIMINAR MI CLUB
            </button>
          </div>
        </div>


        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-4 pb-12">
          <AnimatePresence mode="wait">
            {activeTab === 'interfaz' && (
              <motion.div key="interfaz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-10 w-full max-w-[600px]">
                
                                           
                <div>
                  <h3 className="text-[10px] text-[#F97316] font-black uppercase tracking-[0.3em] mb-4">PERSONALIZACIÓN DE AVATAR</h3>
                  <div className="flex gap-8 items-center bg-[#0A0A0A] border border-white/5 p-6 rounded-xl">
                    
                    <div className="w-24 h-24 rounded-full flex items-center justify-center shrink-0 border-2 border-[#111]" style={{ background: generateGradient() }}>
                      <span className="font-black text-4xl tracking-tighter" style={{ color: config.textColor || '#FFFFFF', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                        {config.avatar || 'TH'}
                      </span>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">ÁNGULO (°)</span>
                        <input type="text" value={config.angle?.toString()} onChange={(e) => handleNumberChange('angle', e.target.value, 360)} className="bg-[#111] border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#F97316] transition-colors" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">LETRAS (MAX 2)</span>
                        <input type="text" maxLength={2} value={config.avatar || ''} onChange={(e) => handleChange('avatar', e.target.value.toUpperCase())} className="bg-[#111] border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#F97316] transition-colors" />
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">CANTIDAD DE COLORES</span>
                        <div className="flex gap-2">
                          {[1, 2, 3].map(num => (
                            <button key={num} onClick={() => handleChange('colorCount', num)} className={`flex-1 py-1.5 text-[10px] font-black transition-all border ${config.colorCount === num ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'}`}>{num}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div className="flex flex-col bg-[#0A0A0A] p-2 border border-white/5">
                      <span className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-1">TEXTO</span>
                      <input type="color" value={config.textColor || '#FFFFFF'} onChange={(e) => handleChange('textColor', e.target.value)} className="w-full h-6 cursor-pointer border-0 bg-transparent p-0" />
                    </div>
                    {[...Array(config.colorCount || 1)].map((_, i) => (
                      <div key={i} className="flex flex-col bg-[#0A0A0A] p-2 border border-white/5">
                        <span className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-1">COLOR {i+1}</span>
                        <input type="color" value={config.colors?.[i] || '#000000'} onChange={(e) => handleColorChange(i, e.target.value)} className="w-full h-6 cursor-pointer border-0 bg-transparent p-0" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] text-[#F97316] font-black uppercase tracking-[0.3em] mb-4">ATAJOS Y RED</h3>
                  
                  <div className="flex items-center justify-between bg-[#0A0A0A] border border-white/5 p-4 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">EXTRAPOLACIÓN (PING)</span>
                    <div className="flex items-center gap-2">
                      <input type="text" value={config.extrapolation?.toString()} onChange={(e) => handleNumberChange('extrapolation', e.target.value, 500)} className="bg-[#111] border border-white/10 w-16 text-center py-1 text-xs text-white outline-none focus:border-[#F97316]" />
                      <span className="text-[10px] font-black text-white/30">MS</span>
                    </div>
                  </div>

                  <div className="bg-[#0A0A0A] border border-white/5 p-4 flex flex-col gap-3">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">BOTONES DE DISPARO ALTERNATIVOS (La "X" siempre dispara)</span>
                    <div className="flex gap-2">
                      {[0, 1, 2].map(i => (
                        <button 
                          key={i} 
                          onClick={() => setListeningKey(`kickKeys_${i}`)} 
                          className={`flex-1 py-3 font-black text-[10px] uppercase tracking-widest border transition-all ${listeningKey === `kickKeys_${i}` ? 'bg-[#F97316] text-black border-[#F97316] animate-pulse' : 'bg-[#111] text-white/80 border-white/10 hover:border-white/30'}`}
                        >
                          {listeningKey === `kickKeys_${i}` ? 'PRESIONA...' : (config.kickKeys?.[i] || '—')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'diseno' && (
              <motion.div key="diseno" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-10 w-full max-w-[600px]">
                
                <div>
                  <h3 className="text-[10px] text-[#F97316] font-black uppercase tracking-[0.3em] mb-4">RENDIMIENTO VISUAL</h3>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-[#0A0A0A] border border-white/5 p-5">
                      <span className="text-xs font-bold uppercase tracking-widest text-white">CALIDAD GRÁFICA GLOBAL</span>
                      <div className="flex gap-1">
                        {['bajo', 'normal', 'alto'].map(lvl => (
                          <button key={lvl} onClick={() => handleChange('graficos', lvl)} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border ${config.graficos === lvl ? 'bg-white text-black border-white' : 'bg-[#111] text-white/40 border-white/5 hover:border-white/20'}`}>
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-[#0A0A0A] border border-white/5 p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-widest text-white">ANIMACIONES DE APERTURA DE SOBRES</span>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">Elige entre una apertura cinemática o directa</span>
                      </div>
                      <div className="flex gap-1">
                        {['normal', 'avanzado'].map(tipo => (
                          <button key={tipo} onClick={() => handleChange('animacionSobres', tipo)} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border ${config.animacionSobres === tipo ? 'bg-[#F97316] text-black border-[#F97316]' : 'bg-[#111] text-white/40 border-white/5 hover:border-white/20'}`}>
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'audio' && (
              <motion.div key="audio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-10 w-full max-w-[600px]">
                
                <div>
                  <h3 className="text-[10px] text-[#F97316] font-black uppercase tracking-[0.3em] mb-4">MEZCLADOR GENERAL</h3>
                  
                  <div className="bg-[#0A0A0A] border border-white/5 p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-black uppercase tracking-widest text-white">VOLUMEN MAESTRO</span>
                      <span className="text-2xl font-black italic text-[#F97316] leading-none">{config.volMaster || 0}</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={config.volMaster || 0} 
                      onChange={(e) => handleChange('volMaster', Number(e.target.value))} 
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#F97316]" 
                    />
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      Este volumen afectará a la música de fondo, efectos de sobres, clics de la interfaz y sonido durante el juego.
                    </p>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}