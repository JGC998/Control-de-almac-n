# ROADMAP — CRM Taller

> Última actualización: 2026-06-17  
> Generado desde `ideas.txt` + sesión de planificación  
> Última actualización ideas: 2026-06-17 (añadido T-76)

---

## 🎯 Visión general

El CRM tiene la operativa completa (pedidos, presupuestos, stock, importaciones, facturación, tracking de contenedores con WhatsApp) y la agilidad de almacén (recepción OCR offline desde tablet). La siguiente iteración refina el **vínculo entre referencias de proveedor y la tarifa de precios interna**, permitiendo mapear espesores nominales del proveedor (2.7 mm) al espesor comercial correcto (3 mm) sin depender de que coincidan exactamente. A medio plazo: soporte multi-naviera, sistema de tarifas de coste en dos capas, dashboard ejecutivo y portal cliente.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Estado |
|----|-------|------|-------------|--------|
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

**Ejemplo de uso:**
- Referencia proveedor: `EM120/2 BLANCO(12CF)` — Espesor indicado: 2.7 mm
- El usuario selecciona Material: `PVC`, luego en el dropdown ve `PVC BLANCO 2MM`, `PVC BLANCO 3MM`…
- Elige `PVC BLANCO 2MM` aunque la fila diga 2.7 mm
- Al guardar la importación, el precio €/m² de `PVC BLANCO 2MM` se actualiza automáticamente

**Implementación:**
- Añadir campo `material: ''` a `nuevaBobina` en `calculadora-contenedor/page.js`
- Añadir columna Material con `<select>` de valores únicos de `tarifas.map(t => t.material)`
- Cambiar el filtro del dropdown "Tarifa €/m²": en vez de `tarifas.filter(t => Math.abs(t.espesor - row.espesor) < 0.1)`, usar `tarifas.filter(t => t.material === row.material)`
- Persistir el campo `material` en el JSON junto a `tarifaMaterialId`

---

---

#### T-76 — Campos "Lonas" y "Acabado" en cada fila de la calculadora de contenedor
**Tipo:** Frontend · **Complejidad:** Pequeña

**Contexto:** T-74 añadió la columna "Material" para filtrar el dropdown "Tarifa €/m²" por tipo de material. Sin embargo, `TarifaMaterial` tiene un constraint único sobre 4 campos: `(material, espesor, lonas, acabado)`. Sin "Lonas" y "Acabado" en la fila, el dropdown puede mostrar varias opciones con el mismo material y espesor pero diferente acabado/lonas, obligando al usuario a elegir manualmente con riesgo de error.

**Diseño propuesto:**
1. Añadir dos columnas nuevas por fila de bobina: **Lonas** (dropdown con valores únicos de `tarifas.map(t => t.lonas)` para el material seleccionado) y **Acabado** (idem)
2. Los campos que ya existen en la fila del proveedor (Tipo, Referencia, Espesor, Ancho, Largo, Precio USD) no se repiten — solo se añaden los que faltan del "universo tarifa": Lonas y Acabado
3. Filtro del dropdown "Tarifa €/m²": `tarifas.filter(t => t.material === row.material && (!row.lonas || t.lonas === row.lonas) && (!row.acabado || t.acabado === row.acabado))` — filtrado progresivo, tolerante a vacío
4. Cuando el usuario selecciona una tarifa concreta, los campos Lonas y Acabado se auto-rellenan desde la tarifa elegida (si estaban vacíos)
5. Persistir `lonas` y `acabado` en el JSON `bobinas` de la importación

**Archivos afectados:**
- `src/app/compras/calculadora-contenedor/page.js` — añadir campos a `nuevaBobina`, columnas en la tabla, lógica de filtrado encadenado
- No requiere cambios de backend ni de BD

---

#### T-75 — Longitud de taco editable en calculadora PVC (valor por defecto: ancho − 10 mm)
**Tipo:** Frontend · **Complejidad:** Pequeña

**Comportamiento actual:** la calculadora de bandas PVC calcula la longitud del taco como `ancho_banda - 10 mm` (ej. banda 400 mm → taco 390 mm) de forma automática y no editable.

**Problema:** a veces el cliente necesita una longitud de taco menor (p.ej. 350 mm en vez de 390 mm) y no hay forma de ajustarlo sin cambiar el ancho de la banda.

