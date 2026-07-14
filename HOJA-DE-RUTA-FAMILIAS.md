# Hoja de Ruta — Implementación Familias/Subfamilias

> Estado al 14/07/2026. **Fases 1, 2, 3 y 4 completadas.**

---

## ✅ Completado — Fase 1: Base de datos

- [x] `prisma/schema.prisma` — modelos `Familia`, `Subfamilia`, `subfamiliaId` en `Producto` y `ArticuloSimple`
- [x] `prisma/schema.dev.prisma` — mismos cambios para SQLite dev
- [x] `prisma/migrate-prod-familias.sql` — script MySQL para producción
- [x] `prisma/seed-familias.js` — 6 familias y 17 subfamilias sembradas en dev
- [x] `db push` ejecutado en dev, cliente Prisma regenerado

## ✅ Completado — Fase 2: API

- [x] `src/lib/validations.js` — `subfamiliaId` en todos los schemas, `familiaSchema`, `subfamiliaSchema`
- [x] `src/app/api/productos/route.js` — subfamilia incluida en respuestas, filtros, subfamiliaId en POST
- [x] `src/app/api/productos/[id]/route.js` — subfamilia en GET, subfamiliaId en PUT
- [x] `src/app/api/articulos-simples/route.js` — subfamilia incluida, subfamiliaId en POST, filtros
- [x] `src/app/api/familias/route.js` + `[id]/route.js` — CRUD completo
- [x] `src/app/api/subfamilias/route.js` + `[id]/route.js` — CRUD completo
- [x] Bugs corregidos: `pricing/calculate`, `dump-catalogo.js`

## ✅ Completado — Fase 3: UI

- [x] `src/componentes/productos/SelectorFamiliaSubfamilia.js` — dropdown cascada Familia → Subfamilia
- [x] `src/componentes/productos/FormularioProductoInteligente.js` — añadido subfamiliaId y el selector
- [x] `src/componentes/modales/ModalBusquedaProductos.js` — filtro por familia, chip de subfamilia en filas
- [x] `src/app/gestion/catalogos/familias/page.js` — CRUD con filas expandibles, subfamilias inline
- [x] `src/app/gestion/productos/page.js` — columna Subfamilia (badge con color), filtro por familia
- [x] `src/app/gestion/productos/[id]/page.js` — badge Familia/Subfamilia en detalles técnicos
- [x] `src/app/almacen/articulos/page.js` — reescrita con SelectorFamiliaSubfamilia, columna y filtro
- [x] `src/componentes/layout/BarraLateral.js` — enlace "Familias" en sección Gestión

---

## ✅ Completado — Fase 4: Limpieza seeds y corrección de bugs

### 4.1 seed.js ✓
- Eliminadas referencias a modelo inexistente `produto_Old`
- Corregido upsert de Producto para usar clave compuesta `@@unique([nombre, referenciaFabricante])`
- Corregido Stock para usar FK `proveedorId` en lugar de campo `proveedor: string`

### 4.2 seed-mock.js ✓
- Eliminados campos inexistentes `descricao`, `precio`, `stock`, `categoria`
- Añadido `referenciaFabricante: 'MOCK-NNN'` para garantizar unicidad en constraint compuesto

### 4.3 Bugs adicionales corregidos ✓
- `ModalBusquedaProductos`: `filtroFamilia` faltaba en el array de deps del useMemo `filtrados`
- `GestionFamiliasPage.eliminarFamilia`: cascada manual de subfamilias antes de eliminar la familia
- `POST /api/articulos-simples`: campo `activo` se ignoraba → siempre creaba con `activo: true`
- `GET /api/articulos-simples/[id]`: no incluía la relación `subfamilia` (inconsistente con el listado)

---

## Referencia: Familias y subfamilias (sembradas en dev)

| Familia | Color | Subfamilias |
|---------|-------|-------------|
| GOMA | #C0392B | Cierre tronco, Faldeta, Estrella (uds), Metraje (m) |
| CARAMELO | #B45309 | Faldeta, Estrella, Metraje |
| FIELTRO | #6D28D9 | Faldeta, Metraje |
| PVC | #1D4ED8 | Banda sin fin, Banda con grapa, Banda abierta, Pieza PVC |
| PLANCHA DE GOMA | #065F46 | Plancha Negra, Plancha Verde |
| ACCESORIO | #374151 | Grapa, Taco/barra, Herraje, Consumible, Otro |

## Referencia: Atributos por familia

| Familia | Espesor | Ancho | Largo | Lonas | Acabado | Color |
|---------|---------|-------|-------|-------|---------|-------|
| GOMA | ✓ | ✓ | ✓ | — | — | ✓ |
| CARAMELO | ✓ | ✓ | ✓ | — | — | — |
| FIELTRO | ✓ | ✓ | ✓ | — | — | — |
| PVC | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PLANCHA DE GOMA | ✓ | ✓ | ✓ | — | — | — |
| ACCESORIO | — | — | — | — | — | — |

## Pasos para desplegar en producción

1. Ejecutar `prisma/migrate-prod-familias.sql` en la base de datos MySQL
2. Ejecutar `node prisma/seed-familias.js` (con la URL de prod en DATABASE_URL)
3. Hacer el deploy habitual de Next.js
