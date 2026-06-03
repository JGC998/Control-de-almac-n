# ROADMAP — CRM Taller

> Última actualización: 2026-06-03  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

La Calculadora de Contenedor ya gestiona artículos multi-tipo (bobinas, tacos, grapas, máquinas), calcula costes prorrateados y exporta informes PDF. La siguiente iteración se centra en dos ejes: **trazabilidad del pedido** (quién, qué factura, qué contenedor, en qué estado) y **agilidad en la introducción de datos** (duplicar filas, autocompletar, notas, alertas visuales). A más largo plazo, la integración con el catálogo de materiales y el historial de precios cerrará el ciclo importación → coste de producto → tarifa de venta.

---

## 🔴 Hallazgos del code-review (2026-06-03) — pendientes de corrección

| ID | Hallazgo | Severidad | Archivo |
|----|----------|-----------|---------|
| SEC-01 | `estado`, `numFactura`, `numContenedor`, `fechaPedido`, `fechaLlegada` se leen del body crudo sin validación Zod en POST y PUT — permite insertar cualquier string sin restricción | **Alta** | `api/importaciones/route.js` + `[id]/route.js` |
| SEC-02 | Mismo gap en el handler PUT — los campos de trazabilidad no pasan por el schema | **Alta** | `api/importaciones/[id]/route.js` |
| PERF-01 | `bobinasFinal.filter(b => b.subtotalEUR > 0)` se ejecuta 2 veces en cada render (líneas 993 y 1037) | Media | `calculadora-contenedor/page.js` |
| MAINT-01 | Bloque de 10 `parseFloat()` duplicado línea a línea entre POST y PUT — si se añade campo numérico hay que actualizarlo en 2 sitios | Media | Ambas rutas |
| MAINT-02 | `datosTrazabilidad` es estado paralelo sin constante de referencia — añadir campo nuevo requiere actualizar 3 sitios (cargar, reset, modal) | Baja | `calculadora-contenedor/page.js` |

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-56 | Datos del proveedor, nº de factura y nº de contenedor | Full stack + DB | Media | — |
| T-57 | Duplicar fila de artículo | Frontend | Pequeña | — |
| T-58 | Autocompletar referencias desde importaciones anteriores | Frontend | Media | — |
| T-59 | Notas por artículo (campo de observaciones por línea) | Frontend | Pequeña | — |
| T-60 | Resaltar en naranja artículos con precio = 0 | Frontend | Pequeña | — |
| T-61 | Plantillas de contenedor reutilizables | Full stack | Media | T-56 |
| T-62 | Estado del contenedor + fechas (Pedido / Tránsito / Aduana / Recibido) | Full stack | Media | T-56 |
| T-63 | Exportar artículos a Excel (.xlsx) | Frontend | Pequeña | — |
| T-64 | Alerta de variación de precio vs última importación del mismo artículo | Frontend | Media | — |
| T-65 | Vincular referencias con materiales del catálogo (tarifas-rollo / materiales) | Full stack | Grande | T-56 |

---

## 🗺️ Fases propuestas

### Fase 1 — Trazabilidad del pedido
> Que cada importación guardada sepa de quién viene, con qué factura y en qué estado está. Estimación: 1-2 días.

- [ ] **T-56** — Datos del proveedor, nº de factura y nº de contenedor  
  _Añadir en el formulario (y en el modelo `ImportacionContenedor`): selector de proveedor de la BD, campo libre para nº de factura del proveedor (p. ej. `INV-2026-001`) y nº de contenedor de naviera (p. ej. `MSCU1234567`). Estos datos se muestran en el historial, en el modal de guardado y en el encabezado del PDF. Requiere migración Prisma: tres nuevas columnas `proveedorId`, `numFactura`, `numContenedor`._

- [ ] **T-62** — Estado del contenedor + fechas  
  _Nuevo campo `estado` (`PEDIDO` | `TRANSITO` | `ADUANA` | `RECIBIDO`) y dos fechas opcionales: `fechaPedido` y `fechaLlegada`. Se muestra como badge de color en el historial. Permite saber de un vistazo qué contenedores están en camino._

### Fase 2 — Agilidad en la introducción de datos
> Reducir el tiempo de entrada de la factura del proveedor. Estimación: 1-2 días.

- [ ] **T-57** — Botón "Duplicar fila" por artículo  
  _Icono de duplicar al lado del borrar. Clona la fila con todos sus campos (tipo, referencia, dimensiones, precio) para cuando hay varias referencias similares de un mismo material._

- [ ] **T-59** — Campo de notas por artículo  
  _Pequeño input de texto al final de cada fila (o un popover) para anotaciones como "viene en palé 3", "muestra", "calidad B". Se guarda en el JSON de artículos y aparece en el PDF como columna adicional._

- [ ] **T-60** — Resaltar filas con precio = 0  
  _Fila con fondo naranja/ámbar si el campo precio está vacío o es 0. Aviso visual para no olvidar ningún artículo sin precio antes de guardar._

