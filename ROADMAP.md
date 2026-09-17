# ROADMAP — CRM Taller

> Última actualización: 2026-09-17  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

El objetivo de esta ronda es una **remodelación estructural de la navegación**: limpiar menús quitando enlaces que estorban, arreglar las dos herramientas rotas, mejorar visualmente las secciones más usadas (Grapas, Tacos, Tarifa de materiales) y añadir funcionalidad de estadísticas de proveedor al nivel que ya tienen los clientes. A medio plazo, las calculadoras se integran en `/ventas` como formato chat y la configuración se reorganiza en apartados independientes.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-01 | Quitar enlace "Calculadora inversa" de /herramientas hub | Limpieza UI | Pequeña | — |
| T-02 | Quitar enlace "Comparativa reparto de gastos" de /herramientas hub | Limpieza UI | Pequeña | — |
| T-03 | Quitar enlace "Foto → Cotización (IA)" de /herramientas hub | Limpieza UI | Pequeña | — |
| T-04 | Quitar enlace "Tacos" de /configuracion hub | Limpieza UI | Pequeña | — |
| T-05 | Quitar enlace "Materiales" de /configuracion hub | Limpieza UI | Pequeña | — |
| T-06 | Quitar enlace "Productos" de /gestion hub | Limpieza UI | Pequeña | — |
| T-07 | Quitar enlace "Materiales" de /gestion hub | Limpieza UI | Pequeña | — |
| T-08 | Arreglar Semáforo de rentabilidad (/herramientas/analisis-rentabilidad) | Bug | Media | — |
| T-09 | Arreglar Comparativa de proveedores (/herramientas/comparativa-proveedores) | Bug | Media | — |
| T-10 | Revisar bugs en Carta de porte (/herramientas/carta-porte) | Bug/QA | Pequeña | — |
| T-11 | Dashboard de márgenes: añadir filtro por material | Mejora UI | Pequeña | — |
| T-12 | Dashboard de márgenes: exportar a PDF | Mejora | Media | — |
| T-13 | Fabricantes: columna "Nº productos" en la tabla de /gestion | Mejora UI | Pequeña | — |
| T-14 | Grapas: remodelación visual de la sección | Diseño/UI | Media | — |
| T-15 | Tacos: remodelación visual concordante con Grapas | Diseño/UI | Media | T-14 |
| T-16 | Tarifa de materiales: remodelación visual | Diseño/UI | Media | — |
| T-17 | Calculadora PVC: convertir a formato chat y reubicar en /ventas | Feature | Grande | — |
| T-18 | Calculadora de metrajes: convertir a formato chat y reubicar en /ventas | Feature | Grande | — |
| T-19 | Proveedores: nueva interfaz tipo ficha-cliente con estadísticas de compra | Feature | Grande | — |
| T-20 | Configuración: márgenes y referencias como apartados independientes en /configuracion | Refactor | Media | — |
| T-21 | /almacen — Rollos: mostrar rollos generados volcados a productos | Feature | Media | — |
| T-22 | /almacen — Materiales: sección que muestra los materiales dados de alta | Feature | Pequeña | — |

---

## 🗺️ Fases propuestas

### Fase 1 — Limpieza de navegación
> Quitar todos los enlaces que estorban sin tocar los componentes. Estimación: 1-2 horas.

- [ ] **T-01** — Quitar "Calculadora inversa" del hub de /herramientas  
  _En `src/app/herramientas/page.js`: eliminar el objeto del array `items` con href `/calculadora/inversa`. El componente `/calculadora/inversa/page.js` no se borra._

- [ ] **T-02** — Quitar "Comparativa reparto de gastos" del hub de /herramientas  
  _Mismo archivo, eliminar el ítem con href `/herramientas/comparativa-reparto`._

- [ ] **T-03** — Quitar "Foto → Cotización (IA)" del hub de /herramientas  
  _Mismo archivo, eliminar el ítem con href `/herramientas/foto-cotizacion`._

- [ ] **T-04** — Quitar "Tacos" de /configuracion  
  _En `src/app/configuracion/page.js` (o el hub correspondiente): quitar el enlace a `/configuracion/tacos`._

- [ ] **T-05** — Quitar "Materiales" de /configuracion  
  _Mismo archivo: quitar enlace a `/gestion/catalogos/materiales` o similar._

- [ ] **T-06** — Quitar "Productos" de /gestion  
  _En el hub de /gestion: quitar el ítem que apunta a `/gestion/productos`._

- [ ] **T-07** — Quitar "Materiales" de /gestion  
  _En el hub de /gestion: quitar el ítem de materiales._

### Fase 2 — Bugs: herramientas rotas
> Dejar operativas las dos herramientas que el usuario reporta como no funcionales. Estimación: 2-4 horas.

- [ ] **T-08** — Arreglar Semáforo de rentabilidad  
  _Inspeccionar qué falla en `/herramientas/analisis-rentabilidad` y la API `/api/importaciones/[id]/analisis-rentabilidad`. Reproducir el error, corregir y verificar que el comparador de dos importaciones también funciona._

- [ ] **T-09** — Arreglar Comparativa de proveedores  
  _Inspeccionar `/herramientas/comparativa-proveedores` y su API. Comprobar si el problema es de datos (ninguna `BobinaPedido` en DB) o de lógica de la herramienta._

- [ ] **T-10** — Revisar Carta de porte  
  _El usuario nunca la ha probado. Probar flujo completo: rellenar campos, generar PDF, descargarlo. Corregir cualquier error que aparezca._

