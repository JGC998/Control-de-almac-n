# ROADMAP — CRM Taller / Control de Almacén

> Última actualización: 2026-05-27  
> Estado: rama `dev` en producción con MySQL real

---

## 🎯 Visión general

El proyecto está desplegado en producción. La interfaz topnav con responsive tablet está activa. Toda la Fase 2 (rendimiento + bugs) está completada. El siguiente bloque es la calculadora de envíos (T-10), filtros avanzados e informes PDF. A fin de año: VeriFactu D2 directo al webservice AEAT.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-10 | Calculadora de Envíos: desglose + botón "añadir al pedido" + UX | Frontend | Media | — |
| T-11 | Dashboard: panel "Facturas pendientes de cobro" | Frontend/Backend | Media | — |
| T-12 | Informes: botón "Exportar a PDF" en página de informes | Frontend/Backend | Media | — |
| T-13 | Informes: informe de ventas por período y por cliente | Backend | Media | — |
| T-14 | Listas: filtros por fecha, cliente e importe en pedidos/presupuestos | Frontend | Media | — |
| T-15 | Búsqueda global: NIF, referencia, importe; resultados agrupados; Ctrl+K | Frontend/Backend | Grande | — |
| T-16 | Acciones en bloque: selección múltiple, exportar, eliminar | Frontend/Backend | Grande | T-14 |
| T-17 | Email: envío de facturas y albaranes | Backend | Media | — |
| T-18 | Stock: descuento automático al pasar albarán a ENTREGADO | Backend | Media | — |
| T-19 | VeriFactu D2: envío directo al webservice AEAT | Backend | Grande | — |
| T-28-ext | Búsqueda global: full-text index MySQL | Backend/DB | Grande | — |

---

## 🗺️ Fases propuestas

---

### Fase 2 — Rendimiento y bugs críticos
> Cambios de bajo riesgo y alta ganancia. Sin nuevas funcionalidades. Estimación: 2–3 horas en total.

- [x] **T-28** — 🐛 BUG: `_count: { albaranes: true }` en `GET /api/pedidos`  
  _Eliminado. La relación `albaranes` no existe en `schema.prisma`._

- [x] **T-21** — Informes KPIs: `findMany`→`aggregate` para ticketMedio  
  _`db.pedido.aggregate({ _avg: {total} })` en `informes/route.js`._

- [x] **T-22** — Informes KPIs: `findMany`→`aggregate` para sumas mensuales  
  _Dos `db.pedido.aggregate({ _sum: {total} })` en paralelo con `Promise.all`._

- [x] **T-23** — Informes top-clientes: `groupBy` en DB en lugar de Node.js  
  _`db.pedido.groupBy({ by: ['clienteId'], _sum: {total}, _count: {id}, take: 20 })` + lookup de nombres._

- [x] **T-24** — Informes ventas-por-producto: añadir `take: 5000`  
  _`db.pedidoItem.findMany({ take: 5000 })` en `informes/route.js`._

- [x] **T-25** — `clientes/[id]/resumen`: límites y aggregate para stats  
  _`take: 50` en findMany, `aggregate + count` para totalFacturado y numPedidos/Presupuestos reales._

- [x] **T-26** — `pedidos-proveedores` GET: paginación básica  
  _`take: 50` / `skip` con `page`/`limit` params; respuesta `{ data, meta }`; frontend actualizado._

- [x] **T-27** — Dashboard: desactivar refresh en background  
  _`refreshWhenHidden: false, refreshWhenOffline: false` añadidos._

---

### Fase 3 — Quick wins UX pendientes
> Mejoras de la calculadora de envíos. Estimación: 1–2 horas.

- [ ] **T-10** — Calculadora de Envíos: mejoras  
  _Tres sub-tareas: (a) desglose visual tras calcular; (b) botón "Añadir al pedido"; (c) mejoras de layout._

---

### Fase 4 — Funcionalidades de valor
> Features que añaden valor real al flujo diario. Estimación: 1–2 semanas.

- [ ] **T-12** — Informes: exportar a PDF  
  _Botón en la página de informes que capture los datos y los empaquete como PDF descargable._

- [ ] **T-13** — Informes: más períodos y por cliente  
  _Ampliar `/api/informes` con `ventas-por-cliente` y `ventas-por-período-personalizado`. Añadir selector de rango de fechas en la UI._

- [ ] **T-14** — Filtros combinados en listas  
  _Filtros por rango de fechas, cliente e importe en pedidos y presupuestos. Persistidos en URL para poder compartir/volver._

- [ ] **T-11** — Dashboard: panel "Facturas pendientes de cobro"  
  _Sección en el dashboard con facturas EMITIDA próximas a vencer o ya vencidas._

- [ ] **T-17** — Email: facturas y albaranes  
  _Extender el envío por email (ya existe para pedidos) a facturas y albaranes._

- [ ] **T-18** — Stock: descuento automático al marcar albarán como ENTREGADO  
  _Al cambiar estado de albarán a ENTREGADO, descontar automáticamente los metros del stock correspondiente._

---

### Fase 5 — Features avanzadas *(a partir de año nuevo)*
> Funcionalidades que requieren estabilidad de las fases anteriores.

- [ ] **T-15** — Búsqueda global mejorada  
  _Buscar por NIF, referencia de producto e importe. Resultados agrupados. Atajo Ctrl+K. Depende de T-27 (full-text index) para buen rendimiento con catálogos grandes._

- [ ] **T-16** — Acciones en bloque en listados  
  _Checkbox de selección múltiple, barra contextual, marcar pagadas, exportar selección, eliminar en bloque._

