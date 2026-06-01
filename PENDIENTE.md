# PENDIENTE — CRM Taller / Control de Almacén

> Última actualización: 2026-05-29  
> Unificado desde: `REVIEW.md` · `ROADMAP.md` · `PENDIENTE.md`

---

## ✅ COMPLETADO (sesión 2026-05-27 / 2026-05-29)

| ID | Descripción | Esfuerzo |
|----|-------------|----------|
| CRIT-01 | Eliminado `/guias` (páginas que llamaban a `/api/guias` inexistente) | 30 min |
| SEC-01 | Zod validation en `PUT /api/clientes/[id]` | 20 min |
| API-03 | Campo `nif` añadido en `PUT /api/clientes/[id]` | 5 min |
| BUG-01 | `take: 500` por defecto en `crearManejadoresCRUD` GET | 15 min |
| API-01 | `take: 5000` en `GET /api/logistica/tarifas` | 5 min |
| DB-01 | Índices en `Stock` (material, metrosDisponibles, proveedor) | 20 min |
| DB-02 | Índices en `MovimientoStock` (stockId, fecha) | 10 min |
| DB-03 | Índices en `Documento` (tipo, productoId) | 10 min |
| DB-04 | Índices en `BobinaPedido` (pedidoId, referenciaId) | 5 min |
| SEC-02 | `logApiError` en `email.js` (reemplazado console.log/warn/error) | 10 min |
| BUG-03 | `logApiError` en `pdfGenerator.js` (4× console.error) | 15 min |
| BUG-02 | `take: 10000` en `informes/ventas-mensuales` | 5 min |
| API-02 | `take: 2000` en precios, tarifas-rollo, referencias, documentos | 20 min |
| CODE-01 | Soporte `zodSchema` opcional en `crearManejadoresCRUD` POST | 30 min |
| CODE-02 | `console.error` en frontend reemplazado por estado de error visual | 1 h |
| T-32 | PWA manifest + meta tags Apple en `layout.js` | — |
| T-33 | Nota de trabajo imprimible (`/pedidos/[id]/nota-trabajo`) | — |

---

## ⛔ BLOQUEADO — Esperando integración de `Factura`/`Albaran` en `dev`

### [T-17] Email: envío de facturas y albaranes
La API `sendEmail` ya existe en `src/lib/email.js`. Implementar rutas `/api/facturas/[id]/email` y `/api/albaranes/[id]/email` cuando esas entidades se integren en `dev`.

### [T-18] Stock: descuento automático al marcar albarán como ENTREGADO
Al cambiar estado de albarán a ENTREGADO, descontar automáticamente los metros del stock correspondiente.

---

## 🟡 BAJA PRIORIDAD — Próximo mes

### [T-15] Búsqueda global con Ctrl+K
Buscar por NIF, referencia de producto e importe. Resultados agrupados por entidad. Atajo `Ctrl+K`. Requiere T-28-ext (full-text index) para buen rendimiento con catálogos grandes.  
**Complejidad:** Grande

### [T-16] Acciones en bloque en listados
Checkbox de selección múltiple, barra contextual, marcar pagadas, exportar selección, eliminar en bloque.  
**Complejidad:** Grande

---

## 🟢 BACKLOG — Sin fecha

### [DB-05] `AuditLog.details` como `String` en lugar de JSON nativo
Funciona correctamente, pero en MySQL no permite `JSON_EXTRACT` queries. No urgente.  
**Corrección:** Cambiar a `@db.Json` en `prisma/schema.prisma` (producción).

### [T-28-ext] Full-text index MySQL en `Cliente` y `Producto`
Migración de schema para añadir `@@fulltext([nombre])`. Mejora drástica del rendimiento de búsqueda global. Prerrequisito para T-15.

### [T-19] VeriFactu D2: envío directo al webservice AEAT
Requiere decisión sobre certificado FNMT (en servidor vs. navegador del usuario). Pospuesto a 2027.

---

*Para regenerar la revisión técnica: `/review-full` · Para actualizar el roadmap: `/roadmap`*
