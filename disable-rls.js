const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.qdbswcnitjdvruhgtiux',
  password: 'Movitecnica@2026',
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- Disable RLS on all tables to allow public access
ALTER TABLE tecnicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE solic_epp DISABLE ROW LEVEL SECURITY;
ALTER TABLE viaticos DISABLE ROW LEVEL SECURITY;
ALTER TABLE insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos DISABLE ROW LEVEL SECURITY;

-- Make sure RLS policy set is off for all tables
ALTER TABLE tecnicos NO FORCE ROW LEVEL SECURITY;
ALTER TABLE servicios NO FORCE ROW LEVEL SECURITY;
ALTER TABLE solic_epp NO FORCE ROW LEVEL SECURITY;
ALTER TABLE viaticos NO FORCE ROW LEVEL SECURITY;
ALTER TABLE insumos NO FORCE ROW LEVEL SECURITY;
ALTER TABLE repuestos NO FORCE ROW LEVEL SECURITY;
`;

async function run() {
  try {
    await client.connect();
    console.log("Disabling RLS on all tables...");
    await client.query(sql);
    console.log("✅ RLS disabled successfully on all tables!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
