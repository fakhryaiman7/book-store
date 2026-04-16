import { supabase } from './src/config/supabase.js';

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---');
  
  const query = `
    SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'user_book_access'
      AND tc.constraint_name = 'user_book_access_rental_id_fkey';
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
  
  if (error) {
    // If exec_sql doesn't exist, try direct fetch if enabled or we might need another way
    console.error('Failed to run diagnostic query. Using alternate method...');
    // Alternate: Just list the columns to see types
    const { data: cols, error: colErr } = await supabase.from('user_book_access').select('*').limit(0);
    console.log('Column structure:', cols, colErr);
  } else {
    console.table(data);
  }
}

diagnose();
