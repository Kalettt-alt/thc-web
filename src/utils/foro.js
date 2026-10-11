import { supabase } from './supabase';

export const ETIQUETAS_FORO = {
  Normal: { nombre: 'Normal', color: 'text-[#888] bg-[#111] border-[#333]' },
  Debate: { nombre: 'Debate', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  Torneo: { nombre: 'Torneo', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  Seleccion: { nombre: 'Selección', color: 'text-green-500 bg-green-500/10 border-green-500/30' },
  Clips: { nombre: 'Clips', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  Escracho: { nombre: 'Escracho', color: 'text-red-500 bg-red-500/10 border-red-500/30' },
};

export function imagenSegura(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export async function guardarVoto({ tabla, columna, id, usuarioId, valor, votoAnterior }) {
  const query = supabase.from(tabla);
  const resultado = votoAnterior === valor
    ? await query.delete().eq(columna, id).eq('usuario_id', usuarioId).select('valor').maybeSingle()
    : await query.upsert({ [columna]: id, usuario_id: usuarioId, valor }, { onConflict: `${columna},usuario_id` }).select('valor').single();
  if (resultado.error) throw resultado.error;
  if (!resultado.data) throw new Error('No se pudo confirmar el voto.');
  return votoAnterior === valor ? null : resultado.data.valor;
}

export const enviarNotificacion = async (usuarioDestinoId, actorId, tipo, postId, comentarioId = null) => {
  if (!usuarioDestinoId || usuarioDestinoId === actorId) return;
  const { error } = await supabase.from('notificaciones').insert([{ usuario_id: usuarioDestinoId, actor_id: actorId, tipo, enlace_id: postId, comentario_id: comentarioId }]);
  if (error) throw error;
};

export const procesarMenciones = async (texto, actorId, postId, comentarioId = null, ignorarIds = []) => {
  const menciones = texto.match(/@([\w!.]+)/g);
  if (!menciones) return;
  const apodos = new Set(menciones.map(m => m.substring(1).toLowerCase()));
  const { data: usuarios, error } = await supabase.from('perfiles').select('id, apodo, discord_nombre');
  if (error) throw error;
  await Promise.all((usuarios || []).filter(u => {
    const apodo = (u.apodo || u.discord_nombre || '').replace(/\s+/g, '').toLowerCase();
    return apodos.has(apodo) && u.id !== actorId && !ignorarIds.includes(u.id);
  }).map(u => enviarNotificacion(u.id, actorId, 'mencion', postId, comentarioId)));
};
