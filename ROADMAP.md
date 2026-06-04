# ROADMAP — CRM Taller

> Última actualización: 2026-06-03  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

La Calculadora de Contenedor gestiona artículos multi-tipo, trazabilidad completa del pedido, edición de importaciones guardadas y exportación PDF. La siguiente iteración añade: autocompletar referencias desde el historial, alerta visual de variación de precio, exportación Excel y plantillas de contenedor reutilizables.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Estado |
|----|-------|------|-------------|--------|
| T-56 | Datos del proveedor, nº factura y nº contenedor | Full stack + DB | Media | ✅ |
| T-57 | Duplicar fila de artículo | Frontend | Pequeña | ✅ |
| T-58 | Autocompletar referencias desde importaciones anteriores | Frontend | Media | ⏳ |
| T-59 | Notas por artículo | Frontend | Pequeña | ✅ |
| T-60 | Resaltar artículos sin precio en naranja | Frontend | Pequeña | ✅ |
| T-61 | Plantillas de contenedor reutilizables | Full stack | Media | ⏳ |
| T-62 | Estado del contenedor + fechas | Full stack + DB | Media | ✅ |
| T-63 | Exportar artículos a Excel (.xlsx) | Frontend | Pequeña | ⏳ |
| T-64 | Alerta de variación de precio vs última importación | Frontend | Media | ⏳ |
| T-65 | Vincular referencias con materiales del catálogo | Full stack | Grande | ⏳ |
| T-66 | Editar importación guardada (PUT + flujo UI) | Full stack | Media | ✅ |
| SEC-01/02 | Trazabilidad bypass Zod en POST/PUT — z.coerce + enum estado | Seguridad | Pequeña | ✅ |
| MAINT-01 | Bloque parseFloat duplicado entre POST y PUT | Mantenibilidad | Pequeña | ✅ |
| MAINT-02 | TRAZABILIDAD_VACIA constante para sincronizar cargar/reset | Mantenibilidad | Pequeña | ✅ |
| PERF-01 | articulosConValor calculado 2× en cada render | Rendimiento | Pequeña | ✅ |

---

## 🗺️ Fases propuestas

### Fase 1 — Trazabilidad del pedido ✅ COMPLETA
> Implementado: proveedor, nº factura, nº contenedor, estado, fechas, edición de importaciones.

### Fase 2 — Agilidad en la introducción de datos
> Estimación restante: 2-3 horas.

- [x] **T-57** Botón "Duplicar fila" ✅
- [x] **T-59** Notas por artículo ✅
- [x] **T-60** Resaltar filas con precio = 0 ✅
- [ ] **T-58** — Autocompletar referencias  
  _Al escribir la referencia, mostrar un dropdown con referencias usadas en importaciones anteriores (HTML datalist, sin backend extra). Filtrado en tiempo real._
- [ ] **T-61** — Plantillas de contenedor reutilizables  
  _Botón "Guardar plantilla" que guarda la lista de artículos (sin precios) con un nombre. Al cargar, rellena la tabla y deja precios en blanco. Nueva tabla `PlantillaContenedor` + API + UI._

### Fase 3 — Análisis y cierre del ciclo
> Estimación restante: 3-4 horas.

- [ ] **T-63** — Exportar artículos a Excel  
  _Botón "Exportar Excel" junto al PDF. Hoja 1: artículos. Hoja 2: desglose. Hoja 3: gastos y resumen. ExcelJS ya instalado._
- [ ] **T-64** — Alerta de variación de precio vs última importación  
  _Si el precio de una referencia sube más del 10% vs su último precio guardado, mostrar badge ⚠️ en la celda de precio con el % de variación._
- [ ] **T-65** — Vincular referencias con materiales del catálogo  
  _Selector opcional por fila → material de `tarifas-rollo`. Botón "Actualizar precios de coste" propaga €/m calculado a `precioCompra` del material._

---

## ⚡ Quick wins pendientes

- [ ] **T-63** Exportar Excel (~1 hora)
- [ ] **T-58** Autocompletar referencias con datalist (~45 min)
- [ ] **T-64** Alerta variación precio (~1 hora)

---

## 🚧 Dependencias

- **T-61** (plantillas) requiere nueva tabla en Prisma — el único pendiente con migración de BD
- **T-64** mejora con más historial acumulado pero funciona desde el primer día
- **T-65** requiere decisión: vincular a `tarifas-rollo` (tiene `precioCompra`) o `materiales`

---

## 💡 Ideas pospuestas

- **Comparar dos importaciones** — pospuesto hasta tener más historial
- **Control de pagos** — fuera de scope (contabilidad)
- **Cálculo de volumen del contenedor** — baja prioridad

---

## ✅ Completado

- ✅ **SEC-01/02 + MAINT-01/02 + PERF-01** Code-review: Zod coerce, validación trazabilidad, TRAZABILIDAD_VACIA, filtro memoizado (2026-06-03)
- ✅ **T-66** Editar importación guardada — PUT API + estado editandoId + modal Actualizar (2026-06-03)
- ✅ **T-56** Proveedor, nº factura, nº contenedor — migración Prisma + API + modal (2026-06-03)
- ✅ **T-62** Estado del contenedor (PEDIDO|TRANSITO|ADUANA|RECIBIDO) + fechas pedido/llegada (2026-06-03)
- ✅ **T-60** Filas naranja cuando precio = 0 (2026-06-03)
- ✅ **T-57** Botón duplicar fila (2026-06-03)
- ✅ **T-59** Notas por artículo (campo discreto bajo referencia) (2026-06-03)
- ✅ **T-55a** @media print (2026-06-03)
- ✅ **T-55** Exportar PDF con desglose completo (2026-06-03)
- ✅ **T-54** Validación Zod artículos JSON (2026-06-03)
- ✅ **T-53** Cálculos multi-tipo: tacos/grapas/máquinas (2026-06-03)
- ✅ **T-52** Selector de tipo por fila (Bobina/Taco/Grapa/Máquina/Otro) (2026-06-03)
- ✅ Layout ancho completo, sin scrollbar horizontal (2026-06-03)
- ✅ Soporte USD/M y USD/M² en precio (2026-06-02)
- ✅ Historial guardado con carga de datos (2026-06-01)
- ✅ Prorrateo de gastos por valor económico (2026-06-01)
- ✅ API `/api/importaciones` con Zod (2026-06-01)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
