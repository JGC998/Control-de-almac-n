# ROADMAP — CRM Taller / Control de Almacén

> Última actualización: 2026-05-27  
> Estado: rama `dev` en producción con MySQL real

---

## 🎯 Visión general

El proyecto está desplegado en producción. Las Fases 2, 3 y 4 están completadas (rendimiento, rediseño visual, mini-app tablet, filtros, informes por cliente). El siguiente bloque inmediato es la calculadora de coste real de contenedores importados (T-31), que permite desglosar gastos de importación y calcular el coste por metro lineal. A medio plazo: búsqueda global, acciones en bloque. A fin de año: VeriFactu D2 directo al webservice AEAT.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-31 | Calculadora coste contenedor: desglose suplidos/exentos/sujetos + coste real €/metro | Frontend/Backend | Media | — |
| T-17 | Email: envío de facturas y albaranes | Backend | Media | — |
| T-18 | Stock: descuento automático al pasar albarán a ENTREGADO | Backend | Media | — |
| T-15 | Búsqueda global: NIF, referencia, importe; resultados agrupados; Ctrl+K | Frontend/Backend | Grande | T-28-ext |
| T-16 | Acciones en bloque: selección múltiple, exportar, eliminar | Frontend/Backend | Grande | T-14 |
| T-28-ext | Búsqueda global: full-text index MySQL | Backend/DB | Grande | — |
| T-19 | VeriFactu D2: envío directo al webservice AEAT | Backend | Grande | — |

---

## 🗺️ Fases propuestas

---

### Fase 5 — Herramienta de costes de importación *(próxima)*
> Calculadora standalone para desglosar el coste real de un contenedor importado. Estimación: 2–4 horas.

- [ ] **T-31** — Calculadora de coste de contenedor importado  
  _Nueva herramienta en `/herramientas/calculadora-contenedor` (o dentro de la vista de pedido proveedor). Permite introducir bobinas con precio en $ y metros lineales, tasa de cambio $/€, y gastos de importación desglosados en tres tipos:_
  - **Suplidos** — gastos del agente/transitario (handling, B/L, almacenaje puerto). Sin IVA.
  - **Exentos** — aranceles e impuestos pagados en aduana. Sin IVA.
  - **Sujetos** — transporte nacional, descarga en taller. Con IVA (21%).
  
  _Output: coste final por metro lineal para cada bobina (prorrateo proporcional a metros); desglose total en €; posibilidad de guardar/actualizar en el PedidoProveedor correspondiente._
  
  _Nota: el modelo `PedidoProveedor` ya tiene `gastosTotales` y `tasaCambio`. Habrá que valorar si se añaden campos `suplidos`, `exentos`, `sujetos` al schema o si se queda como calculadora sin persistencia._

---

### Fase 6 — Features avanzadas
> Funcionalidades bloqueadas o de largo plazo. Estimación: indeterminada.

- [ ] **T-17** — Email: facturas y albaranes *(bloqueado — modelos no en rama dev)*  
  _La API `sendEmail` ya existe. Implementar rutas `/api/facturas/[id]/email` y `/api/albaranes/[id]/email` cuando esas entidades estén disponibles en `dev`._

- [ ] **T-18** — Stock: descuento automático al marcar albarán como ENTREGADO *(bloqueado — albaranes no en dev)*  
  _Al cambiar estado de albarán a ENTREGADO, descontar automáticamente los metros del stock correspondiente._

- [ ] **T-15** — Búsqueda global mejorada  
  _Buscar por NIF, referencia de producto e importe. Resultados agrupados. Atajo Ctrl+K. Depende de T-28-ext (full-text index) para buen rendimiento con catálogos grandes._

- [ ] **T-16** — Acciones en bloque en listados  
  _Checkbox de selección múltiple, barra contextual, marcar pagadas, exportar selección, eliminar en bloque._

- [ ] **T-28-ext** — Búsqueda global: full-text index MySQL  
  _Migración de schema para añadir `@@fulltext([nombre])` a `Cliente` y `Producto`. Mejora drástica del rendimiento de búsqueda con catálogos grandes._

