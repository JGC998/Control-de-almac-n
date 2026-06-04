# ROADMAP — CRM Taller

> Última actualización: 2026-06-04  

---

## 🎯 Visión general

La Calculadora de Contenedor gestiona artículos multi-tipo, trazabilidad completa, edición de importaciones guardadas, exportación PDF y Excel, autocompletar referencias y alertas de variación de precio. Pendiente: plantillas de contenedor reutilizables y vinculación con el catálogo de materiales.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Estado |
|----|-------|------|-------------|--------|
| T-56 | Datos del proveedor, nº factura y nº contenedor | Full stack + DB | Media | ✅ |
| T-57 | Duplicar fila de artículo | Frontend | Pequeña | ✅ |
| T-58 | Autocompletar referencias desde importaciones anteriores | Frontend | Media | ✅ |
| T-59 | Notas por artículo | Frontend | Pequeña | ✅ |
| T-60 | Resaltar artículos sin precio en naranja | Frontend | Pequeña | ✅ |
| T-61 | Plantillas de contenedor reutilizables | Full stack | Media | ⏳ |
| T-62 | Estado del contenedor + fechas | Full stack + DB | Media | ✅ |
| T-63 | Exportar artículos a Excel (.xlsx) | Frontend | Pequeña | ✅ |
| T-64 | Alerta de variación de precio vs última importación | Frontend | Media | ✅ |
| T-65 | Vincular referencias con materiales del catálogo | Full stack | Grande | ⏳ |
| T-66 | Editar importación guardada (PUT + flujo UI) | Full stack | Media | ✅ |
| SEC-01/02 | Trazabilidad bypass Zod en POST/PUT | Seguridad | Pequeña | ✅ |
| MAINT-01 | Bloque parseFloat duplicado entre POST y PUT | Mantenibilidad | Pequeña | ✅ |
| MAINT-02 | TRAZABILIDAD_VACIA constante | Mantenibilidad | Pequeña | ✅ |
| PERF-01 | articulosConValor calculado 2× en cada render | Rendimiento | Pequeña | ✅ |

---

## 🗺️ Fases propuestas

### Fase 1 — Trazabilidad del pedido ✅ COMPLETA
> Implementado: proveedor, nº factura, nº contenedor, estado, fechas, edición de importaciones.

### Fase 2 — Agilidad en la introducción de datos ✅ COMPLETA

- [x] **T-57** Botón "Duplicar fila" ✅
- [x] **T-59** Notas por artículo ✅
- [x] **T-60** Resaltar filas con precio = 0 ✅
- [x] **T-58** Autocompletar referencias con `<datalist>` (referencias históricas) ✅

### Fase 3 — Análisis y cierre del ciclo ✅ CASI COMPLETA

- [x] **T-63** Exportar artículos a Excel — 3 hojas: Artículos, Desglose, Gastos y Resumen ✅
- [x] **T-64** Alerta variación de precio — badge ▲/▼ con % cuando varía >10% vs último ✅
- [ ] **T-65** Vincular referencias con materiales del catálogo ⏳  
  _Selector opcional por fila → `tarifas-rollo`. Botón "Actualizar precios de coste" propaga €/m a `precioCompra` del material. Requiere decisión de diseño._

### Fase 4 — Plantillas ⏳ PENDIENTE

- [ ] **T-61** Plantillas de contenedor reutilizables  
  _Botón "Guardar plantilla" que guarda la lista de artículos (sin precios). Nueva tabla `PlantillaContenedor` + API + UI. Requiere migración de BD._

---

## 🚧 Dependencias

- **T-61** (plantillas) requiere nueva tabla en Prisma + migración
- **T-65** requiere decisión: vincular a `tarifas-rollo` (tiene `precioCompra`) o `materiales`

---

## 💡 Ideas pospuestas

- **Comparar dos importaciones** — pospuesto hasta tener más historial
- **Control de pagos** — fuera de scope (contabilidad)
- **Cálculo de volumen del contenedor** — baja prioridad

---

## ✅ Completado

- ✅ **T-64** Alerta variación de precio ▲/▼ >10% en celda de precio (2026-06-04)
- ✅ **T-63** Exportar Excel 3 hojas (Artículos, Desglose, Gastos y Resumen) (2026-06-04)
- ✅ **T-58** Autocompletar referencias con datalist histórico (2026-06-04)
- ✅ **Auditoría completa** — 20 hallazgos seguridad/bugs/API corregidos (2026-06-04)
- ✅ **SEC-01/02 + MAINT-01/02 + PERF-01** Code-review (2026-06-03)
- ✅ **T-66** Editar importación guardada — PUT API + modal Actualizar (2026-06-03)
- ✅ **T-56** Proveedor, nº factura, nº contenedor — migración Prisma + API + modal (2026-06-03)
- ✅ **T-62** Estado del contenedor (PEDIDO|TRANSITO|ADUANA|RECIBIDO) + fechas (2026-06-03)
- ✅ **T-60** Filas naranja cuando precio = 0 (2026-06-03)
- ✅ **T-57** Botón duplicar fila (2026-06-03)
- ✅ **T-59** Notas por artículo (2026-06-03)
- ✅ **T-55** Exportar PDF con desglose completo + @media print (2026-06-03)
- ✅ **T-54** Validación Zod artículos JSON (2026-06-03)
- ✅ **T-53** Cálculos multi-tipo: tacos/grapas/máquinas (2026-06-03)
- ✅ **T-52** Selector de tipo por fila (2026-06-03)
- ✅ Layout ancho completo (2026-06-03)
- ✅ Soporte USD/M y USD/M² (2026-06-02)
- ✅ Historial guardado con carga de datos (2026-06-01)
- ✅ Prorrateo de gastos por valor económico (2026-06-01)
- ✅ API `/api/importaciones` con Zod (2026-06-01)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt`.*
