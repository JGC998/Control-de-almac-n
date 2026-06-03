# Changelog — CRM Taller

Registro diario de cambios, mejoras y tareas pendientes.
- ✅ Completado  |  🔄 En progreso  |  ⏳ Pendiente  |  ❌ Descartado

---

## 2026-06-03

### 🐛 Corregido
- ✅ **Calculadora de Contenedor** — corregidos 2 `</div>` sobrantes que cerraban el container principal en mitad del JSX, dejando la columna derecha, la tabla de resultados y el historial flotando fuera del contenedor DOM y rompiendo el layout

### ♻️ Cambiado
- ✅ **Calculadora de Contenedor — layout ancho completo**: eliminado el grid de 2 columnas (`lg:grid-cols-3`) que comprimía la tabla de bobinas a ~66% del ancho y obligaba a usar scrollbar horizontal. La calculadora ahora ocupa todo el ancho disponible (`max-w-screen-xl`)
- ✅ **Calculadora de Contenedor — resumen superior**: la columna derecha sticky (panel azul de Resumen) se eliminó por ser redundante con la franja superior de 4 columnas (TC + Bobinas + Coste + Metros) que ya centraliza toda la información
- ✅ **Calculadora de Contenedor — inputs tabla bobinas**: ampliados todos los campos de entrada para aprovechar el ancho disponible (referencia `w-16→w-24`, espesor/ancho `w-16→w-20`, longitud `w-20→w-24`, precio `w-24→w-32`, selector unidad `w-16→w-20`)
- ✅ **Calculadora de Contenedor — metodología**: nota de metodología movida inline debajo de la sección de Gastos de importación (antes ocupaba espacio de columna lateral)

---

## 2026-06-02

### ✨ Añadido

#### Sistema de grapas inteligente (T-46 → T-51)
- ✅ **T-46** — Nuevo modelo `ModeloGrapa` en Prisma: `tipo` (NORMAL/UNA), `nombre`, `espesorDesde`, `espesorHasta`, `anchosDisponibles` (JSON con anchos de rollo disponibles en mm), `precioMetroLineal`. Migración SQL `20260602000000_add_modelo_grapa`
- ✅ **T-47** — API CRUD `/api/modelos-grapa` (GET/POST), `/api/modelos-grapa/[id]` (PATCH/DELETE) y `/api/modelos-grapa/config-merma` (PUT para guardar `mermaGrapaPct` en `Config`). Schema Zod `modeloGrapaSchema` en `validations.js`
- ✅ **T-48 + T-51** — `/configuracion/grapas` reconstruida con dos secciones: **Modelos genéricos** (nueva tabla con CRUD inline, campo de anchos disponibles CSV, config de % merma) y **Grapas de fabricante** (tabla existente rediseñada)
- ✅ **T-49** — Calculadora de bandas: toggle **Normal / Uña** al activar confección por grapa. Filtrado automático de modelos compatibles por espesor + subtipo. Auto-selección del primer modelo compatible con override manual
- ✅ **T-50** — Calculadora de bandas: cálculo preciso de coste de grapa por ancho de rollo. Selecciona el rollo más pequeño disponible ≥ ancho de banda → `coste = 2 × (anchoRollo/1000) × precio€/m`. Muestra rollo usado y desperdicio mm/extremo. Fallback a % merma si no hay anchos configurados. Advertencia si la banda supera todos los rollos disponibles
- ✅ **Desglose colapsable** en calculadora de bandas (modo grapa): sección "▶ Desglose del cálculo" que muestra paso a paso dimensiones, área, coste de material, coste de grapa (con rollo seleccionado y fórmula explícita) y resumen final para verificación manual

#### Calculadora de Metrajes (nueva)
- ✅ Nueva página `/calculadora/metrajes`: calcula el precio de metros lineales de tira PVC a un ancho determinado, sin confección. Inputs: material, espesor, color (PVC), ancho mm, metros. Soporte de márgenes, desglose colapsable, lista acumulable de líneas, exportación PDF
- ✅ Tab "Metrajes" añadido a las tres calculadoras (Piezas m², Bandas PVC, Metrajes) para navegación directa entre ellas
- ✅ Hub `/herramientas`: nueva entrada "Calculadora de metrajes"

### 🐛 Corregido
- ✅ Hub `/herramientas`: el enlace "Calculadora de bandas PVC" apuntaba a `/calculadora` (piezas m²) en lugar de `/calculadora/bandas`

### ♻️ Cambiado
- ✅ `useGestionCRUD.js` + `PaginaGestion.jsx`: propagación de `erroresCampos` (errores Zod por campo) desde el hook hasta el modal de formulario
- ✅ APIs `fabricantes`, `proveedores`, `clientes`, `tarifas-rollo`, `pricing/margenes`, `materiales`, `precios`: validación Zod añadida en POST/PUT con `zodSchema` en `crearManejadoresCRUD` o `validateData` directo; eliminados `parseFloat`/`parseInt` manuales sin validación previa
- ✅ `almacen/page.js`: hub rediseñado — enlace "Rollos y materiales" apunta a `/tarifas`; eliminados accesos redundantes a Materiales, Productos y Fabricantes (ya accesibles desde Gestión)
- ✅ `almacen/articulos/page.js` + `configuracion/tacos/page.js`: atributos `min` y `step` añadidos a campos numéricos para validación HTML nativa

