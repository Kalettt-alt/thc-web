import { cardAsset, cardCountry, cardStatFields, CARD_DESIGNS, clampCardRating, displayCardPosition, normalizeCardRarity } from './utCards';
import './PlayerCardUT.css';

const designs = import.meta.glob('./cartas/*.{png,jpg,jpeg,webp,avif,svg}', { eager: true, query: '?url', import: 'default' });

export default function PlayerCardUT({ player, compact = false, emptyPosition = '', selected = false }) {
  const rarity = normalizeCardRarity(player?.color);
  const portrait = cardAsset(player?.imagen_url, designs);
  const design = cardAsset(player?.diseno_url, designs) || designs[`./cartas/${CARD_DESIGNS[rarity]}`];
  const country = cardCountry(player);
  const stats = cardStatFields(player);
  if (!player) return <span className={`ut-card ut-card--empty ${compact ? 'ut-card--compact' : ''}`}><span className="ut-card__empty-mark">+</span><span className="ut-card__empty-position">{emptyPosition || 'UT'}</span></span>;
  const name = player.nombre || 'Jugador';
  const nameLength = Array.from(name).length;
  return <span className={`ut-card ut-card--${rarity} ${compact ? 'ut-card--compact' : ''} ${selected ? 'is-selected' : ''}`} data-card-type={rarity}>
    <img className="ut-card__design" src={design} alt="" draggable="false" loading="lazy" />
    <span className="ut-card__top"><b>{clampCardRating(player.grl)}</b><span>{displayCardPosition(player.pos)}</span></span>
    <span className="ut-card__country" title={country.name}>{country.flagUrl ? <img src={country.flagUrl} alt={country.name} draggable="false" /> : <span>{country.code || '—'}</span>}</span>
    {portrait && <span className="ut-card__portrait"><img src={portrait} alt="" draggable="false" loading="lazy" onError={event => { event.currentTarget.hidden = true; }}/></span>}
    <span className={`ut-card__name ${nameLength > 24 ? 'ut-card__name--long' : nameLength > 15 ? 'ut-card__name--medium' : ''}`} style={nameLength>24?{'--card-name-size':`${Math.max(2.75,Math.min(4.8,160/nameLength))}cqi`}:undefined} title={name}>{name}</span>
    <span className="ut-card__stats">{stats.map(([key, label]) => <span key={key}><b>{Number.isFinite(player[key]) ? clampCardRating(player[key]) : '—'}</b><small>{label}</small></span>)}</span>
  </span>;
}
