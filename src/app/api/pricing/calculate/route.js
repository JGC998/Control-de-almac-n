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
      db.reglaMargen.findMany(), // Obtener todas las reglas de margen
      db.reglaDescuento.findMany({ include: { tiers: true } }),
      db.precioEspecial.findMany({ where: { clienteId: clienteId } }),
    ]);

    // --- LÓGICA DE MARGEN POR TIER (Fijo + Porcentaje) ---
    
    // Mapeo del Tier del Cliente a la Base de Margen
    let marginBaseKey = 'FABRICANTE'; // Valor por defecto (margen más bajo)

    if (cliente?.tier === 'GOLD') {
        marginBaseKey = 'CLIENTE_FINAL'; // Mayor precio
    } else if (cliente?.tier === 'SILVER') {
        marginBaseKey = 'INTERMEDIARIO'; // Precio medio
    } else { // Incluye 'NORMAL' y otros
        marginBaseKey = 'FABRICANTE'; 
    }

    const applicableMargin = margenes.find(m => m.base === marginBaseKey);

    // Valores por defecto si la regla no existe en la base de datos
    const DEFAULT_MULTIPLIER = 1.3; 
    const DEFAULT_GASTO_FIJO = 0;
    
    // Si no se encuentra la regla, usar los valores por defecto
    const MARGIN_MULTIPLIER = applicableMargin?.multiplicador || DEFAULT_MULTIPLIER;
    const MARGIN_GASTO_FIJO = applicableMargin?.gastoFijo || DEFAULT_GASTO_FIJO;
    
    // --- FIN LÓGICA DE MARGEN ---

    const preciosEspecialesMap = new Map(preciosEspeciales.map(p => [p.productoId, p.precio]));

    const calculatedItems = [];

    // 2. Procesar cada item
    for (const item of items) {
      if (!item.productId) {
        // Para items manuales, usa el precio provisto por el usuario
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0 });
        continue;
      }
      
      // Obtener el producto, incluyendo el costo unitario
      const producto = await db.producto.findUnique({ where: { id: item.productId } });
      if (!producto) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, error: 'Producto no encontrado' });
        continue;
      }

      let precioFinal = producto.precioUnitario; // Precio base del catálogo
      let baseCost = producto.costoUnitario; 

      // 1. Precio Especial (Máxima prioridad)
      const precioEspecial = preciosEspecialesMap.get(producto.id);
      if (precioEspecial) {
        precioFinal = precioEspecial;
      } else {
        
        // 2. Lógica de Márgenes (Solo si el costo unitario está definido)
        if (baseCost && baseCost > 0) {
            // Aplicar Nueva Fórmula de Margen: (Costo * Multiplicador) + Gasto Fijo
            precioFinal = (baseCost * MARGIN_MULTIPLIER) + MARGIN_GASTO_FIJO;
        } 
        // Si no hay costo, precioFinal sigue siendo el 'precioUnitario' base
        
        // 3. Lógica de Descuentos (Aplica sobre el precio resultante del margen)
        let descuentoAplicado = 0;

        // Se deben revisar todos los tipos de descuento y aplicar el mejor (el mayor 'descuentoAplicado')
        
        // Descuento por cliente (Tier)
        const descuentoCliente = descuentos.find(d => d.tipo === 'cliente' && d.tierCliente === cliente?.tier)?.descuento || 0;
        if (descuentoCliente > descuentoAplicado) {
             descuentoAplicado = descuentoCliente;
        }
        
        // Descuento por categoría (asumiendo que materialId es la categoría)
        const descuentoCategoria = descuentos.find(d => d.tipo === 'categoria' && d.categoria === producto.materialId)?.descuento || 0;
        if (descuentoCategoria > descuentoAplicado) {
             descuentoAplicado = descuentoCategoria;
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
    return NextResponse.json({ message: 'Error al calcular precios' }, { status: 500 });
  }
}
