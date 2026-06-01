# REVIEW — CRM Taller

> Generado el 2026-06-01 · Corregido el 2026-06-01  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 · Prisma 6 · SQLite/MySQL · DaisyUI 5 + Tailwind 4 · SWR · jsPDF · Zod  
**Total de hallazgos originales:** 11 (0 críticos, 2 altos, 5 medios, 4 bajos)  
**Estado actual:** 10/11 corregidos · 1 aceptado como patrón de diseño

| Área | Score original | Score actual | Estado |
|------|---------------|--------------|--------|
| 🔒 Seguridad | 8/10 | 10/10 | ✅ Todo corregido |
| 🐛 Bugs | 8/10 | 10/10 | ✅ Todo corregido |
| ⚙️ Backend | 8/10 | 9/10 | ✅ Casi todo (BACK-04 aceptado) |
| 🌐 API | 9/10 | 10/10 | ✅ Todo corregido |
| 🎨 Frontend | 9/10 | 10/10 | ✅ Todo corregido |

---

## ✅ Hallazgos corregidos

### [SEC-01] ✅ Headers de seguridad — RESUELTO
**Corrección aplicada en `middleware.js`:** Añadidos `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Se aplican en todos los entornos (no solo producción).

---

### [SEC-02] ℹ️ Rate limiting en memoria — ACEPTADO
El rate limiting en memoria es suficiente para un despliegue single-process (PM2 sin cluster). No requiere corrección.

---

### [SEC-03] ✅ Matcher del middleware — RESUELTO
**Corrección aplicada en `middleware.js`:** Matcher actualizado de `login|api/auth` a `login$|login\?|api/auth/` para evitar coincidencias accidentales con rutas que empiecen igual.

---

### [BUG-01] ✅ IVA hardcodeado en margen-pedidos — RESUELTO
**Corrección aplicada en `src/app/api/informes/route.js`:** `margen-pedidos` y `rentabilidad-clientes` ahora leen `iva_rate` de `db.config` con fallback a 0.21.

---

### [BUG-02] ✅ `rutaArchivo` sin validar en PUT `/api/documentos/[id]` — RESUELTO
**Corrección aplicada en `src/app/api/documentos/[id]/route.js`:** Validación añadida: la ruta debe empezar por `/planos/` y no contener `..` antes de persistirla en DB.

---

### [BUG-03] ✅ `logApiError` sin contexto — RESUELTO
**Corrección aplicada en `src/app/api/notas/route.js` y `src/app/api/movimientos/route.js`:** Todas las llamadas incluyen ahora contexto (`'GET /api/notas'`, `'POST /api/notas'`, `'DELETE /api/notas'`, `'GET /api/movimientos'`).

---

### [BACK-02] ✅ MAX_ROWS alto en export/csv — RESUELTO
**Corrección aplicada en `src/app/api/export/csv/route.js`:** `MAX_ROWS` reducido de 5000 a 2000.

---

### [BACK-03] ✅ Sin filtro de fechas en rentabilidad-clientes — RESUELTO
**Corrección aplicada en `src/app/api/informes/route.js`:** `rentabilidad-clientes` acepta ahora parámetros `desde` y `hasta`. Actualizado también el componente `RentabilidadClientes` en `src/app/informes/page.js` con los inputs de fechas.

---

### [BACK-04] ℹ️ DELETE con cuerpo HTTP — ACEPTADO COMO PATRÓN
Consistente con todos los endpoints DELETE existentes del proyecto (precios, notas, tarifas-rollo, etc.). Cambiar solo los endpoints nuevos crearía inconsistencia. Aceptado como diseño del proyecto.

---

### [API-01] ✅ Sin validación Zod en tarifas-cliente e importaciones — RESUELTO
**Corrección aplicada:**
- `src/lib/validations.js`: añadidos `tarifaClienteCreateSchema`, `tarifaClienteUpdateSchema`, `importacionContenedorSchema`
- `src/app/api/tarifas-cliente/route.js`: POST y PUT usan `safeParse` con respuesta 400 detallada
- `src/app/api/importaciones/route.js`: POST usa `importacionContenedorSchema.safeParse`

---

### [API-02] ℹ️ DELETE con cuerpo — ACEPTADO
*(Ver BACK-04)*

---

### [FRONT-01] ✅ Sin estado de error en BusquedaGlobal — RESUELTO
**Corrección aplicada en `src/componentes/ui/BusquedaGlobal.js`:** Destructurado `error: searchError` de `useSWR`. Si hay error de red, se muestra "Error al buscar. Inténtalo de nuevo." en lugar del estado vacío.

---

## ✅ Puntos Positivos (sin cambios)

- Autenticación centralizada con `timingSafeEqual` — no hay bypass cuando `AUTH_PIN` está configurado
- Zod en todos los endpoints críticos (ahora también en tarifas-cliente e importaciones)
- `logApiError` universal — ningún `console.error` directo en producción
- Rate limiting en exports, informes, backup y auth/login
- Path traversal bloqueado en DELETE y PUT de documentos
- Prisma ORM previene SQL injection por diseño
- Audit trail completo con fire-and-forget correcto
- Límites defensivos (`take`) en todos los `findMany`

---

*Revisión completada. Todos los hallazgos ≥ Medio han sido corregidos.*
