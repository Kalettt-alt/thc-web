import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { validateClubForm, validateLogoFile } from './utValidation';
import { saveClubIdentity } from './clubIdentityUT';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Upload, Plus, Minus, MapPin, Trash2, Trophy } from 'lucide-react';
import { supabase } from '../../utils/supabase';                               
import Particles from '../../components/Particles'; 

import LogoUT from './LogoUT.png'; 
import LogoPremier from './Logos/LogoPremier.png';
import LogoEspana from './Logos/LogoEspana.png';
import LogoSerieA from './Logos/LogoSerieA.png';
import LogoBundesliga from './Logos/LogoBundesliga.png';
import LogoBrasil from './Logos/LogoBrasil.png';
import LogoArgentina from './Logos/LogoArgentina.png';

const LIGAS_DISPONIBLES = [
  { id: 'premier', nombre: 'Premier League', logo: LogoPremier },
  { id: 'laliga', nombre: 'LaLiga EA Sports', logo: LogoEspana },
  { id: 'seriea', nombre: 'Serie A', logo: LogoSerieA },
  { id: 'bundesliga', nombre: 'Bundesliga', logo: LogoBundesliga },
  { id: 'brasileirao', nombre: 'Brasileirão', logo: LogoBrasil },
  { id: 'argentina', nombre: 'Liga Argentina', logo: LogoArgentina },
  { id: 'resto', nombre: 'Resto del Mundo', logo: null }
];

