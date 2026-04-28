import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yehrrdhbppafkzreqmli.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_W2FRlouveVM4prA83zKmaQ_dEW1Cpfq';

export const supabase = createClient(supabaseUrl, supabaseKey);

