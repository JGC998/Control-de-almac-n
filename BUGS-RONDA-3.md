# Bugs — Ronda 3

> Generado el 2026-08-04
> 8 bugs encontrados (4 confirmados, 2 probables, 1 potencial + 1 de consistencia)

---

## Resumen

| # | Severidad | Archivo | Impacto |
|---|-----------|---------|---------|
| BUG-R3-01 | 🔴 CONFIRMADO | `src/app/api/pedidos/from-presupuesto/route.js:34` | Presupuesto en estado 'Rechazado' convertible en pedido |
| BUG-R3-02 | 🔴 CONFIRMADO | `src/app/api/almacen-stock/route.js:87-93` | FK violation en MySQL; audit trail destruida en SQLite por CASCADE |
| BUG-R3-03 | 🔴 CONFIRMADO | `src/app/api/pedidos/[id]/email/route.js:32` | PDF de email de pedido sin datos de empresa (NIF, nombre, etc.) |
| BUG-R3-04 | 🔴 CONFIRMADO | `src/app/api/clientes/[id]/historial-precios/route.js` | Devuelve `unitPrice` (= COSTE interno) etiquetado como historial de precio de venta |
| BUG-R3-05 | 🔴 CONFIRMADO | `src/app/api/precios/route.js:84-109` | `tarifaMaterial.update` + cascade `tarifaRollo.update` sin transacción; fallo parcial no recuperable |
| BUG-R3-06 | 🟠 PROBABLE | `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js:53-54` | Costes recalculados desde primitivos divergen de los campos almacenados en `actualizarPrecio*` |
| BUG-R3-07 | 🟠 PROBABLE | `src/app/calculadora/metrajes/page.js:68` | `gastoFijo` sumado por línea; pedido de N líneas cobra N × gastoFijo |
| BUG-R3-08 | 🟡 POTENCIAL | `historico-bobinas/route.js` vs `analisis-rentabilidad/route.js` | Dos informes muestran coste/metro distinto para la misma importación |

---

## BUG-R3-01 🔴 CONFIRMADO

**Archivo:** `src/app/api/pedidos/from-presupuesto/route.js:34`

**Problema:** No se valida el estado del presupuesto antes de crear el pedido. Se puede convertir en pedido un presupuesto que está en estado `Rechazado` o `Cancelado`.

**Cómo se dispara:** Llamar a `POST /api/pedidos/from-presupuesto` con el ID de cualquier presupuesto, independientemente de su estado.

**Corrección:**
```js
// Añadir justo después de leer el presupuesto (línea ~34):
const ESTADOS_CONVERTIBLES = ['Borrador', 'Enviado', 'Aceptado'];
if (!ESTADOS_CONVERTIBLES.includes(presupuesto.estado)) {
  return NextResponse.json(
    { message: `No se puede convertir un presupuesto en estado '${presupuesto.estado}'` },
    { status: 422 }
  );
}
```

---

## BUG-R3-02 🔴 CONFIRMADO

**Archivo:** `src/app/api/almacen-stock/route.js:87-93`

**Problema:** El endpoint DELETE de movimientos de stock elimina directamente el registro sin verificar si tiene dependencias. En MySQL esto causaría una FK violation si existe alguna referencia. En SQLite (dev) el CASCADE destruye silenciosamente el audit trail de stock.

**Cómo se dispara:** `DELETE /api/almacen-stock/{id}` sobre un movimiento que tiene referencias.

**Corrección:**
```js
// Antes del delete, verificar que no tiene referencias:
const movimiento = await db.movimientoStock.findUnique({ where: { id } });
if (!movimiento) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });

// En lugar de eliminar, marcar como anulado (soft delete):
const anulado = await db.movimientoStock.update({
  where: { id },
  data: { anulado: true, anuladoEn: new Date() }
});
return NextResponse.json(anulado);
```

> Alternativa si no quieres añadir campo: al menos verificar que el movimiento existe y registrar una entrada de auditoría antes de eliminar.

---

## BUG-R3-03 🔴 CONFIRMADO

**Archivo:** `src/app/api/pedidos/[id]/email/route.js:32`

