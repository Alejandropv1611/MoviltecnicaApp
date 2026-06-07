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
DROP TABLE IF EXISTS solicitudes_epp_items CASCADE;
DROP TABLE IF EXISTS solicitudes_epp CASCADE;
DROP TABLE IF EXISTS viaticos CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;
DROP TABLE IF EXISTS repuestos CASCADE;
DROP TABLE IF EXISTS tecnicos_requisitos CASCADE;
DROP TABLE IF EXISTS requisitos_catalogo CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;
DROP TABLE IF EXISTS tecnicos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- Matches Tecnico interface
CREATE TABLE tecnicos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100),
    doc VARCHAR(50),
    especialidad VARCHAR(100),
    nivel VARCHAR(100),
    contrato VARCHAR(100),
    ingreso VARCHAR(50),
    tel VARCHAR(50),
    email VARCHAR(100),
    arl VARCHAR(100),
    eps VARCHAR(100),
    obs TEXT,
    baseReqs JSONB,
    clientes JSONB
);

-- Matches Servicio interface
CREATE TABLE servicios (
    id VARCHAR(50) PRIMARY KEY,
    oc VARCHAR(50),
    cliente VARCHAR(100),
    "desc" TEXT,
    tipo VARCHAR(50),
    valor NUMERIC,
    costo NUMERIC,
    unidad VARCHAR(150),
    cc VARCHAR(50),
    vendedor VARCHAR(100),
    ot VARCHAR(50),
    lugar VARCHAR(150),
    fp VARCHAR(50),
    ff VARCHAR(50),
    hhp NUMERIC,
    hhe NUMERIC,
    ubp NUMERIC,
    ubr NUMERIC,
    estado VARCHAR(50),
    creado VARCHAR(50),
    tecnico VARCHAR(100)
);

-- Matches SolicEpp interface
CREATE TABLE solic_epp (
    id VARCHAR(50) PRIMARY KEY,
    ov VARCHAR(50),
    tecnico VARCHAR(100),
    fecha VARCHAR(50),
    obs TEXT,
    estado VARCHAR(50),
    items JSONB
);

-- Matches Viatico interface
CREATE TABLE viaticos (
    id VARCHAR(50) PRIMARY KEY,
    ov VARCHAR(50),
    tecnico VARCHAR(100),
    concepto VARCHAR(150),
    dias NUMERIC,
    vpd NUMERIC,
    fecha VARCHAR(50),
    estado VARCHAR(50)
);

-- Matches Insumo interface
CREATE TABLE insumos (
    id VARCHAR(50) PRIMARY KEY,
    ov VARCHAR(50),
    insumo VARCHAR(150),
    unidad VARCHAR(50),
    qty NUMERIC,
    cu NUMERIC,
    proveedor VARCHAR(150),
    estado VARCHAR(50)
);

-- Matches Repuesto interface
CREATE TABLE repuestos (
    id VARCHAR(50) PRIMARY KEY,
    ov VARCHAR(50),
    ref VARCHAR(100),
    "desc" TEXT,
    qty NUMERIC,
    cu NUMERIC,
    proveedor VARCHAR(150),
    garantia VARCHAR(100),
    estado VARCHAR(50)
);
`;

async function run() {
  try {
    await client.connect();
    await client.query(sql);
    console.log("DB Re-created to match interfaces perfectly!");
  } catch (err) {
    console.error("Error", err.stack);
  } finally {
    await client.end();
  }
}

run();