- [ ] **T-28-ext** — Búsqueda global: full-text index MySQL  
  _Migración de schema para añadir `@@fulltext([nombre])` a `Cliente` y `Producto`. Mejora drástica del rendimiento de búsqueda con catálogos grandes._

- [ ] **T-19** — VeriFactu D2: envío directo al webservice AEAT  
  _Requiere decisión sobre certificado FNMT. Pospuesto a 2027._

---

## ⚡ Quick wins — hacer ahora

> Toda la Fase 2 está completada. Los próximos quick wins son parte de Fase 3:

---

## 🚧 Dependencias y bloqueos

- **T-19** requiere decisión previa sobre certificado FNMT (en servidor vs navegador del usuario).
- **T-16** depende conceptualmente de que **T-14** (filtros) esté hecho primero.
- **T-15** se beneficia enormemente de **T-28-ext** (full-text index) — sin él la búsqueda hace full scans.

---

## 💡 Ideas descartadas o pospuestas

- **Envío directo AEAT en 2026** — pospuesto a 2027 (T-19). El flujo manual XML funciona perfectamente para la fase actual.
- **Multi-empresa** — el sistema es mono-empresa por diseño. Sin planes de cambio.
- **Selector de temas** — eliminado por hydration mismatch con Next.js App Router. Tema Corporate fijo.

---

## ✅ Completado

### Fase A — Navegación y diseño
- Topnav horizontal con dropdowns, tema Corporate, hub pages, BD SQLite local con datos mock

### Fase B — Albaranes
- Modelos Prisma, API completa, PDF valorado/sin valorar, generación desde pedido, páginas listado/detalle/nuevo

### Fase C — Facturas
- Modelos Prisma, API completa, PDF con IVA, inmutabilidad, anti-doble-facturación, factura manual sin albarán

### Fase D1 — VeriFactu: Hash + QR + Configuración emisor
- Hash SHA-256 encadenado, QR en PDF, `ConfiguracionEmisor`, `src/lib/verifactu.js`

### Fase D2 — VeriFactu: Exportación XML para AEAT
- `GET/POST /api/facturas/exportar-aeat`, botón en UI, campo CSV de confirmación, badges `estadoEnvioAeat`

### Fase D3 — Facturas rectificativas R1–R5
- Modal de creación, API, XML con `<FacturasRectificadas>`, PDF "FACTURA RECTIFICATIVA"

### Fase E — Cobros y vencimientos (parcial)
- Badges VENCIDA/PRÓXIMA en listado y detalle, registro de fecha de pago al marcar PAGADA

### Auditoría de seguridad — 1ª ronda (39 hallazgos — REVIEW.md)
- Rate limiting, PIN timing-safe, headers seguridad (CSP, HSTS, X-Frame-Options), MIME whitelist, Zod en todos los endpoints, paginación con límites, audit logs, error messages seguros

### Sincronización de ramas (T-01 → T-04)
- Rama `dev` creada desde `refactorizacion`, facturas/albaranes/VeriFactu eliminados, build OK en producción con MySQL real

### Auditoría de seguridad — 2ª ronda (10 hallazgos — REVIEW.md)
- CRITICO-01: SQL injection en `bulk-update` eliminado (ORM + validación de rango)
- BUG-06: imports faltantes en `config-paletizado` restaurados + GET handler
- BACK-01: `console.error` reemplazado por `logApiError` en `utilidades.js`
- API-01: `parseInt(uuid)` eliminado en `plantillas/[id]`
- BUG-03: handler DELETE falso en `documentos` eliminado
- BUG-05 + BACK-04: campo `version` inexistente eliminado + `procesos.json` con fallback silencioso
- BACK-03 + SEC-04: `take: 5000` + rate limit en exports Excel
- BUG-01: campos inexistentes eliminados de `receive-order` (`fechaEntrada`, `ubicacion`, `referencia`)
- BACK-02 + BACK-05: DELETE `pedidos-proveedores` arreglado (sin crash) + Zod en PUT
- SEC-03: `from` en email.js usa `RESEND_FROM` env var

### Fase 2 — Quick wins UX (T-06, T-07, T-08, T-09, T-20) ✅
- T-06: Hub Configuración ya usa `HubPage` correctamente (verificado)
- T-07: `generateBudgetPDF` — caja de cliente con altura dinámica (`splitTextToSize`)
- T-08: Botón "Imprimir PDF" en detalle de pedido (ya implementado, verificado)
- T-09: Botón "Enviar Email" ya eliminado del detalle de pedido (verificado)
- T-20: Dropdowns topnav con toggle touch + click-outside + `min-h-[44px]` en botones tabla

### Fase 2 — Rendimiento y bugs críticos (T-21 al T-28) ✅
- T-28: BUG eliminado — `_count: { albaranes: true }` en `GET /api/pedidos` (relación inexistente)
- T-21+T-22: KPIs aggregate — 3× `findMany+reduce` → `db.pedido.aggregate` en `informes/route.js`
- T-23: Top-clientes — `findMany` de toda la tabla → `db.pedido.groupBy` en DB (top 20)
- T-24: Ventas-por-producto — añadido `take: 5000` en `db.pedidoItem.findMany`
- T-25: `clientes/[id]/resumen` — `take: 50` en listas + `aggregate`/`count` para stats reales
- T-26: `pedidos-proveedores` GET — paginación básica `take: 50`, respuesta `{ data, meta }`
- T-27: Dashboard — `refreshWhenHidden: false, refreshWhenOffline: false` en `useSWR`

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