---

## 2026-06-01 (auditoría)

### Correcciones de seguridad y calidad — REVIEW.md (10 hallazgos)

### 🔒 Seguridad
- ✅ **SEC-01** — `middleware.js`: añadidos headers `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` en todos los entornos (no solo producción)
- ✅ **SEC-03** — `middleware.js`: matcher mejorado con anchors `login$|login\?|api/auth/` para evitar coincidencias accidentales con rutas que empiecen igual

### 🐛 Corregido
- ✅ **BUG-01** — `informes/route.js`: `margen-pedidos` y `rentabilidad-clientes` leen ahora `iva_rate` de `db.config` (fallback 0.21) en lugar de tener el IVA hardcodeado
- ✅ **BUG-02** — `documentos/[id]/route.js`: PUT valida que `rutaArchivo` empiece por `/planos/` y no contenga `..` antes de persistir en DB; previene rutas arbitrarias en la base de datos
- ✅ **BUG-03** — `notas/route.js`, `movimientos/route.js`: contexto añadido a todas las llamadas `logApiError` (`'GET /api/notas'`, `'POST /api/notas'`, `'DELETE /api/notas'`, `'GET /api/movimientos'`)

### ♻️ Cambiado
- ✅ **BACK-02** — `export/csv/route.js`: `MAX_ROWS` reducido de 5000 a 2000 para evitar timeouts con catálogos grandes
- ✅ **BACK-03** — `informes/route.js` + `informes/page.js`: `rentabilidad-clientes` acepta parámetros `desde`/`hasta` para filtrar por rango de fechas; UI actualizada con inputs de fecha
- ✅ **API-01** — `validations.js`, `tarifas-cliente/route.js`, `importaciones/route.js`: schemas Zod formales (`tarifaClienteCreateSchema`, `tarifaClienteUpdateSchema`, `importacionContenedorSchema`) + `safeParse` en POST y PUT; respuesta 400 con errores detallados por campo
- ✅ **FRONT-01** — `BusquedaGlobal.js`: estado de error visible cuando `/api/busqueda` falla — muestra "Error al buscar" en lugar del estado vacío indistinguible de "sin resultados"

---

## 2026-06-01 (madrugada)

### T-39 · T-40 · T-41 — Análisis de rentabilidad

- ✅ **T-39 — Margen real por pedido**: nuevo tab "Margen por Pedido" en `/informes`. Calcula por pedido: coste base (suma de `quantity × unitPrice` de ítems), venta sin IVA (`total / 1.21`), margen € y % margen. Filtro por rango de fechas. Resumen con 4 KPIs (pedidos, venta, coste, margen). Badge de color por porcentaje de margen (≥20% verde, ≥10% amarillo, <10% rojo). API `GET /api/informes?tipo=margen-pedidos`
- ✅ **T-40 — Rentabilidad por cliente**: nuevo tab "Rentabilidad" en `/informes`. Agrupa T-39 por cliente: facturación, coste, margen € y % margen. Gráfico de barras horizontales con top 10 (venta vs margen). Ordenado de más a menos rentable. API `GET /api/informes?tipo=rentabilidad-clientes`
- ✅ **T-41 — Histórico de precios de proveedor**: nuevo tab "Precios Importación" en `/informes`. Lista de referencias de bobina extraídas de las importaciones guardadas. Al seleccionar una referencia: gráfico de líneas de evolución USD/M y €/M real, tabla histórica con fecha, descripción de importación, TC y coste calculado. Recalcula el €/M real con prorrateo a partir de los datos almacenados. API `GET /api/importaciones/historico-bobinas`

---

## 2026-06-01 (noche)

### T-43 · T-44 · T-45 — Calculadora de contenedor: nueva lógica de gastos + persistencia

- ✅ **T-44 — Nueva regla de gastos**: `gastosRepercutibles = suplidos + exentos`. Los **Exentos (aranceles)** ahora se incluyen en el coste de producto (badge "✓ Repercute"). Los **Sujetos (21% IVA)** se guardan para control pero **nunca entran en el cálculo del €/metro** — el IVA es deducible y no es coste neto. Aviso informativo claro en la UI
- ✅ **T-45 — Texto explicativo**: panel de metodología actualizado; etiquetas de cada casilla explican exactamente qué es cada concepto y por qué se trata así
- ✅ **T-43 — Persistencia de importaciones**: nuevo modelo `ImportacionContenedor` (ambos schemas, `db push` aplicado). API `GET|POST /api/importaciones` + `DELETE /api/importaciones/[id]`. Botón "Guardar importación" aparece al completar el cálculo (abre modal con nombre opcional). Sección "Historial de importaciones" colapsable al pie de la página con tabla de todas las guardadas; cada fila tiene botón "Cargar" para restaurar los datos en la calculadora

---

## 2026-06-01 (tarde)

### T-15 · T-16 · T-28-ext — Búsqueda global y acciones en bloque