**Diseño propuesto:**
- El campo "Longitud taco" en la sección de tacos pasa de texto estático a `<input type="number">` editable
- Se prellena automáticamente con `ancho_banda - 10` cuando el ancho cambia (si el usuario no lo ha tocado) o cuando se abre la calculadora por primera vez
- Si el usuario edita el valor manualmente, ese valor prevalece y deja de actualizarse automáticamente al cambiar el ancho
- Un botón/enlace "Restaurar por defecto" vuelve a `ancho - 10` si hace falta
- El valor editado se propaga al PDF y al pedido igual que los demás campos de la sección de tacos

**Archivos afectados:**
- `src/componentes/calculadoras/CalculadoraBandas.js` — añadir estado `longitudTacoCustom` y lógica de sincronización
- `src/app/api/pedidos/route.js` y `[id]/route.js` — asegurarse de que `longitudTaco` ya se guarda (verificar)

---

### Fase 2 — Bugs y tracking multi-naviera *(prioridad alta)*
> Corregir el fallo OCR de cámara y ampliar el sistema de tracking a otras navieras. Estimación: 1-2 días.

---

#### T-72 — Bug: cámara OCR no procesa la imagen
**Tipo:** Frontend · **Complejidad:** Pequeña

Al pulsar "Escanear etiqueta" en la calculadora de contenedor (o recepción tablet), la cámara abre pero devuelve el mensaje **"NO SE PUDO PROCESAR LA IMAGEN. Asegúrate de que sea nítida y vuelve a intentarlo"**.

Posibles causas:
- Imagen capturada con resolución demasiado baja para Tesseract
- Timeout del worker de Tesseract en dispositivos lentos (tablet Android)
- Canvas de captura con fondo negro / sin contenido si la cámara tarda en arrancar
- Permisos de cámara concedidos pero stream vacío al hacer la captura

**Investigación:**
1. Añadir log del error real del worker Tesseract antes de mostrar el mensaje genérico
2. Comprobar que el canvas tiene píxeles reales en el momento de la captura
3. Probar añadir un delay mínimo tras `getUserMedia` antes de capturar el frame

---

#### T-73 — Soporte multi-naviera en tracking
**Tipo:** Backend · **Complejidad:** Media

El sistema actual soporta solo Yang Ming (prefijos YMMU/YMLU). Cuando llega un contenedor de otra naviera, `buscarTracking()` devuelve `null` sin tracking.

**Estrategia para añadir una naviera nueva:**
1. Abrir la web de la naviera en DevTools → pestaña Network
2. Buscar en el contenedor hasta que aparezca la petición JSON del tracking
3. Copiar URL + headers mínimos necesarios
4. Añadir función `buscarTrackingXXX()` en `src/lib/tracking.js`
5. Añadir prefijos de esa naviera a la función de routing `buscarTracking()`

**Navieras habituales con APIs internas conocidas:**
- MSC: `www.msc.com/api/feature/tools/TrackingInfo`
- CMA-CGM: `www.cma-cgm.com` (requiere investigación con DevTools)
- Hapag-Lloyd: `www.hapag-lloyd.com` (requiere investigación con DevTools)

**Pendiente:** identificar qué navieras usa el usuario con frecuencia.

---

### Fase 3 — Sistema de precios en dos capas *(prioridad alta)*
> Saber exactamente cuánto cuesta cada material y garantizar que la tarifa de venta siempre cubre ese coste más un margen mínimo. Estimación: 3-4 días.

---

#### T-67 — Tarifa de coste interno por m²
**Tipo:** Full stack + DB · **Complejidad:** Media

Nueva tabla `TarifaCoste` en la BD que almacena, por cada combinación `material + espesor`, el **coste real más reciente en €/m²** (calculado desde la última importación cerrada). Sirve como fuente de verdad interna sobre lo que cuesta el stock.

**Campos:** `id`, `material`, `espesor`, `precioM2`, `precioMetroLineal`, `anchoMm` (opcional), `actualizadaEn`, `importacionOrigenId`

**Pantalla de gestión:** `/configuracion/tarifas-coste` — tabla editable donde se puede ajustar manualmente si hace falta.

**Implementación:**
- Migración Prisma: nueva tabla `TarifaCoste`
- `GET/POST/PUT /api/tarifas-coste`
- Página de gestión con `PaginaGestion`

---

#### T-68 — Tarifa de venta base con margen mínimo
**Tipo:** Full stack + DB · **Complejidad:** Media

Extensión de `TarifaCoste`: cada material tiene un `margenMinimo` (configurable por material, defecto global en `Config`). La tarifa de venta base se calcula como `precioM2 × (1 + margenMinimo)` y se muestra como referencia en los pedidos.

