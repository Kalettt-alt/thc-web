export function validatePublicSupabaseConfig(url, key) {
  if (!url || !key) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.');
  let role;
  try { role = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { role = null; }
  if (key.startsWith('sb_secret_') || role === 'service_role' || role === 'supabase_admin') {
    throw new Error('La aplicación web solo puede usar la clave pública de Supabase. Retira y regenera la clave privada expuesta.');
  }
  const target = new URL(url);
  if (target.protocol !== 'https:' && !(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && target.protocol === 'http:')) {
    throw new Error('Supabase requiere una dirección HTTPS, salvo en desarrollo local.');
  }
  return { url, key };
}