- ✅ **T-28-ext** — `@@fulltext([nombre])` añadido a `Cliente` y `Producto` en `schema.prisma` (MySQL producción); hace que la búsqueda por nombre sea índice de texto completo en lugar de full table scan
- ✅ **T-15 — Búsqueda global Ctrl+K**: nuevo componente `BusquedaGlobal.js` — modal overlay al pulsar `Ctrl+K` (o `⌘K`), resultados agrupados por tipo (clientes, pedidos, presupuestos, productos), navegación con ↑↓/Enter/Esc. Botón "Buscar..." con atajo visible en el navbar desktop. Usa la API `/api/busqueda` ya existente
- ✅ **T-16 — Acciones en bloque**: nuevo componente `TablaConSeleccion.jsx` reemplaza `TablaDatos` en pedidos y presupuestos. Añade checkbox por fila + "seleccionar todo". Barra flotante al seleccionar: acciones específicas por tipo (pedidos: Marcar Facturado / Cancelar; presupuestos: Aceptar / Rechazar) + exportar selección a CSV. APIs `POST /api/pedidos/bulk-update` y `POST /api/presupuestos/bulk-update` con validación Zod

---

## 2026-06-01 (mañana)

### Fase 8 — CRM y precios avanzados (T-36 · T-37 · T-38)

- ✅ **T-36 — Historial de precios por cliente**: nueva sección colapsable en la ficha de cliente con tabla de referencias históricas (último precio, media, mín/máx, nº de veces pedido, fecha última compra). API `GET /api/clientes/[id]/historial-precios` agrega PedidoItem por descripción/productoId
- ✅ **T-37 — Tarifas pactadas por cliente**: nuevo modelo `TarifaCliente` (schema dev + prod, `prisma db push` aplicado). CRUD completo en ficha de cliente: añadir, activar/desactivar, eliminar. API `GET|POST|PUT|DELETE /api/tarifas-cliente`. En el formulario de pedido/presupuesto, al seleccionar un cliente con tarifas activas aparecen badges clicables que insertan la línea con el precio pactado directamente
- ✅ **T-38 — Plantillas en pedidos**: `TemplateManager` habilitado también para "Nuevo pedido" (antes solo en presupuestos). Comparten el mismo pool de plantillas guardadas

### Fase 7 — Logística documental (T-34 · T-35)

- ✅ **T-34 — Carta de porte PDF**: nueva herramienta en `/herramientas/carta-porte`. Formulario con expedidor (prefilled desde config de empresa), destinatario, tabla de mercancías dinámica (descripción, nº palés, nº bultos, peso, valor declarado), agencia de transporte y observaciones. API `POST /api/herramientas/carta-porte` devuelve PDF. Enlace añadido en menú Herramientas
- ✅ **T-35 — Inventario de palés**: integrado en T-34. Sección colapsable que permite detallar el contenido de cada palé (referencia, descripción, metros, rollos, peso). Al generar el PDF se añade una segunda página con tabla por palé incluyendo totales automáticos

### Fase 6 — Taller + impresión (T-32 · T-33)

- ✅ **T-32 — PWA instalable**: `public/manifest.json` con `display: standalone`, shortcuts a "Nuevo pedido" y "Stock". Meta tags Apple (`apple-mobile-web-app-capable`, `theme-color`) en `layout.js`. La app aparece instalable en Android/iOS
- ✅ **T-33 — Nota de trabajo imprimible**: nueva ruta `/pedidos/[id]/nota-trabajo` con vista de impresión: cabecera empresa, datos del pedido, tabla de líneas (sin precios, con columna "Realizado"), notas, área de firma. Botón "Nota de trabajo" añadido en el detalle del pedido

### Correcciones técnicas — PENDIENTE.md (39 ítems resueltos)

- ✅ **CRIT-01**: eliminadas páginas `/guias` y `/guias/[id]` que llamaban a `/api/guias` inexistente
- ✅ **SEC-01 + API-03**: Zod validation en `PUT /api/clientes/[id]`; campo `nif` incluido en el update
- ✅ **BUG-01 + API-01**: `take: 500` por defecto en `crearManejadoresCRUD` GET; `take: 5000` en tarifas de transporte
- ✅ **SEC-02 + BUG-03**: `logApiError` en `email.js` y `pdfGenerator.js` (eliminados todos los `console.error`)
- ✅ **DB-01–04**: índices `@@index` en `Stock`, `MovimientoStock`, `Documento`, `BobinaPedido` (ambos schemas)
- ✅ **BUG-02 + API-02**: `take` defensivo en `informes/ventas-mensuales`, `/api/precios`, `/api/tarifas-rollo`, `/api/configuracion/referencias`, `/api/documentos`
- ✅ **CODE-01**: soporte `zodSchema` opcional en `crearManejadoresCRUD` POST
- ✅ **CODE-02**: `console.error` en frontend reemplazado por estados de error visibles en UI (`fotos/page.js`, `configuracion/logistica/page.js`, `calculadora/actions.js`)

---

## 2026-05-27 (madrugada)

### Calculadora de contenedor — rediseño completo (T-31 v2)

