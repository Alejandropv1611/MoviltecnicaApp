-- ✅ SOLUCIÓN FINAL: Recrear tabla con nuevo nombre y migrar datos
-- Esto evita problemas de caché de Supabase

-- 1. Crear tabla NUEVA con el esquema correcto
CREATE TABLE tecnicos_new (
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
    baseReqs JSONB DEFAULT '[]'::jsonb,
    clientes JSONB DEFAULT '[]'::jsonb
);

-- 2. Copiar datos de la tabla antigua (si existen)
INSERT INTO tecnicos_new (id, nombre, doc, especialidad, nivel, contrato, ingreso, tel, email, arl, eps, obs, baseReqs, clientes)
SELECT id, nombre, doc, especialidad, nivel, contrato, ingreso, tel, email, arl, eps, obs, 
       COALESCE(baseReqs, '[]'::jsonb),
       COALESCE(clientes, '[]'::jsonb)
FROM tecnicos
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Eliminar tabla antigua
DROP TABLE IF EXISTS tecnicos CASCADE;

-- 4. Renombrar tabla nueva como la original
ALTER TABLE tecnicos_new RENAME TO tecnicos;

-- 5. Verificar que funciona
SELECT COUNT(*) as total_tecnicos FROM tecnicos;
SELECT * FROM tecnicos LIMIT 1;
