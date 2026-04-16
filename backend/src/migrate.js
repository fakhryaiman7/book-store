// One-time migration script — run with: node src/runMigration.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import pg from 'pg';
const { Client } = pg;

// Supabase exposes a direct Postgres connection via the connection string
// We'll use the Supabase REST API with service role for DDL
const SUPABASE_URL = process.env.SUPABASE_URL.trim();
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY.trim();

const runSQL = async (sql) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_ddl`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_statement: sql }),
  });
  return { ok: r.ok, text: await r.text() };
};

console.log(`
===========================================
  SUPABASE MANUAL MIGRATION REQUIRED
===========================================

The Supabase MCP server is currently unavailable to run DDL automatically.

Please open your Supabase project's SQL Editor at:
  https://supabase.com/dashboard/project/yehrrdhbppafkzreqmli/sql

And run the following SQL:

------- COPY BELOW -------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE books ADD COLUMN IF NOT EXISTS book_file_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS preview_file_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS rental_price DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE books ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2);
UPDATE books SET rental_price = price_per_day WHERE rental_price = 0 OR rental_price IS NULL;
UPDATE books SET purchase_price = COALESCE(purchase_price, price_per_day * 10) WHERE purchase_price = 0 OR purchase_price IS NULL;

CREATE TABLE IF NOT EXISTS rentals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rental_days INTEGER NOT NULL,
  rental_price_per_day DECIMAL(10,2) NOT NULL,
  total_rental_cost DECIMAL(10,2) NOT NULL,
  rental_start_date TIMESTAMPTZ DEFAULT NOW(),
  rental_due_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending',
  order_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_book_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  access_type VARCHAR(20) NOT NULL DEFAULT 'rental',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id, access_type)
);

------- COPY ABOVE -------

After running the SQL, the app will be fully functional.
`);
process.exit(0);
