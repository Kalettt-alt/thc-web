import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Megaphone } from 'lucide-react';
import { broadcastKitColors } from './matchPresentationUT';

export default function MatchCheerUT({ team, disabled, reduced }) {
  const surface = useRef(null);
  const burst = useRef(null);
  const cooldown = useRef(0);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState(false);
  useEffect(() => {
    burst.current = confetti.create(surface.current, { resize:true, useWorker:false });
    return () => { burst.current?.reset(); burst.current = null; };
  }, []);
  useEffect(() => {
    if (!remaining) return undefined;
    const timer = setInterval(() => {
      const seconds = Math.max(0,Math.ceil((cooldown.current-Date.now())/1000));
      setRemaining(seconds);
      if (seconds < 12) setMessage(false);
    },250);
    return () => clearInterval(timer);
  },[remaining]);
  const cheer = () => {
    if (disabled || Date.now() < cooldown.current) return;
    cooldown.current = Date.now()+15000;
    setRemaining(15); setMessage(true);
    const {primary,secondary} = broadcastKitColors(team);
    const options = { colors:[primary,secondary], particleCount:reduced?12:65, spread:55, startVelocity:reduced?16:38,
      gravity:1.05, ticks:reduced?70:160, scalar:.85, disableForReducedMotion:false };
    void burst.current?.({...options,angle:62,origin:{x:.04,y:.78}});
    void burst.current?.({...options,angle:118,origin:{x:.44,y:.78}});
  };
  return <><canvas className="ut-match__confetti" ref={surface} aria-hidden="true"/><div className="ut-match__cheer"><button type="button" onClick={cheer} disabled={disabled||remaining>0} aria-label={remaining?`Arenga disponible en ${remaining} segundos`:'Arengar a mi equipo'}><Megaphone size={16}/>{remaining?`${remaining}s`:'Arenga'}</button><span role="status">{message?`¡DALE, ${team.abreviatura||team.nombre||'EQUIPO'}!`:''}</span></div></>;
}
