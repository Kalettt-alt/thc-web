import { clamp } from './matchGeometry.js';
import { refreshPlayerSpeed } from './matchManagement.js';

const lines = [
  ['CONFIDENCE', 'Confío en vosotros. Jugad con personalidad.'],
  ['CALM', 'Respirad y elegid el pase sencillo.'],
  ['FOCUS', 'La siguiente jugada empieza con una buena decisión.'],
  ['INTENSITY', 'Un esfuerzo juntos vale más que diez carreras solos.'],
  ['CONFIDENCE', 'Tenéis calidad para cambiar este partido.'],
  ['CALM', 'No necesitamos resolver todo en el primer toque.'],
  ['FOCUS', 'Mirad antes de recibir y encontrad al compañero libre.'],
  ['INTENSITY', 'Disputad cada balón sin perder la posición.'],
  ['CONFIDENCE', 'Seguid intentándolo; el error no define vuestra actuación.'],
  ['CALM', 'Conservemos la pelota cuando el rival nos presione.'],
  ['FOCUS', 'Cerrad el pase interior y orientad al rival hacia la banda.'],
  ['INTENSITY', 'Acompañad la presión; no dejéis solo al primero.'],
  ['CONFIDENCE', 'Quiero que disfrutéis jugando como equipo.'],
  ['CALM', 'Si no hay espacio delante, apoyad atrás y empezad otra vez.'],
  ['FOCUS', 'Mantened la distancia entre líneas.'],
  ['INTENSITY', 'Reaccionad al perderla y recuperad el orden.'],
  ['CONFIDENCE', 'Vuestra mejor versión aún está por venir.'],
  ['CALM', 'La paciencia también crea ocasiones.'],
  ['FOCUS', 'Buscad la banda contraria cuando se cierre este lado.'],
  ['INTENSITY', 'Llegad al duelo preparados, sin precipitaros.'],
  ['CONFIDENCE', 'Estoy con vosotros; atreveos cuando aparezca el espacio.'],
  ['CALM', 'No gastéis energía en carreras que no ayudan al equipo.'],
  ['FOCUS', 'Asegurad el primer pase después de recuperar.'],
  ['INTENSITY', 'Apoyad al que lleva la pelota con una opción cercana.'],
  ['CONFIDENCE', 'Habéis hecho cosas buenas; construid sobre ellas.'],
  ['CALM', 'Bajad las pulsaciones y volved a hablaros en la cancha.'],
  ['FOCUS', 'Atacad el espacio, no la posición del compañero.'],
  ['INTENSITY', 'Proteged nuestra portería como una sola línea.'],
  ['CONFIDENCE', 'Una buena acción puede devolvernos la confianza.'],
  ['CALM', 'Elegid cuándo acelerar y cuándo guardar la pelota.'],
  ['FOCUS', 'El portador necesita una salida por cada lado.'],
  ['INTENSITY', 'Ganad el segundo balón y reorganizaos.'],
  ['CONFIDENCE', 'El marcador no cambia lo que sois capaces de hacer.'],
  ['CALM', 'No forcéis el disparo si hay un pase mejor.'],
  ['FOCUS', 'Un compañero que baja libera espacio para otro.'],
  ['INTENSITY', 'Volved a vuestra zona después de ayudar en la presión.'],
  ['CONFIDENCE', 'Jugad sin miedo, pero con atención al compañero.'],
  ['CALM', 'El balón puede correr más que nosotros.'],
  ['FOCUS', 'Proteged el centro antes de salir a perseguir.'],
  ['INTENSITY', 'Cuando uno acelere, los demás deben ofrecer apoyo.'],
  ['CONFIDENCE', 'Confío en vuestra lectura del partido.'],
  ['CALM', 'Cada posesión nos permite recuperar el control.'],
  ['FOCUS', 'Levantad la cabeza y buscad una pared si os cierran.'],
  ['INTENSITY', 'Ayudad al compañero que está sintiendo el cansancio.'],
  ['CONFIDENCE', 'Todavía podemos escribir una buena segunda parte.'],
  ['CALM', 'Cuidemos el pase y el ritmo, sin ansiedad.'],
  ['FOCUS', 'Preparad la siguiente acción antes de recibir.'],
  ['INTENSITY', 'Competid con orden hasta la última jugada.'],
  ['CONFIDENCE', 'Vuestra unión puede marcar la diferencia.'],
  ['FOCUS', 'Haced sencillo lo difícil y manteneos conectados.']
];

export const TEAM_TALK_PHRASES = lines.map(([tone, text], index) => ({ id: `talk_${index + 1}`, tone, text }));
export const MAX_TEAM_TALKS = 4;

export function getTeamTalkOptions(random = Math.random) {
  const result = ['CONFIDENCE', 'CALM', 'FOCUS', 'INTENSITY'].map(tone => {
    const group = TEAM_TALK_PHRASES.filter(phrase => phrase.tone === tone);
    return group[Math.floor(clamp(random(), 0, 0.999999) * group.length)];
  });
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(clamp(random(), 0, 0.999999) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function applyMatchTeamTalk(state, { phraseId, targetType, targetId } = {}) {
  if (state.phase !== 'HALFTIME' || state.finished) return { ok: false, error: 'Las charlas están disponibles en el descanso.' };
  if (state.teamTalkCount >= MAX_TEAM_TALKS) return { ok: false, error: 'Ya enviaste las cuatro charlas del descanso.' };
  const phrase = TEAM_TALK_PHRASES.find(option => option.id === phraseId);
  if (!phrase || !['TEAM', 'POSITION', 'PLAYER'].includes(targetType)) return { ok: false, error: 'Selecciona una frase y un destinatario válidos.' };
  const affected = state.players.filter(player => player.isUser && (targetType === 'TEAM' || targetType === 'POSITION' && player.role === targetId || targetType === 'PLAYER' && (player.sourceId === targetId || player.id === targetId)));
  if (!affected.length) return { ok: false, error: 'El destinatario no está en cancha.' };
  for (const player of affected) {
    const fitnessFactor = 0.3 + player.rawStamina / 100 * 0.7;
    const boost = (phrase.tone === 'INTENSITY' ? 0.013 : phrase.tone === 'CONFIDENCE' ? 0.011 : 0.009) * fitnessFactor;
    player.moraleBonus = Math.min(0.045, (player.moraleBonus || 0) + boost);
    refreshPlayerSpeed(player);
  }
  state.teamTalkCount += 1;
  state.teamTalkHistory.push({ ...phrase, targetType, targetId: targetId || null, affected: affected.map(player => player.sourceId || player.id) });
  return { ok: true, affected: affected.length, remaining: MAX_TEAM_TALKS - state.teamTalkCount };
}
