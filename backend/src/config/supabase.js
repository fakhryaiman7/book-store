import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = "https://yehrrdhbppafkzreqmli.supabase.co";
// Hardcoding the service role key to ensure Vercel picks it up correctly
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllaHJyZGhicHBhZmt6cmVxbWxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk3MjQ3NiwiZXhwIjoyMDg4NTQ4NDc2fQ.7EYh7lSMNfN-X0qYJP5Zsd_eFk4Pta1AIf0yFgC7OJA";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
