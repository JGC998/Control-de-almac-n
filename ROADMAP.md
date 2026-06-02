# ROADMAP — CRM Taller

> Última actualización: 2026-06-02 (rev. 2)  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

El foco más inmediato es completar el sistema de **grapas inteligente**: añadir una tabla de modelos genéricos con precios por metro lineal y conectarla a la calculadora de bandas, de forma que al elegir el espesor el coste de la grapa se calcule automáticamente con el desperdicio configurado. En paralelo, quedan pendientes la integración de Artículos Simples en presupuestos/pedidos y un conjunto de mejoras de alto valor identificadas en la revisión del proyecto (alertas de stock, exportación Excel, Kanban de pedidos, informe de compras).

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-07 | Añadir Artículos Simples al flujo de presupuesto/pedido | Frontend / Backend | Media | — |
| T-46 | DB: modelo `ModeloGrapa` (tipo NORMAL/UNA, nombre, espesorDesde, espesorHasta, precioMetroLineal) | Backend / DB | Pequeña | — |
| T-47 | API CRUD para `ModeloGrapa` | Backend | Pequeña | T-46 |
| T-48 | UI en `/configuracion/grapas`: sección de modelos genéricos con precios y porcentaje de merma | Frontend | Media | T-47 |
| T-49 | Calculadora de bandas: auto-selección de modelo genérico según espesor de la banda | Frontend | Media | T-48 |
| T-50 | Calculadora de bandas: cálculo de coste de grapa (precio/m × 2 × (ancho_mm/1000 + merma)) | Frontend | Media | T-49 |
| T-51 | Campo `porcentajeMermaGrapa` configurable en `/configuracion/grapas` (valor por defecto editable) | Frontend | Pequeña | T-48 |
| T-52 | Dashboard: alertas de stock bajo con umbral configurable por material | Frontend / Backend | Media | — |
| T-53 | Informes: nuevo tab "Compras a proveedor" (importe y frecuencia por proveedor, filtro por fecha) | Frontend / Backend | Media | — |
| T-54 | Exportación Excel (.xlsx) en informes (exceljs ya instalado, sin dependencia nueva) | Frontend / Backend | Pequeña | — |
| T-55 | Vista Kanban de pedidos agrupados por estado | Frontend | Media | — |
| T-56 | Módulo de devoluciones/incidencias asociadas a pedidos | Full-stack | Grande | — |
| T-57 | Comparativa de proveedores para el mismo producto (tabla lado a lado con precio y plazo) | Frontend / Backend | Media | — |
| T-58 | ⚠️ DECISIÓN PREVIA: elegir modelo de precio de grapa (A/B/C — ver Fase 5-ext) | Diseño | — | — |
| T-59 | Renombrar campo `precioMetroLineal` → `precioPor100mm` en `ModeloGrapa` + migración + API | Backend / DB | Pequeña | T-58 |
| T-60 | Calculadora: nueva fórmula de coste basada en €/100mm de par de grapa | Frontend | Media | T-58, T-59 |
| T-61 | Calculadora: hint de optimización — mostrar empalmes por barra y barra óptima | Frontend | Media | T-60 |

---

## 🗺️ Fases propuestas

### Fase 5 — Sistema de grapas inteligente
> Completar el modelo de grapas para que la calculadora de bandas calcule automáticamente el coste de la grapa según el espesor seleccionado. Estimación: 2-3 días.

- [x] **T-46** — Modelo `ModeloGrapa` en Prisma ✅  
  _Campos: `tipo` (NORMAL | UNA), `nombre`, `espesorDesde`, `espesorHasta` (nullable), `anchosDisponibles` (JSON, anchos de rollo disponibles en mm), `precioMetroLineal`. Migración SQL creada._

- [x] **T-47** — API CRUD `/api/modelos-grapa` y `/api/modelos-grapa/[id]` ✅  
  _GET devuelve `{ modelos, mermaGrapaPct }`. POST/PATCH con validación Zod. `/api/modelos-grapa/config-merma` PUT para guardar % merma en Config._

- [x] **T-48** — UI en `/configuracion/grapas`: tabla de modelos genéricos ✅  
  _Página reconstruida con dos secciones: "Modelos genéricos" (nueva) y "Grapas de fabricante" (existente). Formulario inline con campos tipo, nombre, espesor, anchos disponibles (CSV) y precio._

- [x] **T-51** — Porcentaje de merma configurable en `/configuracion/grapas` ✅  
  _Campo numérico en la sección de modelos genéricos. Guardado en `Config.mermaGrapaPct`. Se usa como fallback si el modelo no tiene anchos disponibles configurados._