- [ ] **T-19** — VeriFactu D2: envío directo al webservice AEAT  
  _Requiere decisión sobre certificado FNMT. Pospuesto a 2027._

---

## ⚡ Quick wins — hacer ahora

- [ ] **T-31** — Calculadora coste contenedor (~3-4 horas) — **nueva prioridad**

---

## 🚧 Dependencias y bloqueos

- **T-17 y T-18** bloqueados hasta que los modelos de facturas/albaranes se integren en `dev`.
- **T-19** requiere decisión previa sobre certificado FNMT (en servidor vs navegador del usuario).
- **T-16** depende conceptualmente de que **T-14** (filtros) esté hecho primero. ✅ T-14 completado.
- **T-15** requiere **T-28-ext** (full-text index) para buen rendimiento con catálogos grandes.
- **T-31** puede implementarse como calculadora sin persistencia (más rápido) o con cambios de schema (más completo). Decisión previa necesaria.

---

## 💡 Ideas descartadas o pospuestas

- **Envío directo AEAT en 2026** — pospuesto a 2027 (T-19). El flujo manual XML funciona perfectamente.
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

### Fase D4 — Pedidos internos / sin facturación
- Campo `sinFacturacion`, tab separado en listado, bloqueo de albarán/facturado, toggle en detalle y en creación

### Fase E — Cobros y vencimientos (parcial)
- Badges VENCIDA/PRÓXIMA en listado y detalle, registro de fecha de pago al marcar PAGADA

### Auditoría de seguridad — 1ª ronda (39 hallazgos — REVIEW.md)
- Rate limiting, PIN timing-safe, headers seguridad (CSP, HSTS, X-Frame-Options), MIME whitelist, Zod en todos los endpoints, paginación con límites, audit logs, error messages seguros

### Sincronización de ramas (T-01 → T-04)
- Rama `dev` creada desde `refactorizacion`, facturas/albaranes/VeriFactu eliminados, build OK en producción con MySQL real

### Auditoría de seguridad — 2ª ronda (10 hallazgos — REVIEW.md)
- CRITICO-01: SQL injection en `bulk-update` eliminado
- BUG-06: imports faltantes en `config-paletizado` restaurados
- BACK-01 a SEC-04: 8 fixes adicionales de seguridad y backend

### Fase 2 — Quick wins UX (T-06 a T-09, T-20) ✅
- T-07: `generateBudgetPDF` — caja de cliente con altura dinámica
- T-20: Dropdowns topnav responsive tablet + `min-h-[44px]` en botones

### Fase 2 — Rendimiento y bugs críticos (T-21 al T-28) ✅
- T-28 BUG: `_count.albaranes` inexistente eliminado de `GET /api/pedidos`
- T-21+T-22: KPIs → `db.pedido.aggregate` en paralelo
- T-23: Top-clientes → `db.pedido.groupBy` en DB (top 20)
- T-24: Ventas-por-producto → `take: 5000`
- T-25: `clientes/resumen` → `take: 50` + `aggregate`/`count`
- T-26: `pedidos-proveedores` GET → paginación `{data, meta}`
- T-27: Dashboard `useSWR` → `refreshWhenHidden: false`

### Fase 3 — Diseño y experiencia visual ✅
- T-29: Rediseño visual — KPICard, TablaDatos, globals.css, print styles
- T-30: Mini-app tablet `/tablet` — Tarifas, Stock, Calculadora de precios

### Fase 4 — Quick wins UX ✅
- T-10: Calculadora de Envíos — desglose visual + botón "Añadir al pedido"
- T-11: Dashboard — panel `PanelFacturasPendientes` con semáforo de vencimiento
- T-12: Informes — exportar a PDF con `window.print()` + print styles
- T-13: Informes — nuevo tab "Por Cliente" + API `ventas-por-cliente` con rango de fechas
- T-14: Pedidos — filtros `FiltroBusqueda` + `FiltroFechas` persistidos en URL

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
