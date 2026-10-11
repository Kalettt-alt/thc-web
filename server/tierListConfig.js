export function getTierListBackendConfig(env = {}) {
  const origins = new Set((env.THC_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  for (const name of ['VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_BRANCH_URL']) {
    const hostname = env[name];
    if (hostname && /^[a-z\d](?:[a-z\d.-]*[a-z\d])?$/i.test(hostname)) origins.add(`https://${hostname}`);
  }
  return {
    supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    anonKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
    webhook: env.DISCORD_TIERLIST_WEBHOOK,
    allowedOrigins: [...origins].join(','),
  };
}