- [x] **T-49** — Calculadora de bandas: toggle Normal/Uña + auto-selección de modelo ✅  
  _Toggle Normal/Uña aparece al activar confección por grapa. Filtrado de modelos compatibles por espesor + tipo. Auto-selección del primer compatible, override manual disponible._

- [x] **T-50** — Calculadora de bandas: coste de grapa con anchos de rollo ✅  
  _Fórmula precisa: selecciona el rollo más pequeño ≥ ancho banda → `coste = 2 × (anchoRollo/1000) × precioMetroLineal`. Muestra rollo seleccionado y desperdicio mm/extremo. Fallback a % merma si no hay anchos configurados. Advertencia si banda supera todos los rollos disponibles._

---

### Fase 5-ext — Refinamiento del modelo de precio de grapas ⚠️ REQUIERE DECISIÓN
> Cambiar la unidad de precio de €/metro lineal a €/100mm y ajustar la fórmula según el modelo de consumo elegido. Estimación: 1-2 días — **bloqueada hasta decidir el modelo de precio**.

#### El problema
De una barra de grapa de X mm salen `floor(X / ancho_banda)` empalmes. El desperdicio = `X mod ancho_banda`. Tres opciones de precio:

| Opción | Qué se cobra | Quién absorbe el desperdicio |
|--------|-------------|------------------------------|
| **A — consumo real** | `(ancho_banda / 100) × precio` | El negocio absorbe el desperdicio |
| **B — coste prorrateado** | `(X / floor(X/ancho_banda)) / 100 × precio` | El cliente paga su parte del desperdicio |
| **C — consumo + info** | `(ancho_banda / 100) × precio` + desglose visible del desperdicio | El negocio absorbe, pero se muestra para transparencia |

**Recomendación: Opción A** — precio simple basado en lo que se consume realmente. El desglose de cuántos empalmes salen de cada barra es información de gestión de stock, no de precio al cliente.

#### Casuística de optimización (solo informativa, no afecta al precio en Opción A)

| Banda | Barra 1000mm | Barra 1200mm | Barra 1500mm |
|-------|-------------|-------------|-------------|
| 400mm | 2 empalmes, 200mm sobra | **3 empalmes, 0mm sobra** ✓ | 3 empalmes, 300mm sobra |
| 495mm | 2 empalmes, 10mm sobra | 2 empalmes, 210mm sobra | **3 empalmes, 15mm sobra** ✓ |
| 600mm | 1 empalme, 400mm sobra | 2 empalmes, 0mm sobra ✓ | 2 empalmes, 300mm sobra |

- [x] **T-58** — ⚠️ DECISIÓN: Opción A confirmada ✅  
  _Precio basado en consumo real: `(ancho_banda / 100) × €/100mm`. El negocio absorbe el desperdicio. El hint de optimización es solo informativo._

- [x] **T-59** — Renombrar `precioMetroLineal` → `precioPor100mm` en DB, API y UI ✅  
  _Migración SQL `20260602000001_rename_grapa_price_field`. Conversión automática: valor÷10. API, validaciones Zod y formulario de configuración actualizados._

- [x] **T-60** — Nueva fórmula de coste en calculadora de bandas ✅  
  _`coste = (ancho_banda / 100) × precioPor100mm`. Sin desperdicio en el precio. Desglose colapsable actualizado con fórmula explícita._

- [x] **T-61** — Hint de optimización de barra en calculadora ✅  
  _Para cada barra disponible: `floor(barra / banda)` empalmes y `barra mod banda` desperdicio. La barra óptima (★, mínimo desperdicio por empalme) se destaca en verde. Visible en el mini-desglose y en el desglose colapsable._

---

### Fase 6 — Integración de Artículos Simples en el ciclo de venta
> Completar la tarea pendiente de la Fase 4: que los artículos del almacén puedan añadirse a presupuestos y pedidos. Estimación: 2-3 días.

- [ ] **T-07** — Artículos Simples en presupuesto/pedido  
  _En el formulario de nuevo presupuesto/pedido, cuando el usuario busca un producto, los `ArticuloSimple` aparecen como opciones con su precio unitario precargado. Hay que distinguirlos de los `Producto` en la lista (badge "Artículo" vs "Producto"). Al añadirlos, se guardan como `PedidoItem` / `PresupuestoItem` igual que cualquier otra línea._

---


## ⚡ Quick wins

- [ ] **T-54** — Exportar Excel en informes con exceljs (ya instalado, ~2-3 horas)
- [ ] **T-51** — Campo de merma de grapa en configuración (~30 min, preparatorio para T-50)
- [ ] **T-47** — API de modelos genéricos de grapas (~1 hora, bloqueante para el resto de Fase 5)

