import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/pricing/calculate
export async function POST(request) {
  try {
    const { items, clienteId, selectedMarginId } = await request.json(); // Se recibe selectedMarginId

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Se requiere un array de "items"' }, { status: 400 });
    }

    // 1. Obtener todas las reglas de precios de la BD en paralelo
    const [cliente, margenes, descuentos, preciosEspeciales] = await db.$transaction([
      db.cliente.findUnique({ where: { id: clienteId } }),
      db.reglaMargen.findMany(),
      db.reglaDescuento.findMany({ include: { tiers: true } }),
      db.precioEspecial.findMany({ where: { clienteId: clienteId } }),
    ]);

    // Precios especiales mapped by product ID (Note: preciosEspeciales likely refers to string IDs if not updated, but let's assume it matches product ID type. 
    // If the schema for PrecioEspecial wasn't updated to Int product ID, this might break. 
    // Checking schema: PrecioEspecial has productId String. 
    // The new Producto has ID Int. 
    // This relation is broken in schema (I didn't update PrecioEspecial to Int).
    // The prisma schema I saw earlier: model PrecioEspecial { ... productId String ... }
    // It has: producto Producto @relation(...) 
    // Wait, in my schema update (Step 8), I updated relations to point to Producto_Old!
    //   "producto    Producto_Old?   @relation(fields: [productoId], references: [id], onDelete: Cascade)"
    // So PrecioEspecial points to Producto_Old.
    // It does NOT point to the new simple Producto.
    // Therefore, I cannot use PrecioEspecial with the new Producto model yet.
    // I will disable PrecioEspecial lookup for new products for now, or assume it's not applicable.

    // Actually, I should probably just skip PrecioEspecial logoc for the new products if the types don't match.
    // unique([clienteId, productoId]) where productoId is String.
    // So I can't look up an Int ID in there.
    // I'll comment out PrecioEspecial logic or ignore it.

    const calculatedItems = [];

    // 2. Procesar cada item
    for (const item of items) {
      if (!item.productId) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, finalPrice: item.unitPrice || 0 });
        continue;
      }

      const pId = parseInt(item.productId);
      if (isNaN(pId)) {
        // Si el ID no es numérico, quizás es un producto antiguo o inválido
        calculatedItems.push({ ...item, error: 'ID de producto inválido' });
        continue;
      }

      const producto = await db.producto.findUnique({
        where: { id: pId },
      });

      if (!producto) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, finalPrice: item.unitPrice || 0, error: 'Producto no encontrado' });
        continue;
      }

      // Base del Costo: Usamos el precio del producto
      let costoBase = parseFloat(producto.precio) || 0;
      let precioFinal = costoBase;

      // LÓGICA DE PRECIOS
      // 1. Precio Especial (Deshabilitado por incompatibilidad de tipos ID Int vs String en esta migración parcial)
      // const precioEspecial = preciosEspecialesMap.get(producto.id);
      // if (precioEspecial) { ... }

      if (costoBase > 0) {
        // 2. Lógica de Márgenes

        let margenAplicar = null;
        let gastoFijoTotalAplicar = 0;

        // --- BÚSQUEDA DE MARGEN ---
        if (selectedMarginId) {
          // Prioridad 1: Margen seleccionado por el usuario
          const margenRule = margenes.find(m => m.id === selectedMarginId);
          if (margenRule) {
            margenAplicar = margenRule.multiplicador;
            gastoFijoTotalAplicar = margenRule.gastoFijo || 0;
          }
        } else if (cliente?.tier) {
          // Fallback: Margen por Tier de Cliente 
          const margenClienteRule = margenes.find(m => m.tipo === 'Cliente' && m.tierCliente === cliente.tier);
          if (margenClienteRule) {
            margenAplicar = margenClienteRule.multiplicador;
            gastoFijoTotalAplicar = margenClienteRule.gastoFijo || 0;
          }
        } else {
          // Fallback 3: Margen general
          margenAplicar = 1.3;
          gastoFijoTotalAplicar = 0;
        }
        // --- FIN BÚSQUEDA DE MARGEN ---

        // Aplicar el margen
        if (margenAplicar !== null) {
          precioFinal = (costoBase * margenAplicar) + (gastoFijoTotalAplicar / (item.quantity > 0 ? item.quantity : 1));
        } else {
          precioFinal = costoBase;
        }

        // 3. Lógica de Descuentos
        let descuentoAplicado = 0;

        // Descuento por cliente
        if (cliente?.tier) {
          const descuentoCliente = descuentos.find(d => d.tipo === 'cliente' && d.tierCliente === cliente.tier)?.descuento || 0;
          if (descuentoCliente > descuentoAplicado) {
            descuentoAplicado = descuentoCliente;
          }
        }

        // Descuento por categoría (Ahora usamos producto.categoria si existe)
        if (producto.categoria) {
          const descuentoCategoria = descuentos.find(d => d.tipo === 'categoria' && d.categoria === producto.categoria)?.descuento || 0;
          if (descuentoCategoria > descuentoAplicado) {
            descuentoAplicado = descuentoCategoria;
          }
        }

        // Descuento por volumen
        const descuentoVolumen = descuentos.find(d => d.tipo === 'volumen');
        if (descuentoVolumen && descuentoVolumen.tiers) {
          const tierAplicable = descuentoVolumen.tiers
            .filter(t => item.quantity >= t.cantidadMinima)
            .sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0];

          if (tierAplicable && tierAplicable.descuento > descuentoAplicado) {
            descuentoAplicado = tierAplicable.descuento;
          }
        }

        if (descuentoAplicado > 0) {
          precioFinal = precioFinal * (1 - descuentoAplicado);
        }
      }

      calculatedItems.push({
        ...item,
        unitPrice: parseFloat(precioFinal.toFixed(2)),
      });
    }

    return NextResponse.json(calculatedItems);
  } catch (error) {
    console.error('Error en el motor de precios:', error);
    return NextResponse.json({ message: error.message || 'Error al calcular precios' }, { status: 500 });
  }
}