**Problema:** El route de email del pedido genera el PDF de taller pasando `host` como parámetro pero no incluye los datos de empresa (`empresa_nombre`, `empresa_nif`, etc.). La función `generateTallerPDF` en `pdfGenerator.js` espera estos datos en el objeto `config` que se le pasa. El PDF que llega al cliente tiene el nombre de empresa en blanco.

**Cómo se dispara:** Enviar email de pedido desde la vista de pedido. El PDF adjunto sale sin cabecera de empresa.

**Corrección:**
```js
// email/route.js — leer config de empresa antes de generar el PDF
const configRecords = await db.config.findMany({
  where: { key: { in: ['empresa_nombre', 'empresa_nif', 'empresa_direccion', 'empresa_telefono'] } }
});
const empresa = Object.fromEntries(configRecords.map(r => [r.key, r.value]));

const pdfBuffer = await generateTallerPDF(order, {
  valorado: false,
  pedidoUrl,
  margenRule: null,
  ivaRate: 0.21,
  empresa,          // ← pasar datos de empresa
});
```

---

## BUG-R3-04 🔴 CONFIRMADO

**Archivo:** `src/app/api/clientes/[id]/historial-precios/route.js`

**Problema:** El endpoint devuelve `PedidoItem.unitPrice` como "precio de venta al cliente", pero `unitPrice` almacena el **coste** del ítem (no el precio de venta con margen aplicado). El historial de precios mostrado en la ficha del cliente es en realidad un historial de costes internos.

**Cómo se dispara:** Ver la ficha de un cliente → pestaña "Historial de precios". Todos los precios mostrados son costes, no lo que se le cobró al cliente.

**Corrección:**
```js
// historial-precios/route.js — aplicar margen antes de devolver
// Para cada item, leer el marginId del pedido y calcular el precio de venta:
const items = await db.pedidoItem.findMany({
  where: { pedido: { clienteId: id } },
  include: { pedido: { include: { reglaMargen: true } }, producto: true }
});

return items.map(item => {
  const mult = item.pedido.reglaMargen?.multiplicador ?? 1;
  const precioVenta = Number(item.unitPrice) * mult;
  return {
    ...item,
    precioVenta,       // precio real cobrado al cliente
    // NO devolver unitPrice (coste interno)
  };
});
```

---

## BUG-R3-05 🔴 CONFIRMADO

**Archivo:** `src/app/api/precios/route.js:84-109`

**Problema:** La actualización de precio de tarifa de material (`tarifaMaterial.update`) seguida de la actualización de tarifas de rollo asociadas se hace en dos operaciones Prisma independientes, sin transacción. Si la segunda operación falla (ej. timeout, FK violation), la tarifa principal queda actualizada pero los rollos asociados tienen precios viejos — estado inconsistente que no puede resolverse reintentando sin saber qué cambió.

**Cómo se dispara:** Actualizar un precio de tarifa cuando hay rollos asociados y la segunda query falla (sobrecarga de BD, red, etc.).

**Corrección:**
```js
// precios/route.js — envolver en transacción
const resultado = await db.$transaction(async (tx) => {
  const tarifa = await tx.tarifaMaterial.update({
    where: { id: tarifaId },
    data: { precio: nuevoPrecio }
  });

  if (tarifasRollo?.length) {
    await Promise.all(
      tarifasRollo.map(r =>
        tx.tarifaRollo.update({ where: { id: r.id }, data: { precio: r.precio } })
      )
    );
  }

  return tarifa;
});

return NextResponse.json(resultado);
```

---

## BUG-R3-06 🟠 PROBABLE

**Archivo:** `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js:53-54`

**Problema:** `gastosRepercutibles` y `totalBobinasEUR` se recalculan desde primitivos en lugar de leer los campos almacenados en BD, produciendo análisis de rentabilidad inconsistentes con los costes reales grabados por `actualizarPrecio*`.

```js
// ACTUAL — recalculado desde primitivos
const gastosRepercutibles = (importacion.suplidos || 0) + (importacion.exentos || 0);
const totalBobinasEUR     = (importacion.totalBobinasUSD || 0) * tc;

// actualizarPrecio* usa los campos almacenados:
actualizarPrecioMateriales(bobinas, importacion.totalBobinasEUR, importacion.gastosRepercutibles, tc)
```