---

## 💡 Ideas descartadas o pospuestas

- **Grapa: absorción total del desperdicio por el negocio (Opción B/C)** — Pospuesta hasta confirmar modelo de precio en T-58.

---

## 🚧 Dependencias y bloqueos

- **T-47** requiere **T-46** (DB antes que la API)
- **T-48** y **T-51** requieren **T-47** (API antes que la UI)
- **T-49** requiere **T-48** (modelos disponibles en DB para auto-selección)
- **T-50** requiere **T-49** y **T-51** (necesita el modelo seleccionado y el % de merma)
- **T-52** (alertas de stock) — el campo `umbralMinimo` requiere una pequeña migración en `AlmacenStock`
- **T-56** (devoluciones) requiere decidir si afectan al cálculo de margen antes de implementar
- **T-59**, **T-60**, **T-61** requieren **T-58** (decisión del modelo de precio de grapa)

---


## ✅ Completado

- Despliegue en producción (Prisma DB push, índices sincronizados)
- Eliminados datos de negocio privados del repositorio GitHub; historial limpiado con git-filter-repo
- **T-01** — Modelo `ArticuloSimple` creado en Prisma (dev + prod)
- **T-02** — API REST CRUD `/api/articulos-simples` + `/api/articulos-simples/[id]`
- **T-03** — Hub `/almacen` rediseñado: Rollos y materiales, Grapas, Tacos, Artículos varios
- **T-04** — Stock e Inventario eliminado del hub de Almacén
- **T-05** — Materiales accesible desde el hub de Almacén
- **T-06** — Pantalla de gestión de Artículos varios (`/almacen/articulos`)
- **T-08** — Auditoría completa de cobertura Zod en endpoints POST/PUT
- **T-09** — Schemas Zod añadidos: `fabricanteSchema`, `proveedorSchema`, `tarifaRolloSchema`, `tarifaRolloUpdateSchema`, `tarifaClienteCreateSchema`, `importacionContenedorSchema`
- **T-10** — `min`/`step` en campos numéricos; errores Zod por campo en formularios
- **T-11** — `request.json()` en `try/catch` en rutas afectadas; manejo de errores uniforme
- **T-12** — `try/catch` + `logApiError` en `sequence.js` (`getNextNumber`, `getCurrentNumber`)
- **T-15** — Búsqueda global Ctrl+K con modal overlay y resultados agrupados
- **T-16** — Acciones en bloque en pedidos y presupuestos (bulk-update con barra flotante)
- **T-28-ext** — Índices `@@fulltext` en `Cliente` y `Producto` para búsqueda full-text en MySQL
- **T-31** — Calculadora de contenedor: rediseño completo (prorrateo por valor, exentos, columna % valor)
- **T-32** — PWA instalable (manifest.json, shortcuts, meta tags Apple)
- **T-33** — Nota de trabajo imprimible en `/pedidos/[id]/nota-trabajo`
- **T-34** — Carta de porte PDF en `/herramientas/carta-porte`
- **T-35** — Inventario de palés integrado en la carta de porte (segunda página PDF)
- **T-36** — Historial de precios por cliente en ficha de cliente
- **T-37** — Tarifas pactadas por cliente (modelo `TarifaCliente`, integrado en formulario de pedido)
- **T-38** — Plantillas habilitadas también en "Nuevo pedido"
- **T-39** — Margen real por pedido (tab en `/informes`, filtro por fecha, badges de color)
- **T-40** — Rentabilidad por cliente con gráfico barras horizontales y filtro por fecha
- **T-41** — Histórico de precios por bobina importada (gráfico evolución USD/M y €/M)
- **T-43** — Persistencia de importaciones (modelo `ImportacionContenedor`, historial y botón "Cargar")
- **T-44** — Nueva regla de gastos en calculadora de contenedor (exentos repercuten, sujetos no)
- **T-45** — Panel de metodología actualizado con explicaciones por casilla
- **SEC-01/03** — Headers de seguridad y matcher de middleware reforzados
- **BUG-01** — IVA leído de `db.config` en lugar de hardcodeado en informes de margen
- **BUG-02** — Validación de `rutaArchivo` en documentos para prevenir rutas arbitrarias
- **BACK-02/03** — `MAX_ROWS` reducido a 2000; `rentabilidad-clientes` acepta filtro de fechas
- **API-01** — Schemas Zod en `tarifas-cliente` e `importaciones`; respuestas 400 por campo
- **FRONT-01** — Estado de error visible en `BusquedaGlobal`

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
