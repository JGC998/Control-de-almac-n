import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { getMargenes } from '@/lib/config-cache';

export const dynamic = 'force-dynamic';

// POST /api/pricing/calculate
export async function POST(request) {
  try {
    const { items, clienteId, selectedMarginId } = await request.json(); // Se recibe selectedMarginId

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Se requiere un array de "items"' }, { status: 400 });
    }

    // 1. Obtener reglas de precios y cliente en paralelo
    const [cliente, margenes] = await Promise.all([
      clienteId ? db.cliente.findUnique({ where: { id: clienteId }, select: { id: true, tier: true } }) : Promise.resolve(null),
      getMargenes(),
    ]);

    // 2. Cargar todos los productos necesarios en una sola query (evita N+1)
    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    const productosMap = new Map();
    if (productIds.length > 0) {
      const productos = await db.producto.findMany({
        where: { id: { in: productIds } },
        select: { id: true, precioUnitario: true },
      });
      for (const p of productos) productosMap.set(p.id, p);
    }

    const calculatedItems = [];

    // Total de unidades de todos los ítems para repartir gastoFijo proporcionalmente
    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) > 0 ? Number(i.quantity) : 1), 0);

    // 3. Procesar cada item
    for (const item of items) {
      if (!item.productId) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, finalPrice: item.unitPrice || 0 });
        continue;
      }

      const producto = productosMap.get(item.productId);

      if (!producto) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, finalPrice: item.unitPrice || 0 });
        continue;
      }

      const costoBase = parseFloat(producto.precioUnitario) || 0;
      let precioFinal = costoBase;

      if (costoBase > 0) {
        let margenAplicar = null;
        let gastoFijoTotalAplicar = 0;

        if (selectedMarginId) {
          const margenRule = margenes.find(m => m.id === selectedMarginId);
          if (margenRule) {
            margenAplicar = margenRule.multiplicador;
            gastoFijoTotalAplicar = margenRule.gastoFijo || 0;
          }
        } else if (cliente?.tier) {
          const margenClienteRule = margenes.find(m => m.tipo === 'Cliente' && m.tierCliente === cliente.tier);
          if (margenClienteRule) {
            margenAplicar = margenClienteRule.multiplicador;
            gastoFijoTotalAplicar = margenClienteRule.gastoFijo || 0;
          }
        } else {
          margenAplicar = 1.0;
        }

        if (margenAplicar !== null) {
          precioFinal = (costoBase * margenAplicar) + (gastoFijoTotalAplicar / totalQty);
        }
      }

      calculatedItems.push({
        ...item,
        unitPrice: parseFloat(precioFinal.toFixed(2)),
      });
    }

    return NextResponse.json(calculatedItems);
  } catch (error) {
    logApiError(error, 'Error en el motor de precios:');
    return NextResponse.json({ message: "Error al calcular precios" }, { status: 500 });
  }
}