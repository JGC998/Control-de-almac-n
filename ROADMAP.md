# ROADMAP — CRM Taller

> Última actualización: 2026-06-26  
> Generado desde `ideas.txt` + sesión de planificación  

---

## 🎯 Visión general

El CRM tiene la operativa completa (pedidos, presupuestos, stock, importaciones, facturación, tracking de contenedores con WhatsApp) y la agilidad de almacén (recepción OCR offline desde tablet). La siguiente iteración añade una **nota de taller imprimible** para que cualquiera pueda cobrar un pedido, rediseña los **accesos directos del dashboard** para que sean los mismos tanto en escritorio como en tablet/móvil, y refina el vínculo entre referencias de proveedor y la tarifa de precios interna. A medio plazo: soporte multi-naviera, sistema de tarifas de coste en dos capas, dashboard ejecutivo y portal cliente.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Estado |
|----|-------|------|-------------|--------|
| T-80 | Vista tablet/móvil con los mismos accesos directos que el dashboard rediseñado | Frontend | Pequeña | ⏳ |
| T-79 | Rediseñar accesos directos del dashboard (quitar 3, añadir 4 nuevos) | Frontend | Pequeña | ⏳ |
| T-78 | PDF "nota de taller" para pedidos de cliente (cliente, peso, precio sin detalles de margen) | Backend + Frontend | Pequeña | ⏳ |
| T-77 | Tracking de barco en paralelo al tracking de contenedor (Yang Ming vessel schedule) | Backend + Frontend | Media | ✅ |
| T-76 | Añadir campos "Lonas" y "Acabado" por fila en calculadora de contenedor para vinculación exacta con TarifaMaterial | Frontend | Pequeña | ✅ |
| T-75 | Longitud de taco editable en calculadora PVC con valor por defecto (ancho_banda − 10 mm) | Frontend | Pequeña | ✅ |
| T-74 | Columna "material" en calculadora de contenedor + vinculación por tipo de material (no por espesor) | Frontend + Backend | Media | ✅ |
| T-72 | Bug: cámara OCR falla con "NO SE PUDO PROCESAR LA IMAGEN" | Frontend | Pequeña | ⏳ |
| T-73 | Soporte multi-naviera en tracking (MSC, CMA-CGM, Hapag-Lloyd…) | Backend | Media | ⏳ |
| T-67 | Tarifa de coste interno por m² (material + espesor) | Full stack + DB | Media | ⏳ |
| T-68 | Tarifa de venta base con margen mínimo configurable | Full stack + DB | Media | ⏳ |
| T-69 | Propuesta de actualización de tarifa de coste post-importación | Full stack | Media | ⏳ |
| T-70 | Informe anual de variación de costes + propuesta de ajuste de ventas | Full stack | Grande | ⏳ |
| T-61 | Plantillas de contenedor reutilizables | Full stack + DB | Media | ⏳ |
| T-65 | Vincular referencias OCR con materiales del catálogo | Full stack | Grande | ⏳ |
| N-06 | Dashboard ejecutivo con KPIs reales | Frontend | Media | ⏳ |
| N-07 | Portal público de cliente (link para ver presupuesto) | Full stack | Grande | ⏳ |
| N-08 | Modo picking en tablet para preparar pedidos | Full stack | Grande | ⏳ |

---

## 🗺️ Fases propuestas

### Fase 0 — Mejoras operativas inmediatas *(prioridad inmediata)*
> PDF de taller y rediseño de accesos directos: pequeñas pero de uso diario. Estimación: 1 día.

---

#### T-78 — PDF "nota de taller" para pedidos de cliente
**Tipo:** Backend + Frontend · **Complejidad:** Pequeña

**Problema actual:** el PDF de pedido tiene demasiada información (márgenes, referencias internas). Cuando alguien del taller necesita cobrar a un cliente que viene a recoger, no hay un documento limpio que puedan dejarle al lado.