**Escenario:** `gastosRepercutibles = 5000`, `suplidos = 3000`, `exentos = 1000`. El análisis usa 4000 €, pero los costes del catálogo se fijaron con 5000 €. Los márgenes del informe son erróneos.

**Corrección:**
```js
// FIX — leer campos almacenados
const gastosRepercutibles = importacion.gastosRepercutibles || 0;
const totalBobinasEUR     = importacion.totalBobinasEUR || 0;
```

---

## BUG-R3-07 🟠 PROBABLE

**Archivo:** `src/app/calculadora/metrajes/page.js:68`

**Problema:** `gastoFijo` de la `ReglaMargen` se suma **una vez por cada línea** añadida, en lugar de aplicarse una única vez al total del pedido.

```js
// ACTUAL — gastoFijo sumado por línea
const precioConMargen = precioBase * multiplicador + gastoFijo; // ← multiplicado N veces
```

**Escenario:** `ReglaMargen` con `gastoFijo: 80 €` (porte mínimo). El usuario añade 3 líneas. El total mostrado tiene 240 € de gastos fijos en lugar de 80 €. Presupuesto con 160 € de más.

**Corrección:**
```js
// page.js:68 — FIX: quitar gastoFijo del cálculo por línea
const precioConMargen = precioBase * multiplicador; // sin gastoFijo

// Y en el cálculo de totales, sumarlo una sola vez:
const totales = useMemo(() => {
  const base = lineas.reduce((acc, l) => ({
    precio: acc.precio + l.precio,
    peso: acc.peso + l.peso,
    metros: acc.metros + l.metros,
  }), { precio: 0, peso: 0, metros: 0 });

  const gastoFijo = selectedMargin?.gastoFijo ?? 0;
  return { ...base, precio: base.precio + gastoFijo };
}, [lineas, selectedMargin]);
```

---

## BUG-R3-08 🟡 POTENCIAL

**Archivos:** `src/app/api/importaciones/historico-bobinas/route.js` vs `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js`

**Problema:** Dos informes del mismo módulo muestran coste/metro distinto para la misma importación porque usan campos diferentes:

| Informe | `gastosRepercutibles` | `totalBobinasEUR` |
|---------|----------------------|-------------------|
| `historico-bobinas` | `imp.gastosRepercutibles` (campo almacenado) ✅ | `imp.totalBobinasEUR` (campo almacenado) ✅ |
| `analisis-rentabilidad` | `suplidos + exentos` (recalculado) ❌ | `totalBobinasUSD × tc` (recalculado) ❌ |

**Escenario:** Un usuario compara los dos informes y ve costes/metro distintos para el mismo contenedor. No hay explicación visible. Puede llevar a decisiones de precio incorrectas.

**Corrección:** Ya cubierta por BUG-R3-06. Al corregir `analisis-rentabilidad` para leer los campos almacenados, ambos informes quedan alineados.

---

## Archivos sin bugs relevantes encontrados

Los siguientes grupos se revisaron y no presentaron nuevos bugs funcionales (más allá de los ya corregidos en rondas anteriores):

- `src/app/api/pedidos/from-presupuesto/route.js` — solo el bug de validación de estado (BUG-R3-01)
- `src/app/api/stock-management/receive-order/route.js` — lógica correcta, incluye check de pedido existente
- `src/app/api/importaciones/[id]/bobinas/route.js` — correcto
- `src/app/api/logistica/calcular/route.js` — correcto
- `src/lib/sequence.js` — correcto
- `src/lib/validations.js` — schemas completos
- `src/componentes/calculadoras/CalculadoraBandas.js` — correcto
- `src/app/api/plantillas/route.js` y `[id]/route.js` — correctos (costoUnitario ya excluido)
- `src/app/api/pedidos/export/route.js` y `presupuestos/export/route.js` — correctos
- `src/app/api/dashboard/route.js` — correcto
- `src/app/api/tarifas-cliente/route.js` — correcto
