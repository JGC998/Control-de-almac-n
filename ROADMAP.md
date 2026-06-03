# ROADMAP — CRM Taller

> Última actualización: 2026-06-03  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

La siguiente fase del proyecto amplía la **Calculadora de Contenedor** en dos dimensiones: primero, permitir importar cualquier tipo de artículo (no solo bobinas de PVC), para reflejar la realidad de los pedidos a China donde llegan materiales muy distintos; y segundo, generar un **informe PDF imprimible** con el desglose completo de la importación para tener constancia física de los cálculos.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-52 | Renombrar "Bobinas" → "Artículos del pedido" y añadir selector de categoría de producto | Frontend | Media | — |
| T-53 | Adaptar cálculos para artículos sin dimensiones (grapas, tacos, máquinas): unidades × precio | Frontend / Lógica | Media | T-52 |
| T-54 | Añadir campo `tipo` y `unidades` al JSON de artículos en `ImportacionContenedor` (Prisma) | Backend / DB | Pequeña | T-52 |
| T-55 | Generar informe PDF imprimible con jsPDF + jspdf-autotable | Frontend / PDF | Media | T-52, T-53 |

---

## 🗺️ Fases propuestas

### Fase 1 — Contenedor multi-producto
> Ampliar la calculadora para aceptar cualquier tipo de artículo, no solo bobinas de material en rollo. Estimación: 1-2 días.

- [x] **T-52** — Renombrar sección "Bobinas" → "Artículos del pedido" y añadir selector de **categoría** por fila ✅ 2026-06-03  
  _Tipos: Bobina, Taco, Grapa, Máquina, Otro. Campos dimensionales se adaptan por tipo._

- [x] **T-53** — Adaptar lógica de cálculo para artículos sin dimensiones lineales ✅ 2026-06-03  
  _Tacos: metros × USD/m. Grapas: nº cajas × USD/caja (ancho de grapa guardado). Máquinas/Otro: cantidad × USD/ud. El prorrateo de gastos sigue siendo por valor económico._

- [x] **T-54** — Actualizar validación Zod de importaciones para incluir `tipo` en el JSON de artículos ✅ 2026-06-03  
  _`importacionContenedorSchema` actualizado: `bobinas` ahora valida con `refine` que sea JSON array válido. `articuloContenedorSchema` interno define los campos permitidos._

### Fase 2 — Informe PDF imprimible
> Generar un documento descargable/imprimible con todos los datos de la importación. Estimación: 1 día.

- [x] **T-55** — Botón "Exportar PDF" que genera el informe completo de la importación ✅ 2026-06-03  
  _PDF client-side con jsPDF: cabecera (fecha + TC), tabla de artículos (tipo, detalle, cant., USD, EUR), gastos de importación, resumen (coste producto + €/m), desglose por artículo (gastos prorrateados + €/m o €/ud). Paginación automática con pie de página._

---

## ⚡ Quick wins

Tareas pequeñas que se pueden hacer rápido y aportan valor inmediato:

- [x] **T-52a** — Solo cambiar etiquetas "Bobinas" → "Artículos" en la UI ✅ (completado como parte de T-52)
- [x] **T-55a** — Añadir estilos `@media print` a globals.css ✅ 2026-06-03  
  _Clase `print-contenedor` en el container, `no-print` en historial y botones de acción. Inputs y selects se vuelven transparentes, overflow-x visible para que la tabla no se corte._

---

## 🚧 Dependencias y bloqueos

- **T-53** requiere que **T-52** esté completada (necesita conocer el tipo de artículo para calcular correctamente)
- **T-55** se puede hacer en paralelo a T-53/T-54, pero el PDF será más completo si incluye ya la columna "Categoría" de T-52
- **T-54** (Prisma JSON) no bloquea nada crítico; los artículos sin campo `tipo` se tratan como `BOBINA` por defecto (backward compat)

---

## 💡 Ideas descartadas o pospuestas

_(Ninguna idea de esta ronda se descarta; todas son concretas y accionables)_

---

## ✅ Completado

- ✅ **T-55** Exportar PDF informe de importación completo (2026-06-03)
- ✅ **T-54** Validación Zod artículos JSON con tipo (2026-06-03)
- ✅ **T-53** Cálculos multi-tipo: tacos, grapas, máquinas (2026-06-03)
- ✅ **T-52** Artículos del pedido — selector de tipo por fila (2026-06-03)
- ✅ Calculadora de Contenedor — layout ancho completo, sin scrollbar horizontal (2026-06-03)
- ✅ Calculadora de Contenedor — barra de resumen superior (TC + Bobinas + Coste + Metros) en franja completa (2026-06-03)
- ✅ Soporte USD/M y USD/M² (SQM) en precio de bobinas (2026-06-02)
- ✅ Historial de importaciones guardadas con carga de datos (2026-06-01)
- ✅ Prorrateo de gastos por valor económico (2026-06-01)
- ✅ API `/api/importaciones` con validación Zod (2026-06-01)
- ✅ Histórico de precios de proveedor por bobina (T-41, 2026-06-01)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