**Diseño propuesto:**
- Nuevo botón "PDF Taller" en la página de detalle de pedido, junto al PDF normal
- Nuevo endpoint `GET /api/pedidos/[id]/pdf-taller`
- Contenido del PDF: nombre del cliente, fecha, lista de artículos con descripción + cantidad + peso unitario + precio total de línea, total kg y total €
- **No incluye:** precios de coste, márgenes, referencias internas, notas internas
- Formato: A4, cabecera con logo y datos de empresa, tabla limpia, pie con total grande y legible

**Archivos:**
- `src/app/api/pedidos/[id]/pdf-taller/route.js` — nuevo endpoint
- `src/app/gestion/pedidos/[id]/page.js` — añadir botón "PDF Taller"

---

#### T-79 — Rediseñar accesos directos del dashboard
**Tipo:** Frontend · **Complejidad:** Pequeña

**Cambios respecto al dashboard actual:**
- **Quitar:** Total presupuestos, Pedidos proveedores, Tablón de notas
- **Dejar:** Pedidos de cliente
- **Añadir:** Nuevo pedido (botón), Contenedores, Almacén, Tarifa de materiales, Calculadora de bandas PVC, Calculadora de metrajes

**Diseño propuesto:** grid 2×4 o 3×3 de tarjetas con icono grande y etiqueta corta. Cada tarjeta navega a su ruta directamente.

**Archivo:** `src/app/page.js` (o el componente de dashboard)

---

#### T-80 — Vista tablet/móvil con los mismos accesos directos
**Tipo:** Frontend · **Complejidad:** Pequeña

**Contexto:** T-79 rediseña el dashboard de escritorio. El usuario quiere que cuando se accede desde tablet o móvil, la pantalla de inicio muestre exactamente los mismos 6-7 accesos directos en formato táctil (botones grandes, sin la tabla de datos del escritorio).

**Diseño propuesto:**
- Detección de pantalla con Tailwind (`md:hidden`, `hidden md:block`) o `useMediaQuery`
- En pantallas pequeñas: grid de accesos directos a pantalla completa, sin KPIs ni tablas
- En pantallas grandes: dashboard completo actual

**Nota:** T-79 debe hacerse primero para definir la lista definitiva de accesos.

**Archivos:** mismos que T-79 + posible componente `AccesosDirectosMovil`

---

### Fase 1 — Vinculación material-tarifa en calculadora de contenedor *(prioridad inmediata)*
> Permitir que cada fila de la calculadora de contenedor indique el tipo de material y se vincule a la tarifa correcta aunque el espesor del proveedor no coincida exactamente. Estimación: 1-2 días.

---

#### T-74 — Columna "material" + vinculación por tipo en la calculadora de contenedor
**Tipo:** Frontend + Backend · **Complejidad:** Media

**Problema actual:** la vinculación `Tarifa €/m² → vincular` filtra el dropdown por `espesor` de la fila. Pero el proveedor puede indicar 2.7 mm cuando el producto se vende como 3 mm, por lo que el dropdown no muestra la entrada correcta de la tarifa.

**Diseño propuesto:**

1. **Nueva columna "Material"** en la tabla de bobinas — dropdown con los valores distintos de `material` en `TarifaMaterial` (PVC, LONA, GOMA, etc.). Este campo se persiste en el JSON `bobinas` de la importación junto al resto.

2. **Dropdown "Tarifa €/m²"** filtrado únicamente por `material` seleccionado (sin filtrar por espesor). Muestra todas las entradas de ese material: `PVC 2mm`, `PVC 3mm`, `PVC 5mm`… para que el usuario elija la correcta aunque el espesor del proveedor sea distinto.

3. **`__nuevo__` sigue funcionando** — si el material/espesor no existe, crear entrada en `TarifaMaterial`.

4. **`actualizarPrecioMateriales`** ya usa `tarifaMaterialId`, así que el backend no requiere cambios — solo el frontend para pasar el ID correcto.