**Pantalla:** misma página `/configuracion/tarifas-coste`, columna adicional "Precio venta base" calculada en tiempo real. Si el precio de venta actual en `TarifaMaterial` está por debajo del precio base → alerta visual.

**No reemplaza las tarifas actuales** — es una referencia interna. El operario sigue usando las tarifas de cliente como siempre.

**Implementación:**
- Añadir `margenMinimo Float?` a `TarifaCoste`
- Lógica de cálculo en cliente (sin API extra)
- Clave `margen_coste_defecto` en `Config` (global fallback)

---

#### T-69 — Propuesta de actualización de tarifa de coste post-importación
**Tipo:** Full stack · **Complejidad:** Media

Extensión del semáforo N-01: cuando el análisis de rentabilidad muestra que el coste de importación difiere de la `TarifaCoste` actual, aparece un botón **"Aplicar este coste"** junto a cada fila afectada. Al hacer clic → confirma → actualiza `TarifaCoste` con el nuevo precio y el ID de la importación como origen.

**El usuario siempre aprueba manualmente — sin automatismos.** Esto es intencionado para evitar actualizaciones de precio accidentales.

**Flujo:**
1. Guardar/ver importación → botón "Ver análisis de rentabilidad" (N-01)
2. Filas con variación > umbral muestran botón "Aplicar este coste (9.00 €/m²)"
3. Al confirmar: `PUT /api/tarifas-coste/[id]` con nuevo precio + `importacionOrigenId`

**Implementación:**
- Requiere T-67 (TarifaCoste existente)
- Nueva columna "Coste actual registrado" en el análisis N-01
- Botón de aplicar en cada fila con variación significativa (> 5%)

---

### Fase 4 — Calidad del PDF y plantillas de contenedor
> Pequeñas mejoras de pulido operativo. Estimación: 1-2 días.

---

#### T-61 — Plantillas de contenedor reutilizables
**Tipo:** Full stack + DB · **Complejidad:** Media

Botón "Guardar como plantilla" en la calculadora de contenedor. Guarda la lista de artículos (sin precios). Al abrir una nueva importación, "Cargar plantilla" rellena la tabla y deja los precios en blanco.

**Implementación:**
- Nueva tabla `PlantillaContenedor`: `id, nombre, bobinas Json, creadaEn`
- `POST /api/importaciones/plantillas` + `GET /api/importaciones/plantillas`
- Selector de plantilla en la calculadora con modal

---

### Fase 5 — Análisis anual y propuestas de ajuste *(medio plazo)*
> Herramienta de fin de año para revisar si los precios de venta siguen siendo rentables tras las subidas de coste. Estimación: 3-4 días.

---

#### T-70 — Informe anual de variación de costes + propuesta de ajuste de ventas
**Tipo:** Full stack · **Complejidad:** Grande

Nueva herramienta `/herramientas/revision-anual-precios`. Compara el coste de cada material al inicio del año vs. el coste actual (en `TarifaCoste`). Para cada material muestra:

| Material | Coste ene-26 | Coste dic-26 | Variación | Precio venta actual | Precio propuesto |
|----------|-------------|-------------|-----------|--------------------|--------------------|
| PVC 3mm  | 8.50 €/m²   | 9.00 €/m²   | +5.88%    | 18.50 €/m²         | 19.59 €/m² (+5.88%) |

- El usuario revisa la propuesta material a material y hace clic en "Aceptar" en los que quiera subir
- Al aceptar → actualiza `TarifaMaterial.precio` con el nuevo valor
- Historial de revisiones guardado en `AuditLog`

**Requiere T-67** (TarifaCoste con historial por año).

**Implementación:**
- Añadir `historial Json?` a `TarifaCoste` para guardar snapshots de inicio de año
- API `GET /api/tarifas-coste/revision-anual`
- Página con tabla de comparación y aprobación por fila

---

#### T-65 — Vincular referencias OCR con materiales del catálogo
**Tipo:** Full stack · **Complejidad:** Grande

La base de este trabajo ya está implementada (`tarifaMaterialId` en filas de la calculadora). T-74 añade la columna "material" que hace la vinculación más ergonómica. T-65 cubre la integración completa con OCR: cuando el texto escaneado de una etiqueta coincide con una referencia conocida, prellenar automáticamente el `material` y el `tarifaMaterialId`.

**Requiere T-74** y decisión previa: vincular a `TarifaMaterial` (ya decidido) o a `materiales`.

---

### Fase 6 — Engagement y portal cliente *(futuro)*
> Reducir fricción con el cliente y mejorar visibilidad del negocio.

