const energy = player => Math.max(0, Math.min(100, Number.isFinite(player?.energia) ? player.energia : 100));
const orderTable = (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name);

export function generateCareerNews({ club, apodo = 'el mánager', round = 0, standings = {}, fixture = [], lineup = {}, reserves = [], teams = [], lastMatch } = {}) {
  if (!club?.id) return [];
  const news = [];
  const add = (key, titular, desc, sub, tags = [], img = club.img) => news.push({ id: `${round}:${key}`, titular, desc, sub, impactosTag: tags, img });
  const team = id => teams.find(item => item.id === id) || standings[id];
  let latest;
  for (let i = Math.min(round, fixture.length - 1); i >= 0 && !latest; i--) {
    latest = fixture[i]?.find(match => match.jugado && (match.local === club.id || match.visitante === club.id));
  }
  if (latest && Number.isFinite(latest.gl) && Number.isFinite(latest.gv)) {
    const home = latest.local === club.id;
    const ours = home ? latest.gl : latest.gv;
    const theirs = home ? latest.gv : latest.gl;
    const opponent = team(home ? latest.visitante : latest.local)?.name || 'su rival';
    const margin = ours - theirs;
    const headline = margin > 2 ? 'UNA ACTUACIÓN PARA RECORDAR' : margin > 0 ? 'TRES PUNTOS QUE VALEN' : margin < -2 ? 'TOCA RECOMPONERSE' : margin < 0 ? 'UNA DERROTA PARA CORREGIR' : ours === 0 ? 'LAS DEFENSAS MANDARON' : 'EL REPARTO DE UN PARTIDO PAREJO';
    add('result', headline, `${club.name} ${margin > 0 ? 'superó' : margin < 0 ? 'cayó ante' : 'empató con'} ${opponent} por ${ours}–${theirs}, ${home ? 'en casa' : 'como visitante'}. ${margin > 0 ? 'El equipo suma tres puntos y ya prepara el próximo desafío.' : margin < 0 ? 'La próxima fecha será una oportunidad para ajustar la salida y recuperar confianza.' : 'Un punto para cada equipo en una jornada que se decidió por detalles.'}`, 'La última fecha', [{ label: `${ours}–${theirs}`, color: 'text-[#b6530f]' }, { label: home ? 'Local' : 'Visitante', color: 'text-[#635544]' }]);
  } else {
    add('welcome', `NUEVA ETAPA EN ${club.name.toUpperCase()}`, `${apodo} prepara su primer partido al frente de ${club.name}. La plantilla comienza con energía completa: las decisiones en la cancha escribirán las próximas noticias.`, 'Desde el club');
  }
  const table = Object.values(standings).filter(item => typeof item?.name === 'string').sort(orderTable);
  const position = table.findIndex(item => item.id === club.id);
  const ours = table[position];
  if (ours?.pj > 0) {
    const leader = table[0];
    const difference = Math.max(0, leader.pts - ours.pts);
    add('table', position === 0 ? 'EL CLUB MARCA EL PASO' : difference <= 3 ? 'LA PUNTA SIGUE A TIRO' : 'CADA PUNTO CUENTA', `${club.name} ocupa el puesto ${position + 1} con ${ours.pts} ${ours.pts === 1 ? 'punto' : 'puntos'} tras ${ours.pj} ${ours.pj === 1 ? 'partido' : 'partidos'}. ${position === 0 ? 'Sostener el ritmo será el reto de la próxima jornada.' : `La distancia con ${leader.name} es de ${difference} ${difference === 1 ? 'punto' : 'puntos'}.`}`, 'La competición', [{ label: `${position + 1}.º puesto`, color: 'text-[#b6530f]' }, { label: `${ours.pts} ${ours.pts === 1 ? 'punto' : 'puntos'}`, color: 'text-[#635544]' }]);
  }
  const active = Object.values(lineup).filter(Boolean).sort((a, b) => energy(a) - energy(b));
  const tired = active.filter(player => energy(player) < 70);
  if (tired.length) {
    const lowest = tired[0];
    const fresh = reserves.filter(player => energy(player) >= 80).length;
    add('fitness', energy(lowest) < 40 ? 'EL CUERPO PIDE UN CAMBIO' : 'DOSIFICAR TAMBIÉN ES DIRIGIR', `${lowest.name} llega con ${Math.round(energy(lowest))}% de energía. ${tired.length === 1 ? 'Es el titular que más necesita recuperación.' : `${tired.length} titulares están por debajo del 70%.`} ${fresh ? `Hay ${fresh} ${fresh === 1 ? 'reserva fresca' : 'reservas frescas'} para rotar.` : 'Revisa la plantilla antes de volver a competir.'} La Bebida THC permite recuperar a todo el plantel.`, 'Estado del plantel', [{ label: `${Math.round(energy(lowest))}% de energía`, color: 'text-[#ac392b]' }]);
  }
  const allStats = Object.values(lastMatch?.summary?.playerStats || lastMatch?.playerStats || {});
  const scorer = allStats.filter(player => player.isUser && player.goals > 0).sort((a, b) => b.goals - a.goals)[0];
  if (scorer && news.length < 3) add('player', `${scorer.name.toUpperCase()} PUSO SU FIRMA`, `${scorer.name} marcó ${scorer.goals} ${scorer.goals === 1 ? 'gol' : 'goles'} en el último partido. Su aporte fue una de las notas de la fecha para ${club.name}.`, 'El protagonista');
  let next;
  let nextRound;
  for (let i = Math.max(0, round); i < fixture.length && !next; i++) {
    next = fixture[i]?.find(match => !match.jugado && (match.local === club.id || match.visitante === club.id));
    if (next) nextRound = i;
  }
  if (next) {
    const opponent = team(next.local === club.id ? next.visitante : next.local);
    const gap = Number.isFinite(opponent?.grl) && Number.isFinite(club.grl) ? club.grl - opponent.grl : null;
    add('next', gap === null || Math.abs(gap) <= 3 ? 'SE VIENE OTRO PULSO' : gap > 0 ? 'FAVORITOS, CON LOS PIES EN LA TIERRA' : 'UN DESAFÍO PARA EL EQUIPO', `${opponent?.name || 'El próximo rival'} espera en la jornada ${nextRound + 1}. ${next.local === club.id ? 'Se jugará en casa.' : 'El equipo jugará como visitante.'} ${gap === null || Math.abs(gap) <= 3 ? 'El cruce promete equilibrio: energía, pases y decisiones pueden marcar la diferencia.' : gap > 0 ? 'El GRL favorece al club, pero la ventaja hay que construirla en la cancha.' : 'La circulación y el orden serán claves para competir ante un rival de mayor GRL.'}`, 'Lo que viene', [{ label: `Jornada ${nextRound + 1}`, color: 'text-[#b6530f]' }], opponent?.img || club.img);
  }
  return news.slice(0, 4);
}
