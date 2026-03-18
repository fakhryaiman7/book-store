import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: Supabase URL or Anon Key is missing from environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
