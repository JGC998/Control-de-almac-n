# ROADMAP — CRM Taller

> Última actualización: 2026-07-08  
> Generado desde `ideas.txt` + tareas pendientes en curso

---

## 🎯 Visión general

El CRM cubre ya el ciclo completo de ventas y compras. El foco actual es consolidar la calidad del dato (catálogo limpio, materiales sin duplicados, pesos correctos en pedidos) y extender el módulo de tracking marítimo a más navieras. A medio plazo, el objetivo es cerrar el ciclo fiscal con VeriFactu y mejorar la experiencia en tablet.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-72 | Bug cámara OCR en calculadora de contenedor | Bug | Pequeña | — |
| T-61 | Plantillas de contenedor reutilizables | Frontend + Backend | Media | — |
| T-65 | Vincular referencias OCR con catálogo de productos | Frontend + Backend | Media | T-61 |
| T-73 | Soporte multi-naviera en tracking (CMA-CGM, Hapag-Lloyd, ONE, COSCO, Maersk, Evergreen) | Backend | Grande | — |
| T-79 | Rediseñar accesos directos del dashboard | Frontend | Pequeña | — |
| T-80 | Vista tablet con accesos directos equivalentes al dashboard | Frontend | Pequeña | T-79 |
| T-81 | Limpiar desplegable de materiales en búsqueda de productos — solo mostrar materiales con artículos/tarifas activas | Frontend + Backend | Pequeña | — |
| T-82 | Filtros contextuales en búsqueda de productos — acabados disponibles según material seleccionado | Frontend | Pequeña | T-81 |
| T-67 | Sistema de tarifas de coste — capa 1: precio base por material/espesor | Backend + DB | Grande | — |
| T-68 | Sistema de tarifas de coste — capa 2: ajuste por cliente/volumen | Backend + DB | Grande | T-67 |
| T-69 | UI de gestión de tarifas de coste en dos capas | Frontend | Media | T-67, T-68 |

---

## 🗺️ Fases propuestas

### Fase 1 — Calidad del catálogo *(ahora)*
> Limpiar los datos que el usuario ve a diario al crear pedidos. Estimación: 1–2 días.

- [ ] **T-81** — Limpiar desplegable de materiales en búsqueda de productos  
  _El modal "Buscar Producto" muestra materiales (VERDE, RS62-1200 MM, GOMA NEGRA4 AA…) que no tienen artículos con precio activo. Filtrar la query de materiales para devolver solo los que tienen al menos un `Producto` con `precioUnitario > 0` o con `TarifaRollo` asociada._

- [ ] **T-82** — Filtros contextuales: acabados según material  
  _Si selecciono "GOMA", el dropdown de acabados solo debe mostrar los acabados que existen en productos de material GOMA. Actualmente "NEGRA" aparece como acabado de GOMA pero da 0 resultados. Resolver con query dinámica cuando cambia el material._

- [ ] **T-72** — Bug cámara OCR en calculadora de contenedor  
  _La cámara no abre o falla en algún dispositivo. Diagnosticar y corregir._

### Fase 2 — UX dashboard y tablet
> Modernizar la entrada al sistema. Estimación: 1 día.

- [ ] **T-79** — Rediseñar accesos directos del dashboard  
  _Los accesos actuales son genéricos. Proponer un diseño con accesos frecuentes (Nuevo Pedido, Buscar Producto, Ver Importaciones, etc.) y KPIs visibles._

- [ ] **T-80** — Vista tablet con accesos equivalentes  
  _La vista `/tablet` debe tener los mismos accesos directos rediseñados en T-79, adaptados a pantalla táctil (botones grandes, sin hover)._

### Fase 3 — Tracking multi-naviera
> Extender el seguimiento de contenedores más allá de Yang Ming. Estimación: 1–2 semanas.

