# DESIGN.md — Documentación Visual de la Interfaz

> Cada sección describe el estado **aprobado** de una página.  
> Antes de modificar cualquier ruta documentada aquí, leer su sección y confirmar con el usuario si el cambio afecta la estructura o el aspecto visual.  
> Si el cambio toca algo marcado con 🚫, mostrar un artefacto de preview antes de tocar el código.

---

## Índice

- [/](#inicio-dashboard)
- [/ventas](#ventas)
- [/gestion/productos](#gestionproductos)
- [/pedidos](#pedidos)

---

## / (Inicio — Dashboard)

**Archivo:** `src/app/page.js`  
**Estado:** ✅ Aprobado  
**Renderizado:** Client Component — `useSWR('/api/dashboard', { refreshInterval: 60000 })`

### Estructura visual (de arriba a abajo)

```
┌─────────────────────────────────────────────────────────────┐
│  Inicio (h1 text-2xl font-bold)                             │
├─────────────────────────────────────────────────────────────┤
│  AccesosDirectos — grid 2 cols / sm:3 cols / lg:4 cols      │
│  7 tarjetas con rounded-2xl, icono w-8 h-8 + label sm       │
│  hover:scale-105 · active:scale-95 · transition-transform   │
│                                                             │
│  Presupuestos (primary) · Pedidos (success)                 │
│  Almacén (accent) · Contenedores (secondary)                │
│  Calculadora bandas (warning) · Calculadora metrajes (neutral)│
│  Tarifas (info)                                             │
├─────────────────────────────────────────────────────────────┤
│  grid md:grid-cols-2 gap-4 — solo visible si hay datos:     │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ PanelFamilias        │  │ PanelFacturasPendientes       │ │
│  │ Barras horizontales  │  │ KPIs: emitidas / vencidas     │ │
│  │ por familia (color + │  │ Total pendiente               │ │
│  │ nº productos)        │  │ Lista de facturas (link cada) │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Accesos directos — orden y colores fijos

| # | Label | href | Color DaisyUI |
|---|-------|------|---------------|
| 1 | Presupuestos | `/presupuestos` | `bg-primary` |
| 2 | Pedidos | `/pedidos` | `bg-success` |
| 3 | Almacén | `/almacen` | `bg-accent` |
| 4 | Contenedores | `/compras/contenedores` | `bg-secondary` |
| 5 | Calculadora bandas | `/calculadora/bandas` | `bg-warning` |
| 6 | Calculadora metrajes | `/calculadora/metrajes` | `bg-neutral` |
| 7 | Tarifas | `/tarifas` | `bg-info` |

### Widgets secundarios

- **PanelFamilias** — barras horizontales proporcionales al nº de productos por familia, coloreadas con `familia.color`. Solo aparece si `familiaStats.length > 0`.
- **PanelFacturasPendientes** — 2 KPIs (nº emitidas / nº vencidas en `bg-error/10`), total pendiente en €, lista de hasta N facturas con link a cada una. `AlertCircle text-error` si vencida, `Clock` si no. Solo aparece si hay facturas.
- El grid de widgets no se renderiza si ambos paneles están vacíos.

### 🚫 No cambiar sin confirmar

1. **7 accesos directos** — ese conjunto y ese orden son deliberados. No añadir ni quitar sin aprobación.
2. **Colores por sección** — cada tarjeta usa el color semántico de su área (primary = ventas, success = pedidos, etc.). No cambiar los colores.
3. **refreshInterval: 60 000 ms** — el dashboard se refresca cada minuto. No bajar ese intervalo.
4. **Widgets solo si hay datos** — los paneles no aparecen en pantalla vacía, no añadir placeholders ni estados vacíos en el grid.

---

---

## /ventas

**Archivo:** `src/app/ventas/page.js`  
**Estado:** ✅ Aprobado  
**Renderizado:** Server Component — delega en `<HubPage>`

### Estructura visual

```
┌─────────────────────────────────────────────────────────────┐
│  💲 Ventas (h1 con icono DollarSign, color primary)         │
│  "Gestión del ciclo de venta: presupuestos y pedidos..."    │
├─────────────────────────────────────────────────────────────┤
│  Grupo: "Crear nuevo documento"                             │
│  ┌────────────────────────┐  ┌────────────────────────────┐ │
│  │ FilePlus  Nuevo         │  │ PackagePlus  Nuevo pedido  │ │
│  │ presupuesto             │  │ [Crear pedido]             │ │
│  │ [Crear presupuesto]     │  │                            │ │
│  └────────────────────────┘  └────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Grupo: "Ver y gestionar"                                   │
│  ┌────────────────────────┐  ┌────────────────────────────┐ │
│  │ FileText  Presupuestos  │  │ Package  Pedidos de cliente│ │
│  │ [Ver presupuestos]      │  │ [Ver pedidos]              │ │
│  └────────────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Grupos y destinos — orden fijo

| Grupo | Item | href |
|-------|------|------|
| Crear nuevo documento | Nuevo presupuesto | `/presupuestos/nuevo` |
| Crear nuevo documento | Nuevo pedido | `/pedidos/nuevo` |
| Ver y gestionar | Presupuestos | `/presupuestos` |
| Ver y gestionar | Pedidos de cliente | `/pedidos` |

### 🚫 No cambiar sin confirmar

1. **Dos grupos, cuatro items** — estructura fija. No añadir albaranes, facturas ni otras secciones aquí sin aprobación.
2. **Orden de items dentro de cada grupo** — presupuesto siempre antes que pedido (refleja el flujo natural del ciclo de venta).
3. **Página de hub pura** — no añadir widgets de datos, KPIs ni tablas. Para eso está el Dashboard (`/`).

---

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
