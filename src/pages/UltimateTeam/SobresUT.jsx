import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { JUGADORES_BASE } from './data/jugadoresBase';
import { catalogCard, EXAMPLE_CARD, isUtSchemaMissing, utRequestError } from './utCards';
import { openUtPack, readPendingUtPack } from './packRequestsUT';
import PlayerCardUT from './PlayerCardUT';
import PlayerCardDetailsUT from './PlayerCardDetailsUT';
import './SobresUT.css';

function Pack({name='THC BASE',quantity=5,opening=false}) {
  return <span className={`ut-pack-art ${opening?'is-opening':''}`} aria-hidden="true"><span className="ut-pack-art__lid"/><span className="ut-pack-art__body"><span className="ut-pack-art__brand">THC</span><b>UT</b><i>{name}</i><span className="ut-pack-art__quantity">{quantity} JUGADORES</span></span><span className="ut-pack-art__shine"/></span>;
}

export default function SobresUT({onVolver,isTutorial=false,onTutorialComplete,initialView='sobres'}) {
  const [view,setView]=useState(initialView);
  const [phase,setPhase]=useState('closed');
  const [packs,setPacks]=useState([]);
  const [catalog,setCatalog]=useState([]);
  const [userId,setUserId]=useState(null);
  const [loading,setLoading]=useState(!isTutorial);
  const [error,setError]=useState('');
  const [available,setAvailable]=useState(0);
  const [attempt,setAttempt]=useState(0);
  const [page,setPage]=useState(0);
  const [search,setSearch]=useState('');
  const [query,setQuery]=useState('');
  const [position,setPosition]=useState('');
  const [selectedPack,setSelectedPack]=useState(0);
  const [cards,setCards]=useState([]);
  const [detail,setDetail]=useState(null);
  const closeDetail=useCallback(()=>setDetail(null),[]);
  const [opening,setOpening]=useState(false);
  const [pending,setPending]=useState(null);
  const lock=useRef(false);
  const timer=useRef(null);
  const reduced=useReducedMotion();
  const pack=packs[selectedPack];
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{const debounce=setTimeout(()=>{setQuery(search.trim());setPage(0);},250);return()=>clearTimeout(debounce);},[search]);
  useEffect(()=>{
    if(isTutorial)return;
    let cancelled=false;
    const load=async()=>{
      setLoading(true);setError('');
      try{
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError||!user)throw new Error('Inicia sesión para ver tus sobres.');
        if(cancelled)return;setUserId(user.id);setPending(readPendingUtPack(localStorage,user.id));
        if(view==='sobres'){
          const [inventory,count]=await Promise.all([supabase.from('ut_sobres_inventario').select('id,tipo_id,estado,tipo:ut_sobres_catalogo(id,nombre,cantidad_cartas)').eq('user_id',user.id).eq('estado','disponible').order('adquirido_en',{ascending:true}).range(page*12,page*12+11),supabase.from('ut_sobres_inventario').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('estado','disponible')]);
          if(inventory.error||count.error)throw inventory.error||count.error;
          if(!cancelled){setPacks(inventory.data||[]);setAvailable(count.count||0);setSelectedPack(0);}
        }else{
          let catalogQuery=supabase.from('ut_cartas').select('*').or('activa.eq.true,es_ejemplo.eq.true').order('grl',{ascending:false}).order('id',{ascending:true});
          if(query)catalogQuery=catalogQuery.ilike('nombre',`%${query.replace(/[%_,()\\]/g,'')}%`);
          if(position)catalogQuery=catalogQuery.eq('posicion',position);
          const result=await catalogQuery.range(page*24,page*24+23);
          if(result.error)throw result.error;
          if(!cancelled)setCatalog((result.data||[]).map(card=>catalogCard(card)));
        }
      }catch(err){if(!cancelled){setError(isUtSchemaMissing(err)?'El catálogo está en preparación.':utRequestError(err,'No se pudo cargar el apartado.'));if(isUtSchemaMissing(err)){setPacks([]);setAvailable(0);setCatalog([]);}}}
      finally{if(!cancelled)setLoading(false);}
    };void load();return()=>{cancelled=true;};
  },[isTutorial,view,page,query,position,attempt]);

  const open=async()=>{
    if(lock.current||(!isTutorial&&!pack&&!pending))return;
    lock.current=true;setOpening(true);setError('');
    try{
      if(isTutorial)setCards(JUGADORES_BASE);
      else{
        const receipt=await openUtPack(supabase,pending?.packId||pack.id,userId,localStorage);
        setCards(receipt.cartas.map(row=>catalogCard(row.carta,row.id)));setPending(null);
        setPacks(current=>current.filter(item=>item.id!==(pending?.packId||pack.id)));setAvailable(count=>Math.max(0,count-1));
      }
      setPhase('opening');timer.current=setTimeout(()=>setPhase('revealed'),reduced?100:1850);
    }catch(err){setPending(readPendingUtPack(localStorage,userId));setError(utRequestError(err,'No se pudo confirmar la apertura. Vuelve a intentarlo.'));}
    finally{lock.current=false;setOpening(false);}
  };
  const finish=()=>{if(isTutorial)onTutorialComplete?.(JUGADORES_BASE);else{setPhase('closed');setSelectedPack(0);setAttempt(n=>n+1);}};
  const changeView=next=>{if(opening||phase==='opening')return;setView(next);setPage(0);setDetail(null);};
  const preview=catalog.length?catalog:(!query&&!position&&page===0?[EXAMPLE_CARD]:[]);
  return <div className="ut-packs" inert={Boolean(detail)}>
    <header className="ut-packs__header"><button onClick={onVolver} disabled={opening||phase==='opening'||isTutorial}><ArrowLeft size={18}/> Regresar</button><span>THC: <b>ULTIMATE TEAM</b></span>{!isTutorial&&<nav aria-label="Sobres y cartas"><button aria-current={view==='sobres'?'page':undefined} onClick={()=>changeView('sobres')}>Mis sobres</button><button aria-current={view==='catalogo'?'page':undefined} onClick={()=>changeView('catalogo')}>Catálogo</button></nav>}</header>
    <AnimatePresence mode="wait">
      {phase==='closed'&&view==='sobres'&&<motion.main key="packs" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="ut-packs__room"><div className="ut-packs__heading"><h1>SOBRES<span>.</span></h1><span>{isTutorial?'Tu primer equipo':`${available} ${available===1?'disponible':'disponibles'}`}</span></div><span className="ut-packs__room-word" aria-hidden="true">TRUENO</span>
        <div className="ut-packs__stage"><button className="ut-packs__pack-button" onClick={()=>void open()} disabled={loading||opening||(!isTutorial&&!pack&&!pending)} aria-label={isTutorial?'Abrir sobre inicial':pending?'Confirmar apertura del sobre':pack?`Abrir ${pack.tipo?.nombre||'sobre'}`:'Sin sobres disponibles'}><Pack name={isTutorial?'INICIAL':pack?.tipo?.nombre||'THC BASE'} quantity={isTutorial?23:pack?.tipo?.cantidad_cartas||5}/></button><div className="ut-packs__floor"/></div>
        <div className="ut-packs__bottom">{loading?<p role="status">Cargando sobres…</p>:opening?<p role="status">Confirmando apertura…</p>:pending?<button className="ut-packs__primary" onClick={()=>void open()}>Confirmar apertura</button>:isTutorial||pack?<button className="ut-packs__primary" onClick={()=>void open()}>Abrir sobre <ArrowUpRight size={20}/></button>:<><p>Aún no tienes sobres.</p><button onClick={()=>changeView('catalogo')}>Explorar cartas <ArrowUpRight size={18}/></button></>}{error&&<p className="ut-packs__error" role="alert">{error}<button onClick={()=>setAttempt(n=>n+1)} aria-label="Actualizar sobres"><RefreshCw size={16}/></button></p>}{packs.length>1&&<div className="ut-packs__selector">{packs.map((item,i)=><button key={item.id} className={i===selectedPack?'is-active':''} onClick={()=>setSelectedPack(i)} aria-label={`Sobre ${i+1}: ${item.tipo?.nombre||'THC'}`}>{i+1}</button>)}</div>}{!isTutorial&&available>12&&<div className="ut-packs__pagination"><button disabled={page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span>{page+1}</span><button disabled={packs.length<12} onClick={()=>setPage(n=>n+1)}>Siguiente</button></div>}</div>
      </motion.main>}
      {phase==='closed'&&view==='catalogo'&&<motion.main key="catalog" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} className="ut-packs__catalog"><div className="ut-packs__heading"><h1>LAS CARTAS<span>.</span></h1><span>Tu próximo once está aquí.</span></div><div className="ut-packs__filters"><label><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar jugador" aria-label="Buscar jugador"/></label><select aria-label="Filtrar por posición" value={position} onChange={e=>{setPosition(e.target.value);setPage(0);}}><option value="">Todas las posiciones</option>{['GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST','CF'].map(pos=><option key={pos}>{pos}</option>)}</select></div>{error&&<p className="ut-packs__error" role="status">{error}</p>}{loading?<p role="status">Cargando cartas…</p>:<><div className="ut-packs__cards">{preview.map(player=><button key={player.id} onClick={()=>setDetail(player)} aria-label={`Ver estadísticas de ${player.nombre}`}><PlayerCardUT player={player}/><span>{player.ejemplo?'Muestra de diseño':player.nombre}</span></button>)}</div>{preview.length===0&&<p>No se encontraron cartas.</p>}<div className="ut-packs__pagination"><button disabled={page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span>Página {page+1}</span><button disabled={catalog.length<24} onClick={()=>setPage(n=>n+1)}>Siguiente</button></div></>}</motion.main>}
      {phase==='opening'&&<motion.div key="opening" className="ut-packs__opening" initial={{opacity:0}} animate={{opacity:1}}><span className="ut-packs__opening-ring"/><Pack name={isTutorial?'INICIAL':'THC'} quantity={cards.length} opening/><span className="ut-packs__opening-flash"/></motion.div>}
      {phase==='revealed'&&<motion.main key="revealed" className="ut-packs__reveal" initial={{opacity:0}} animate={{opacity:1}}><div className="ut-packs__heading"><h1>{isTutorial?'TU PRIMER ONCE':'NUEVAS CARTAS'}<span>.</span></h1><span>{cards.length} jugadores{!isTutorial?' guardados en tu club':''}</span></div><div className="ut-packs__cards">{cards.map((player,i)=><motion.button type="button" key={player.id} aria-label={`Ver carta de ${player.nombre}`} onClick={()=>setDetail(player)} initial={reduced?false:{opacity:0,y:40,rotateY:85}} animate={{opacity:1,y:0,rotateY:0}} transition={{delay:Math.min(i*.1,1.2),duration:.5}}><PlayerCardUT player={player}/></motion.button>)}</div><button className="ut-packs__primary" onClick={finish}>{isTutorial?'Continuar':'Continuar en Sobres'} <ArrowUpRight size={20}/></button></motion.main>}
    </AnimatePresence>
    {detail&&<PlayerCardDetailsUT player={detail} onClose={closeDetail}/>}
  </div>;
}