- [ ] **T-73** — Soporte multi-naviera (CMA-CGM, Hapag-Lloyd, ONE, COSCO, Maersk, Evergreen)  
  _Cada naviera tiene su propio portal/API. La arquitectura actual en `buscarTracking()` ya tiene el switch por `courierCode`. Investigar y añadir scrapers/adaptadores para cada naviera. Prioridad según clientes activos._

  _Subnivel sugerido:_
  - T-73a: CMA-CGM (alta prioridad si hay contenedores activos)
  - T-73b: Hapag-Lloyd
  - T-73c: ONE / COSCO / Maersk / Evergreen

### Fase 4 — Plantillas y OCR avanzado en contenedor
> Reducir la entrada manual en importaciones. Estimación: 3–5 días.

- [ ] **T-61** — Plantillas de contenedor reutilizables  
  _Guardar una importación como plantilla (sin datos de precio/TC) para reutilizar la lista de artículos en el siguiente pedido al mismo proveedor._

- [ ] **T-65** — Vincular referencias OCR con catálogo  
  _Cuando el OCR detecta una referencia, buscarla en el catálogo de productos y autorellenar espesor/ancho/material si coincide. Reduce correcciones manuales post-escaneo._

### Fase 5 — Sistema de tarifas de coste *(futuro)*
> Dos capas de precio: base por material + ajuste por cliente. Estimación: 1–2 semanas.

- [ ] **T-67** — Tarifas de coste — capa 1: precio base por material/espesor  
  _Tabla `TarifaCoste` con (material, espesor, €/m lineal). Sirve como precio de referencia interno._

- [ ] **T-68** — Tarifas de coste — capa 2: ajuste por cliente/volumen  
  _Multiplicador o descuento sobre la capa 1 según cliente o tramo de volumen._

- [ ] **T-69** — UI de gestión de tarifas en dos capas  
  _Pantalla en Configuración para editar ambas capas visualmente._

---

## ⚡ Quick wins

- [ ] **T-81** — Filtrar materiales sin artículos activos en el desplegable (~1 hora)
- [ ] **T-82** — Acabados contextuales según material seleccionado (~1 hora)
- [ ] **T-79** — Rediseñar accesos directos del dashboard (~2 horas)
- [ ] **T-72** — Investigar y corregir bug cámara OCR (~1 hora)

---

## 🚧 Dependencias y bloqueos

- **T-82** requiere que **T-81** esté en marcha (misma query de productos)
- **T-80** requiere que **T-79** esté completada (copiar el diseño a tablet)
- **T-68** requiere que **T-67** esté completada (capa 2 aplica sobre capa 1)
- **T-69** requiere **T-67 + T-68** completadas
- **T-65** requiere que **T-61** esté en marcha (flujo de importación establecido)
- **T-73** no tiene bloqueos técnicos pero requiere conocer qué navieras usan los clientes activos antes de priorizar subtipos

---

## 💡 Ideas descartadas o pospuestas

- **VesselFinder Container Tracking API** — $7/contenedor/mes. Demasiado caro para el volumen actual. Se mantiene el scraping del AIS público.

---

## ✅ Completado *(resumen reciente)*

- ✅ **T-81 parcial** — Cabecera nota de taller en blanco (ahorro de tinta)
- ✅ Peso unitario/total en vista de pedido de cliente
- ✅ Nota de taller: descripción enriquecida con material + dimensiones
- ✅ Fix falso transbordo cuando `nombreBarco` fue editado manualmente
- ✅ Cron de posiciones AIS: reverse geocoding con OSM Nominatim
- ✅ Fix ETA en `buscarSchedulePorMmsi` (no se leía `parseVFEta`)
- ✅ Fix QR en nota de taller usando host header real
- ✅ Historial de costes de producto
- ✅ Stock mínimo con alertas
- ✅ Búsqueda global Ctrl+K
- ✅ Acciones en bloque en pedidos y presupuestos
- ✅ Sistema de grapas inteligente (T-46→T-51)
- ✅ Calculadora de metrajes
- ✅ Análisis de rentabilidad post-importación
- ✅ Tracking Yang Ming + WhatsApp automático
- ✅ OCR de etiquetas con Tesseract.js

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