- ✅ **Campos de bobina** rediseñados para coincidir con la factura del proveedor: nº bobina, espesor (mm), ancho (mm), longitud por rollo (m), nº de rollos, USD/M — los totales de metros y precio se calculan automáticamente
- ✅ **Prorrateo por valor económico** — los gastos se distribuyen proporcionalmente al precio total de cada bobina (no por metros); una bobina que representa el 40% del valor recibe el 40% de los gastos
- ✅ **Exentos (aranceles) no repercutidos** — se registran y aparecen en el desembolso total real, pero no se incluyen en el €/metro ni en el coste de producto; el resumen distingue explícitamente "Coste producto" (bobinas + suplidos + sujetos) de "Desembolso total" (todo incluido aranceles + IVA)
- ✅ **Columna "% valor"** en la tabla de resultados — muestra qué porcentaje del valor total representa cada bobina, para visualizar el prorrateo

### Documentación — unificación de archivos de seguimiento

- ✅ **`PENDIENTE.md` unificado** desde `REVIEW.md` + `ROADMAP.md` + `PENDIENTE.md`: un único archivo ordenado por prioridad (Crítico → Alto → Medio → Bajo → Backlog) con solo los ítems pendientes; se eliminaron todos los completados
- ✅ **`REVIEW.md` eliminado** — contenido íntegramente volcado en `PENDIENTE.md`
- ✅ **`ROADMAP.md` reducido** — conserva solo el historial de fases completadas e ideas descartadas; el backlog pendiente vive en `PENDIENTE.md`

---

## 2026-05-27 (noche)

### Mini-app tablet — mejoras y nuevas funciones

- ✅ **Entrada de stock desde tablet** — formulario táctil inline en el tab Stock: material (con datalist de sugerencias), espesor y metros; llama a `POST /api/almacen-stock` y refresca la lista automáticamente
- ✅ **Salida de stock desde tablet** — botón "Salida" por fila que despliega campo de metros a descontar con confirmación; llama a `POST /api/almacen-stock?action=salida`
- ✅ **Nuevo tab Pedidos** — muestra pedidos PENDIENTE/EN_PROCESO filtrados desde `/api/pedidos`; contador de estados en cabecera, buscador por número o cliente
- ✅ **Fix bug Stock tab** — `data?.stockItems` → `data?.stock` (la API devuelve `{ stock: [...] }`, no `stockItems`); evitaba crash con "filtrado.map is not a function" al pulsar el tab
- ✅ **Fix campos array en `useBusqueda`** — `campos` movido a `useMemo` para evitar recálculos innecesarios en cada render
- ✅ **Redirección automática móvil/tablet** — `middleware.js`: detecta User-Agent `Mobi|Android|iPhone|iPad|Tablet` y redirige desde `/` a `/tablet` antes de la verificación de PIN
- ✅ **Script `dev:lan`** — `package.json`: nuevo script `next dev --turbopack -H 0.0.0.0` para exponer el servidor de desarrollo a la red local

### Auditoría de código — REVIEW.md

- ✅ `REVIEW.md` regenerado completamente: 22 hallazgos (1 crítico, 7 altos, 12 medios) con hoja de ruta priorizada en 4 fases; principal hallazgo: `src/app/guias/` consume `/api/guias` inexistente → feature rota en producción

---

## 2026-05-27 (tarde)

### Rendimiento — Fase 2 completa (T-21 a T-28)

- ✅ **T-28 BUG** — `GET /api/pedidos`: eliminado `_count: { albaranes: true }` en el include de Prisma; la relación `albaranes` no existe en `schema.prisma` y habría roto el listado tras cualquier `prisma generate`
- ✅ **T-27** — Dashboard `page.js`: `useSWR` con `refreshWhenHidden: false, refreshWhenOffline: false` — elimina polling continuo cuando la pestaña está inactiva
- ✅ **T-21+T-22** — `GET /api/informes?tipo=kpis`: 3× `db.pedido.findMany({ select: {total} })` + `reduce` en Node.js reemplazados por `db.pedido.aggregate({ _sum, _avg, _count })` en paralelo con `Promise.all`; toda la lógica de stats se calcula en MySQL
- ✅ **T-23** — `GET /api/informes?tipo=top-clientes`: `db.pedido.findMany` de toda la tabla + agrupación manual en Node.js reemplazados por `db.pedido.groupBy({ by: ['clienteId'], _sum: {total}, _count: {id}, orderBy, take: 20 })` + lookup de nombres con `db.cliente.findMany`
- ✅ **T-24** — `GET /api/informes?tipo=ventas-por-producto`: añadido `take: 5000` a `db.pedidoItem.findMany` para evitar transferencias ilimitadas
- ✅ **T-25** — `GET /api/clientes/[id]/resumen`: `take: 50` en findMany de pedidos y presupuestos; stats (`totalFacturado`, `numPedidos`, `numPresupuestos`) calculados con `db.pedido.aggregate + count` sobre el historial completo, no solo los 50 cargados
- ✅ **T-26** — `GET /api/pedidos-proveedores-data`: paginación básica con parámetros `page`/`limit` (default 50, máx 200); respuesta cambiada de array plano a `{ data, meta: { total, page, limit, totalPages } }`; frontend `proveedores/page.js` actualizado para usar `pedidos?.data`

