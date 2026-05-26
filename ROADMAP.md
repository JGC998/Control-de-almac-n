# ROADMAP — CRM Taller / Control de Almacén

> Última actualización: 2026-05-26  
> Generado desde `ideas.txt` + backlog existente

---

## 🎯 Visión general

El proyecto tiene una base sólida con navegación, CRM, presupuestos, pedidos, almacén, calculadoras y el flujo completo hasta VeriFactu. El siguiente paso inmediato es **sincronizar ramas**: llevar todas las mejoras actuales a `main` sin arrastrar las funcionalidades de facturas/albaranes/VeriFactu que no se necesitarán hasta fin de año. Una vez estabilizado `main`, el trabajo continúa con mejoras UX menores, filtros avanzados, informes PDF y — a partir de año nuevo — la integración directa con el webservice AEAT.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-01 | Inventariar qué incluir/excluir en el merge a `main` | Infra | Pequeña | — |
| T-02 | Crear rama `dev` limpia desde `main` actual | Infra | Pequeña | T-01 |
| T-03 | Portar a `dev` todo excepto facturas/albaranes/VeriFactu | Backend/Infra | Grande | T-02 |
| T-04 | Validar compilación y funcionalidad en `dev` | Testing | Media | T-03 |
| T-05 | Merge `dev` → `main` cuando estable | Infra | Pequeña | T-04 |
| T-06 | Hub Configuración: reestructurar `/configuracion` como hub puro | Frontend | Pequeña | — |
| T-07 | PDF pedido: corregir texto de cliente desbordando el recuadro | Frontend | Pequeña | — |
| T-08 | PDF pedido: añadir botón "Imprimir" directo (sin descargar) | Frontend | Pequeña | — |
| T-09 | Pedidos: eliminar botón "Enviar Email" de la vista de detalle | Frontend | Pequeña | — |
| T-10 | Calculadora de Envíos: desglose + botón "añadir al pedido" + UX | Frontend | Media | — |
| T-11 | Dashboard: panel "Facturas pendientes de cobro" | Frontend/Backend | Media | — |
| T-12 | Informes: botón "Exportar a PDF" en página de informes | Frontend/Backend | Media | — |
| T-13 | Informes: informe de ventas por período y por cliente | Backend | Media | — |
| T-14 | Listas: filtros por fecha, cliente e importe en pedidos/facturas/albaranes | Frontend | Media | — |
| T-15 | Búsqueda global: NIF, referencia, importe; resultados agrupados; Ctrl+K | Frontend/Backend | Grande | — |
| T-16 | Acciones en bloque: selección múltiple, marcar pagadas, exportar, eliminar | Frontend/Backend | Grande | — |
| T-17 | Email: envío de facturas y albaranes (ya existe para pedidos) | Backend | Media | T-05 |
| T-18 | Stock: descuento automático al pasar albarán a ENTREGADO | Backend | Media | T-05 |
| T-19 | VeriFactu D2: envío directo al webservice AEAT (actualmente solo exportación XML) | Backend | Grande | T-05 |

---

## 🗺️ Fases propuestas

### Fase 1 — Sincronización de ramas
> Llevar todas las mejoras de `refactorizacion` a `main` sin las features de facturas/albaranes/VeriFactu. Estimación: 1–2 días.

- [ ] **T-01** — Inventariar qué incluir/excluir  
  _Revisar los commits de `refactorizacion` y clasificar cada archivo modificado: "va a main" (navegación, seguridad, CRM, calculadoras, proveedores, almacén, pricing) vs "se queda" (todo lo relacionado con Albaran, Factura, VeriFactu, ConfiguracionEmisor, Rectificativa). Documentar la lista antes de tocar nada._

- [ ] **T-02** — Crear rama `dev` desde `main`  
  _`git checkout main && git checkout -b dev`. Punto de partida limpio. Todos los cambios de la Fase 1 van a `dev`, no directamente a `main`._

