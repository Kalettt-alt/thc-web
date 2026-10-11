const KEY_PREFIX = 'thc:ut:pack-pending:';
export function readPendingUtPack(storage,userId) {
  try{const value=JSON.parse(storage.getItem(KEY_PREFIX+userId)||'null');return /^[0-9a-f-]{36}$/i.test(value?.packId||'')&&/^[0-9a-f-]{36}$/i.test(value?.requestId||'')?value:null;}catch{return null;}
}
export async function openUtPack(client,packId,userId,storage) {
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user||user.id!==userId)throw new Error('Tu sesión cambió. Vuelve a entrar a Sobres.');
  const existing=readPendingUtPack(storage,userId);
  if(existing&&existing.packId!==packId)throw new Error('Confirma primero la apertura anterior.');
  const pending=existing||{packId,requestId:crypto.randomUUID()};
  storage.setItem(KEY_PREFIX+userId,JSON.stringify(pending));
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const query=client.rpc('thc_ut_abrir_sobre',{p_sobre_id:packId,p_solicitud_id:pending.requestId});
    const {data,error}=await(query.abortSignal?query.abortSignal(controller.signal):query);
    if(error)throw error;
    if(!Array.isArray(data?.cartas)||!data.cartas.length||data.cartas.some(row=>!row?.id||!row?.carta?.id))throw new Error('No se pudo confirmar el contenido del sobre. Reintenta la apertura.');
    storage.removeItem(KEY_PREFIX+userId);return data;
  }catch(error){
    if (['P0001','P0002','22023','42501'].includes(error?.code)) storage.removeItem(KEY_PREFIX+userId);
    throw error;
  }finally{clearTimeout(timeout);}
}
