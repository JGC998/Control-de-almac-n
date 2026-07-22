# ROADMAP — CRM Taller

> Última actualización: 2026-07-22  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

El foco ahora es la **identificación unívoca de productos**: evitar confusiones entre piezas similares (mismo nombre, distinto espesor) creando un código interno auto-generado a partir de los atributos del producto, mostrándolo en todos los puntos de contacto (lista, pedidos, búsqueda) y permitiendo imprimir etiquetas físicas para los troqueles. Como requisito previo, hay que exponer el campo **fabricante** en el formulario de producto, que existe en la base de datos pero nunca se ha mostrado en la interfaz.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-01 | Añadir selector de fabricante al formulario de producto | Mejora UI | Pequeña | — |
| T-02 | Función `generarCodigo(producto)` en `producto-utils.js` con reglas de abreviación | Feature | Pequeña | T-01 |
| T-03 | Mostrar código interno en la lista de productos (`/gestion/productos`) | Mejora UI | Pequeña | T-02 |
| T-04 | Mostrar código en `EditorFilaItem` al seleccionar un producto en un pedido | Mejora UI | Pequeña | T-02 |
| T-05 | Incluir código interno como campo de búsqueda en `ModalBusquedaProductos` | Mejora UI | Pequeña | T-02 |
| T-06 | Mejorar etiqueta PDF existente para incluir el código interno prominentemente | Mejora | Pequeña | T-02 |
| T-07 | Imprimir etiquetas en lote desde la selección de la lista de productos | Feature | Media | T-06 |

---

## 🗺️ Fases propuestas

### Fase 1 — Fabricante + código interno visible en todos los puntos
> Eliminar la confusión entre productos similares con un código auto-generado. Estimación: 2-3 horas.

- [ ] **T-01** — Añadir fabricante al formulario de producto  
  _`FormularioProductoInteligente.js`: cargar `/api/fabricantes` con SWR y añadir un select debajo de Ref. fabricante. El campo `fabricanteId` ya existe en el payload — solo falta la UI._

- [ ] **T-02** — Función `generarCodigo(producto)` con reglas de abreviación  
  _Añadir a `src/lib/producto-utils.js`. Combina: Familia (3 letras) · Subfamilia (4 letras) · Fabricante (iniciales) · Acabado (3 letras si aplica) · Espesor (Xmm) · Ancho×Largo. Ejemplo: `GOm-CIER-MB-8mm-500×1200`. Documentar las reglas en DESIGN.md._

- [ ] **T-03** — Código visible en la lista de productos  
  _`/gestion/productos/page.js`: añadir columna "Código" tras el nombre, generada al vuelo con `generarCodigo()`. Click en el código → copiar al portapapeles (tooltip "Copiado")._

- [ ] **T-04** — Código en `EditorFilaItem` al añadir una línea de pedido  
  _Mostrar el código como badge extra debajo del nombre del producto cuando la línea es de tipo catálogo. Permite al operario verificar que seleccionó la pieza correcta._

- [ ] **T-05** — Buscar por código en el modal de búsqueda de productos  
  _`ModalBusquedaProductos.js`: añadir `generarCodigo(p)` al `matchTexto` del filtrado. El usuario podrá buscar "8mm 500" y encontrar la pieza concreta._

### Fase 2 — Etiquetas físicas para troqueles
> Cerrar el ciclo: el código interno imprimible y pegable en las piezas. Estimación: 2-3 horas.

- [ ] **T-06** — Mejorar la etiqueta PDF existente con el código interno  
  _`src/lib/pdfGenerator.js → generateEtiquetaPDF()`: el endpoint `GET /api/productos/[id]/etiqueta` ya genera un PDF 100×70mm con QR. Añadir el código auto-generado como texto grande y destacado. El botón de etiqueta ya existe en `/gestion/productos/[id]`._

- [ ] **T-07** — Imprimir etiquetas en lote desde la lista  
  _En `/gestion/productos`, el panel de selección masiva (bottom bar) ya existe. Añadir botón "Imprimir etiquetas (N)". Nuevo endpoint `POST /api/productos/etiquetas-lote` que acepta un array de IDs y devuelve un PDF multipágina (una etiqueta por página)._

---

## ⚡ Quick wins

Tareas pequeñas de impacto inmediato que se pueden resolver en minutos:

- [ ] **T-01** — Fabricante en formulario: un select con SWR, sin cambio de DB (~30 min)
- [ ] **T-05** — Búsqueda por código: una línea en el `matchTexto` de `ModalBusquedaProductos` (~10 min, requiere T-02)

---

## 🚧 Dependencias y bloqueos

- **T-02 a T-07** dependen de T-01 solo parcialmente: T-02 puede empezar sin T-01 (el fabricante simplemente sale vacío en el código si no está asignado), pero lo ideal es hacer T-01 primero para que los productos nuevos ya lleven fabricante desde el principio.
- **T-07** requiere T-06 (la lógica de generación de una etiqueta debe existir antes de hacer el lote).
- **Reglas de abreviación** (T-02): los nombres exactos de las abreviaciones hay que decidirlos antes de implementar — se propone un sistema en el DESIGN.md pero el usuario puede ajustarlo.

---

## 💡 Ideas descartadas o pospuestas

- **Código almacenado en BD** (campo `codigoInterno`): se descarta por ahora a favor de generarlo al vuelo desde los campos existentes. Ventaja: sin migración, siempre consistente con los datos reales. Si en el futuro se necesita indexar por código o filtrarlo server-side, se puede añadir el campo y rellenarlo con una migración de datos.
- **QR o código de barras en etiqueta**: el QR ya existe en la etiqueta actual (apunta a la ficha del producto). No se añade código de barras por el momento.

---

## ✅ Completado anteriormente
- **T-13**: Documentar /inicio y /ventas en DESIGN.md — `a944c75`
- **Fase 3**: Guardar metraje en catálogo + generar productos desde tarifas (T-10, T-11) — `ccce4af`
- **Fase 2**: Filtrado cascada búsqueda (T-07→T-09) + paridad presupuestos (T-12) — `6befd55`
- **Fase 1**: Limpieza formularios y 3 bugs (T-01→T-06) — `e832c2b`
- Historial de cliente en formulario de pedido/presupuesto (reemplaza Plantillas) — `2aeceff`
- Simplificación lista de productos (dos tabs, sin columna Tipo) — `8cfcaf0`
- 15 fixes de la segunda revisión de código — `9618c67`

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
