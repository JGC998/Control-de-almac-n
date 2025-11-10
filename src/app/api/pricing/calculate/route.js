import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/pricing/calculate
export async function POST(request) {
  try {
    const { items, clienteId } = await request.json();

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

    const preciosEspecialesMap = new Map(preciosEspeciales.map(p => [p.productoId, p.precio]));

    const calculatedItems = [];

    // 2. Procesar cada item
    for (const item of items) {
      if (!item.productId) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, finalPrice: item.unitPrice || 0 });
        continue;
      }
      
      const producto = await db.producto.findUnique({ 
        where: { id: item.productId },
        include: { material: true } 
      }); 

      if (!producto) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, finalPrice: item.unitPrice || 0, error: 'Producto no encontrado' });
        continue;
      }

      let precioFinal = producto.precioUnitario; // Precio base del catálogo

      // LÓGICA DE PRECIOS
      // 1. Precio Especial (Máxima prioridad)
      const precioEspecial = preciosEspecialesMap.get(producto.id);
      if (precioEspecial) {
        precioFinal = precioEspecial;
      } else {
        // 2. Lógica de Márgenes (si el costo está definido)
        if (producto.costoUnitario && producto.costoUnitario > 0) { // 'costoUnitario' es el campo correcto en el modelo Producto
            
            let margenAplicar = 1.3; // Margen por defecto (30%)

            // Prioridad 1: Margen por Tier de Cliente (NUEVA LÓGICA)
            if (cliente?.tier) {
                // Buscamos una regla de tipo 'Cliente' que coincida con el tier
                const margenClienteTier = margenes.find(m => m.tipo === 'Cliente' && m.tierCliente === cliente.tier)?.valor;
                if (margenClienteTier) {
                    margenAplicar = margenClienteTier;
                }
            }
            
            // Si no se aplicó un margen por Tier de Cliente, miramos Categoría y General
            if (margenAplicar === 1.3) {
              // Prioridad 2: Margen por Categoría
              const margenCategoria = margenes.find(m => m.tipo === 'Categoria' && m.categoria === producto.material?.nombre)?.valor;
              if (margenCategoria) {
                  margenAplicar = margenCategoria;
              }

              // Prioridad 3: Margen General
              const margenGeneral = margenes.find(m => m.tipo === 'General')?.valor;
              if (margenGeneral && margenAplicar === 1.3) { // Solo si aún usa el valor por defecto
                  margenAplicar = margenGeneral;
              }
            }
            
            // Aplicar el mejor margen encontrado
            precioFinal = producto.costoUnitario * margenAplicar;
        }
        // Si no hay costo, el precioFinal sigue siendo el 'precioUnitario' base

        // 3. Lógica de Descuentos (se aplica SOBRE el precioFinal calculado arriba)
        let descuentoAplicado = 0;

        // Descuento por cliente (Tier)
        if (cliente?.tier) {
            const descuentoCliente = descuentos.find(d => d.tipo === 'cliente' && d.tierCliente === cliente.tier)?.descuento || 0;
            if (descuentoCliente > descuentoAplicado) {
                descuentoAplicado = descuentoCliente;
            }
        }
        
        // Descuento por categoría
        if (producto.material?.nombre) {
            const descuentoCategoria = descuentos.find(d => d.tipo === 'categoria' && d.categoria === producto.material.nombre)?.descuento || 0;
            if (descuentoCategoria > descuentoAplicado) {
                descuentoAplicado = descuentoCategoria;
            }
        }

        // Descuento por volumen
        const descuentoVolumen = descuentos.find(d => d.tipo === 'volumen');
        if (descuentoVolumen && descuentoVolumen.tiers) {
            const tierAplicable = descuentoVolumen.tiers
                .filter(t => item.quantity >= t.cantidadMinima)
                .sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0]; // Obtener el tier más alto
                
            if (tierAplicable && tierAplicable.descuento > descuentoAplicado) {
                descuentoAplicado = tierAplicable.descuento;
            }
        }

        // Aplicar el mejor descuento encontrado
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
    return NextResponse.json({ message: 'Error al calcular precios' }, { status: 500 });
  }
}