- [ ] **T-03** — Portar cambios seleccionados a `dev`  
  _Estrategia recomendada: copiar manualmente los archivos "van a main" desde `refactorizacion` a `dev` (más seguro que cherry-pick cuando los commits mezclan features). Archivos clave a portar: `middleware.js`, `next.config.mjs`, `src/lib/` (logger, rateLimiter, validations, audit, manejadores-api), `src/app/api/` (auth, config, pedidos, presupuestos, clientes, productos, proveedores, almacén, precios, pricing, grapas, tacos, pedidos-proveedores-data, export), navegación, componentes, páginas CRM, `CHANGELOG.md`, `REVIEW.md`, `ROADMAP.md`. **Excluir:** `src/app/api/facturas/`, `src/app/api/albaranes/`, `src/lib/verifactu.js`, `src/lib/pdfGenerator.js` (partes de factura/albarán), páginas `/facturas`, `/albaranes`, modelos Prisma de Factura/Albaran/ConfiguracionEmisor._

- [ ] **T-04** — Validar compilación en `dev`  
  _`npm run build` + prueba manual del flujo: login → presupuesto → pedido → almacén → calculadoras → configuración. Si compila y los flujos críticos funcionan, está listo._

- [ ] **T-05** — Merge `dev` → `main`  
  _Cuando T-04 esté verde: `git checkout main && git merge dev`. Punto de control: desde este momento `main` es la rama estable de uso diario._

---

### Fase 2 — Quick wins y pulido UX
> Pequeñas mejoras de alta visibilidad que se pueden hacer en la rama activa en cualquier momento. Estimación: 2–4 horas en total.

- [ ] **T-06** — Hub de Configuración reestructurado  
  _Mover la página actual de Márgenes a `/configuracion/margenes` y hacer que `/configuracion` sea solo el hub con cards de navegación (Márgenes, Empresa, IVA, Backup…). Afecta: `src/app/configuracion/page.js` y rutas de sub-páginas._

- [ ] **T-07** — PDF pedido: texto de cliente que desborda  
  _En `src/app/api/pedidos/[id]/pdf/route.js`, usar `doc.splitTextToSize(texto, anchoRecuadro)` y ajustar la altura del recuadro dinámicamente según el número de líneas resultantes._

- [ ] **T-08** — PDF pedido: botón "Imprimir"  
  _En `src/app/pedidos/[id]/page.js`, tras generar el PDF blob, abrir una ventana con `window.open(blobUrl)` y llamar a `printWindow.print()`. Alternativa: `iframe` oculto con `contentWindow.print()`._

- [ ] **T-09** — Eliminar botón "Enviar Email" de detalle de pedido  
  _En `src/app/pedidos/[id]/page.js`, localizar y eliminar el botón. No afecta al endpoint, solo a la UI._

- [ ] **T-10** — Calculadora de Envíos: mejoras  
  _Tres sub-tareas independientes: (a) desglose tras calcular mostrando tipología elegida y su coste detallado; (b) botón "Añadir al pedido" que abre un selector de pedido y añade el coste de envío como línea; (c) mejoras de layout y feedback visual en tiempo real. Archivos: `src/app/calculadora/logistica/page.js` y componentes._

---

### Fase 3 — Funcionalidades de valor (post-sincronización)
> Features que añaden valor real al flujo de trabajo diario. Estimación: 1–2 semanas.

- [ ] **T-11** — Dashboard: panel de cobros pendientes  
  _Widget en `src/app/page.js` que muestre las facturas EMITIDA con fecha de vencimiento próxima o ya vencida. Ya existe la lógica de badges; es cuestión de añadir una query y un card al dashboard._

- [ ] **T-12** — Informes: exportar a PDF  
  _Botón en `src/app/informes/page.js` que capture los gráficos (via `html2canvas` o generando el PDF directamente desde los datos) y los empaquete como PDF descargable._

- [ ] **T-13** — Informes: más períodos y por cliente  
  _Ampliar `GET /api/informes` con tipos `ventas-por-cliente` y `ventas-por-período-personalizado`. Añadir selector de rango de fechas en la UI de informes._

- [ ] **T-14** — Filtros combinados en listas  
  _Filtros por rango de fechas, por cliente y por rango de importe en las listas de pedidos, facturas y albaranes. Los filtros se persisten en URL (`?desde=&hasta=&clienteId=`). La base ya existe parcialmente en el estado de algunas páginas._

