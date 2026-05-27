# ROADMAP — CRM Taller / Control de Almacén

> Última actualización: 2026-05-27  
> Generado desde `ideas.txt` + backlog existente

---

## 🎯 Visión general

El proyecto está desplegado en producción con MySQL real y la nueva interfaz topnav activa. El siguiente paso inmediato es estabilizar `main` (T-05) y aplicar las mejoras UX pendientes, incluyendo optimizar el diseño para tablet. A medio plazo: filtros avanzados, informes PDF y búsqueda global. A fin de año: VeriFactu D2 directo al webservice AEAT.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-05 | Merge `dev` → `main` cuando estable | Infra | Pequeña | — |
| T-06 | Hub Configuración: reestructurar `/configuracion` como hub puro | Frontend | Pequeña | — |
| T-07 | PDF pedido: corregir texto de cliente desbordando el recuadro | Frontend | Pequeña | — |
| T-08 | PDF pedido: añadir botón "Imprimir" directo (sin descargar) | Frontend | Pequeña | — |
| T-09 | Pedidos: eliminar botón "Enviar Email" de la vista de detalle | Frontend | Pequeña | — |
| T-10 | Calculadora de Envíos: desglose + botón "añadir al pedido" + UX | Frontend | Media | — |
| T-11 | Dashboard: panel "Facturas pendientes de cobro" | Frontend/Backend | Media | — |
| T-12 | Informes: botón "Exportar a PDF" en página de informes | Frontend/Backend | Media | — |
| T-13 | Informes: informe de ventas por período y por cliente | Backend | Media | — |
| T-14 | Listas: filtros por fecha, cliente e importe en pedidos/presupuestos | Frontend | Media | — |
| T-15 | Búsqueda global: NIF, referencia, importe; resultados agrupados; Ctrl+K | Frontend/Backend | Grande | — |
| T-16 | Acciones en bloque: selección múltiple, exportar, eliminar | Frontend/Backend | Grande | T-14 |
| T-17 | Email: envío de facturas y albaranes (ya existe para pedidos) | Backend | Media | T-05 |
| T-18 | Stock: descuento automático al pasar albarán a ENTREGADO | Backend | Media | T-05 |
| T-19 | VeriFactu D2: envío directo al webservice AEAT | Backend | Grande | T-05 |
| T-20 | Diseño responsive para tablet: layout táctil y breakpoints tablet | Frontend | Media | — |

---

## 🗺️ Fases propuestas



---

### Fase 2 — Quick wins y pulido UX
> Mejoras de alta visibilidad que se pueden hacer en cualquier momento. Estimación: 4–6 horas en total.

- [ ] **T-06** — Hub de Configuración reestructurado  
  _Hacer que `/configuracion` sea solo el hub con cards de navegación. Ya existe `HubPage` — solo hay que reorganizar las sub-páginas._

- [ ] **T-07** — PDF pedido: texto de cliente que desborda  
  _En el generador de PDF, usar `doc.splitTextToSize(texto, anchoRecuadro)` y ajustar altura del recuadro dinámicamente._

- [ ] **T-08** — PDF pedido: botón "Imprimir"  
  _En la página de detalle del pedido, abrir el PDF blob en una ventana y llamar a `window.print()`._

- [ ] **T-09** — Eliminar botón "Enviar Email" de detalle de pedido  
  _Solo eliminar el botón de la UI — no afecta al endpoint._

- [ ] **T-10** — Calculadora de Envíos: mejoras  
  _Tres sub-tareas: (a) desglose visual tras calcular; (b) botón "Añadir al pedido"; (c) mejoras de layout._

- [ ] **T-20** — Diseño responsive para tablet  
  _La app usa Tailwind + DaisyUI que ya son responsive, pero hay ajustes específicos para tablet (768–1024px): targets táctiles ≥44px, tablas con scroll horizontal, dropdowns del topnav funcionando con touch, formularios con inputs más grandes. No hace falta una versión separada — con ajustes CSS es suficiente. Ver detalle en la sección de dependencias._

---

### Fase 3 — Funcionalidades de valor
> Features que añaden valor real al flujo diario. Estimación: 1–2 semanas.



- [ ] **T-12** — Informes: exportar a PDF  
  _Botón en la página de informes que capture los datos y los empaquete como PDF descargable._

- [ ] **T-13** — Informes: más períodos y por cliente  
  _Ampliar `/api/informes` con `ventas-por-cliente` y `ventas-por-período-personalizado`. Añadir selector de rango de fechas en la UI._

- [ ] **T-14** — Filtros combinados en listas  
  _Filtros por rango de fechas, cliente e importe en pedidos y presupuestos. Persistidos en URL para poder compartir/volver._

---

### Fase 4 — Features avanzadas *(a partir de año nuevo)*
> Funcionalidades que requieren estabilidad de las fases anteriores, o que no son necesarias hasta fin de año.

- [ ] **T-15** — Búsqueda global mejorada  
  _Buscar por NIF, referencia de producto e importe. Resultados agrupados. Atajo Ctrl+K._

- [ ] **T-16** — Acciones en bloque en listados  
  _Checkbox de selección múltiple, barra contextual, marcar pagadas, exportar selección, eliminar en bloque._


---

## ⚡ Quick wins

Tareas pequeñas que se pueden hacer en menos de 1 hora:

- [ ] **T-05** — Merge `dev` → `main` (~30 min)
- [ ] **T-09** — Eliminar botón "Enviar Email" de detalle pedido (~15 min)
- [ ] **T-07** — Corregir desbordamiento de texto en PDF de pedido (~30 min)
- [ ] **T-08** — Botón "Imprimir" en detalle de pedido (~30 min)
- [ ] **T-06** — Reestructurar `/configuracion` como hub (~45 min)

---

## 🚧 Dependencias y bloqueos

- **T-17 y T-18** tienen más sentido después de T-05 para que queden también en `main`.
- **T-19** requiere decisión previa sobre certificado FNMT (en servidor vs navegador del usuario).
- **T-16** depende conceptualmente de que **T-14** (filtros) esté hecho primero.
- **T-20 (tablet)** — notas de implementación:
  - El topnav ya tiene hamburger para móvil (`lg:hidden`). En tablet (768–1023px) actualmente puede mostrar la versión desktop comprimida o la móvil según el breakpoint `lg`.
  - Revisar si hace falta añadir un breakpoint `md` intermedio en el nav.
  - Las tablas largas (pedidos, clientes) necesitan `overflow-x-auto` en su contenedor.
  - Los botones de acción deben tener `min-h-[44px]` para targets táctiles cómodos.
  - Los dropdowns del encabezado usan `onMouseEnter` — en tablet (touch) esto no funciona. Hay que añadir `onClick` como fallback o cambiar a toggle con estado.
  - No hace falta versión separada: los ajustes son puramente CSS + un pequeño cambio en el trigger del dropdown.

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

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
