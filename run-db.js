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
-- 1. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 2. Tabla de Técnicos
CREATE TABLE IF NOT EXISTS tecnicos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    doc VARCHAR(20) NOT NULL,
    especialidad VARCHAR(100),
    nivel VARCHAR(50),
    contrato VARCHAR(50),
    ingreso DATE,
    tel VARCHAR(20),
    email VARCHAR(100),
    arl VARCHAR(50),
    eps VARCHAR(50),
    obs TEXT
);

-- 3. Tabla de Servicios
CREATE TABLE IF NOT EXISTS servicios (
    id VARCHAR(50) PRIMARY KEY,
    oc VARCHAR(50),
    cliente_id INT,
    descripcion TEXT,
    tipo VARCHAR(50) CHECK (tipo IN ('Preventivo', 'Correctivo', 'Emergencia')),
    valor NUMERIC(15,2),
    costo NUMERIC(15,2),
    unidad VARCHAR(100),
    cc VARCHAR(50),
    vendedor VARCHAR(100),
    ot VARCHAR(50),
    lugar VARCHAR(100),
    fecha_programada DATE,
    fecha_finalizada DATE,
    hhp INT,
    hhe INT,
    ubp NUMERIC(5,2),
    ubr NUMERIC(5,2),
    estado VARCHAR(50) CHECK (estado IN ('Finalizado', 'En progreso', 'En riesgo', 'Programado')),
    creado DATE,
    tecnico_principal_id VARCHAR(50),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (tecnico_principal_id) REFERENCES tecnicos(id) ON DELETE SET NULL
);

-- 4. Catálogo de Requisitos
CREATE TABLE IF NOT EXISTS requisitos_catalogo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) CHECK (tipo IN ('Base', 'Cliente')) NOT NULL,
    cliente_id INT NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- 5. Requisitos por Técnico
CREATE TABLE IF NOT EXISTS tecnicos_requisitos (
    id SERIAL PRIMARY KEY,
    tecnico_id VARCHAR(50) NOT NULL,
    requisito_id INT NOT NULL,
    fecha_vencimiento DATE,
    estado VARCHAR(50) CHECK (estado IN ('vigente', 'vencido', 'en-tramite', 'pendiente')),
    FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id) ON DELETE CASCADE,
    FOREIGN KEY (requisito_id) REFERENCES requisitos_catalogo(id) ON DELETE CASCADE
);

-- 6. Solicitudes de EPP
CREATE TABLE IF NOT EXISTS solicitudes_epp (
    id VARCHAR(50) PRIMARY KEY,
    servicio_id VARCHAR(50) NOT NULL,
    tecnico_id VARCHAR(50) NOT NULL,
    fecha DATE,
    obs TEXT,
    estado VARCHAR(50) CHECK (estado IN ('Entregado', 'En tránsito', 'Pendiente')),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id) ON DELETE RESTRICT
);

-- 7. Ítems de Solicitudes EPP
CREATE TABLE IF NOT EXISTS solicitudes_epp_items (
    id SERIAL PRIMARY KEY,
    solicitud_id VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL,
    costo_unitario NUMERIC(15,2),
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_epp(id) ON DELETE CASCADE
);

-- 8. Viáticos
CREATE TABLE IF NOT EXISTS viaticos (
    id VARCHAR(50) PRIMARY KEY,
    servicio_id VARCHAR(50) NOT NULL,
    tecnico_id VARCHAR(50) NOT NULL,
    concepto VARCHAR(150),
    dias INT,
    valor_por_dia NUMERIC(15,2),
    fecha DATE,
    estado VARCHAR(50) CHECK (estado IN ('Liquidado', 'En curso')),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id) ON DELETE RESTRICT
);

-- 9. Insumos
CREATE TABLE IF NOT EXISTS insumos (
    id VARCHAR(50) PRIMARY KEY,
    servicio_id VARCHAR(50) NOT NULL,
    insumo VARCHAR(150) NOT NULL,
    unidad VARCHAR(20),
    cantidad NUMERIC(10,2),
    costo_unitario NUMERIC(15,2),
    proveedor VARCHAR(100),
    estado VARCHAR(50) CHECK (estado IN ('Utilizado', 'Parcial')),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE
);

-- 10. Repuestos
CREATE TABLE IF NOT EXISTS repuestos (
    id VARCHAR(50) PRIMARY KEY,
    servicio_id VARCHAR(50) NOT NULL,
    referencia VARCHAR(50),
    descripcion VARCHAR(200) NOT NULL,
    cantidad NUMERIC(10,2),
    costo_unitario NUMERIC(15,2),
    proveedor VARCHAR(100),
    garantia VARCHAR(50),
    estado VARCHAR(50) CHECK (estado IN ('Instalado', 'En pedido')),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE
);
`;

async function run() {
  try {
    await client.connect();
    console.log("Connected to database successfully!");
    await client.query(sql);
    console.log("All tables created successfully!");
  } catch (err) {
    console.error("Error executing query", err.stack);
  } finally {
    await client.end();
  }
}

run();
