import { ArrowRight, Check, Medal, Target, Trophy } from 'lucide-react';
import './MatchResultCard.css';

function Badge({ club, getImg }) {
  const source = club.img || `/Imag/${club.name}.png`;
  return <span className="df-result-badge"><img src={getImg ? getImg(source) : source} alt="" onError={event => { event.currentTarget.hidden = true; }} /><b aria-hidden="true">{club.name.slice(0, 1)}</b></span>;
}

const sumStat = (players, key) => players.reduce((total, player) => total + (Number(player[key]) || 0), 0);
const ratingFor = player => Math.max(3, Math.min(10, Number(player.rating) || (6 + (player.goals || 0) * .85 + (player.recoveries || 0) * .08 + (player.saves || 0) * .12 + (player.passesCompleted || 0) * .025 - ((player.passesAttempted || 0) - (player.passesCompleted || 0)) * .025)));

export default function MatchResultCard({ miClub, rival, score = [0, 0], summary, players = [], getImg, onContinue, busy = false, error = '' }) {
  const allStats = Object.values(summary?.playerStats || {}).length ? Object.values(summary.playerStats) : players.map(player => ({ ...player.stats, id: player.sourceId || player.id, name: player.name, isUser: player.isUser }));
  const ownStats = allStats.filter(player => player.isUser);
  const rivalStats = allStats.filter(player => !player.isUser);
  const best = [...ownStats].sort((a, b) => ratingFor(b) - ratingFor(a))[0];
  const won = score[0] > score[1];
  const draw = score[0] === score[1];
  const opportunity = summary?.opportunities;
  const events = (summary?.highlights || summary?.events || []).filter(event => event.type === 'GOAL').slice(-4);
  const rows = [
    { label: 'Tiros', key: 'shots' },
    { label: 'Pases completados', key: 'passesCompleted' },
    { label: 'Recuperaciones', key: 'recoveries' }
  ];

  return <section className={`df-result-card ${won ? 'df-result-card--win' : draw ? 'df-result-card--draw' : 'df-result-card--loss'}`} aria-labelledby="df-result-title">
    <header className="df-result-header"><span><Check size={15} />90′ · FINAL DEL PARTIDO</span><span>THC FANTASY</span></header>
    <div className="df-result-headline"><div><p>EL PARTIDO, EN UNA MIRADA</p><h2 id="df-result-title">{won ? 'VICTORIA' : draw ? 'EMPATE' : 'A SEGUIR'}<span>.</span></h2></div><span className="df-result-stamp">{won ? <Trophy size={36} /> : <Target size={36} />}</span></div>
    <div className="df-result-score"><div><Badge club={miClub} getImg={getImg} /><b>{miClub.name}</b><small>Tu equipo</small></div><strong aria-label={`${miClub.name} ${score[0]}, ${rival.name} ${score[1]}`}>{score[0]}<i>–</i>{score[1]}</strong><div><Badge club={rival} getImg={getImg} /><b>{rival.name}</b><small>Rival</small></div></div>
    {(best || allStats.length > 0) && <div className="df-result-details">
      <div className="df-result-statistics"><h3>El juego</h3>{rows.map(row => <div key={row.key}><b>{sumStat(ownStats, row.key)}</b><span>{row.label}</span><b>{sumStat(rivalStats, row.key)}</b></div>)}{opportunity?.user && opportunity?.rival && <div><b>{opportunity.user.used}/{opportunity.user.limit}</b><span>Ocasiones</span><b>{opportunity.rival.used}/{opportunity.rival.limit}</b></div>}</div>
      {best && <aside className="df-result-player"><span><Medal size={18} />DESTACADO DE TU EQUIPO</span><b>{best.name}</b><div><strong>{ratingFor(best).toFixed(1)}</strong><span>nota del partido</span></div><p>{best.goals || 0} goles <i>·</i> {best.passesCompleted || 0} pases <i>·</i> {best.recoveries || 0} recuperaciones</p></aside>}
    </div>}
    {events.length > 0 && <div className="df-result-highlights" aria-label="Goles del encuentro">{events.map((event, index) => <span key={event.id || index}><b>{event.clock}′</b>{event.playerName || (event.scoringTeam === 'USER' ? miClub.name : rival.name)}</span>)}</div>}
    {error && <p className="df-result-error" role="status">{error}</p>}
    {onContinue && <footer><span>{busy ? 'Guardando el partido…' : 'Tu próxima jornada te espera.'}</span><button type="button" onClick={onContinue} disabled={busy}>{busy ? 'Guardando…' : 'Continuar'}<ArrowRight size={19} /></button></footer>}
  </section>;
}
