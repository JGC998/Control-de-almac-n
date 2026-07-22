# DESIGN.md — Documentación Visual de la Interfaz

> Cada sección describe el estado **aprobado** de una página.  
> Antes de modificar cualquier ruta documentada aquí, leer su sección y confirmar con el usuario si el cambio afecta la estructura o el aspecto visual.  
> Si el cambio toca algo marcado con 🚫, mostrar un artefacto de preview antes de tocar el código.

---

## Índice

- [/gestion/productos](#gestionproductos)
- [/pedidos](#pedidos)

---

## /gestion/productos

**Archivo:** `src/app/gestion/productos/page.js`  
**Estado:** ✅ Aprobado

### Estructura visual (de arriba a abajo)

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Productos (h1 text-2xl font-bold)                        │
│  [🔍 Buscar (input-sm w-56)]  [⬇ CSV]  [＋ Nuevo (primary)] │
├─────────────────────────────────────────────────────────────┤
│  tabs-boxed w-fit                                            │
│  [ Activos (N) ]  [ 🗄 Archivados (N, solo si > 0) ]        │
├─────────────────────────────────────────────────────────────┤
│  card bg-base-100 shadow · table table-sm table-zebra        │
│  thead: ☑  Nombre  Material  Acabado  Espesor  Ancho  Largo  Precio  Peso  –  │
│  tbody: filas con hover cursor-pointer (click = seleccionar) │
├─────────────────────────────────────────────────────────────┤
│  "N productos" text-xs text-right (solo si hay filas)        │
├─────────────────────────────────────────────────────────────┤
│  [PANEL FIJO BOTTOM — solo visible con selección activa      │
│   Y tab = Activos: clasificación masiva por subfamilia]      │
└─────────────────────────────────────────────────────────────┘
```

### Columnas — orden exacto

| # | Label | Key | Tipo | Formato |
|---|-------|-----|------|---------|
| 1 | Nombre | `nombre` | string | Link a `/gestion/productos/[id]` + badge `incompleto` si faltan datos |
| 2 | Material | `material.nombre` | string | Texto plano; `—` si null |
| 3 | Acabado | `acabado` | string | Texto plano; `—` si null |
| 4 | Espesor | `espesor` | number | `X mm`; celda en `text-warning` si null |
| 5 | Ancho | `ancho` | number | `X mm`; celda en `text-warning` si null |
| 6 | Largo | `largo` | number | `X mm`; celda en `text-warning` si null |
| 7 | Precio | `precioUnitario` | number | `X,XX €`; celda en `text-warning` si null |
| 8 | Peso | `pesoUnitario` | number | `X,XX kg`; `—` si null |
| – | Acciones | — | — | Archivar / Editar / Eliminar (alineado a la derecha) |

**Columnas eliminadas intencionalmente:**
- `tipo` — 98% de productos son BANDA, no aporta información útil en el listado
- `subfamilia` — demasiado detalle para la vista de lista

### Sistema de tabs

- **Activos** → `GET /api/productos?activo=true` · badge siempre visible
- **Archivados** → `GET /api/productos?activo=false` · badge neutral, solo si hay archivados (N > 0)
- Ambas SWR cargan en paralelo al montar (carga optimista sin esperar al cambio de tab)
- Al cambiar de tab: resetea selección y búsqueda

### Comportamiento de filas

- Click en fila → toggle selección (checkbox). El nombre tiene `stopPropagation` para navegar sin seleccionar.
- Filas con `espesor/ancho/largo/precioUnitario` nulos → `opacity-70` + badge `badge-warning incompleto`
- Ordenación por columna al hacer click en el header (asc/desc con iconos Chevron)
- Búsqueda filtra por `nombre`, `material.nombre` y `acabado` (client-side, sin redibujado de red)
- Tab Activos: botón acción = **Archivar** (muestra confirmación modal)
- Tab Archivados: botón acción = **Restaurar** (sin confirmación, acción inmediata)

### Panel de clasificación masiva

- Aparece fijo en el bottom solo cuando `selección.size > 0` Y `tab === 'activos'`
- Permite asignar subfamilia a todos los productos seleccionados en un solo PUT paralelo
- Desaparece tras aplicar o al pulsar ✕

### 🚫 No cambiar sin confirmar

1. **Número y orden de columnas** — exactamente 8 columnas de datos. No añadir ni quitar sin aprobación.
2. **Solo dos tabs (Activos / Archivados)** — no añadir una tercera (Todos, Sin clasificar, etc.). Decisión deliberada de simplificación.
3. **Header limpio** — solo: título · búsqueda · icono CSV · botón Nuevo. Sin dropdowns de filtro, botones extra ni badges en el header.
4. **Campo `tipo` en el formulario** — no existe en la tabla pero sí en `FormularioProductoInteligente`. Controla si se muestran campos de material/dimensiones (`esAccesorio = tipo !== 'BANDA'`). No eliminarlo del formulario.

---

---

## /pedidos

**Archivo:** `src/app/pedidos/page.js`  
**Estado:** ✅ Aprobado  
**Renderizado:** Server Component (`force-dynamic`) — sin SWR, paginación servidor

### Estructura visual (de arriba a abajo)

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Pedidos (h1 text-3xl font-bold)                          │
│  [🖨 Imprimir notas]  [⬇ Exportar Excel]  [＋ Nuevo Pedido] │
├─────────────────────────────────────────────────────────────┤
│  Filtros flex-wrap gap-3 items-end:                          │
│  [🔍 Buscar cliente o número…]  [📅 FiltroFechas]  [FiltroEstado] │
├─────────────────────────────────────────────────────────────┤
│  card bg-base-100 shadow-xl border border-base-200           │
│  → TablaConSeleccion (tipo="pedido")                         │
│     Número · Cliente · Fecha · Total · Estado (badge)        │
├─────────────────────────────────────────────────────────────┤
│  PaginacionServidor (20 por página por defecto)              │
└─────────────────────────────────────────────────────────────┘
```

### Columnas — orden exacto

| # | Label | Key | Formato |
|---|-------|-----|---------|
| 1 | Número | `numero` | Texto plano |
| 2 | Cliente | `cliente.nombre` | Texto plano |
| 3 | Fecha | `fechaCreacion` | Fecha formateada |
| 4 | Total | `total` | Moneda (€) |
| 5 | Estado | `estado` | Badge: `Facturado`=éxito · `Pendiente`=advertencia · `Cancelado`=error |

### Comportamiento de filtros y URL

- Sin parámetro `?estado` en la URL → **redirect automático a `?estado=Pendiente`** (la página nunca muestra todos por defecto)
- `?estado=todos` → sin filtro de estado (muestra todos)
- `?busqueda=` → filtra por número de pedido o nombre de cliente
- `?desde=` / `?hasta=` → rango de fechas en `fechaCreacion`
- Todos los filtros son parámetros de URL (server-side, recarga de página)

### Elemento comentado — Tabs Facturables / Internos

En el código existe un bloque **comentado** con tabs para separar pedidos facturables de pedidos internos (`sinFacturacion: true/false`). Los conteos (`totalFacturables`, `totalInternos`) ya se calculan en la query aunque los tabs no estén visibles.

### 🚫 No cambiar sin confirmar

1. **Columnas**: exactamente 5. No añadir ni reordenar sin aprobación.
2. **Botones del header**: los tres botones (Imprimir notas · Exportar Excel · Nuevo Pedido) en ese orden. No añadir más al header.
3. **Tabs comentadas**: el bloque de tabs Facturables/Internos está comentado intencionalmente. No descomentar sin consultar — requiere decisión sobre cómo integrarlo con el resto del flujo.
4. **Redirect por defecto**: la redirección a `?estado=Pendiente` es deliberada. No cambiarla a "todos" ni eliminarla.

---

---

## /pedidos/nuevo

**Archivo:** `src/app/pedidos/nuevo/page.js` → `src/componentes/pedidos/FormularioPedidoCliente.js`  
**Estado:** ✅ Aprobado  
**Renderizado:** Client Component — SWR para clientes, márgenes y productos

### Estructura visual (de arriba a abajo)

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Crear Nuevo Pedido (h1 text-3xl font-bold)              │
├─────────────────────────────────────────────────────────────┤
│  card bg-base-100 shadow-xl                                  │
│  Card title: "Información Principal"                         │
│  [🕐 Historial de cliente] — top-right, desactivado sin cliente │
│  Input: Cliente (Requerido) — readonly + btn buscar          │
│  (Si cliente tiene tarifas: badges inline clickables)        │
├─────────────────────────────────────────────────────────────┤
│  card bg-base-100 shadow-xl                                  │
│  Card title: "Líneas del pedido" + contador "N líneas"       │
│  [+ Añadir producto] [✂ Metraje material] [📏 Buscar Banda PVC] │
│  table w-full:                                               │
│    Stock | Producto | Cantidad | Precio Unit. | Total | Acciones │
│    (EditorFilaItem por fila — badge de tipo en cada línea)  │
├─────────────────────────────────────────────────────────────┤
│  grid grid-cols-1 md:grid-cols-2 gap-6:                     │
│  | Card: Notas Adicionales (textarea h-24)                  │
│  | Card: Resumen del Total                                   │
│  |   Select: Regla de Margen / Tier (requerido)            │
│  |   Subtotal (Costo Base)                                  │
│  |   Subtotal (con Margen) + desglose margen si aplica     │
│  |   IVA (N%)                                               │
│  |   Total (font-bold text-lg text-primary)                │
│  |   Indicador margen estimado (verde ≥20%, amarillo ≥10%, rojo <10%) │
├─────────────────────────────────────────────────────────────┤
│  [Cancelar]  [💾 Guardar] (disabled sin cliente ni margen)  │
└─────────────────────────────────────────────────────────────┘
```

### Botones de añadir línea

| Botón | Clase | Acción |
|-------|-------|--------|
| + Añadir producto | `btn-outline btn-primary` | Añade fila vacía |
| ✂ Metraje material | `btn-outline btn-accent` | Abre `ModalMetrajeMaterial` |
| 📏 Buscar Banda PVC | `btn-outline btn-secondary` | Abre `ModalBusquedaBandasPVC` |

### EditorFilaItem — badges por tipo de línea

| Tipo | Icono | Badge | Color |
|------|-------|-------|-------|
| Metraje material | Scissors | Nombre del material | `badge-accent` |
| Banda PVC calculada | Ruler | "Banda PVC" | `badge-secondary` |
| Producto de catálogo | Package | Subfamilia (si tiene) | Color de la familia |
| Línea manual | Pencil | — | — |

### 🚫 No cambiar sin confirmar

1. **Botón "Historial de cliente"** — reemplazó a "Plantillas" deliberadamente. No restaurar Plantillas.
2. **Tres botones de añadir línea** — en ese orden y con esas clases. No añadir más al header de "Líneas del pedido".
3. **Indicador de margen estimado** — los umbrales (20%/10%) son valores de negocio. No cambiar sin consultar.
4. **Botón Guardar desactivado** sin cliente Y sin margen seleccionado — validación deliberada.

---

*Añadir nuevas secciones aquí conforme se aprueben más páginas.*