---

### Fase 4 — Features avanzadas *(a partir de año nuevo)*
> Funcionalidades que requieren que las fases anteriores estén estables, o que no son necesarias hasta fin de año.

- [ ] **T-15** — Búsqueda global mejorada  
  _Ampliar `BarraBusqueda` para buscar por NIF, referencia de producto e importe exacto. Resultados agrupados por tipo. Atajo Ctrl+K para abrir el buscador. Requiere cambios en el endpoint de búsqueda._

- [ ] **T-16** — Acciones en bloque en listados  
  _Checkbox de selección múltiple en listados, barra de acciones contextual al seleccionar. Acciones: marcar varias facturas como pagadas, exportar selección a CSV/PDF, eliminar en bloque con confirmación. Complejidad alta — afecta a múltiples páginas y endpoints._

- [ ] **T-17** — Email de facturas y albaranes  
  _Extender `src/lib/email.js` (ya usada en pedidos) para enviar facturas y albaranes con adjunto PDF. Añadir botones de email en `/facturas/[id]` y `/albaranes/[id]`._

- [ ] **T-18** — Stock: descuento automático al entregar albarán  
  _En `PUT /api/albaranes/[id]` cuando el estado cambia a `ENTREGADO`, descontar automáticamente las cantidades del stock. Requiere mapear ítems de albarán con registros de stock (actualmente no hay relación directa)._

- [ ] **T-19** — VeriFactu D2: envío directo al webservice AEAT  
  _Actualmente el flujo es: emitir → exportar XML → usuario sube manualmente al portal AEAT. Esta tarea añade el envío directo via HTTPS con certificado FNMT del usuario. **Plazo obligatorio: 01/01/2027.** Complejidad alta — requiere manejo de certificados, firma digital y protocolo SOAP/REST AEAT._

---

## ⚡ Quick wins

Tareas pequeñas que se pueden hacer en menos de 1 hora:

- [ ] **T-09** — Eliminar botón "Enviar Email" de detalle pedido (~15 min)
- [ ] **T-06** — Reestructurar `/configuracion` como hub (~45 min)
- [ ] **T-07** — Corregir desbordamiento de texto en PDF de pedido (~30 min)
- [ ] **T-08** — Botón "Imprimir" en detalle de pedido (~30 min)

---

## 🚧 Dependencias y bloqueos

- **T-02 a T-05** son secuenciales — no se puede saltar ningún paso.
- **T-17 y T-18** pueden hacerse en `refactorizacion` ahora mismo, pero tienen más sentido después de la sincronización (T-05) para que queden también en `main`.
- **T-19** requiere decisión previa: ¿certificado FNMT en servidor o el usuario lo usa desde su propio navegador? La decisión actual es "cert en navegador del usuario" (ver Decisiones VeriFactu en el ROADMAP anterior), lo que complica el envío automático desde el servidor.
- **T-16** (acciones en bloque) depende conceptualmente de que **T-14** (filtros) esté hecho primero, para que la selección tenga contexto de filtrado.
- **T-03** (portar a dev) requiere revisión cuidadosa del schema Prisma: excluir modelos `Factura`, `FacturaItem`, `Albaran`, `AlbaranItem`, `ConfiguracionEmisor`, `Rectificativa` y sus relaciones.

---

## 💡 Ideas descartadas o pospuestas

- **Envío directo AEAT en 2026** — la conexión directa al webservice AEAT (T-19) requiere certificado FNMT y protocolo complejo. Se pospone a 2027 como mucho. El flujo manual de exportación XML funciona perfectamente para la fase actual.
- **Multi-empresa** — el sistema es mono-empresa por diseño. No hay planes de cambiar esto.
- **Selector de temas** — se eliminó en Fase A por hydration mismatch con Next.js App Router. El tema Corporate es fijo hasta que haya una solución limpia.

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

### Auditoría de seguridad (39 hallazgos — REVIEW.md)
- Rate limiting, PIN timing-safe, headers seguridad (CSP, HSTS, X-Frame-Options), MIME whitelist, Zod en todos los endpoints, paginación con límites, audit logs, error messages seguros

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
