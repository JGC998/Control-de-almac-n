# ROADMAP — CRM Taller / Control de Almacén

> Última actualización: 2026-05-27  
> Estado: rama `dev` en producción con MySQL real  
> Tareas pendientes: ver `PENDIENTE.md`

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

### Fase E — Cobros y vencimientos
- Badges VENCIDA/PRÓXIMA en listado y detalle, registro de fecha de pago al marcar PAGADA

### Auditoría de seguridad — 1ª ronda (39 hallazgos)
- Rate limiting, PIN timing-safe, headers seguridad (CSP, HSTS, X-Frame-Options), MIME whitelist, Zod en todos los endpoints, paginación con límites, audit logs, error messages seguros

### Sincronización de ramas (T-01 → T-04)
- Rama `dev` creada desde `refactorizacion`, facturas/albaranes/VeriFactu eliminados, build OK en producción con MySQL real

### Auditoría de seguridad — 2ª ronda (10 hallazgos)
- CRITICO-01: SQL injection en `bulk-update` eliminado
- BUG-06: imports faltantes en `config-paletizado` restaurados
- BACK-01 a SEC-04: 8 fixes adicionales de seguridad y backend

### Fase 2 — Quick wins UX (T-06 a T-09, T-20)
- T-07: `generateBudgetPDF` — caja de cliente con altura dinámica
- T-20: Dropdowns topnav responsive tablet + `min-h-[44px]` en botones

### Fase 2 — Rendimiento y bugs críticos (T-21 al T-28)
- T-28 BUG: `_count.albaranes` inexistente eliminado de `GET /api/pedidos`
- T-21+T-22: KPIs → `db.pedido.aggregate` en paralelo
- T-23: Top-clientes → `db.pedido.groupBy` en DB (top 20)
- T-24: Ventas-por-producto → `take: 5000`
- T-25: `clientes/resumen` → `take: 50` + `aggregate`/`count`
- T-26: `pedidos-proveedores` GET → paginación `{data, meta}`
- T-27: Dashboard `useSWR` → `refreshWhenHidden: false`

### Fase 3 — Diseño y experiencia visual
- T-29: Rediseño visual — KPICard, TablaDatos, globals.css, print styles
- T-30: Mini-app tablet `/tablet` — Tarifas, Stock, Calculadora de precios

### Fase 4 — Quick wins UX
- T-10: Calculadora de Envíos — desglose visual + botón "Añadir al pedido"
- T-11: Dashboard — panel `PanelFacturasPendientes` con semáforo de vencimiento
- T-12: Informes — exportar a PDF con `window.print()` + print styles
- T-13: Informes — nuevo tab "Por Cliente" + API `ventas-por-cliente` con rango de fechas
- T-14: Pedidos — filtros `FiltroBusqueda` + `FiltroFechas` persistidos en URL

### Fase 5 — Herramientas de importación
- T-31: Calculadora de coste de contenedor importado — desglose suplidos/exentos/sujetos, coste €/metro por bobina, sin persistencia

---

*Para añadir nuevas tareas: escríbelas en `ideas.txt` y ejecuta `/roadmap`.*
