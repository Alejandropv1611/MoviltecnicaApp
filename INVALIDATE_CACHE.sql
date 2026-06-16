-- ✅ INVALIDAR CACHE DE SUPABASE
-- Esto fuerza a Supabase a recargar el esquema de las tablas
-- Ejecuta esto en Supabase SQL Editor

-- 1. Primero, verifica que las columnas existan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tecnicos'
ORDER BY ordinal_position;

-- 2. Fuerza la recarga del caché de PostgREST (Supabase REST API)
-- Ejecuta uno de estos comandos:

-- Opción A: Recrear la tabla sin perder datos (si es posible)
ALTER TABLE tecnicos RENAME TO tecnicos_old;
ALTER TABLE tecnicos_old RENAME TO tecnicos;

-- Opción B: Si la anterior no funciona, ejecuta esto para refrescar metadatos
NOTIFY pgrst, 'reload schema';

-- Opción C: Si tienes acceso, reinicia los servicios de PostgREST en Supabase:
-- (Esto requiere permisos de administrador en el proyecto)
-- Ve a: Project Settings > Database > Wrangler/PostgREST > Restart

-- Después de ejecutar esto, RECARGA LA APP completamente:
-- 1. Ctrl+Shift+Delete en el navegador (limpiar caché)
-- 2. Cierra todas las pestañas de la app
-- 3. Abre la app nuevamente
-- 4. Intenta crear un técnico
