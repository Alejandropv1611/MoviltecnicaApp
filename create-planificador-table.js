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
CREATE TABLE IF NOT EXISTS planificaciones (
    id VARCHAR(50) PRIMARY KEY,
    tecnico_id VARCHAR(50),
    fecha VARCHAR(50),
    tipo VARCHAR(50),
    descripcion TEXT,
    creado VARCHAR(50)
);

ALTER TABLE planificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones NO FORCE ROW LEVEL SECURITY;
`;

async function run() {
  try {
    await client.connect();
    console.log("Creating planificaciones table...");
    await client.query(sql);
    console.log("✅ Table planificaciones created and RLS disabled!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
