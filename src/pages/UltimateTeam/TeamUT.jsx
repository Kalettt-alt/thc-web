import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRightLeft, Check, RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { normalizePlayerList } from './utValidation';
import { addSquadCard, arrangeSquad, canSwapSquadCards, effectivePlayerGrl, effectiveSquadOverall, repairSquad, SQUAD_FORMATIONS, swapSquadCards, validateStartingSquad } from './squadUT';
import { catalogCard, clampCardRating, displayCardPosition, isUtSchemaMissing, utRequestError } from './utCards';
import { saveUtSquad } from './squadPersistenceUT';
import PlayerCardUT from './PlayerCardUT';
import PlayerCardDetailsUT from './PlayerCardDetailsUT';
import ClubIdentityLogoUT from './ClubIdentityLogoUT';
import SquadPitchUT from './SquadPitchUT';
import './TeamUT.css';

const emptySquad = { titulares:[], suplentes:[], reservas:[], formacion:'4-3-3' };
export default function TeamUT({ onVolver, tutorialData = null, clubData = null, onSaved }) {
  const [stored, setStored] = useState(emptySquad);
  const tutorialSquad = useMemo(()=>tutorialData ? repairSquad(tutorialData).squad : null,[tutorialData]);
  const squad = tutorialSquad || stored;
  const [loadedClub, setClub] = useState({nombre:'Mi club'});
  const club = clubData || loadedClub;
  const [userId, setUserId] = useState(null);
  const [loading,setLoading] = useState(!tutorialData);
  const [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  const [selected,setSelected] = useState(null);
  const [detail,setDetail] = useState(null);
  const closeDetail = useCallback(()=>setDetail(null),[]);
  const [repaired,setRepaired] = useState(false);
  const [dirty,setDirty] = useState(false);
  const [saving,setSaving] = useState(false);
  const [exitPrompt,setExitPrompt] = useState(false);
  const [clubOpen,setClubOpen] = useState(false);
  const [clubCards,setClubCards] = useState([]);
  const [clubPage,setClubPage] = useState(0);
  const [clubLoading,setClubLoading] = useState(false);
  const [clubError,setClubError] = useState('');
  const lock = useRef(false);
  const reduced = useReducedMotion();
  const formation = SQUAD_FORMATIONS[squad.formacion] ? squad.formacion : '4-3-3';
  const slots = SQUAD_FORMATIONS[formation];
  const selectedPlayer = selected ? squad[selected.section]?.[selected.index] : null;
  const players = [...squad.titulares,...squad.suplentes,...squad.reservas].filter(Boolean);
  const rating = effectiveSquadOverall(squad);
  const readiness = validateStartingSquad(squad);
  const missing = [...new Set(readiness.missingPositions)].map(displayCardPosition).join(', ');

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      try {
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError||!user)throw new Error('Inicia sesión para cargar tu plantilla.');
        const [team,result]=await Promise.all([
          supabase.from('equipos_ut').select('user_id,nombre,abreviatura,logo_url,liga,colores').eq('user_id',user.id).maybeSingle(),
          tutorialData ? Promise.resolve({data:null,error:null}) : supabase.from('plantillas_ut').select('*').eq('user_id',user.id).maybeSingle()
        ]);
        if(team.error||result.error)throw team.error||result.error;
        if(cancelled)return;
        setUserId(user.id);
        if(team.data)setClub(team.data);
        if(result.data){
          const loaded = {...result.data,titulares:normalizePlayerList(result.data.titulares,11),suplentes:normalizePlayerList(result.data.suplentes,7),reservas:normalizePlayerList(result.data.reservas,100)};
          const fixed = repairSquad(loaded);
          setStored(fixed.squad);setDirty(fixed.changed);setRepaired(fixed.changed);
        }
      }catch(err){if(!cancelled)setError(utRequestError(err,'No se pudo cargar tu plantilla.'));}
      finally{if(!cancelled)setLoading(false);}
    };
    void load();return()=>{cancelled=true;};
  },[tutorialData,attempt]);

  useEffect(()=>{
    if(!clubOpen||!userId)return;
    let cancelled=false;
    const load=async()=>{
      setClubLoading(true);setClubError('');
      try{
        const {data,error:loadError}=await supabase.from('ut_cartas_club').select('id,carta:ut_cartas(*)').eq('user_id',userId).order('adquirido_en',{ascending:false}).range(clubPage*24,clubPage*24+23);
        if(loadError)throw loadError;
        if(!cancelled)setClubCards((data||[]).filter(row=>row.carta).map(row=>catalogCard(row.carta,row.id)));
      }catch(err){if(!cancelled)setClubError(isUtSchemaMissing(err)?'Todavía no tienes un catálogo de cartas activo.':utRequestError(err,'No se pudieron cargar tus cartas.'));}
      finally{if(!cancelled)setClubLoading(false);}
    };void load();return()=>{cancelled=true;};
  },[clubOpen,clubPage,userId]);

  useEffect(()=>{
    if(!dirty)return;
    const warn=event=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);

  const change = next=>{if(tutorialData||lock.current||next===squad)return;setStored(next);setDirty(true);setSelected(null);setDetail(null);};
  const move = (from,to)=>{
    if(!canSwapSquadCards(squad,from,to))return;
    change(swapSquadCards(squad,from,to));
  };
  const choose = slot=>{
    if(tutorialData||saving)return;
    if(!selected){const player=squad[slot.section]?.[slot.index];if(player)setDetail({player,slot});else setSelected(slot);return;}
    if(selected.section===slot.section&&selected.index===slot.index){setSelected(null);return;}
    move(selected,slot);
  };
  const addCard = player=>{
    if(players.some(p=>p.id===player.id))return;
    const next=addSquadCard(squad,player,selected);
    if(next===squad){toast.error('Haz espacio en las reservas antes de incorporar otra carta.');return;}
    change(next);setClubOpen(false);
  };
  const save = async()=>{
    if(lock.current||tutorialData)return;
    lock.current=true;setSaving(true);
    try{const result=await saveUtSquad(supabase,squad,userId);const fixed=repairSquad(result);setStored(fixed.squad);setDirty(fixed.changed);setRepaired(fixed.changed);onSaved?.(fixed.squad);toast.success(fixed.changed?'Plantilla corregida. Vuelve a guardar los puestos.':'Plantilla guardada.');}
    catch(err){toast.error(utRequestError(err,'No se pudo guardar la plantilla.'));}
    finally{lock.current=false;setSaving(false);}
  };
  const leave=()=>{if(saving)return;if(dirty)setExitPrompt(true);else onVolver();};
  const renderSlot=(section,index,position)=>{
    const player=squad[section]?.[index];
    const active=selected?.section===section&&selected.index===index;
    const accepts=selected&&canSwapSquadCards(squad,selected,{section,index});
    const effective=position&&player?effectivePlayerGrl(player,position[0]):player?.grl;
    const penalty=player&&position?clampCardRating(player.grl)-effective:0;
    const cardPlayer=player&&position?{...player,grl:effective}:player;
    return <motion.button type="button" key={player?.id || `${section}-${index}`} layoutId={player?.id ? `ut-squad-${player.id}` : undefined} layout transition={{type:'spring',stiffness:250,damping:28,duration:reduced?0:undefined}} className={`ut-squad-slot ${active?'is-selected':''} ${accepts?'is-swap-target':''} ${section==='titulares'?'ut-squad-slot--field':''}`} style={position ? {left:`${position[1]}%`,top:`${position[2]}%`}:undefined} onClick={()=>choose({section,index})} disabled={saving||Boolean(tutorialData)} aria-label={`${position?.[0] || (section==='suplentes'?'Suplente':'Reserva')} ${player?.nombre || 'vacío'}${player ? `, GRL ${effective}${penalty?`, menos ${penalty} por posición`:''}`:''}`} aria-pressed={active} draggable={Boolean(player)&&!saving&&!tutorialData} onDragStart={event=>{event.dataTransfer.setData('application/x-thc-card',JSON.stringify({section,index}));setSelected({section,index});}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();try{const from=JSON.parse(event.dataTransfer.getData('application/x-thc-card'));move(from,{section,index});}catch{setSelected(null);}}}><PlayerCardUT player={cardPlayer} compact selected={active} emptyPosition={displayCardPosition(position?.[0])}/>{penalty>0&&<span className="ut-squad-slot__penalty">−{penalty} GRL</span>}{position&&<span className="ut-squad-slot__position">{displayCardPosition(position[0])}</span>}</motion.button>;
  };
  if(loading)return <div className="ut-squad-state" role="status">Cargando My Team…</div>;
  if(error)return <div className="ut-squad-state" role="alert"><p>{error}</p><button onClick={()=>{setError('');setLoading(true);setAttempt(n=>n+1);}}>Reintentar</button><button onClick={onVolver}>Regresar</button></div>;
  return <div className="ut-squad" role="dialog" aria-modal="true" aria-label="My Team Ultimate Team" onKeyDown={event=>{if(event.key==='Escape'){setSelected(null);setClubOpen(false);}}}>
    <aside className="ut-squad__sidebar" inert={Boolean(detail||clubOpen||exitPrompt)}>
      <button autoFocus className="ut-squad__back" onClick={leave} disabled={saving}><ArrowLeft size={17}/> Regresar</button>
      <span className="ut-squad__title">My Team</span>
      <div className="ut-squad__identity"><ClubIdentityLogoUT club={club} userId={userId||club.user_id}/><div><small>{club.abreviatura || 'MI CLUB'}</small><h1>{club.nombre}</h1></div></div>
      <div className="ut-squad__rating"><strong key={rating}>{rating}</strong><span>GRL</span></div>
      <label className="ut-squad__formation">Formación<select value={formation} disabled={saving||Boolean(tutorialData)} onChange={event=>change(arrangeSquad(squad,event.target.value))}>{Object.keys(SQUAD_FORMATIONS).map(name=><option key={name}>{name}</option>)}</select></label>
      <button className="ut-squad__auto" disabled={saving||Boolean(tutorialData)} onClick={()=>change(arrangeSquad(squad,formation))}><ArrowRightLeft size={17}/> Autoalinear</button>
      {selected&&<div className="ut-squad__detail" aria-live="polite"><h2>{selectedPlayer?.nombre || 'Puesto vacío'}</h2><button onClick={()=>setSelected(null)}>Cancelar cambio</button></div>}
      {!readiness.valid&&<p className="ut-squad__notice" role="status">{missing ? `Completa ${missing} para jugar.` : 'Revisa los puestos del once.'}</p>}
      {repaired&&dirty&&<p className="ut-squad__repair-note" role="status">Posiciones corregidas. Guarda tu plantilla.</p>}
      {!tutorialData&&<button className="ut-squad__club" disabled={saving} onClick={()=>setClubOpen(true)}>Cartas de mi club <span>↗</span></button>}
      <button className="ut-squad__save" disabled={!dirty||saving||Boolean(tutorialData)} onClick={()=>void save()}>{saving?'Guardando…':dirty?'Guardar plantilla':<><Check size={17}/> Guardado</>}</button>
    </aside>
    <LayoutGroup id="ut-squad-layout"><main className="ut-squad__main" inert={Boolean(detail||clubOpen||exitPrompt)}><div className="ut-squad__pitch"><SquadPitchUT warm/><span className="ut-squad__pitch-label">{club.nombre}<span>{formation}</span></span>{slots.map((slot,i)=>renderSlot('titulares',i,slot))}</div><div className="ut-squad__bench"><section><h2>Suplentes</h2><div>{Array.from({length:7},(_,i)=>renderSlot('suplentes',i))}</div></section>{squad.reservas.length>0&&<section><h2>Reservas</h2><div>{squad.reservas.map((_,i)=>renderSlot('reservas',i))}</div></section>}</div></main></LayoutGroup>
    {detail&&<PlayerCardDetailsUT player={detail.player} targetPosition={detail.slot?.section==='titulares'?slots[detail.slot.index]?.[0]:undefined} effectiveGrl={detail.slot?.section==='titulares'?effectivePlayerGrl(detail.player,slots[detail.slot.index]?.[0]):undefined} onClose={closeDetail} onAction={detail.slot ? ()=>{setSelected(detail.slot);setDetail(null);} : ()=>addCard(detail.player)} actionLabel={detail.slot?'Intercambiar posición':players.some(player=>player.id===detail.player.id)?'Ya está en tu plantilla':'Incorporar al equipo'} actionDisabled={saving||Boolean(tutorialData)||(!detail.slot&&players.some(player=>player.id===detail.player.id))}/>}
    {clubOpen&&<div className="ut-squad__scrim" onClick={()=>setClubOpen(false)} inert={Boolean(detail)}><section className="ut-squad__library" role="dialog" aria-modal="true" aria-label="Cartas del club" onClick={e=>e.stopPropagation()}><header><h2>Tu club.</h2><button onClick={()=>setClubOpen(false)} aria-label="Cerrar cartas del club"><X/></button></header>{clubLoading?<p role="status">Cargando cartas…</p>:clubError?<p role="alert">{clubError}</p>:clubCards.length?<div className="ut-squad__collection">{clubCards.map(player=><button key={player.id} onClick={()=>setDetail({player})} aria-label={`Ver carta de ${player.nombre}`}><PlayerCardUT player={player}/><span>{players.some(p=>p.id===player.id)?'En la plantilla':'Ver carta'}</span></button>)}</div>:<p>Las cartas que abras en Sobres aparecerán aquí.</p>}<footer><button disabled={clubPage===0||clubLoading} onClick={()=>setClubPage(p=>p-1)}>Anterior</button><span>Página {clubPage+1}</span><button disabled={clubCards.length<24||clubLoading} onClick={()=>setClubPage(p=>p+1)}>Siguiente</button></footer></section></div>}
    {exitPrompt&&<div className="ut-squad__scrim"><section className="ut-squad__exit" role="dialog" aria-modal="true" aria-labelledby="ut-unsaved"><h2 id="ut-unsaved">Tienes cambios sin guardar.</h2><button onClick={()=>setExitPrompt(false)}>Seguir editando</button><button onClick={onVolver}><RotateCcw size={16}/> Salir sin guardar</button></section></div>}
  </div>;
}
