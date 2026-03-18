import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yehrrdhbppafkzreqmli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllaHJyZGhicHBhZmt6cmVxbWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzI0NzYsImV4cCI6MjA4ODU0ODQ3Nn0.EY6R8XLTAy1J2wRBOLJ8TffS-k5hMTEX42gLtFQhLzk';

export const supabase = createClient(supabaseUrl, supabaseKey);
