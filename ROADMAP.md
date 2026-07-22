# ROADMAP — CRM Taller

> Última actualización: 2026-07-22  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

El foco actual es pulir la interfaz y corregir inconsistencias acumuladas en el área de productos y formularios: campos obsoletos que siguen apareciendo, bugs de filtrado y ordenación, y automatizaciones pendientes que ahorrarán trabajo manual (sobre todo la sincronización tarifa → catálogo de productos).

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-01 | Quitar campos Tipo y Unidad del modal "Nuevo Producto" (desde pedido) | Limpieza | Pequeña | — |
| T-02 | Quitar campos Tipo y Unidad del formulario de edición de producto | Limpieza | Pequeña | T-01 (mismo componente) |
| T-03 | Eliminar `costoUnitario` de todos los formularios visibles al usuario | Limpieza | Pequeña | — |
| T-04 | Bug: el tag de línea en "Metraje material" siempre dice "Banda PVC" | Bug | Pequeña | — |
| T-05 | Bug: el selector Familia/Subfamilia en modal de nuevo producto no carga datos | Bug | Pequeña | — |
| T-06 | Bug: ordenación por nombre en lista de productos no respeta orden numérico | Bug | Pequeña | — |
| T-07 | Autodetectar familia desde el material seleccionado en formulario de producto | Mejora | Media | T-05 |
| T-08 | Modal búsqueda de productos: quitar duplicidad Material/Familia (dejar solo uno) | Limpieza | Pequeña | — |
| T-09 | Modal búsqueda de productos: filtrado en cascada (material → espesor → acabado) | Mejora | Media | T-08 |
| T-10 | Poder guardar un metraje de material como producto del catálogo | Feature | Media | — |
| T-11 | Tarifa de rollos → generar/actualizar producto automáticamente en el catálogo | Feature | Grande | — |
| T-12 | Verificar que la página de presupuestos y su formulario funcionan igual que pedidos | Revisión | Media | — |
| T-13 | Documentar en DESIGN.md: página inicio y página ventas (aprobadas tal como están) | Docs | Pequeña | — |

---

## 🗺️ Fases propuestas

### Fase 1 — Limpieza de formularios y bugs evidentes
> Eliminar campos obsoletos y corregir los tres bugs reportados. Estimación: 2-3 horas.

- [ ] **T-01** — Quitar Tipo y Unidad del modal "Nuevo Producto" (modal de creación rápida desde pedido/presupuesto)  
  _`FormularioProductoRapido.js` o `BaseQuickCreateModal` — eliminar los fields de tipo y unidad_
- [ ] **T-02** — Quitar Tipo y Unidad del formulario de edición de producto  
  _`FormularioProductoInteligente.js` — ya están parcialmente deshabilitados, terminar de quitar_
- [ ] **T-03** — Eliminar `costoUnitario` de todos los formularios visibles  
  _Buscar todos los inputs/campos de costoUnitario en componentes de producto_
- [ ] **T-04** — Bug: tag "Banda PVC" fijo en líneas de metraje material  
  _`ModalMetrajeMaterial.js` — revisar cómo construye `descripcion` al añadir la línea_
- [ ] **T-05** — Bug: selector Familia/Subfamilia vacío en modal nuevo producto  
  _El `SelectorFamiliaSubfamilia` no está recibiendo datos o no está montado correctamente en ese contexto_
- [ ] **T-06** — Bug: ordenación numérica incorrecta en lista de productos  
  _La función `comparar` en `page.js` hace `localeCompare` puro — añadir opción `numeric: true` para ordenar "F10 ROLLO 500" antes que "F10 ROLLO 1800"_

### Fase 2 — Mejoras de producto y búsqueda
> UX más inteligente en los flujos de selección y clasificación de productos. Estimación: 3-4 horas.

- [x] **T-07** — Autodetectar familia desde el material en el formulario de producto  
- [x] **T-08** — Modal búsqueda: quitar la duplicidad Material/Familia  
- [x] **T-09** — Modal búsqueda: filtrado en cascada (material → espesor → acabado)  
- [x] **T-12** — Verificado: presupuestos y pedidos comparten `FormularioPedidoCliente`; ModalHistorialCliente funciona en ambos sin cambios

### Fase 3 — Features de automatización
> Las dos features más grandes, que ahorran trabajo manual recurrente. Estimación: 1-2 días.

- [x] **T-10** — Guardar metraje como producto del catálogo  
- [x] **T-11** — Tarifa rollos → generar/actualizar productos (solo sube precio, nunca baja)

---

## ⚡ Quick wins

Tareas pequeñas de impacto inmediato que se pueden resolver en minutos:

- [ ] **T-06** — Bug ordenación numérica: una línea de fix en `comparar()` (~10 min)
- [ ] **T-04** — Bug tag "Banda PVC": localizar y corregir la descripción que se construye (~15 min)
- [ ] **T-13** — Documentar inicio y ventas en DESIGN.md (~10 min)

---

## 🚧 Dependencias y bloqueos

- **T-07** requiere que **T-05** esté resuelto (si el selector no carga datos, la autodetección no tiene sentido)
- **T-09** requiere **T-08** (primero simplificar, luego añadir filtrado en cascada)
- **T-11** requiere decidir la convención de nombres de producto generado (propuesta arriba: `FIELTRO 10mm ROLLO 1200`)

---

## 💡 Ideas descartadas o pospuestas

- **"Unidad" en productos** — ya prácticamente eliminado en versiones anteriores, se termina de quitar en T-01/T-02
- **Separar activos/obsoletos en tabla nueva de BD** — descartado previamente por riesgo de FK (se usa `activo: Boolean` en su lugar)

---

## ✅ Completado recientemente
- **Fase 3**: Guardar metraje en catálogo + generar productos desde tarifas (T-10, T-11) — `ccce4af`
- **Fase 2**: Filtrado cascada búsqueda (T-07, T-08, T-09) + paridad presupuestos (T-12) — `6befd55`
- **Fase 1**: Limpieza formularios y 3 bugs (T-01 a T-06) — `e832c2b`
- Historial de cliente en formulario de pedido/presupuesto (reemplaza Plantillas) — `2aeceff`
- Simplificación lista de productos (dos tabs, sin columna Tipo) — `8cfcaf0`
- 15 fixes de la segunda revisión de código — `9618c67`
- DESIGN.md con documentación visual de `/gestion/productos` y `/pedidos`

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
