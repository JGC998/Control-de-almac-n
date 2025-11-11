import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

      // Base del Costo: Usamos el precioUnitario del producto (costo por pieza calculada desde tarifas/m²)
      let costoBase = producto.precioUnitario || 0; 
      let precioFinal = costoBase; 

      // LÓGICA DE PRECIOS
      // 1. Precio Especial (Máxima prioridad)
      const precioEspecial = preciosEspecialesMap.get(producto.id);
      if (precioEspecial) {
        precioFinal = precioEspecial;
      } else if (costoBase > 0) {
        // 2. Lógica de Márgenes (MODIFICADA: APLICA EL MARGEN SELECCIONADO POR EL USUARIO)
        
        let margenAplicar = null;
        let gastoFijoTotalAplicar = 0; 
        
        // --- BÚSQUEDA DE MARGEN ---
        if (selectedMarginId) {
             // Prioridad 1: Margen seleccionado por el usuario (siempre debe ser el que se usa)
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
             // Fallback 3: Margen general si no se encuentra nada
             margenAplicar = 1.3;
             gastoFijoTotalAplicar = 0;
        }
        // --- FIN BÚSQUEDA DE MARGEN ---

        // Aplicar el margen
        if (margenAplicar !== null) {
            
            // 1. Aplicar el multiplicador
            precioFinal = costoBase * margenAplicar;
            
            // 2. Diluir el gasto fijo por unidad
            const unidades = item.quantity > 0 ? item.quantity : 1; // Usar la cantidad del ítem
            const gastoFijoUnitario = gastoFijoTotalAplicar / unidades;
            
            // 3. Sumar el gasto fijo unitario
            precioFinal += gastoFijoUnitario;

        } else {
            precioFinal = costoBase;
        }
        
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
                .sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0]; 
                
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
    return NextResponse.json({ message: error.message || 'Error al calcular precios' }, { status: 500 });
  }
}