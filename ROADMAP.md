# ROADMAP — CRM Taller

> Última actualización: 2026-06-08  
> Generado desde `ideas.txt` + sesión de planificación

---

## 🎯 Visión general

El CRM tiene la operativa completa (pedidos, presupuestos, stock, importaciones, facturación) y la agilidad de almacén (recepción OCR offline desde tablet). La siguiente iteración construye un **sistema de precios en dos capas** — tarifa de coste interno y tarifa de venta base — que se mantiene vivo automáticamente a medida que llegan nuevos contenedores, sin que el usuario tenga que actualizar precios a mano. A medio plazo: portal cliente, dashboard ejecutivo y análisis anual de márgenes.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Estado |
|----|-------|------|-------------|--------|
| T-67 | Tarifa de coste interno por m² (material + espesor) | Full stack + DB | Media | ⏳ |
| T-68 | Tarifa de venta base con margen mínimo configurable | Full stack + DB | Media | ⏳ |
| T-69 | Propuesta de actualización de tarifa de coste post-importación | Full stack | Media | ⏳ |
| T-70 | Informe anual de variación de costes + propuesta de ajuste de ventas | Full stack | Grande | ⏳ |
| T-71 | PDF del informe de importación simplificado | Frontend | Pequeña | ⏳ |
| T-61 | Plantillas de contenedor reutilizables | Full stack + DB | Media | ⏳ |
| T-65 | Vincular referencias OCR con materiales del catálogo | Full stack | Grande | ⏳ |
| N-06 | Dashboard ejecutivo con KPIs reales | Frontend | Media | ⏳ |
| N-07 | Portal público de cliente (link para ver presupuesto) | Full stack | Grande | ⏳ |
| N-08 | Modo picking en tablet para preparar pedidos | Full stack | Grande | ⏳ |

---

## 🗺️ Fases propuestas

### Fase 1 — Sistema de precios en dos capas *(prioridad alta)*
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

**Pantalla:** misma página `/configuracion/tarifas-coste`, columna adicional "Precio venta base" calculada en tiempo real. Si el precio de venta actual en `tarifas-rollo` está por debajo del precio base → alerta visual.

**No reemplaza las tarifas actuales** — es una referencia interna. El operario sigue usando las tarifas de cliente como siempre.

**Implementación:**
- Añadir `margenMinimo Float?` a `TarifaCoste`
- Lógica de cálculo en cliente (sin API extra)
- Clave `margen_coste_defecto` en `Config` (global fallback)

---

#### T-69 — Propuesta de actualización de tarifa de coste post-importación
**Tipo:** Full stack · **Complejidad:** Media

Extensión del semáforo N-01: cuando el análisis de rentabilidad muestra que el coste de importación difiere de la `TarifaCoste` actual, aparece un botón **"Aplicar este coste"** junto a cada fila afectada. Al hacer clic → confirma → actualiza `TarifaCoste` con el nuevo precio y el ID de la importación como origen.

El usuario siempre aprueba manualmente — sin automatismos.

**Flujo:**
1. Guardar/ver importación → botón "Ver análisis de rentabilidad" (N-01)
2. Filas con variación > umbral muestran botón "Aplicar este coste (9.00 €/m²)"
3. Al confirmar: `PUT /api/tarifas-coste/[id]` con nuevo precio + `importacionOrigenId`

**Implementación:**
- Requiere T-67 (TarifaCoste existente)
- Nueva columna "Coste actual registrado" en el análisis N-01
- Botón de aplicar en cada fila con variación significativa (> 5%)

---

### Fase 2 — Calidad del PDF y plantillas de contenedor
> Pequeñas mejoras de pulido operativo. Estimación: 1-2 días.

---

#### T-71 — PDF del informe de importación simplificado
**Tipo:** Frontend · **Complejidad:** Pequeña

El PDF actual del informe de importación tiene demasiada información para compartir. Dos opciones de exportación:
- **Informe completo** (como ahora) — para uso interno
- **Resumen simplificado** — solo: lista de artículos con referencia + metros + coste total. Sin desglose de gastos ni metodología.

> ⚠️ **Pendiente de clarificación**: falta saber exactamente qué secciones quitar. Ver nota al final del roadmap.

**Implementación:**
- Segundo botón "PDF Resumen" junto al PDF actual
- Genera solo la tabla de artículos + resumen final (2 páginas máximo)

