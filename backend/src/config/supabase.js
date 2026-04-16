import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

// Use SERVICE_ROLE_KEY for backend operations to bypass RLS, fallback to anon if missing
const supabaseKey = serviceKey || anonKey;

if (!supabaseUrl) console.error("CRITICAL: SUPABASE_URL is missing!");
if (!serviceKey) console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing! Using Anon Key (RLS will block writes).");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