---

#### N-06 — Dashboard ejecutivo con KPIs reales
**Tipo:** Frontend · **Complejidad:** Media

Reemplazar el dashboard actual por uno con:
- **Hoy:** importe pedido, importe presupuestado, comparativa con mismo día semana anterior
- **Este mes:** ventas acumuladas vs. objetivo, margen medio, ticket medio
- **Alertas:** facturas vencidas, stock bajo mínimo, presupuestos sin respuesta >7 días
- **Top 5:** productos más pedidos, clientes más activos

---

#### N-07 — Portal público de cliente (link para ver presupuesto)
**Tipo:** Full stack · **Complejidad:** Grande

Link único y temporal (`/p/[token]`) donde el cliente puede ver el presupuesto en HTML, aceptarlo con un clic y dejar un comentario.

**Implementación:**
- Campo `tokenPublico String? @unique` y `tokenExpira DateTime?` en `Presupuesto`
- `GET /presupuestos/p/[token]` → página pública sin auth
- `POST /api/presupuestos/p/[token]/aceptar`

---

#### N-08 — Modo picking en tablet para preparar pedidos
**Tipo:** Full stack · **Complejidad:** Grande

Vista tablet para preparar pedidos: lista de artículos con checkboxes táctiles. Al marcarlos todos → modal de confirmación + generación del albarán. Integra descuento de stock automático.

---

## ⚡ Quick wins

- ~~**T-76** — Añadir "Lonas" y "Acabado" por fila en calculadora de contenedor para vinculación exacta~~ ✅
- ~~**T-75** — Longitud de taco editable en calculadora PVC con valor por defecto ancho−10 mm~~ ✅
- [ ] **T-72** — Arreglar bug OCR cámara "NO SE PUDO PROCESAR LA IMAGEN" (~1-2h)
- [ ] **T-73** — Añadir una naviera nueva al tracking una vez localizada su API con DevTools (~1h por naviera)
- [ ] **T-61** — Plantillas de contenedor (~3h)
- [ ] **T-67** — Tarifa de coste interna — solo la tabla y la pantalla CRUD (~4h)

---

## 🚧 Dependencias y bloqueos

- **T-69** requiere **T-67** (la tarifa de coste tiene que existir para poder actualizarla)
- **T-70** requiere **T-67** con campo de historial anual — diseñar snapshot de inicio de año (cron job o manual en enero)
- **T-65** requiere **T-74** (columna material ya disponible) — la parte OCR es adicional
- **T-73** requiere identificar qué navieras usa el usuario y encontrar sus APIs internas con DevTools
- **N-07** (portal cliente) requiere decisión sobre política de expiración del token
- **N-08** (picking tablet) necesita campo `preparado Boolean` en `PedidoItem`

---

## 💡 Ideas descartadas o pospuestas

- **Actualización automática de tarifas de venta desde importación** — Descartada. El usuario quiere aprobación manual siempre. Reemplazada por T-69 (propuesta con botón de confirmación) y T-70 (revisión anual).
- **VeriFactu D2 — envío directo a AEAT** — Pospuesto a 2027, pendiente decisión sobre certificado FNMT.
- **Cálculo de volumen del contenedor** — Baja prioridad, sin demanda activa.

---

## ❓ Pendiente de clarificación

- **T-73 — Multi-naviera**: ¿qué navieras se usan además de Yang Ming? Identificar para priorizar cuáles añadir primero.

---

## ✅ Completado

