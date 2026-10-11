import { createClient } from '@supabase/supabase-js';
import { validatePublicSupabaseConfig } from './supabaseConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const config = validatePublicSupabaseConfig(supabaseUrl, supabaseKey);
export const supabase = createClient(config.url, config.key);
