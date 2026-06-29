import { createClient } from '@supabase/supabase-js';

// ⚠️ Use a URL real do projeto e a ANON KEY pública (nunca a service_role/secret key) aqui.
// Os valores anteriores estavam errados: a URL continha uma chave, e a "anon key" era na
// verdade a chave secreta do projeto.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mescdtlvpqblhlqtvnlm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