- ✅ **T-76** — Campos "Lonas" y "Acabado" apilados en columna Material de calculadora de contenedor; filtrado progresivo de tarifa por material→lonas→acabado; auto-relleno al seleccionar tarifa (2026-06-17)
- ✅ **T-75** — Longitud de taco editable en modal de configuración de tacos; valor por defecto `ancho − 10 mm`, restaurable con un clic (2026-06-17)
- ✅ **T-74** — Columna "Material" en calculadora de contenedor + vinculación tarifa por tipo de material (no por espesor) (2026-06-17)
- ✅ **Columna "Acabado" en TarifaMaterial** — Migración Prisma, constraint único actualizado, edición inline en TablaTarifas, PDF incluido (2026-06-17)
- ✅ **Fix: proveedor se borraba al abrir modal guardar importación** — SWR movido al componente padre y pasado como prop; cuando el modal abre ya tiene los datos cacheados (2026-06-17)
- ✅ **17 bugs corregidos (revisión completa)** — IVA desde Config, subtotales redondeados, totales recalculados en PUT, Decimal→Number en informes, serializeDecimals nulos, costoUnitario excluido de CSV, tier enum, BOM CSV, anti-doble-submit, cleanup timeouts, race condition config-cache (2026-06-16)
- ✅ **Columna lonas en TarifaMaterial** — Migración Prisma, constraint único (material, espesor, color, lonas), edición inline en TablaTarifas, PDF incluido (2026-06-15/16)
- ✅ **Auto-actualización TarifaMaterial desde contenedor** — `actualizarPrecioMateriales()` fuego-y-olvido al guardar/actualizar importación; vinculación por `tarifaMaterialId` con opción `__nuevo__` para crear entrada si no existe (2026-06-15)
- ✅ **Grapa v2 — HistorialPrecioGrapa + auto-actualización desde contenedor** — Modelo `HistorialPrecioGrapa`, fórmula `precioPor100mm = costePorCaja / (paresPorCaja × ancho / 100)`, historial visible en `/configuracion/grapas` (2026-06-15)
- ✅ **Tracking Yang Ming sin coste** — Migración de Terminal49 a la API interna de Yang Ming. Sin límites, sin autenticación. Prefijos YMMU/YMLU (2026-06-11)
- ✅ **Página de detalle de contenedor** — `/compras/contenedores/[id]` con tabla de eventos de tracking, botón "Actualizar ahora", ETA, botón "Llegó" (2026-06-11)
- ✅ **Eliminación contador Ship24** — Eliminado el badge "0/50 trackers Ship24" y toda la lógica de `usoShip24` de la página de contenedores (2026-06-11)
- ✅ **Cron horario de tracking con WhatsApp** — Sync automático cada hora (8h-22h) con notificación WhatsApp vía CallMeBot cuando hay nuevo evento (2026-06-11)
- ✅ **Fix: globalMutate no importado en pedido detalle** — Crash al eliminar pedido por `ReferenceError: globalMutate is not defined` (2026-06-11)
- ✅ **Fix: PDF gastoFijo dividía por cantidad individual** — El PDF de presupuesto calculaba `gastoFijoUnitario` dividiendo por `item.quantity` en vez del total de unidades (2026-06-11)
- ✅ **T-71** — PDF del informe de importación simplificado — dos botones "PDF Completo" y "PDF Resumen" en la calculadora de contenedor
- ✅ **Recepción offline en tablet** — Tab "Recepción" en `/tablet`: escaneo OCR + IndexedDB + sync automático al recuperar wifi (2026-06-08)
- ✅ **Escaneo de etiquetas con OCR (Tesseract.js)** — Botón "Escanear etiqueta" en calculadora de contenedor (2026-06-08)
- ✅ **T-64** Alerta variación precio ▲/▼ en calculadora contenedor (2026-06-04)
- ✅ **T-63** Exportar Excel 3 hojas (Artículos, Desglose, Gastos y Resumen) (2026-06-04)
- ✅ **T-58** Autocompletar referencias con datalist histórico (2026-06-04)
- ✅ **Auditoría completa** — 20 hallazgos seguridad/bugs/API corregidos (2026-06-04)
- ✅ **T-66** Editar importación guardada — PUT API + modal Actualizar (2026-06-03)
- ✅ **T-56** Proveedor, nº factura, nº contenedor — migración Prisma + API + modal (2026-06-03)
- ✅ **T-62** Estado del contenedor (PEDIDO|TRANSITO|ADUANA|RECIBIDO) + fechas (2026-06-03)
- ✅ **T-60/57/59** Filas naranja, duplicar fila, notas por artículo (2026-06-03)
- ✅ **T-55** Exportar PDF con desglose completo + @media print (2026-06-03)
- ✅ **T-52/53/54** Multi-tipo, validación Zod, selector de tipo (2026-06-03)
- ✅ **N-01** Semáforo de rentabilidad post-importación (2026-06-08)
- ✅ **N-02** Indicador de margen en tiempo real al crear pedido (2026-06-08)
- ✅ **N-03** Comparativa histórica de precios por proveedor (2026-06-08)
- ✅ **N-04** Reenvío de presupuestos caducados con un clic (2026-06-08)
- ✅ **N-05** Alerta de stock mínimo configurable (2026-06-08)
- ✅ **SEC-01/02 + MAINT-01/02 + PERF-01** Code-review (2026-06-03)
- ✅ Layout ancho completo, USD/M y USD/M², historial con carga, prorrateo por valor (2026-06-01/02)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