---

#### T-61 — Plantillas de contenedor reutilizables
**Tipo:** Full stack + DB · **Complejidad:** Media

Botón "Guardar como plantilla" en la calculadora de contenedor. Guarda la lista de artículos (sin precios). Al abrir una nueva importación, "Cargar plantilla" rellena la tabla y deja los precios en blanco.

**Implementación:**
- Nueva tabla `PlantillaContenedor`: `id, nombre, bobinas Json, creadaEn`
- `POST /api/importaciones/plantillas` + `GET /api/importaciones/plantillas`
- Selector de plantilla en la calculadora con modal

---

### Fase 3 — Análisis anual y propuestas de ajuste *(medio plazo)*
> Herramienta de fin de año para revisar si los precios de venta siguen siendo rentables tras las subidas de coste. Estimación: 3-4 días.

---

#### T-70 — Informe anual de variación de costes + propuesta de ajuste de ventas
**Tipo:** Full stack · **Complejidad:** Grande

Nueva herramienta `/herramientas/revision-anual-precios`. Compara el coste de cada material al inicio del año vs. el coste actual (en `TarifaCoste`). Para cada material muestra:

| Material | Coste ene-26 | Coste dic-26 | Variación | Precio venta actual | Precio propuesto |
|----------|-------------|-------------|-----------|--------------------|--------------------|
| PVC 3mm  | 8.50 €/m²   | 9.00 €/m²   | +5.88%    | 18.50 €/m²         | 19.59 €/m² (+5.88%) |

- El usuario revisa la propuesta material a material y hace clic en "Aceptar" en los que quiera subir
- Al aceptar → actualiza `tarifas-rollo.precioBase` con el nuevo valor
- Historial de revisiones guardado en `AuditLog`

**Requiere T-67** (TarifaCoste con historial por año).

**Implementación:**
- Añadir `historial Json?` a `TarifaCoste` para guardar snapshots de inicio de año
- API `GET /api/tarifas-coste/revision-anual`
- Página con tabla de comparación y aprobación por fila

---

#### T-65 — Vincular referencias OCR con materiales del catálogo
**Tipo:** Full stack · **Complejidad:** Grande

Selector opcional por fila en la calculadora de contenedor (y en la recepción tablet) → material de `tarifas-rollo`. Permite propagar automáticamente el €/m calculado a `TarifaCoste` del material vinculado.

**Requiere T-67** y **decisión previa**: vincular a `tarifas-rollo` (tiene `precioBase`) o a `materiales`. Ver bloqueos.

---

### Fase 4 — Engagement y portal cliente *(futuro)*
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

- [ ] **T-71** — PDF simplificado del informe de importación (~2h, pendiente clarificación de qué secciones quitar)
- [ ] **T-61** — Plantillas de contenedor (~3h)
- [ ] **T-67** — Tarifa de coste interna — solo la tabla y la pantalla CRUD (~4h)

---

## 🚧 Dependencias y bloqueos

- **T-69** requiere **T-67** (la tarifa de coste tiene que existir para poder actualizarla)
- **T-70** requiere **T-67** con campo de historial anual — diseñar snapshot de inicio de año (cron job o manual en enero)
- **T-65** requiere **decisión de diseño**: vincular a `tarifas-rollo` (tiene `precioBase`) o a `materiales` (más genérico). Impacta en T-67 y T-69
- **N-07** (portal cliente) requiere decisión sobre política de expiración del token
- **N-08** (picking tablet) necesita campo `preparado Boolean` en `PedidoItem`

---

## 💡 Ideas descartadas o pospuestas

- **Actualización automática de tarifas de venta desde importación** — Descartada. El usuario quiere aprobación manual siempre. Reemplazada por T-69 (propuesta con botón de confirmación) y T-70 (revisión anual).
- **VeriFactu D2 — envío directo a AEAT** — Pospuesto a 2027, pendiente decisión sobre certificado FNMT.
- **Cálculo de volumen del contenedor** — Baja prioridad, sin demanda activa.

---

## ❓ Pendiente de clarificación

- **T-71 — PDF simplificado**: se sabe que hay que poner "menos datos" pero no se ha especificado cuáles secciones quitar exactamente. ¿Se elimina el desglose de gastos? ¿La metodología? ¿Las columnas de €/m²? Definir antes de implementar.

---

## ✅ Completado

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
