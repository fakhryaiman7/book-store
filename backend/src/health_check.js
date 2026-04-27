
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yehrrdhbppafkzreqmli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllaHJyZGhicHBhZmt6cmVxbWxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk3MjQ3NiwiZXhwIjoyMDg4NTQ4NDc2fQ.7EYh7lSMNfN-X0qYJP5Zsd_eFk4Pta1AIf0yFgC7OJA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function healthCheck() {
  const { data, error } = await supabase.from("books").select("id").limit(1);
  if (error) console.error("Supabase Error:", error);
  else console.log("Supabase OK, found book:", data);
}

healthCheck();