### Fase 3 — Quick wins de UI
> Mejoras de valor visible sin riesgo. Estimación: 2-3 horas.

- [ ] **T-13** — Fabricantes: columna "Nº productos" en la tabla  
  _En la query de `/api/fabricantes`, añadir `_count: { select: { productos: true } }`. En la tabla de `/gestion`, añadir columna "Productos" con ese número._

- [ ] **T-11** — Dashboard de márgenes: filtro por material  
  _En `src/app/herramientas/dashboard-margenes/page.js`: añadir un `<select>` con los materiales únicos del array `filas`. El filtro aplica antes de la ordenación._

- [ ] **T-12** — Dashboard de márgenes: imprimir/exportar PDF  
  _Opción más sencilla: botón "Imprimir" que llame a `window.print()` con una media query `@media print` que oculte controles y expanda la tabla. Alternativa: PDF server-side si se necesita formato más cuidado._

### Fase 4 — Remodelaciones visuales
> Mejorar el aspecto de tres secciones que lo necesitan. Estimación: 3-5 horas.

- [ ] **T-14** — Grapas: remodelación visual  
  _Ver el componente actual en `/configuracion/grapas`. Proponer diseño con cards o tabla mejorada antes de implementar._

- [ ] **T-15** — Tacos: remodelación visual (concordante con Grapas)  
  _Después de T-14, replicar el mismo patrón visual en `/configuracion/tacos`._

- [ ] **T-16** — Tarifa de materiales: remodelación visual  
  _El usuario pide ideas — ver nota en "Ideas a concretar" abajo._

### Fase 5 — Funcionalidades nuevas
> Trabajo más largo, requiere diseño previo. Estimación: 2-3 días.

- [ ] **T-19** — Proveedores: ficha con estadísticas de compra  
  _Crear `/gestion/proveedores/[id]/page.js` al estilo de `/gestion/clientes/[id]`. Estadísticas: total importaciones, gasto acumulado por año, materiales más comprados, historial de precios por material._

- [ ] **T-17** — Calculadora PVC → formato chat en /ventas  
  _Integrar la lógica de `CalculadoraBandas` como componente de chat (ya existe el patrón en pedidos de clientes). Añadir acceso desde el hub de /ventas._

- [ ] **T-18** — Calculadora de metrajes → formato chat en /ventas  
  _Mismo patrón que T-17 pero para `CalculadoraMetrajes`._

- [ ] **T-20** — Configuración: reorganizar márgenes y referencias como apartados  
  _Mover los subapartados de Configuración (Márgenes, Reglas de referencia, etc.) al hub de /configuracion como entradas de primer nivel en lugar de estar anidados. Requiere revisar la navegación actual._

### Fase 6 — /almacen expandido *(futuro)*
> Completar la sección /almacen con las vistas que faltan.

- [ ] **T-21** — /almacen — Rollos: lista de rollos generados volcados a productos  
  _Ver si existe ya una tabla de rollos o hay que crearla. Filtros por material y estado (en stock / volcado)._

- [ ] **T-22** — /almacen — Materiales: sección de materiales dados de alta  
  _Puede ser un enlace directo a `/gestion/catalogos/materiales` o una vista simplificada solo-lectura._

---

## ⚡ Quick wins

Tareas que se resuelven en minutos y mejoran la navegación de inmediato:

- [ ] **T-01 a T-07** — Limpiar 7 enlaces de menú (~5 min cada uno, sin tocar componentes)
- [ ] **T-13** — Columna "Nº productos" en Fabricantes (~30 min)
- [ ] **T-11** — Filtro por material en Dashboard de márgenes (~45 min)

---

## 🚧 Dependencias y bloqueos

- **T-15** (Tacos visual) requiere **T-14** (Grapas visual) para mantener coherencia visual.
- **T-18** requiere que **T-17** esté hecho antes para reutilizar el patrón de chat.
- **T-16** (Tarifa de materiales) está bloqueada esperando que el usuario concrete qué quiere ver — ver "Ideas a concretar".
- **T-08** (Semáforo) y **T-09** (Comparativa proveedores): antes de arreglar hay que reproducir el error — puede ser un problema de datos en la DB de producción, no de código.

---

## 💡 Ideas a concretar antes de implementar

- **T-16 — Tarifa de materiales visual**: el usuario pide explícitamente "dame ideas". Hay que mostrarle opciones antes de codificar. Posibles enfoques: (a) agrupar filas por material con cabecera colapsable, (b) vista de tarjetas con el precio grande y el coste/margen debajo, (c) tabla con color de fondo por nivel de margen. Pendiente de decisión.

- **T-22 — Materiales en /almacen**: ¿es una vista diferente a `/gestion/catalogos/materiales` o solo un enlace? Si es diferente, ¿qué campos/acciones necesita?

---

## ✅ Completado anteriormente

- Historial de precios de venta (`TarifaVentaHistorial`), Dashboard de márgenes, Comparador de dos importaciones, Previsión del próximo pedido — `212c553`
- Fix JSX duplicado en analisis-rentabilidad — `0870cc7`
- Fase 1+2 de etiquetas: fabricante en formulario, código interno, búsqueda por código, etiqueta PDF mejorada, impresión en lote — varios commits
- 15 fixes revisión de código, historial cliente en pedidos, simplificación lista productos — varios commits

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