- [ ] **T-58** — Autocompletar referencias  
  _Al escribir en el campo referencia, mostrar un dropdown con las referencias ya usadas en importaciones anteriores (extraídas del historial guardado). Filtrado en tiempo real con la cadena tecleada._

- [ ] **T-61** — Plantillas de contenedor reutilizables  
  _Botón "Guardar como plantilla" que guarda el listado de artículos (sin precios) con un nombre. Al cargar una plantilla se rellena la tabla con los artículos de la plantilla dejando los precios en blanco para actualizar. Ideal para el "contenedor estándar de PVC"._

### Fase 3 — Análisis y cierre del ciclo *(futuro)*
> Conectar importaciones con el catálogo de materiales y generar alertas de variación de precio. Estimación: 2-3 días.

- [ ] **T-63** — Exportar artículos a Excel  
  _Botón "Exportar Excel" junto al PDF. Genera un `.xlsx` con la tabla de artículos y el desglose de costes usando `exceljs` (ya instalado). Útil para compartir con el proveedor o hacer análisis externos._

- [ ] **T-64** — Alerta de variación de precio vs última importación  
  _Al introducir el precio de un artículo, comparar con el precio de esa misma referencia en la última importación guardada. Si sube más de un X% (configurable, p. ej. 10%), marcar la celda en amarillo con el porcentaje de incremento. Usa el historial de importaciones ya guardado._

- [ ] **T-65** — Vincular referencias con materiales del catálogo  
  _Añadir un selector opcional en cada fila para elegir el material de `tarifas-rollo` al que corresponde ese artículo. Tras guardar la importación, botón "Actualizar precios de coste" que propaga el `€/metro lineal` calculado al campo `precioCompra` del material en la BD. Cierra el ciclo: importación → coste real → tarifa._

---

## ⚡ Quick wins

Tareas pequeñas que se pueden hacer en menos de 1 hora:

esataria genial poder editar un contenedor ya guardado

- [ ] **T-60** — Resaltar en naranja filas con precio = 0 (~20 min)
- [ ] **T-57** — Botón duplicar fila (~30 min)
- [ ] **T-59** — Campo de notas por artículo (~45 min)
- [ ] **T-63** — Exportar a Excel — `exceljs` ya instalado (~1 hora)

---

## 🚧 Dependencias y bloqueos

- **T-61** (plantillas) es más útil una vez que **T-56** (proveedor + metadatos) esté hecho, para que las plantillas también puedan preconfigurarse por proveedor
- **T-62** (estado) depende de **T-56** porque comparte la misma migración de BD
- **T-64** (alerta de precio) requiere que el historial tenga suficientes importaciones guardadas con la misma referencia — funciona desde el primer día pero mejora con el tiempo
- **T-65** (vincular catálogo) requiere decisión previa: ¿se vincula a `materiales`, a `tarifas-rollo` o a ambos? La tabla de tarifas-rollo tiene `precioCompra` que sería el campo natural a actualizar

---

## 💡 Ideas pospuestas

- **Comparar dos importaciones lado a lado** — útil pero requiere una UI específica de comparación; pospuesto hasta tener más historial acumulado
- **Control de pagos del contenedor** — cuánto se ha pagado al proveedor, si hay saldo pendiente; fuera de scope actual (es más contabilidad que logística de importación)
- **Calcular si los artículos caben en el contenedor** — basado en dimensiones del contenedor (20ft/40ft) y de los rollos; muy específico y de baja prioridad

---

## ✅ Completado

- ✅ **T-55a** Estilos @media print para impresión desde navegador (2026-06-03)
- ✅ **T-55** Exportar PDF informe de importación completo (2026-06-03)
- ✅ **T-54** Validación Zod artículos JSON con campo `tipo` (2026-06-03)
- ✅ **T-53** Cálculos multi-tipo: tacos ×metro, grapas ×caja, máquinas ×unidad (2026-06-03)
- ✅ **T-52** Artículos del pedido — selector de tipo por fila (Bobina/Taco/Grapa/Máquina/Otro) (2026-06-03)
- ✅ **T-52a** Etiquetas "Bobinas" → "Artículos" en toda la UI (2026-06-03)
- ✅ Calculadora de Contenedor — layout ancho completo, sin scrollbar horizontal (2026-06-03)
- ✅ Barra de resumen superior (TC + Artículos + Coste + Metros) en franja completa (2026-06-03)
- ✅ Soporte USD/M y USD/M² (SQM) en precio de bobinas (2026-06-02)
- ✅ Historial de importaciones guardadas con carga de datos (2026-06-01)
- ✅ Prorrateo de gastos por valor económico (2026-06-01)
- ✅ API `/api/importaciones` con validación Zod (2026-06-01)
- ✅ Histórico de precios de proveedor por bobina — T-41 (2026-06-01)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