**Archivos afectados:**
- `src/app/compras/calculadora-contenedor/page.js`

---

#### T-76 — Campos "Lonas" y "Acabado" en cada fila de la calculadora de contenedor
**Tipo:** Frontend · **Complejidad:** Pequeña

Añadir dos columnas nuevas por fila: **Lonas** y **Acabado** para filtrado progresivo de tarifa: `material → lonas → acabado`. Auto-relleno al seleccionar tarifa concreta.

**Archivos afectados:**
- `src/app/compras/calculadora-contenedor/page.js`

---

#### T-75 — Longitud de taco editable en calculadora PVC (valor por defecto: ancho − 10 mm)
**Tipo:** Frontend · **Complejidad:** Pequeña

El campo "Longitud taco" pasa de texto estático a `<input>` editable. Se prellena con `ancho − 10`. Si el usuario lo edita, prevalece su valor. Botón "Restaurar".

**Archivos afectados:**
- `src/componentes/calculadoras/CalculadoraBandas.js`

---

### Fase 2 — Tracking mejorado y bugs *(prioridad alta)*
> Añadir tracking paralelo de barco para ETAs más rápidas, corregir el fallo OCR de cámara y ampliar el tracking a otras navieras. Estimación: 2-3 días.

---

#### T-72 — Bug: cámara OCR no procesa la imagen
**Tipo:** Frontend · **Complejidad:** Pequeña

Al pulsar "Escanear etiqueta", la cámara abre pero devuelve el mensaje **"NO SE PUDO PROCESAR LA IMAGEN"**.

**Investigación:**
1. Añadir log del error real del worker Tesseract antes de mostrar el mensaje genérico
2. Comprobar que el canvas tiene píxeles reales en el momento de la captura
3. Probar añadir un delay mínimo tras `getUserMedia` antes de capturar el frame

---

#### T-77 — Tracking de barco en paralelo al tracking de contenedor
**Tipo:** Backend + Frontend · **Complejidad:** Media

Tracking paralelo via Yang Ming vessel schedule API. El nombre del barco se extrae del tracking del contenedor y se usa para consultar el itinerario completo con ETAs por puerto.

**Requiere:** investigación previa con DevTools en `yangming.com/en/esolution/schedule/vessel_schedule?vessel=OSOL`

---

#### T-73 — Soporte multi-naviera en tracking
**Tipo:** Backend · **Complejidad:** Media

Añadir MSC, CMA-CGM, Hapag-Lloyd al routing de `buscarTracking()`. Cada naviera requiere investigación con DevTools para localizar su API interna.

---

### Fase 3 — Sistema de precios en dos capas *(prioridad alta)*
> Saber exactamente cuánto cuesta cada material y garantizar que la tarifa de venta siempre cubre ese coste más un margen mínimo. Estimación: 3-4 días.

---

#### T-67 — Tarifa de coste interno por m²
**Tipo:** Full stack + DB · **Complejidad:** Media

Nueva tabla `TarifaCoste` con el coste real más reciente en €/m² por `(material, espesor)`. Pantalla de gestión en `/configuracion/tarifas-coste`.

---

#### T-68 — Tarifa de venta base con margen mínimo
**Tipo:** Full stack + DB · **Complejidad:** Media

Extensión de T-67: columna "Precio venta base" = `precioM2 × (1 + margenMinimo)`. Alerta visual si el precio actual está por debajo.

---

#### T-69 — Propuesta de actualización de tarifa de coste post-importación
**Tipo:** Full stack · **Complejidad:** Media

Botón "Aplicar este coste" en el análisis N-01 cuando el coste de importación difiere de `TarifaCoste`. El usuario siempre aprueba manualmente.

**Requiere T-67.**

---

### Fase 4 — Calidad del PDF y plantillas de contenedor
> Pequeñas mejoras de pulido operativo. Estimación: 1-2 días.

