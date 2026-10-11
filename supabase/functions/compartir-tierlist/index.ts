import { createHandler } from './handler.js';

let publicKeys: Record<string, string> = {};
try { publicKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}'); } catch { publicKeys = {}; }

Deno.serve(createHandler({
  supabaseUrl: Deno.env.get('SUPABASE_URL'),
  anonKey: publicKeys.default || Object.values(publicKeys)[0] || Deno.env.get('SUPABASE_ANON_KEY'),
  webhook: Deno.env.get('DISCORD_TIERLIST_WEBHOOK'),
  allowedOrigins: Deno.env.get('THC_ALLOWED_ORIGINS'),
}));