export default function CrearEquipoUT({ onComplete }) {
  const [step, setStep] = useState('logo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validatingLogo, setValidatingLogo] = useState(false);
  const logoRequest = useRef(0);
  const submitLock = useRef(false);
  
  const [formData, setFormData] = useState({
    logoFile: null,
    logoUrl: null,
    nombre: '',
    abreviatura: '',
    liga: null, 
    equipacion: {
      camiseta: { colores: ['#0055FF', '#FFD700'], diseno: 'mitad' }, 
      short: { colores: ['#050505'], diseno: 'solido' }, 
      texto: '#FFFFFF' 
    },
    estadio: '',
    apodos: [''] 
  });

  const [kitTab, setKitTab] = useState('camiseta');
  useEffect(() => () => {
    if (formData.logoUrl) URL.revokeObjectURL(formData.logoUrl);
  }, [formData.logoUrl]);
  const STEPS_ORDER = ['logo', 'nombre', 'liga', 'colores', 'estadio', 'apodos', 'resumen'];

  const nextStep = () => {
    const currentIndex = STEPS_ORDER.indexOf(step);
    if (currentIndex < STEPS_ORDER.length - 1) setStep(STEPS_ORDER[currentIndex + 1]);
  };

  const prevStep = () => {
    const currentIndex = STEPS_ORDER.indexOf(step);
    if (currentIndex > 0) setStep(STEPS_ORDER[currentIndex - 1]);
  };

  const isStepValid = () => {
    if (step === 'logo') return formData.logoFile !== null;
    if (step === 'nombre') return formData.nombre.trim().length > 0 && /^[A-Z]{3}$/.test(formData.abreviatura.trim());
    if (step === 'liga') return formData.liga !== null;
    if (step === 'colores') return formData.equipacion.camiseta.colores.length >= 2 && formData.equipacion.short.colores.length >= 1;
    if (step === 'estadio') return formData.estadio.trim().length > 0;
    if (step === 'apodos') return formData.apodos.length > 0 && formData.apodos[0].trim().length > 0;
    return true; 
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    const requestId = ++logoRequest.current;
    e.target.value = '';
    if (!file) return;
    setValidatingLogo(true);
    try {
      await validateLogoFile(file);
      if (requestId !== logoRequest.current) return;
      const url = URL.createObjectURL(file);
      setFormData(previous => ({ ...previous, logoFile: file, logoUrl: url }));
    } catch (error) {
      if (requestId === logoRequest.current) toast.error(error.message);
    } finally {
      if (requestId === logoRequest.current) setValidatingLogo(false);
    }
  };

  const addApodo = () => { if (formData.apodos.length < 3) setFormData({ ...formData, apodos: [...formData.apodos, ''] }); };
  const removeApodo = (idx) => { setFormData({ ...formData, apodos: formData.apodos.filter((_, i) => i !== idx) }); };
  const updateApodo = (idx, val) => {
    const nuevos = [...formData.apodos];
    nuevos[idx] = val;
    setFormData({ ...formData, apodos: nuevos });
  };

  const handleKitColorChange = (part, idx, value) => {
    setFormData(previous => ({ ...previous, equipacion: part === 'texto'
      ? { ...previous.equipacion, texto: value }
      : { ...previous.equipacion, [part]: { ...previous.equipacion[part], colores: previous.equipacion[part].colores.map((color, index) => index === idx ? value : color) } }
    }));
  };

  const addKitColor = (part) => {
    const max = part === 'camiseta' ? 4 : 2;
    setFormData(previous => previous.equipacion[part].colores.length >= max ? previous : ({ ...previous,
      equipacion: { ...previous.equipacion, [part]: { ...previous.equipacion[part], colores: [...previous.equipacion[part].colores, '#FFFFFF'] } }
    }));
  };

  const removeKitColor = (part, idx) => {
    const min = part === 'camiseta' ? 2 : 1;
    setFormData(previous => previous.equipacion[part].colores.length <= min ? previous : ({ ...previous,
      equipacion: { ...previous.equipacion, [part]: { ...previous.equipacion[part], colores: previous.equipacion[part].colores.filter((_, index) => index !== idx) } }
    }));
  };

  const setKitDesign = (part, diseno) => {
    setFormData(previous => ({ ...previous, equipacion: { ...previous.equipacion, [part]: { ...previous.equipacion[part], diseno } } }));
  };

                                 
  const handleFinalSubmit = async () => {
    if (submitLock.current || validatingLogo) return;
    const validationError = validateClubForm(formData, LIGAS_DISPONIBLES);
    if (validationError) return toast.error(validationError);
    submitLock.current = true;
    setIsSubmitting(true);
    const toastId = toast.loading('Creando tu club...');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');

      let finalLogoUrl = null;
      if (formData.logoFile) {
        const fileExt = await validateLogoFile(formData.logoFile);
        const fileName = `${user.id}_logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos_clubes').upload(fileName, formData.logoFile, { upsert: true, contentType: formData.logoFile.type });
        if (uploadError) throw new Error('No se pudo subir el escudo. Comprueba tu conexión y vuelve a intentarlo.');
        const { data: { publicUrl } } = supabase.storage.from('logos_clubes').getPublicUrl(fileName);
        finalLogoUrl = publicUrl;
      }

      const teamData = {
        user_id: user.id,
        nombre: formData.nombre.trim(),
        abreviatura: formData.abreviatura.trim(),
        logo_url: finalLogoUrl,
        liga: formData.liga?.nombre || 'Resto del Mundo',
        colores: formData.equipacion.camiseta.colores,
        estadio: formData.estadio.trim(),
        apodos: formData.apodos.map(a => a.trim()).filter(Boolean)
      };

      const savedClub = await saveClubIdentity(supabase, teamData, user.id);
      toast.success('Club creado correctamente.', { id: toastId });
      
      onComplete(savedClub);
    } catch (err) {
      console.error("Error fundando club:", err);
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el club. Comprueba tu conexión y vuelve a intentarlo.', { id: toastId });
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const stepInfo = {
    logo: { titulo: 'EMBLEMA DEL CLUB', desc: 'Sube el escudo que representará a tu franquicia en el mundo. Usa PNG o JPG de hasta 2 MB. Se recomienda un escudo cuadrado con fondo transparente.' },
    nombre: { titulo: 'IDENTIDAD', desc: 'Forja tu propia leyenda. Ingresa el nombre de tu equipo (Máx. 20 caracteres) y una abreviatura de exactamente 3 letras obligatorias.' },
    liga: { titulo: 'SELECCIÓN DE LIGA', desc: 'Elige la liga donde comenzará tu camino hacia la gloria y establecerás la sede de tu equipo.' },
    colores: { titulo: 'EQUIPACIÓN', desc: 'Diseña la indumentaria de tu club. Personaliza patrones y colores de forma independiente para la camiseta, los shorts y el dorsal.' },
    estadio: { titulo: 'TU FORTALEZA', desc: 'Nombra el coliseo donde tus rivales temerán jugar. Será tu hogar y fortaleza inexpugnable.' },
    apodos: { titulo: 'LA HINCHADA', desc: '¿Cómo gritará la grada tu nombre? Configura hasta 3 apodos oficiales para tu club (Al menos 1 es obligatorio).' }
  };

  const renderForm = () => {
    const info = stepInfo[step];
    if (!info) return null; 

    return (
      <div className="w-full flex flex-col justify-center flex-1 z-10 px-10 lg:px-20 py-12">
        <div className="mb-10">
          <span className="text-black/50 font-black uppercase tracking-[0.3em] text-[10px] md:text-[11px] mb-3 block">
            PASO ACTUAL: {step.toUpperCase()}
          </span>
          <h2 className="text-5xl md:text-6xl lg:text-[4.5rem] font-black italic uppercase tracking-tighter text-white leading-none mb-6 drop-shadow-sm">
            {info.titulo}
          </h2>
          <p className="text-black/80 text-[10px] md:text-xs uppercase tracking-widest font-black leading-relaxed max-w-xl">
            {info.desc}
          </p>
        </div>

        <div className="w-full max-w-xl">
          {step === 'logo' && (
            <label htmlFor="logo-upload" className="w-full h-48 border-[3px] border-dashed border-white/30 rounded-2xl bg-black/10 flex flex-col items-center justify-center gap-4 hover:bg-black/20 hover:border-white transition-all cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.1)] group">
              <input id="logo-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImageUpload} />
              <Upload size={36} className="text-white group-hover:-translate-y-2 transition-transform drop-shadow-md" />
              <span className="text-black font-black uppercase tracking-[0.2em] text-xs bg-white px-8 py-3 rounded-xl shadow-md">
                {formData.logoFile ? 'CAMBIAR ESCUDO' : 'SUBIR ESCUDO'}
              </span>
            </label>
          )}

          {step === 'nombre' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-black/60 font-black uppercase tracking-widest text-[10px]">Nombre del Club (Máx 20)</label>
                <input type="text" maxLength={20} placeholder="Ej: Trueno FC" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="bg-black/10 border-2 border-transparent px-6 py-4 rounded-xl text-white font-black text-xl outline-none focus:border-white focus:bg-black/20 transition-all placeholder:text-white/40 shadow-inner" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-black/60 font-black uppercase tracking-widest text-[10px]">Abreviatura (3 Letras exactas)</label>
                <input type="text" maxLength={3} placeholder="Ej: TRU" value={formData.abreviatura} onChange={(e) => setFormData({...formData, abreviatura: e.target.value.toUpperCase()})} className="bg-black/10 border-2 border-transparent px-6 py-4 rounded-xl text-white font-black text-2xl outline-none focus:border-white focus:bg-black/20 transition-all placeholder:text-white/40 uppercase w-48 text-center shadow-inner" />
              </div>
            </div>
          )}

          {step === 'liga' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[40vh] overflow-y-auto custom-scrollbar pr-4">
              {LIGAS_DISPONIBLES.map((liga) => (
                <button key={liga.id} onClick={() => setFormData({...formData, liga})} className={`p-4 flex items-center justify-between text-left font-black uppercase tracking-widest text-[11px] border-[3px] rounded-xl transition-all ${formData.liga?.id === liga.id ? 'bg-white text-black border-white shadow-lg' : 'bg-black/10 text-white/90 border-transparent hover:border-white/30 hover:bg-black/20'}`}>
                  {liga.nombre}
                </button>
              ))}
            </div>
          )}

          {step === 'colores' && (
            <div className="flex flex-col bg-black/10 rounded-2xl overflow-hidden shadow-inner">
              <div className="flex bg-black/20">
                {['camiseta', 'short', 'texto'].map(t => (
                  <button key={t} onClick={() => setKitTab(t)} className={`flex-1 py-4 font-black uppercase tracking-widest text-[10px] transition-colors ${kitTab === t ? 'bg-white text-black' : 'text-white/70 hover:bg-black/10'}`}>{t}</button>
                ))}
              </div>

              <div className="p-6 flex flex-col gap-6">
                {kitTab !== 'texto' && (
                  <div>
                    <span className="text-white/70 font-black uppercase tracking-widest text-[10px] block mb-3">Patrón de Diseño</span>
                    <div className="flex flex-wrap gap-2">
                      {['solido', ...(kitTab === 'camiseta' ? ['franjas', 'mitad', 'diagonal'] : []), ...(kitTab === 'short' ? ['lateral'] : [])].map(d => (
                        <button key={d} onClick={() => setKitDesign(kitTab, d)} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.equipacion[kitTab].diseno === d ? 'bg-white text-black border-white shadow-md' : 'bg-transparent text-white/50 border-white/20 hover:border-white/50'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/70 font-black uppercase tracking-widest text-[10px]">
                      Colores ({kitTab === 'texto' ? 1 : formData.equipacion[kitTab].colores.length}/{kitTab === 'camiseta' ? 4 : kitTab === 'short' ? 2 : 1})
                    </span>
                    {kitTab !== 'texto' && (
                      <button onClick={() => addKitColor(kitTab)} disabled={formData.equipacion[kitTab].colores.length >= (kitTab === 'camiseta' ? 4 : 2)} className="p-1.5 bg-black/20 rounded hover:bg-black text-white transition-colors disabled:opacity-30"><Plus size={14}/></button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {kitTab === 'texto' ? (
                      <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-transparent hover:border-white/10 transition-colors">
                        <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">Color Dorsal</span>
                        <input type="color" value={formData.equipacion.texto} onChange={(e) => handleKitColorChange('texto', 0, e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                      </div>
                    ) : (
                      formData.equipacion[kitTab].colores.map((color, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-transparent hover:border-white/10 transition-colors">
                          <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">Color {idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <input type="color" value={color} onChange={(e) => handleKitColorChange(kitTab, idx, e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                            {idx >= (kitTab === 'camiseta' ? 2 : 1) && (
                              <button onClick={() => removeKitColor(kitTab, idx)} className="text-red-800 hover:text-red-500 bg-black/20 p-1.5 rounded"><Minus size={14}/></button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'estadio' && (
            <div className="flex flex-col gap-2">
              <label className="text-black/60 font-black uppercase tracking-widest text-[10px]">Nombre del Estadio</label>
              <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50" size={24} />
                <input type="text" maxLength={30} placeholder="Ej: Monumental THC" value={formData.estadio} onChange={(e) => setFormData({...formData, estadio: e.target.value})} className="w-full bg-black/10 border-2 border-transparent pl-16 pr-6 py-5 rounded-xl text-white font-black text-xl outline-none focus:border-white focus:bg-black/20 transition-all placeholder:text-white/40 shadow-inner" />
              </div>
            </div>
          )}

          {step === 'apodos' && (
            <div className="flex flex-col gap-4">
              {formData.apodos.map((apodo, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-black/60 font-black uppercase tracking-widest text-[9px]">Apodo {idx + 1} {idx === 0 && '(Obligatorio)'}</label>
                    <input type="text" maxLength={15} placeholder={idx === 0 ? "Ej: Los Truenos" : "Opcional"} value={apodo} onChange={(e) => updateApodo(idx, e.target.value)} className="w-full bg-black/10 border-2 border-transparent px-5 py-4 rounded-xl text-white font-black text-lg outline-none focus:border-white focus:bg-black/20 transition-all placeholder:text-white/40 shadow-inner" />
                  </div>
                  {idx > 0 && (
                    <button onClick={() => removeApodo(idx)} className="mt-4 p-4 bg-red-600/20 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-colors"><Trash2 size={20}/></button>
                  )}
                </div>
              ))}
              {formData.apodos.length < 3 && (
                <button onClick={addApodo} className="mt-2 py-4 border-[3px] border-dashed border-black/20 text-black/60 hover:text-black hover:border-black/50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                  + AÑADIR OTRO APODO
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    );
  };

                                               
                                             
                                               
  const renderPreview = () => {
    const cam = formData.equipacion.camiseta;
    const sho = formData.equipacion.short;
    const c1 = cam.colores[0];
    const c2 = cam.colores[1] || c1;
    const s1 = sho.colores[0];
    const s2 = sho.colores[1] || s1;

    return (
      <motion.div
        key={`prev-${step}`}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}
        className="w-full h-full flex flex-col items-center justify-center relative z-10"
      >
        {step === 'logo' && (
          <div className="relative w-64 h-64 md:w-[22rem] md:h-[22rem] flex items-center justify-center">
            {!formData.logoUrl ? (
              <h1 className="text-white text-[8rem] font-black italic">???</h1>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full h-full flex items-center justify-center">
                <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" />
              </motion.div>
            )}
          </div>
        )}

        {step === 'nombre' && (
          <div className="text-center flex flex-col items-center">
             {formData.logoUrl && <img src={formData.logoUrl} className="w-20 h-20 object-contain mb-6 opacity-60 drop-shadow-xl" alt="Logo" />}
             <h2 className="text-white text-[8rem] md:text-[10rem] font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">{formData.abreviatura || '???'}</h2>
             <h3 className="text-white/80 text-xl md:text-3xl font-black uppercase tracking-[0.3em] mt-4">{formData.nombre || 'NOMBRE DEL CLUB'}</h3>
          </div>
        )}

        {step === 'liga' && (
          <div className="flex flex-col items-center text-center">
            {formData.liga && formData.liga.logo ? (
               <img src={formData.liga.logo} alt="Liga" className="w-40 h-40 md:w-56 md:h-56 object-contain mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
            ) : (
               <div className="mb-8"><Trophy size={100} className="text-white/20" /></div>
            )}
            <h2 className="text-white text-4xl md:text-6xl font-black italic uppercase tracking-tighter max-w-xl drop-shadow-lg">{formData.liga ? formData.liga.nombre : 'SELECCIONA'}</h2>
          </div>
        )}

        {step === 'colores' && (
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 120 180" className="w-64 md:w-80 h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] relative z-10">
              <defs>
                <linearGradient id="mitad" x1="0" y1="0" x2="1" y2="0"><stop offset="50%" stopColor={c1} /><stop offset="50%" stopColor={c2} /></linearGradient>
                <linearGradient id="diagonal" x1="0" y1="0" x2="1" y2="1"><stop offset="50%" stopColor={c1} /><stop offset="50%" stopColor={c2} /></linearGradient>
                <pattern id="franjas" width="20" height="20" patternUnits="userSpaceOnUse">
                  {cam.colores.map((c, i) => <rect key={i} x={(20/cam.colores.length)*i} width={20/cam.colores.length} height="20" fill={c} />)}
                </pattern>
              </defs>
              
                                                              
              <path d="M 40 10 C 45 20, 75 20, 80 10 L 110 30 L 100 50 L 90 40 L 90 100 L 30 100 L 30 40 L 20 50 L 10 30 Z" 
                    fill={cam.diseno === 'mitad' ? 'url(#mitad)' : cam.diseno === 'diagonal' ? 'url(#diagonal)' : cam.diseno === 'franjas' ? 'url(#franjas)' : c1} 
                    stroke="#000" strokeWidth="2" strokeLinejoin="round" />
              
                                                 
              <text x="60" y="75" textAnchor="middle" fill={formData.equipacion.texto} fontSize="35" fontWeight="900" fontStyle="normal" style={{fontFamily: 'sans-serif'}}>10</text>

                                        
              <path d="M 30 105 L 90 105 L 95 155 L 65 155 L 60 135 L 55 155 L 25 155 Z" 
                    fill={s1} stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                                          
              {sho.diseno === 'lateral' && sho.colores.length > 1 && (
                <>
                  <path d="M 30 105 L 35 105 L 30 155 L 25 155 Z" fill={s2} />
                  <path d="M 90 105 L 85 105 L 90 155 L 95 155 Z" fill={s2} />
                </>
              )}
            </svg>
          </div>
        )}

        {step === 'estadio' && (
          <div className="text-center flex flex-col items-center">
            <h2 className="text-white text-5xl md:text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl px-4">{formData.estadio || 'ESTADIO'}</h2>
            <span className="text-white/40 text-sm font-black uppercase tracking-[0.4em] mt-6">{formData.liga?.nombre}</span>
          </div>
        )}

        {step === 'apodos' && (
          <div className="text-center flex flex-col items-center gap-8">
            {formData.apodos.map((apodo, i) => apodo && (
              <h2 key={i} className="text-white text-4xl md:text-6xl font-black italic uppercase tracking-tighter drop-shadow-lg">"{apodo}"</h2>
            ))}
          </div>
        )}

                                                                 
        {step === 'resumen' && (
          <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 text-center lg:text-left px-8">
            <div className="flex flex-col items-center lg:items-end shrink-0">
               <img src={formData.logoUrl} className="w-48 h-48 md:w-64 md:h-64 object-contain mb-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" alt="Logo" />
               <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-none drop-shadow-2xl">{formData.nombre}</h2>
               <span className="text-[#F97316] text-3xl font-black uppercase tracking-[0.5em] mt-2 drop-shadow-md">{formData.abreviatura}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-10 bg-black/40 p-10 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-2xl w-full max-w-lg">
              <div><span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1">LIGA</span><span className="text-white font-black text-sm uppercase">{formData.liga?.nombre}</span></div>
              <div><span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1">ESTADIO</span><span className="text-white font-black text-sm uppercase">{formData.estadio}</span></div>
              <div><span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-1">HINCHADA</span><span className="text-white font-black text-sm uppercase">{formData.apodos[0]}</span></div>
              <div>
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">COLORES OFICIALES</span>
                <div className="flex gap-2">
                  {formData.equipacion.camiseta.colores.map((c, i) => <div key={i} className="w-5 h-5 rounded-full border border-white/20 shadow-md" style={{backgroundColor: c}}></div>)}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex w-full h-full font-sans bg-[#020100] overflow-hidden">
      
                                                              
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <Particles />
      </div>

                                          
      <div className="absolute top-8 left-8 z-[100]">
        {step !== 'resumen' && (
          <button onClick={prevStep} disabled={step === 'logo'} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/60 hover:text-black transition-colors outline-none disabled:opacity-0 disabled:pointer-events-none">
            <ArrowLeft size={16} /> VOLVER
          </button>
        )}
      </div>

                                                    
                                                                  
                                                    
      <AnimatePresence mode="wait">
        {step !== 'resumen' && (
          <motion.div 
            key={`left-panel-${step}`} 
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute left-0 top-0 bottom-0 w-full lg:w-[60%] flex flex-col z-20 shadow-[30px_0_50px_rgba(0,0,0,0.8)] bg-[#f28a13]"
          >
            <div className="flex items-center gap-3 p-8 lg:p-12 shrink-0 relative z-20">
              <img src={LogoUT} alt="THC Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-black text-sm font-black italic tracking-[0.2em] uppercase">THC: UT</h1>
            </div>
            <div className="flex-1 flex flex-col relative z-20 overflow-hidden pt-4">
              {renderForm()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

                                                    
                                                        
                                                    
      <motion.div 
        animate={{ width: step === 'resumen' ? '100%' : '40%' }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        className="absolute right-0 top-0 bottom-0 bg-transparent flex flex-col items-center justify-center z-10 overflow-hidden"
      >
        <div className="w-full h-full flex flex-col p-12 relative z-10">
          <AnimatePresence mode="wait">
            {renderPreview()}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="absolute bottom-12 right-12 z-[9999]">
        <AnimatePresence>
          {isStepValid() && (
            <motion.button 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              onClick={step === 'resumen' ? handleFinalSubmit : nextStep}
              disabled={isSubmitting || validatingLogo}
              className="flex items-center gap-4 bg-white text-[#050505] px-12 py-5 rounded font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-[#F97316] transition-colors outline-none shadow-[0_10px_40px_rgba(0,0,0,0.6)] group disabled:opacity-50"
            >
              {isSubmitting ? 'CREANDO CLUB...' : (step === 'resumen' ? 'FUNDAR FRANQUICIA' : 'CONTINUAR')}
              {!isSubmitting && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
