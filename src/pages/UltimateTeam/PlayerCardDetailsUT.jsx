import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';
import PlayerCardUT from './PlayerCardUT';
import { cardCountry, cardStatFields, clampCardRating, displayCardPosition, normalizeCardRarity } from './utCards';
import './PlayerCardDetailsUT.css';

export default function PlayerCardDetailsUT({ player, onClose, onAction, actionLabel = 'Intercambiar', actionDisabled = false, effectiveGrl, targetPosition }) {
  const dialog = useRef(null);
  const closeButton = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not([disabled]),a[href],input,select,[tabindex="0"]')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [onClose]);
  const stats = cardStatFields(player);
  const country = cardCountry(player);
  const rarity = normalizeCardRarity(player.color);
  return createPortal(<section ref={dialog} className={`ut-card-details ut-card-details--${rarity}`} role="dialog" aria-modal="true" aria-label={`Carta de ${player.nombre}`}>
    <header><button ref={closeButton} type="button" onClick={onClose}><ArrowLeft size={20}/> Regresar</button><span>THC / ULTIMATE TEAM</span></header>
    <div className="ut-card-details__layout">
      <div className="ut-card-details__stage"><PlayerCardUT player={player}/></div>
      <div className="ut-card-details__info">
        <div className="ut-card-details__category"><span>{rarity === 'oro' ? 'Oro' : rarity === 'plata' ? 'Plata' : rarity === 'bronce' ? 'Bronce' : rarity === 'plus' ? 'Plus' : 'Ultimate'}</span><b>{clampCardRating(player.grl)} <small>GRL</small></b></div>
        <h1>{player.nombre}</h1>
        <p>{displayCardPosition(player.pos)}{country.name && ` · ${country.name}`}{player.club && ` · ${player.club}`}</p>
        {Number.isFinite(effectiveGrl)&&effectiveGrl<clampCardRating(player.grl)&&<p className="ut-card-details__position-note">En {displayCardPosition(targetPosition)} <b>{effectiveGrl} GRL</b><span>−{clampCardRating(player.grl)-effectiveGrl} por posición</span></p>}
        <div className="ut-card-details__stats">{stats.map(([key,label]) => <div key={key}><span>{label}</span><b>{Number.isFinite(player[key]) ? clampCardRating(player[key]) : '—'}</b><i><span style={{width:`${Number.isFinite(player[key]) ? clampCardRating(player[key]) / 99 * 100 : 0}%`}}/></i></div>)}</div>
        {player.ejemplo && <p className="ut-card-details__note">Carta de muestra</p>}
        {onAction && <button className="ut-card-details__action" type="button" onClick={onAction} disabled={actionDisabled}><ArrowRightLeft size={20}/>{actionLabel}</button>}
      </div>
    </div>
  </section>, document.body);
}
