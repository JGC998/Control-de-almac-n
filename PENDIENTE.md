# PENDIENTE — CRM Taller / Control de Almacén

> Última actualización: 2026-05-27  
> Unificado desde: `REVIEW.md` · `ROADMAP.md` · `PENDIENTE.md`

---

## 🚨 CRÍTICO — Resolver antes del próximo deploy

### [CRIT-01] `/guias` completamente rota en producción
**Origen:** REVIEW.md  
**Archivo:** `src/app/guias/` + API inexistente  
**Problema:** Las páginas `/guias` y `/guias/[id]` llaman a `/api/guias` que no existe. Feature rota en producción; cualquier usuario que llegue a esa URL ve un error 500.  
**Corrección:** Eliminar las páginas del menú de navegación, o crear la ruta `/api/guias` si la feature se quiere mantener.  
**Esfuerzo:** ~30 min

### [SEC-01] `PUT /api/clientes/[id]` sin validación Zod
**Origen:** REVIEW.md  
**Archivo:** `src/app/api/clientes/[id]/route.js`  
**Problema:** El único endpoint PUT de clientes no valida el cuerpo con Zod. Cualquier campo puede enviarse sin restricciones.  
**Corrección:** Añadir schema Zod con los campos permitidos antes del `db.cliente.update`.  
**Esfuerzo:** ~20 min

### [API-03] `PUT /api/clientes/[id]` ignora el campo `nif`
**Origen:** REVIEW.md  
**Archivo:** `src/app/api/clientes/[id]/route.js`  
**Problema:** El update no incluye `nif` en los campos actualizados. El NIF no puede modificarse aunque el formulario lo envíe.  
**Corrección:** Añadir `nif` al objeto `data` del `db.cliente.update`.  
**Esfuerzo:** ~5 min

---

## 🔴 ALTA PRIORIDAD — Esta semana

### [BUG-01] `crearManejadoresCRUD` devuelve todos los registros sin límite
**Origen:** REVIEW.md  
**Archivo:** `src/lib/manejadores-api.js`  
**Problema:** El handler GET genérico no aplica `take` en modo no-paginado. Tablas con muchos registros (precios, referencias, documentos) devuelven todo su contenido de golpe.  
**Corrección:** Añadir `take: 500` por defecto cuando no hay paginación explícita.  
**Esfuerzo:** ~15 min

### [API-01] `GET /api/logistica/tarifas` sin límite
**Origen:** REVIEW.md  
**Archivo:** `src/app/api/logistica/tarifas/route.js`  
**Problema:** `db.tarifaTransporte.findMany()` sin `take`. Full table scan en cada carga de la calculadora de envíos.  
**Corrección:** Añadir `take: 5000`.  
**Esfuerzo:** ~5 min

### [DB-01] Tabla `Stock` sin índices
**Origen:** REVIEW.md  
**Archivo:** `prisma/schema.prisma` + `prisma/schema.dev.prisma`  
**Problema:** `Stock` es la tabla central del almacén (tablet app + dashboard). Los filtros `WHERE material`, `WHERE metrosDisponibles < 100` y `WHERE proveedor` hacen full scan en cada carga.  
**Corrección:**
```prisma
model Stock {
  // ...campos existentes sin cambios
  @@index([material])
  @@index([metrosDisponibles])
  @@index([proveedor])
}
```
**Esfuerzo:** ~20 min

### [SEC-02] `email.js` vuelca emails de clientes al log del servidor
**Origen:** REVIEW.md  
**Archivo:** `src/lib/email.js`  
**Problema:** `console.log/warn/error` directo expone datos personales (direcciones de email de clientes) en los logs del servidor.  
**Corrección:** Reemplazar con `logApiError` de `src/lib/logger.js`.  
**Esfuerzo:** ~10 min

---

## 🟠 MEDIA PRIORIDAD — Próximas 2 semanas

### [BUG-02] `informes/ventas-mensuales` sin límite en `findMany`
**Origen:** REVIEW.md  
**Archivo:** `src/app/api/informes/route.js` (línea ~36)  
**Problema:** `findMany` sin `take` en ventas mensuales. Con catálogos grandes puede devolver miles de pedidos y agotar memoria.  
**Corrección:** Añadir `take: 10000` defensivo.  
**Esfuerzo:** ~5 min

### [API-02] Endpoints de catálogos sin límite defensivo
**Origen:** REVIEW.md  
**Archivos:** `/api/precios` · `/api/tarifas-rollo` · `/api/configuracion/referencias` · `/api/documentos`  
**Problema:** Estos endpoints devuelven todos los registros sin `take`. Los catálogos son pequeños hoy, pero sin límite es una bomba de tiempo.  
**Corrección:** Añadir `take: 2000` en cada uno.  
**Esfuerzo:** ~20 min

### [DB-02] `MovimientoStock` sin índices en `fecha` ni `stockId`
**Origen:** REVIEW.md  
**Archivo:** `prisma/schema.prisma` + `prisma/schema.dev.prisma`  
**Problema:** El dashboard ordena `ORDER BY fecha DESC LIMIT 10`. Sin índice en `fecha`, full scan + sort en cada carga de la página principal.  
**Corrección:**
```prisma
model MovimientoStock {
  @@index([stockId])
  @@index([fecha])
}
```
**Esfuerzo:** ~10 min

