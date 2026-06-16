-- ❌ FIX FOR 400 BAD REQUEST ERROR: RLS BLOCKING INSERTS
-- 
-- El error 400 ocurre porque Supabase tiene Row Level Security (RLS) habilitado
-- en las tablas. Necesitas ejecutar este SQL en el Supabase SQL Editor.
-- 
-- ✅ PASOS:
-- 1. Ve a https://app.supabase.com
-- 2. Selecciona tu proyecto "MovitecnicaApp"
-- 3. Abre SQL Editor > New query
-- 4. Copia y ejecuta el SQL debajo
-- 5. Prueba crear un técnico nuevamente

-- Desactivar RLS en todas las tablas
ALTER TABLE tecnicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE solic_epp DISABLE ROW LEVEL SECURITY;
ALTER TABLE viaticos DISABLE ROW LEVEL SECURITY;
ALTER TABLE insumos DISABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está desactivado
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tecnicos', 'servicios', 'solic_epp', 'viaticos', 'insumos', 'repuestos');