---

#### T-61 — Plantillas de contenedor reutilizables
**Tipo:** Full stack + DB · **Complejidad:** Media

Botón "Guardar como plantilla" en la calculadora. Nueva tabla `PlantillaContenedor`. Al abrir una nueva importación, "Cargar plantilla" rellena la tabla sin precios.

---

### Fase 5 — Análisis anual y propuestas de ajuste *(medio plazo)*
> Herramienta de fin de año para revisar si los precios de venta siguen siendo rentables. Estimación: 3-4 días.

---

#### T-70 — Informe anual de variación de costes + propuesta de ajuste de ventas
**Tipo:** Full stack · **Complejidad:** Grande

Nueva herramienta `/herramientas/revision-anual-precios`. Compara coste inicio de año vs. coste actual. Aprobación por material. **Requiere T-67.**

---

#### T-65 — Vincular referencias OCR con materiales del catálogo
**Tipo:** Full stack · **Complejidad:** Grande

Cuando el texto OCR coincide con una referencia conocida, prellenar automáticamente `material` y `tarifaMaterialId`. **Requiere T-74.**

---

### Fase 6 — Engagement y portal cliente *(futuro)*
> Reducir fricción con el cliente y mejorar visibilidad del negocio.

---

#### N-06 — Dashboard ejecutivo con KPIs reales
**Tipo:** Frontend · **Complejidad:** Media

Hoy, este mes, alertas (facturas vencidas, stock bajo, presupuestos sin respuesta), top 5 productos y clientes.

---

#### N-07 — Portal público de cliente (link para ver presupuesto)
**Tipo:** Full stack · **Complejidad:** Grande

Link único `/p/[token]` donde el cliente ve el presupuesto, lo acepta y deja comentario. Sin auth.

---

#### N-08 — Modo picking en tablet para preparar pedidos
**Tipo:** Full stack · **Complejidad:** Grande

Vista tablet para preparar pedidos: checkboxes táctiles por artículo. Al completar → albarán + descuento de stock.

---

## ⚡ Quick wins

- [ ] **T-78** — PDF nota de taller (cliente, peso, precio) para dejar en el mostrador (~2h)
- [ ] **T-79** — Rediseñar accesos directos del dashboard (quitar 3, añadir 4) (~1h)
- [ ] **T-80** — Vista tablet con los mismos accesos directos (~1h, depende de T-79)
- [ ] **T-72** — Arreglar bug OCR cámara "NO SE PUDO PROCESAR LA IMAGEN" (~1-2h)
- [ ] **T-73** — Añadir una naviera nueva al tracking una vez localizada su API con DevTools (~1h por naviera)
- [ ] **T-61** — Plantillas de contenedor (~3h)
- [ ] **T-67** — Tarifa de coste interna — solo la tabla y la pantalla CRUD (~4h)

---

## 🚧 Dependencias y bloqueos

- **T-80** requiere **T-79** (lista definitiva de accesos directos)
- **T-69** requiere **T-67** (la tarifa de coste tiene que existir para poder actualizarla)
- **T-70** requiere **T-67** con campo de historial anual — diseñar snapshot de inicio de año (cron job o manual en enero)
- **T-65** requiere **T-74** (columna material ya disponible) — la parte OCR es adicional
- **T-77** requiere investigación previa con DevTools en `yangming.com/en/esolution/schedule/vessel_schedule?vessel=OSOL` para localizar el endpoint JSON interno
- **T-73** requiere identificar qué navieras usa el usuario y encontrar sus APIs internas con DevTools
- **N-07** (portal cliente) requiere decisión sobre política de expiración del token
- **N-08** (picking tablet) necesita campo `preparado Boolean` en `PedidoItem`

---

## 💡 Ideas descartadas o pospuestas