### [DB-03] `Documento` sin índices en `tipo` ni `productoId`
**Origen:** REVIEW.md  
**Archivo:** `prisma/schema.prisma` + `prisma/schema.dev.prisma`  
**Problema:** `WHERE tipo = 'PROCESO'` en procesos y `WHERE productoId = ?` en páginas de producto hacen full scan.  
**Corrección:**
```prisma
model Documento {
  @@index([tipo])
  @@index([productoId])
}
```
**Esfuerzo:** ~10 min

### [BUG-03] `pdfGenerator.js` usa `console.error` en lugar de `logApiError`
**Origen:** REVIEW.md  
**Archivo:** `src/lib/pdfGenerator.js`  
**Problema:** 4× `console.error` exponen información interna en logs. Inconsistente con el resto de la API.  
**Corrección:** Reemplazar con `logApiError` de `src/lib/logger.js`.  
**Esfuerzo:** ~15 min

### [T-17] Email: envío de facturas y albaranes
**Origen:** ROADMAP.md  
**Estado:** ⛔ BLOQUEADO — modelos `Factura` y `Albaran` no están en la rama `dev`  
**Descripción:** La API `sendEmail` ya existe en `src/lib/email.js`. Implementar rutas `/api/facturas/[id]/email` y `/api/albaranes/[id]/email` cuando esas entidades se integren en `dev`.

### [T-18] Stock: descuento automático al marcar albarán como ENTREGADO
**Origen:** ROADMAP.md  
**Estado:** ⛔ BLOQUEADO — modelo `Albaran` no está en la rama `dev`  
**Descripción:** Al cambiar estado de albarán a ENTREGADO, descontar automáticamente los metros del stock correspondiente.

---

## 🟡 BAJA PRIORIDAD — Próximo mes

### [CODE-01] `crearManejadoresCRUD` POST sin soporte para validación Zod
**Origen:** REVIEW.md  
**Archivo:** `src/lib/manejadores-api.js`  
**Problema:** El handler POST genérico no tiene slot para pasar un schema Zod. Los endpoints que usan el patrón genérico quedan sin validación de entrada.  
**Corrección:** Añadir parámetro opcional `schema`; si está presente, validar el body antes de escribir en DB.  
**Esfuerzo:** ~30 min

### [DB-04] `BobinaPedido` sin índice en `pedidoId`
**Origen:** REVIEW.md  
**Archivo:** `prisma/schema.prisma` + `prisma/schema.dev.prisma`  
**Problema:** Cada carga de un pedido proveedor busca sus bobinas sin índice en la FK.  
**Corrección:**
```prisma
model BobinaPedido {
  @@index([pedidoId])
  @@index([referenciaId])
}
```
**Esfuerzo:** ~5 min

### [CODE-02] `console.error` en frontend no muestra nada al operario
**Origen:** REVIEW.md  
**Archivos:** `calculadora/actions.js:44` · `fotos/page.js:39,50,96` · `configuracion/logistica/page.js:35,171`  
**Problema:** Cuando algo falla, el error se silencia en consola. El operario no sabe que ocurrió un problema.  
**Corrección:** Usar el sistema de toasts (`src/lib/toast.js`) para mostrar el error al usuario.  
**Esfuerzo:** ~1 h

### [FRONT-01] `dangerouslySetInnerHTML` sin sanitización en guías
**Origen:** REVIEW.md  
**Archivo:** `src/app/guias/[id]/page.js` línea 58  
**Problema:** Renderiza HTML crudo de la API. Riesgo XSS almacenado si usuarios pueden editar contenido. Actualmente la feature está rota (ver CRIT-01), el riesgo es latente.  
**Corrección:** Cuando se implemente, instalar `isomorphic-dompurify` y sanitizar `htmlContent` antes de renderizar.  
**Esfuerzo:** ~30 min

### [T-15] Búsqueda global con Ctrl+K
**Origen:** ROADMAP.md  
**Descripción:** Buscar por NIF, referencia de producto e importe. Resultados agrupados por entidad. Atajo `Ctrl+K`. Requiere T-28-ext (full-text index) para buen rendimiento con catálogos grandes.  
**Complejidad:** Grande

### [T-16] Acciones en bloque en listados
**Origen:** ROADMAP.md  
**Descripción:** Checkbox de selección múltiple, barra contextual, marcar pagadas, exportar selección, eliminar en bloque.  
**Complejidad:** Grande

---

## 🟢 BACKLOG — Sin fecha

### [DB-05] `AuditLog.details` como `String` en lugar de JSON nativo
**Origen:** REVIEW.md  
**Problema:** Funciona correctamente, pero en MySQL no permite `JSON_EXTRACT` queries. No urgente.  
**Corrección:** Cambiar a `@db.Json` en `prisma/schema.prisma` (producción).

### [T-28-ext] Full-text index MySQL en `Cliente` y `Producto`
**Origen:** ROADMAP.md  
**Descripción:** Migración de schema para añadir `@@fulltext([nombre])`. Mejora drástica del rendimiento de búsqueda global. Prerrequisito para T-15.

### [T-19] VeriFactu D2: envío directo al webservice AEAT
**Origen:** ROADMAP.md  
**Descripción:** Requiere decisión sobre certificado FNMT (en servidor vs. navegador del usuario). Pospuesto a 2027.

---

*Unificado el 2026-05-27 desde `REVIEW.md` · `ROADMAP.md` · `PENDIENTE.md`*  
*Para regenerar la revisión técnica: `/review-full` · Para actualizar el roadmap: `/roadmap`*
