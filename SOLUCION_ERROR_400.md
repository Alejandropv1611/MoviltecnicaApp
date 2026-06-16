# 🔧 SOLUCIÓN: Error 400 Bad Request en Registro de Técnicos

## Causa del Error
- **Código HTTP:** 400 Bad Request
- **Mensaje real:** `PGRST204: Could not find the 'baseReqs' column of 'tecnicos' in the schema cache`
- **Causa raíz:** La tabla `tecnicos` en Supabase está incompleta - faltan columnas como `baseReqs` y `clientes`
- **Por qué:** La tabla fue creada con un esquema antiguo o incorrecto

## Solución: Recrear las Tablas con Esquema Correcto

### Pasos:
1. Abre https://app.supabase.com
2. Selecciona tu proyecto **qdbswcnitjdvruhgtiux**
3. Ve a **SQL Editor** en el menú izquierdo
4. Haz clic en **New query**
5. Copia y pega el contenido completo del archivo **RECREATE_TABLES.sql**
6. Haz clic en **Run** (botón triangular)
7. Deberías ver: "Query executed successfully"

### Qué hace este script:
- ✅ Elimina las tablas antiguas (sin perder datos si no estaban en producción)
- ✅ Crea todas las tablas con el esquema correcto
- ✅ Incluye todas las columnas necesarias: `baseReqs`, `clientes`, etc.
- ✅ Verifica que las tablas se crearon correctamente

### Después de recrear las tablas:
1. Recarga la app (Ctrl+Shift+R)
2. La base de datos estará vacía, así que verás 0 técnicos
3. Intenta crear un nuevo técnico
4. **Debería funcionar ahora** ✅

---

## Por qué pasó esto

La tabla `tecnicos` estaba definida con un esquema antiguo que no incluía:
- `baseReqs` (JSONB) - Requisitos base del técnico
- `clientes` (JSONB) - Clientes asignados al técnico

Cuando la app intentaba insertar un registro con estas columnas, Supabase devolvía 400 porque no las encontraba.

---

## Archivos Relacionados
- `src/app/services/db.service.ts` - Servicio de base de datos con logging mejorado
- `FIX_RLS_ERROR.sql` - Script SQL para desactivar RLS
- `disable-rls.js` - Script Node.js (alternativa si RLS sigue activo)