### Documentación

- ✅ `ROADMAP.md` actualizado: Fase 2 marcada como completada, T-05 (merge → main) eliminado del backlog a petición, dependencias actualizadas

---

## 2026-05-27

### Auditoría de seguridad — 2ª ronda (10 hallazgos corregidos)

- ✅ **CRÍTICO-01** — SQL injection en `bulk-update/route.js` eliminado: `$executeRawUnsafe` con interpolación directa reemplazado por ORM (`findMany` + `$transaction` de updates individuales) con validación de rango del porcentaje
- ✅ **BUG-06** — `config-paletizado/route.js`: imports faltantes (`NextResponse`, `db`, `logApiError`) restaurados + handler GET añadido (estaba ausente)
- ✅ **BACK-01** — `utilidades.js`: `console.error` reemplazado por `logApiError`; eliminado "Consulte logs." del mensaje de error 500
- ✅ **API-01** — `plantillas/[id]/route.js`: eliminado `parseInt(uuid)` que convertía IDs de string a `NaN` antes de la query Prisma
- ✅ **BUG-03** — `documentos/route.js`: eliminado handler DELETE falso que parseaba el body pero devolvía 405
- ✅ **BUG-05 + BACK-04** — `maquinaria/procesos/route.js`: campo `version` inexistente eliminado de `db.documento.create`; GET con try/catch y fallback silencioso `[]` para `procesos.json`
- ✅ **BACK-03 + SEC-04** — `/api/pedidos/export` y `/api/presupuestos/export`: `take: 5000` para evitar volcados ilimitados + rate limiting (10 req/min por IP)
- ✅ **BUG-01** — `receive-order/route.js`: campos inexistentes eliminados de `tx.stock.create` (`fechaEntrada`, `ubicacion`, `metrosInicialesPorBobina`) y de `movimientos.create` (`referencia`) que causaban crash en runtime
- ✅ **BACK-02 + BACK-05** — `pedidos-proveedores-data/[id]/route.js`: DELETE reescrito (queries por campo `referencia` inexistente causaban crash); PUT con validación Zod del body; eliminado campo `color` inexistente en `BobinaPedido`
- ✅ **SEC-03** — `email.js`: campo `from` usa `process.env.RESEND_FROM` en lugar de dirección hardcodeada
- ✅ `REVIEW.md` creado con 22 hallazgos documentados (1 crítico, 4 altos, 9 medios, 8 bajos)
- ✅ `ROADMAP.md` generado con fases, quick wins, dependencias y T-20 (tablet)

### Roadmap — quick wins y UX (T-06, T-07, T-08, T-09, T-20)

- ✅ **T-09** — Botón "Enviar Email" en detalle de pedido: ya estaba eliminado (verificado)
- ✅ **T-08** — Botón "Imprimir PDF" en detalle de pedido: ya estaba implementado (verificado)
- ✅ **T-06** — Hub Configuración: ya usaba `HubPage` correctamente (verificado)
- ✅ **T-07** — `pdfGenerator.js` `generateBudgetPDF`: caja de cliente con altura fija reemplazada por `splitTextToSize` con altura dinámica; tabla baja automáticamente según líneas del cliente
- ✅ **T-20** — Responsive tablet en `Encabezado.js`: dropdowns del topnav responden a touch (botón chevron hace toggle al tocar, cierra al pulsar fuera con `useEffect`, `onClose` al navegar desde el dropdown); `min-h-[44px] touch-manipulation` en botones Editar/Eliminar de `PaginaGestion.jsx` y botón "Ver" de `TablaDatos.jsx`

---

## 2026-05-21

### Rama: `refactorizacion`

#### Fase A — Navegación y diseño

- ✅ Merge rama `dev` → `main` (11 commits)
- ✅ Eliminar rama `feature/calculadora-pvc-v1`
- ✅ Crear rama `refactorizacion`
- ✅ Mover navegación de barra lateral a cabecera horizontal (topnav)
- ✅ Aplicar tema **Corporate** como predeterminado (selector de temas incluido: Dim, Night, Dracula, Corporate, Nord)
- ✅ Arreglar buscador — migrar `input-group` → `join` (DaisyUI v5)
- ✅ Crear hub pages: `/ventas`, `/compras`, `/gestion`, `/herramientas`
- ✅ Nav: label de sección = link al hub · chevron = dropdown rápido
- ✅ Añadir **Informes** como ítem propio en la barra (antes estaba enterrado en Herramientas)
- ✅ BD SQLite local para desarrollo (`prisma/dev.db`) con datos mock realistas (15 clientes, 10 productos, 52 presupuestos, 39 pedidos…)

#### Reorganización de navegación (esta sesión)

