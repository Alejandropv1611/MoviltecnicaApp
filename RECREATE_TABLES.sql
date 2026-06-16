-- ✅ RECREAR TABLAS CON ESQUEMA CORRECTO
-- Ejecuta esto en Supabase SQL Editor
-- NOTA: Ejecuta SOLO en el orden de arriba a abajo, línea por línea si hay errores

-- 1. Eliminar tablas dependientes PRIMERO (en orden correcto)
DROP TABLE IF EXISTS solicitudes_epp_items CASCADE;
DROP TABLE IF EXISTS solicitudes_epp CASCADE;
DROP TABLE IF EXISTS viaticos CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;
DROP TABLE IF EXISTS repuestos CASCADE;
DROP TABLE IF EXISTS solic_epp CASCADE;
DROP TABLE IF EXISTS tecnicos_requisitos CASCADE;
DROP TABLE IF EXISTS requisitos_catalogo CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;
DROP TABLE IF EXISTS tecnicos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- 2. Esperar a que se eliminen todas las tablas
-- Si recibes errores de dependencias, ejecuta el siguiente comando primero:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 2. Crear tabla TECNICOS con el esquema correcto
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

-- 3. Crear tabla SERVICIOS
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

-- 4. Crear tabla SOLIC_EPP
CREATE TABLE solic_epp (
    id VARCHAR(50) PRIMARY KEY,
    ov VARCHAR(50),
    tecnico VARCHAR(100),
    fecha VARCHAR(50),
    obs TEXT,
    estado VARCHAR(50),
    items JSONB
);

-- 5. Crear tabla VIATICOS
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

-- 6. Crear tabla INSUMOS
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

-- 7. Crear tabla REPUESTOS
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

-- ✅ Verificar que se crearon correctamente
SELECT 
    table_name,
    array_agg(column_name) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tecnicos', 'servicios', 'solic_epp', 'viaticos', 'insumos', 'repuestos')
GROUP BY table_name;
