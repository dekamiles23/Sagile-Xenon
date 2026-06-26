import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'sb_secret_GEsYmczQKJip2Ejvj7N06A_WFHHjXRq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
