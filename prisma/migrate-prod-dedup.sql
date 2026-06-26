-- =============================================================
-- LIMPIEZA DE DUPLICADOS — Ejecutar ANTES de migrate-prod-indexes.sql
-- =============================================================

-- ─── Grapa: conservar id=1 (CHINO), eliminar id=7 (CH) ──────
DELETE FROM `Grapa` WHERE `id` = 7;

-- ─── Producto: migrar todas las referencias al primero del par, luego borrar el segundo ───

-- Pair 1: 317244628020000 - GOMA - Topavi
-- Conservar: 18b8a7ab-d3ba-4a40-9d57-c11cb5a369d8
-- Eliminar:  8085cc29-ede4-4d50-851b-0bcc5ee6e6da
UPDATE `PedidoItem`      SET `productoId` = '18b8a7ab-d3ba-4a40-9d57-c11cb5a369d8' WHERE `productoId` = '8085cc29-ede4-4d50-851b-0bcc5ee6e6da';
UPDATE `AlbaranItem`     SET `productoId` = '18b8a7ab-d3ba-4a40-9d57-c11cb5a369d8' WHERE `productoId` = '8085cc29-ede4-4d50-851b-0bcc5ee6e6da';
UPDATE `FacturaItem`     SET `productoId` = '18b8a7ab-d3ba-4a40-9d57-c11cb5a369d8' WHERE `productoId` = '8085cc29-ede4-4d50-851b-0bcc5ee6e6da';
UPDATE `PresupuestoItem` SET `productoId` = '18b8a7ab-d3ba-4a40-9d57-c11cb5a369d8' WHERE `productoId` = '8085cc29-ede4-4d50-851b-0bcc5ee6e6da';
UPDATE `TarifaCliente`   SET `productoId` = '18b8a7ab-d3ba-4a40-9d57-c11cb5a369d8' WHERE `productoId` = '8085cc29-ede4-4d50-851b-0bcc5ee6e6da';
UPDATE `Documento`       SET `productoId` = '18b8a7ab-d3ba-4a40-9d57-c11cb5a369d8' WHERE `productoId` = '8085cc29-ede4-4d50-851b-0bcc5ee6e6da';
DELETE FROM `Producto` WHERE `id` = '8085cc29-ede4-4d50-851b-0bcc5ee6e6da';

-- Pair 2: 500/4 - GOMA - BANDA CAUCHO
-- Conservar: 5c5731d0-6601-487a-a527-50525a43dd7b
-- Eliminar:  dd8deb78-eef2-4bb0-8808-cf1ffeb74747
UPDATE `PedidoItem`      SET `productoId` = '5c5731d0-6601-487a-a527-50525a43dd7b' WHERE `productoId` = 'dd8deb78-eef2-4bb0-8808-cf1ffeb74747';
UPDATE `AlbaranItem`     SET `productoId` = '5c5731d0-6601-487a-a527-50525a43dd7b' WHERE `productoId` = 'dd8deb78-eef2-4bb0-8808-cf1ffeb74747';
UPDATE `FacturaItem`     SET `productoId` = '5c5731d0-6601-487a-a527-50525a43dd7b' WHERE `productoId` = 'dd8deb78-eef2-4bb0-8808-cf1ffeb74747';
UPDATE `PresupuestoItem` SET `productoId` = '5c5731d0-6601-487a-a527-50525a43dd7b' WHERE `productoId` = 'dd8deb78-eef2-4bb0-8808-cf1ffeb74747';
UPDATE `TarifaCliente`   SET `productoId` = '5c5731d0-6601-487a-a527-50525a43dd7b' WHERE `productoId` = 'dd8deb78-eef2-4bb0-8808-cf1ffeb74747';
UPDATE `Documento`       SET `productoId` = '5c5731d0-6601-487a-a527-50525a43dd7b' WHERE `productoId` = 'dd8deb78-eef2-4bb0-8808-cf1ffeb74747';
DELETE FROM `Producto` WHERE `id` = 'dd8deb78-eef2-4bb0-8808-cf1ffeb74747';

-- Pair 3: N600 INTERIOR - GOMA - Noli
-- Conservar: 501333aa-df0a-4fa3-a3bb-c41096f92344
-- Eliminar:  f6d43b81-046a-4df6-bbd5-f1f0e7ec2726
UPDATE `PedidoItem`      SET `productoId` = '501333aa-df0a-4fa3-a3bb-c41096f92344' WHERE `productoId` = 'f6d43b81-046a-4df6-bbd5-f1f0e7ec2726';
UPDATE `AlbaranItem`     SET `productoId` = '501333aa-df0a-4fa3-a3bb-c41096f92344' WHERE `productoId` = 'f6d43b81-046a-4df6-bbd5-f1f0e7ec2726';
UPDATE `FacturaItem`     SET `productoId` = '501333aa-df0a-4fa3-a3bb-c41096f92344' WHERE `productoId` = 'f6d43b81-046a-4df6-bbd5-f1f0e7ec2726';
UPDATE `PresupuestoItem` SET `productoId` = '501333aa-df0a-4fa3-a3bb-c41096f92344' WHERE `productoId` = 'f6d43b81-046a-4df6-bbd5-f1f0e7ec2726';
UPDATE `TarifaCliente`   SET `productoId` = '501333aa-df0a-4fa3-a3bb-c41096f92344' WHERE `productoId` = 'f6d43b81-046a-4df6-bbd5-f1f0e7ec2726';
UPDATE `Documento`       SET `productoId` = '501333aa-df0a-4fa3-a3bb-c41096f92344' WHERE `productoId` = 'f6d43b81-046a-4df6-bbd5-f1f0e7ec2726';
DELETE FROM `Producto` WHERE `id` = 'f6d43b81-046a-4df6-bbd5-f1f0e7ec2726';

-- Pair 4: PRODUCTO TEMPORAL GOMA - GOMA - GOMA
-- Conservar: 0f721086-e400-4a87-a762-4466305194d7
-- Eliminar:  8baa9ae7-1c18-48ef-aaed-505824a15b46
UPDATE `PedidoItem`      SET `productoId` = '0f721086-e400-4a87-a762-4466305194d7' WHERE `productoId` = '8baa9ae7-1c18-48ef-aaed-505824a15b46';
UPDATE `AlbaranItem`     SET `productoId` = '0f721086-e400-4a87-a762-4466305194d7' WHERE `productoId` = '8baa9ae7-1c18-48ef-aaed-505824a15b46';
UPDATE `FacturaItem`     SET `productoId` = '0f721086-e400-4a87-a762-4466305194d7' WHERE `productoId` = '8baa9ae7-1c18-48ef-aaed-505824a15b46';
UPDATE `PresupuestoItem` SET `productoId` = '0f721086-e400-4a87-a762-4466305194d7' WHERE `productoId` = '8baa9ae7-1c18-48ef-aaed-505824a15b46';
UPDATE `TarifaCliente`   SET `productoId` = '0f721086-e400-4a87-a762-4466305194d7' WHERE `productoId` = '8baa9ae7-1c18-48ef-aaed-505824a15b46';
UPDATE `Documento`       SET `productoId` = '0f721086-e400-4a87-a762-4466305194d7' WHERE `productoId` = '8baa9ae7-1c18-48ef-aaed-505824a15b46';
DELETE FROM `Producto` WHERE `id` = '8baa9ae7-1c18-48ef-aaed-505824a15b46';

-- =============================================================
-- Ahora ya puedes ejecutar migrate-prod-indexes.sql
-- =============================================================
