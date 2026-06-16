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
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100),
    reqs JSONB
);
`;

const seedData = [
  {
    id: "CLI-0001",
    nombre: "Drummond",
    reqs: JSON.stringify([
      { nombre: "Inducción Drummond", vence: "", estado: "vigente" },
      { nombre: "Espacios confinados", vence: "", estado: "vigente" },
      { nombre: "Izaje de cargas", vence: "", estado: "vigente" }
    ])
  },
  {
    id: "CLI-0002",
    nombre: "Cerrejón",
    reqs: JSON.stringify([
      { nombre: "Inducción Cerrejón", vence: "", estado: "vigente" },
      { nombre: "Izaje de cargas", vence: "", estado: "vigente" },
      { nombre: "COPASST cliente", vence: "", estado: "vigente" }
    ])
  },
  {
    id: "CLI-0003",
    nombre: "Ecopetrol",
    reqs: JSON.stringify([
      { nombre: "Inducción Ecopetrol", vence: "", estado: "vigente" },
      { nombre: "H2S Alive", vence: "", estado: "vigente" },
      { nombre: "SART", vence: "", estado: "vigente" }
    ])
  },
  {
    id: "CLI-0004",
    nombre: "Promigas",
    reqs: JSON.stringify([
      { nombre: "Inducción Promigas", vence: "", estado: "vigente" },
      { nombre: "Manejo seguro de gas", vence: "", estado: "vigente" }
    ])
  },
  {
    id: "CLI-0005",
    nombre: "Glencore",
    reqs: JSON.stringify([
      { nombre: "Inducción Glencore", vence: "", estado: "vigente" },
      { nombre: "Izaje de cargas", vence: "", estado: "vigente" }
    ])
  },
  {
    id: "CLI-0006",
    nombre: "Carbones del Caribe",
    reqs: JSON.stringify([
      { nombre: "Inducción CBC", vence: "", estado: "vigente" },
      { nombre: "Espacios confinados", vence: "", estado: "vigente" }
    ])
  }
];

async function run() {
  try {
    await client.connect();
    await client.query(sql);
    console.log("Tabla clientes creada.");
    
    // Check if empty
    const res = await client.query('SELECT COUNT(*) FROM clientes');
    if (res.rows[0].count === '0') {
      console.log("Poblando tabla clientes...");
      for (const cli of seedData) {
        await client.query('INSERT INTO clientes (id, nombre, reqs) VALUES ($1, $2, $3)', [cli.id, cli.nombre, cli.reqs]);
      }
      console.log("Tabla clientes poblada con datos por defecto.");
    } else {
      console.log("La tabla ya tiene datos.");
    }
  } catch (err) {
    console.error("Error", err.stack);
  } finally {
    await client.end();
  }
}

run();
