import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Muro from '../src/pages/Muro/Muro.jsx';
import { supabase } from '../src/utils/supabase.js';
import '../src/index.css';

const own = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const now = Date.now();
let pool = Array.from({ length: 200 }, (_, index) => ({
  id: `33333333-3333-4333-8333-${String(index).padStart(12, '0')}`,
  autor_id: index < 3 ? own : other,
  titulo: `Momento ${index + 1}`,
  descripcion: 'Revisión local de cupos y galería histórica.',
  imagen_url: '/imagenes/LogoTHC.png',
  creado_en: new Date(now - index * 30 * 60000).toISOString(),
  autor: { discord_nombre: index < 3 ? 'THC Demo' : 'Comunidad', avatar_url: '/imagenes/LogoTHC.png' },
}));
supabase.rpc = async () => {
  const ownRows = pool.filter(row => row.autor_id === own);
  const start = ownRows.length ? Math.min(...ownRows.map(row => Date.parse(row.creado_en))) : null;
  const used = start && Date.now() < start + 7 * 86400000 ? ownRows.length : 0;
  return { data: { limite: 3, usadas: used, disponibles: Math.max(0,3-used), inicio: start ? new Date(start).toISOString() : null, reinicio: start ? new Date(start+7*86400000).toISOString() : null, ahora: new Date().toISOString() }, error: null };
};
supabase.from = table => {
  const filters = {};
  let operation = 'read';
  let limit = 1000;
  let before = null;
  const query = {
    select() { return this; }, order() { return this; }, limit(value) { limit = value; return this; },
    range() { return this; }, in() { return this; },
    eq(key,value) { filters[key] = value; return this; },
    delete() { operation = 'delete'; return this; },
    or(value) { before = value.match(/id[.]lt[.]([a-z0-9-]+)/)?.[1]; return this; },
    then(resolve) {
      if (table === 'muro_votos') return resolve({ data: [], error: null });
      let rows = pool.filter(row => Object.entries(filters).every(([key,value]) => row[key] === value));
      if (before) rows = rows.slice(rows.findIndex(row => row.id === before) + 1);
      if (operation === 'delete') pool = pool.filter(row => !rows.some(deleted => deleted.id === row.id));
      return resolve({ data: rows.slice(0,limit), count: pool.length, error: null });
    },
  };
  return query;
};
supabase.storage.from = () => ({ getPublicUrl: path => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/muro_media/${path}` } }), remove: async () => ({error:null}) });
createRoot(document.getElementById('root')).render(<BrowserRouter><Muro session={{user:{id:own}}}/><Toaster/></BrowserRouter>);