- **Actualización automática de tarifas de venta desde importación** — Descartada. El usuario quiere aprobación manual siempre. Reemplazada por T-69 y T-70.
- **VeriFactu D2 — envío directo a AEAT** — Pospuesto a 2027, pendiente decisión sobre certificado FNMT.
- **Cálculo de volumen del contenedor** — Baja prioridad, sin demanda activa.

---

## ❓ Pendiente de clarificación

- **T-73 — Multi-naviera**: ¿qué navieras se usan además de Yang Ming? Identificar para priorizar cuáles añadir primero.

---

## ✅ Completado

- ✅ **Revisión completa de schema DB** — FK constraints (onDelete Restrict/SetNull/Cascade), 15 índices nuevos, unicidad Grapa/Producto, columna `categoria` eliminada de Cliente, `Stock.proveedor` renombrado a `proveedorId` con FK real, `ImportacionContenedor.estado` default corregido a BORRADOR. Migración aplicada a dev y prod (2026-06-26)
- ✅ **Filtros Akinator para bandas PVC** — Modal de búsqueda y página `/almacen/bandas` con 7 niveles de filtrado en cascada (espesor→color→conf→tacos→tipo taco→ancho→largo) usando nomenclatura SF/GR/AB (2026-06-25)
- ✅ **8 bugs corregidos (sesión anterior)** — IVA 2100% en PDFs, doble recepción de pedidos proveedor, isSubmittingRef sin reset, transacción borrador void, tracking sync, clientes/[id] categoria, from-presupuesto status codes, CSV select→include (2026-06-25)
- ✅ **T-77** — Tracking de barco en paralelo al contenedor: nombre del barco extraído de `vesselVoyage`, schedule via API Yang Ming, campo `nombreBarco` en BD, sección "🛳 Barco" en modal de tracking (2026-06-17).
- ✅ **T-76** — Campos "Lonas" y "Acabado" apilados en columna Material de calculadora de contenedor; filtrado progresivo; auto-relleno al seleccionar tarifa (2026-06-17)
- ✅ **T-75** — Longitud de taco editable en modal de configuración de tacos; valor por defecto `ancho − 10 mm`, restaurable con un clic (2026-06-17)
- ✅ **T-74** — Columna "Material" en calculadora de contenedor + vinculación tarifa por tipo de material (2026-06-17)
- ✅ **Columna "Acabado" en TarifaMaterial** — Migración Prisma, constraint único actualizado, edición inline, PDF incluido (2026-06-17)
- ✅ **Fix: proveedor se borraba al abrir modal guardar importación** (2026-06-17)
- ✅ **17 bugs corregidos (revisión completa)** — IVA desde Config, subtotales, Decimal→Number, tier enum, anti-doble-submit, race conditions (2026-06-16)
- ✅ **Columna lonas en TarifaMaterial** (2026-06-15/16)
- ✅ **Auto-actualización TarifaMaterial desde contenedor** (2026-06-15)
- ✅ **Grapa v2 — HistorialPrecioGrapa** (2026-06-15)
- ✅ **Tracking Yang Ming sin coste** (2026-06-11)
- ✅ **Página de detalle de contenedor** (2026-06-11)
- ✅ **Cron horario de tracking con WhatsApp** (2026-06-11)
- ✅ **T-71** — PDF del informe de importación simplificado (2026-06-08)
- ✅ **Recepción offline en tablet** (2026-06-08)
- ✅ **Escaneo de etiquetas con OCR (Tesseract.js)** (2026-06-08)
- ✅ **N-01/02/03/04/05** — Semáforo rentabilidad, margen tiempo real, historial precios, reenvío presupuestos, alerta stock mínimo (2026-06-08)
- ✅ **T-64/63/58/66/56/62/60/57/59/55/52/53/54** — Múltiples mejoras de contenedor y documentos (2026-06-01/04)
- ✅ **Auditoría completa** — 20 hallazgos seguridad/bugs/API corregidos (2026-06-04)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