- ✅ **Ventas** — dropdown en dos bloques: *Crear* (Presupuesto, Pedido, Albarán·, Factura·) y *Ver* (listados)
- ✅ **Compras** — dropdown en dos bloques: *Crear* (Pedido nacional, Importación) y *Ver* (pedidos, proveedores)
- ✅ **Almacén** — renombrado a catálogo de materiales/productos; stock de inventario movido a `/almacen/stock`
- ✅ **Gestión** — solo Clientes + Tarifas de material
- ✅ **Herramientas** — solo calculadoras (Planos/Documentos eliminado del menú)
- ✅ **Configuración** — hub page antes de acceder a sub-secciones
- ✅ Dropdown siempre visible al pasar el cursor sobre cualquier parte de la sección (no solo el chevron)

---

---

## 2026-05-21 (sesión 2)

### Rama: `refactorizacion`

#### Correcciones de bugs
- ✅ `key={boolOpen}` en modales → claves estáticas únicas (FormularioPedidoProveedor, documentos)
- ✅ `setState` síncrono en `useEffect` → lazy initialization en ThemeSwitcher
- ✅ Dropdowns del nav: solo un dropdown abierto a la vez (estado JS, no CSS hover)
- ✅ Quitar "Ver todo en X →" del pie de dropdown (el label ya navega al hub)
- ✅ Cards del hub: fondo `bg-base-200` para distinguirse del fondo de la página

#### Fase B — Albaranes
- ✅ Modelos Prisma: `Albaran`, `AlbaranItem`; relaciones en `Pedido`, `Cliente`, `Producto`
- ✅ BD actualizada (`prisma db push`)
- ✅ API `GET/POST /api/albaranes`
- ✅ API `GET/PUT/DELETE /api/albaranes/[id]`
- ✅ API `GET /api/albaranes/[id]/pdf` (genera PDF con firma, totales, referencia al pedido)
- ✅ API `POST /api/pedidos/[id]/albaran` — genera albarán desde pedido (transacción)
- ✅ Página `/albaranes` — listado con filtro por estado y paginación
- ✅ Página `/albaranes/[id]` — detalle con cambio de estado y descarga PDF
- ✅ Página `/albaranes/nuevo` — selección de pedido para generar albarán
- ✅ Página `/pedidos/[id]` — botón "Generar albarán" + sección de albaranes vinculados
- ✅ Nav: "Nuevo albarán" y "Albaranes" activos (quitado `disabled: true`)
- ✅ Hub Ventas: cards de Albarán y Albaranes activas

---

## 2026-05-22

### Fase D — VeriFactu

- ✅ Modelo `ConfiguracionEmisor` en Prisma (NIF, nombre fiscal, dirección, modo pruebas/producción)
- ✅ `src/lib/verifactu.js` — cálculo de huella SHA-256 encadenada, generación XML AEAT, URL QR de verificación
- ✅ Al emitir factura (BORRADOR → EMITIDA): hash VeriFactu calculado automáticamente, `estadoEnvioAeat = PENDIENTE`
- ✅ Facturas EMITIDA/PAGADA son inmutables (solo rectificativas permitidas)
- ✅ API `POST /api/facturas/[id]/rectificativa` — crea facturas correctivas R1–R5 (Sustitución / Diferencias)
- ✅ API `GET /api/facturas/[id]/xml` — exporta XML VeriFactu individual, marca como EXPORTADO
- ✅ API `GET /api/facturas/exportar-aeat` — exporta lote de hasta 1000 facturas PENDIENTE; re-exporta EXPORTADO si no hay pendientes
- ✅ PDF de factura incluye QR VeriFactu con URL de verificación
- ✅ Página `/configuracion/emisor` — formulario NIF, nombre fiscal, dirección, modo test/prod
- ✅ Página `/facturas/[id]` — sección VeriFactu con estado envío, botón XML individual, botón rectificativa
- ✅ Página `/facturas` — listado con paginación, filtros por `clientId`, `albaranId`, `pedidoId`, `estado`
- ✅ Página `/facturas/[id]` — detalle completo con albarán/pedido vinculado, ítems, rectificativas

### Fase E — Cobros y vencimientos

- ✅ Campo `fechaPago DateTime?` añadido al modelo `Factura` en `schema.dev.prisma`
- ✅ `PUT /api/facturas/[id]` — auto-registra `fechaPago = now()` al cambiar estado a PAGADA
- ✅ Listado `/facturas` — badges **VENCIDA** (rojo) y **PRÓXIMA** (<7 días, amarillo) en columna de vencimiento
- ✅ Detalle `/facturas/[id]` — badges de vencimiento + fecha de pago cuando está disponible

### UI — Factura manual

- ✅ Página `/facturas/nuevo` rediseñada con dos pestañas:
  - **Manual**: selector de cliente SWR, líneas de ítems libres, fecha de vencimiento, notas, preview de totales en tiempo real
  - **Desde albarán**: flujo original de generación desde albarán emitido

### Seguridad S1–S13

