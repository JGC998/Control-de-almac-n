-- =============================================================================
-- MIGRACIÓN: Fusionar ArticuloSimple en Producto
-- Ejecutar en producción ANTES de actualizar el schema de Prisma
-- =============================================================================

-- 1. Añadir nuevas columnas a Producto
ALTER TABLE Producto
  ADD COLUMN tipo        VARCHAR(50)  NOT NULL DEFAULT 'BANDA',
  ADD COLUMN unidad      VARCHAR(20)  NOT NULL DEFAULT 'M2',
  ADD COLUMN activo      TINYINT(1)   NOT NULL DEFAULT 1,
  ADD COLUMN descripcion TEXT         NULL;

-- 2. Eliminar columnas obsoletas de Producto
ALTER TABLE Producto
  DROP COLUMN precioVentaFab,
  DROP COLUMN precioVentaInt,
  DROP COLUMN precioVentaFin;

-- 3. Añadir índices
ALTER TABLE Producto ADD INDEX idx_producto_tipo (tipo);
ALTER TABLE Producto ADD INDEX idx_producto_activo (activo);

-- 4. Migrar ArticuloSimple → Producto
--    - categoria  → tipo  (CORDON | BORDE_ONDULADO → igual, OTRO → ACCESORIO)
--    - fabricante → referenciaFabricante (reutilizamos el campo de texto existente)
--    - precioUnitario, costoUnitario, descripcion, activo, subfamiliaId → igual
INSERT INTO Producto
  (id, nombre, tipo, unidad, precioUnitario, costo, descripcion, activo,
   subfamiliaId, referencia_fab, creadoEn, actualizado)
SELECT
  UUID(),
  nombre,
  CASE categoria
    WHEN 'CORDON'         THEN 'CORDON'
    WHEN 'BORDE_ONDULADO' THEN 'BORDE_ONDULADO'
    ELSE                       'ACCESORIO'
  END,
  unidad,
  precioUnitario,
  costoUnitario,
  descripcion,
  activo,
  subfamiliaId,
  fabricante,   -- fabricante string → referenciaFabricante
  creadoEn,
  creadoEn
FROM ArticuloSimple;

-- 5. Eliminar tabla ArticuloSimple (y sus FK constraints)
ALTER TABLE ArticuloSimple DROP FOREIGN KEY ArticuloSimple_subfamiliaId_fkey;
DROP TABLE ArticuloSimple;
