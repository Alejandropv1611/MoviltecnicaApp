-- ✅ SOLUCIÓN ALTERNATIVA: Agregar columnas faltantes sin eliminar tablas
-- Ejecuta esto si el script de recreación falla por dependencias
-- 
-- Este script solo AGREGA las columnas faltantes sin perder datos

-- 1. Verificar si la columna baseReqs existe en tecnicos
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tecnicos' AND column_name = 'baseReqs';

-- 2. Si NO existe, agregarla
ALTER TABLE IF EXISTS tecnicos ADD COLUMN IF NOT EXISTS baseReqs JSONB;

-- 3. Si NO existe, agregar clientes
ALTER TABLE IF EXISTS tecnicos ADD COLUMN IF NOT EXISTS clientes JSONB;

-- 4. Verificar que las columnas están
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'tecnicos'
ORDER BY ordinal_position;

-- Si esto funciona, las columnas se han agregado correctamente ✅