- ✅ **S1/S2** — Autenticación PIN opcional vía `middleware.js` + cookie `crm-auth` (HttpOnly, SameSite=Strict, 8h)
  - `middleware.js` (raíz) — protege todas las rutas excepto `_next/*`, `/login`, `/api/auth/*`
  - `src/app/login/page.js` — pantalla de login con overlay (`fixed inset-0 z-[100]`)
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/status`
  - `Encabezado.js` — botón de logout visible cuando `AUTH_PIN` está configurado
  - `.env.local` — `AUTH_PIN` comentado por defecto (desactivado en desarrollo)
- ✅ **S3** — Audit log al cambiar estado de factura (fire-and-forget `db.auditLog.create().catch(() => {})`)
- ✅ **S4** — Audit log al crear rectificativa
- ✅ **S7** — Cap de 5000 filas en exportación CSV (`GET /api/export/csv`)
- ✅ **S8** — Middleware S1 cubre todas las rutas API (no requiere cambios adicionales)
- ✅ **S9** — Rate limiting en `GET /api/informes`: 20 peticiones/min por IP, responde 429 con `Retry-After`
- ✅ **S11** — Eliminada exposición de `error.message` en 4 rutas de catch blocks
- ✅ **S13** — `src/lib/logger.js` con `logApiError(error, context)`: logs estructurados sin stack traces ni consultas SQL
  - Reemplazados todos los `console.error(error)` en los ~59 archivos de rutas API

---

## 2026-05-26

### Rama: `refactorizacion`

#### Correcciones REVIEW.md (quinta tanda — BACK-05 completo)

- ✅ **BACK-05 (completo)** — Zod schemas añadidos a `src/lib/validations.js`: `grapaSchema`, `grapaUpdateSchema`, `tacoSchema`, `tacoBatchUpdateSchema`, `descuentoSchema` (con `descuentoTierSchema` anidado), `pedidoProveedorSchema` (con `bobinaProveedorSchema` anidado). Todos usan `z.coerce.number()` para aceptar inputs numéricos tanto como `number` como `string`. Aplicados via `validateData()` en: `grapas/route.js` (POST + PUT), `tacos/route.js` (POST + PUT), `precios/route.js` (POST, usando `tarifaMaterialSchema` existente), `pricing/descuentos/route.js` (POST), `pedidos-proveedores-data/route.js` (POST). REVIEW.md actualizado: sin hallazgos pendientes.

#### Correcciones REVIEW.md (cuarta tanda — cierre)

- ✅ **API-01 / BACK-03** — Modo legacy eliminado de `GET /api/pedidos` y `GET /api/presupuestos`: siempre devuelven `{ data, meta }` con `page` y `limit` por defecto. Añadido `Math.min(..., 500)` en presupuestos. Frontend ya manejaba ambos formatos (`result?.data || result || []`)
- ✅ **SEC-15** — CSP permisiva en `next.config.mjs`: `default-src 'self'`, `script-src` con `'unsafe-inline'/'unsafe-eval'` (necesario Next.js), `frame-ancestors 'none'`, `object-src 'none'`
- ✅ **BACK-05 (parcial)** — Validación de ítems en `POST /api/albaranes` (descripción, cantidad > 0, precio ≥ 0); validación de `material` requerido y `metrosDisponibles > 0` en `POST /api/almacen-stock` acción entrada
- ✅ **BUG-02** — Comentario en `sequence.js` explicando por qué `getNextNumber()` se llama fuera de la transacción (evita deadlocks en SQLite) y qué hacer al migrar a MySQL

#### Correcciones REVIEW.md (tercera tanda)

- ✅ **SEC-16** — `.catch(() => {})` → `.catch(err => logApiError(err, 'AUDIT_FAIL'))` en `facturas/[id]/route.js` y `facturas/[id]/rectificativa/route.js`
- ✅ **SEC-11** — Error de stock insuficiente: detalle (metros exactos) solo en log de servidor; cliente recibe `"Stock insuficiente para realizar la salida."` con HTTP 422
- ✅ **SEC-06** — `GET /api/config/backup`: rate limiting `backup:<ip>` (5 req/min) + audit log fire-and-forget en cada descarga
- ✅ **SEC-10** — `next.config.mjs`: headers `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy` en todas las rutas
- ✅ **SEC-14** — `middleware.js`: header `Strict-Transport-Security` (solo en producción)
- ✅ **BUG-07** — `pricing/calculate`: `Number(item.quantity)` explícito en cálculo de margen — evita coerciones silenciosas con strings
- ✅ **BACK-09** — `POST /api/pedidos/[id]/albaran`: guard `pedido.sinFacturacion === true` → 422
- ✅ **API-03** — `POST /api/facturas`: validación de cada ítem (descripción requerida, cantidad > 0, precio ≥ 0) antes de crear
- ✅ **FRONT-04** — `facturas/nuevo/page.js`: `htmlFor`/`id` conectados en input de búsqueda de cliente. `FormularioPedidoCliente.js`: `<label className="sr-only">` añadido al input del modal
- ✅ **REVIEW.md** actualizado con dos bloques finales: hallazgos aplicados (34 ítems) y pendientes (5 ítems con motivo)

#### Correcciones REVIEW.md (segunda tanda)

- ✅ **SEC-12** — `GET /api/informes` tipo `ventas-mensuales`: año acotado al rango `[2000, currentYear]` para evitar queries sobre fechas absurdas
- ✅ **SEC-08** — `POST /api/documentos`: validación de MIME type antes de guardar el archivo; tipos permitidos: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`; respuesta 415 si el tipo no está en la lista blanca
- ✅ **SEC-09** — `POST /api/pedidos/[id]/email` y `POST /api/presupuestos/[id]/email`: validación de formato de email con regex antes de llamar a `sendEmail`
- ✅ **API-04** — `GET /api/facturas/exportar-aeat` convertido a `POST` (el estado de las facturas se modifica con estado EXPORTADO); GET se mantiene como read-only sin efecto de estado. UI actualizada: `<a href>` reemplazado por `<form method="POST">` en `/facturas/page.js`
- ✅ **FRONT-01** — `BarraBusqueda.js`: clave `key={index}` → `key={\`${item.type}-${item.id}\`}` (clave estable)
- ✅ **FRONT-02** — Dashboard (`src/app/page.js`): eliminado `console.error` en bloque de error SWR; UI de error mejorada con DaisyUI `alert alert-error`. Informes (`src/app/informes/page.js`): añadido estado de error con `alert alert-error` en `KPICards`, `VentasMensuales`, `TopClientes`, `VentasPorProducto` y `PresupuestosSinRespuesta`
- ✅ **FRONT-03** — `presupuestos/[id]/page.js`: estados `isCreatingOrder` e `isDownloading` añadidos; botones "Crear Pedido" y "Descargar PDF" muestran spinner y `disabled` durante la operación
- ✅ **FRONT-04** — `pedidos/[id]/page.js`: estado `isDownloading` añadido; botón "Descargar PDF" muestra spinner y `disabled` durante la operación
- ✅ **BUG-05** — `src/lib/rateLimiter.js`: intervalo de limpieza reducido de `WINDOW_MS * 5` (5 min) a `WINDOW_MS` (1 min) para evitar acumulación de entradas caducadas en memoria
- ✅ **BUG-06** — `src/app/api/albaranes/[id]/factura/route.js`: cálculo de `fechaVencimiento` ahora usa la fecha de hoy en la zona horaria `Europe/Madrid` (via `Intl.DateTimeFormat`) en lugar de UTC puro, evitando el desfase en cambios de hora

