import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://yehrrdhbppafkzreqmli.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is missing in backend environment variables.");
} else {
  console.log("Supabase Client initialized for URL:", supabaseUrl.substring(0, 20) + "...");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