---

## Backlog — por implementar (futuro)

### Fase B — Albaranes
- ✅ ~~Modelo Prisma: `Albaran`, `AlbaranItem`~~
- ✅ ~~Migración de base de datos~~
- ✅ ~~API `/api/albaranes/`~~
- ✅ ~~Página `/albaranes` (listado)~~
- ✅ ~~Flujo: Pedido → generar Albarán~~
- ✅ ~~PDF de albarán~~
- ✅ ~~Activar enlaces "Nuevo albarán" y "Albaranes" en nav~~

### Fase C — Facturas ✅
- ✅ ~~Modelo Prisma: `Factura`, `FacturaItem`~~
- ✅ ~~Migración de base de datos~~
- ✅ ~~API `/api/facturas/`~~
- ✅ ~~Página `/facturas` (listado)~~
- ✅ ~~Flujo: Albarán → generar Factura~~
- ✅ ~~PDF de factura (con desglose IVA + espacio reservado VeriFactu QR)~~
- ✅ ~~Activar enlaces "Nueva factura" y "Facturas" en nav~~

### Fase D — VeriFactu (obligatorio antes del 01/01/2027)
- ✅ ~~Configuración del emisor (NIF, nombre fiscal, dirección)~~
- ✅ ~~Hash encadenado SHA-256~~
- ✅ ~~Servicio de cálculo de huella digital~~
- ✅ ~~Servicio de generación XML (esquema AEAT)~~
- ✅ ~~QR en PDF de factura con enlace de verificación~~
- ✅ ~~Inmutabilidad de facturas (solo rectificativas)~~
- ✅ ~~Exportación por lotes (hasta 1000 facturas)~~
- ⏳ (Fase D2) Envío directo al webservice AEAT (actualmente solo exportación de archivo)

### Fase E — Cobros y vencimientos
- ✅ ~~Badges VENCIDA/PRÓXIMA en listado y detalle de facturas~~
- ✅ ~~Auto-registro de fecha de pago al marcar PAGADA~~
- ⏳ Panel "Facturas pendientes de cobro" en dashboard

### Fase E — Informes PDF
- ⏳ Botón "Exportar a PDF" en página de Informes
- ⏳ Informe de ventas por período
- ⏳ Informe de clientes / actividad

### Pendientes técnicos
- ⏳ Hub de Configuración: separar `/configuracion` (Márgenes) en `/configuracion/margenes` para que `/configuracion` sea solo el hub
- ⏳ PDF — texto de cliente desbordando recuadro en nota de trabajo (`src/app/api/pedidos/[id]/pdf/route.js`)
- ⏳ PDF — botón "Imprimir" directo desde el pedido (`src/app/pedidos/[id]/page.js`)
- ⏳ Pedidos — eliminar botón "Enviar Email" de la vista de detalle (`src/app/pedidos/[id]/page.js`)
- ⏳ Calculadora de Envíos — desglose detallado, botón "añadir al pedido", mejoras UX
