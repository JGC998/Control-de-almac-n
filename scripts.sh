#!/bin/bash

# Rutas de los archivos
PRODUCTOS_POST_API="prisma/api/productos/route.js"
PRODUCTOS_PUT_API="prisma/api/productos/[id]/route.js"
PRICING_CALCULATE_API="prisma/api/pricing/calculate/route.js"
SEEDED_SCRIPT="scripts/clean-seeder.js"


echo "--- 🛠️ Corrigiendo consultas de ReglaMargen en las APIs y lógica interna ---"

# --- FUNCIÓN DE CÁLCULO DE PRECIOS DE VENTA (Base) ---
CALCULATE_SALES_PRICES=$(cat <<'EOF_SALES_PRICES'
async function calculateSalesPrices(precioBase, margenes) {
    const prices = {};
    const salesRules = {
        'FABRICANTE': 'precioVentaFab',
        'INTERMEDIARIO': 'precioVentaInt',
        'CLIENTE FINAL': 'precioVentaFin',
    };

    for (const tier in salesRules) {
        const rule = margenes.find(m => m.tierCliente === tier);
        let finalPrice = precioBase;

        if (rule) {
            const multiplicador = rule.multiplicador || 1;
            const gastoFijo = rule.gastoFijo || 0;

            // Fórmula: (Precio Base * Multiplicador) + Gasto Fijo
            finalPrice = (precioBase * multiplicador) + gastoFijo;
        }

        prices[salesRules[tier]] = parseFloat(finalPrice.toFixed(2));
    }
    
    return prices;
}
EOF_SALES_PRICES
)

# --- FUNCIÓN BASE DE CÁLCULO DE COSTO DE MATERIA PRIMA ---
CALCULATE_BASE_COST=$(cat <<'EOF_BASE_COST'
async function calculateBaseCost(materialId, espesor, largo, ancho) {
    if (!materialId || !espesor || !largo || !ancho || largo <= 0 || ancho <= 0) {
        return { precioBase: 0, peso: 0, costo: 0 };
    }

    // 1. Obtener el nombre del material para buscar la tarifa
    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { nombre: true }
    });

    if (!material) {
        return { precioBase: 0, peso: 0, costo: 0 };
    }

    // 2. Buscar la TarifaMaterial
    const tarifa = await db.tarifaMaterial.findUnique({
        where: { 
            material_espesor: { 
                material: material.nombre,
                espesor: espesor
            }
        },
    });

    if (!tarifa || tarifa.precio <= 0) {
        return { precioBase: 0, peso: 0, costo: 0 };
    }

    // 3. Aplicar las fórmulas de cálculo (Dimensiones EN MILÍMETROS, conversión a M²)
    const largo_m = parseFloat(largo) / 1000;
    const ancho_m = parseFloat(ancho) / 1000;
    
    const areaM2 = largo_m * ancho_m; 
    
    const precioBase = areaM2 * tarifa.precio; // Precio Base (Costo de Materia Prima)
    const peso = areaM2 * tarifa.peso;     
    
    return { 
        precioBase: parseFloat(precioBase.toFixed(2)), 
        peso: parseFloat(peso.toFixed(2)),
        costo: 0, // Ignoramos el Costo Unitario manual
    };
}
EOF_BASE_COST
)

# --- MODIFICACIÓN 1: prisma/api/productos/route.js (POST API) ---
cat > $PRODUCTOS_POST_API <<PRODUCTOS_POST_API_EOF
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

${CALCULATE_SALES_PRICES}

${CALCULATE_BASE_COST}

// GET /api/productos - Obtiene todos los productos
export async function GET(request) {
// ... (GET sin cambios)
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clientId');

    const whereClause = {};
    if (clienteId) {
      whereClause.clienteId = clienteId; 
    }

    const productos = await db.producto.findMany({
      where: whereClause,
      include: {
        fabricante: true,
        material: true,
        cliente: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/productos - Crea un nuevo producto
export async function POST(request) {
  try {
    const data = await request.json();
    
    // 1. Buscar Fabricante, Material y Márgenes
    const [fabricante, material, margenes] = await db.$transaction([
      db.fabricante.findUnique({ where: { nombre: data.fabricante } }),
      db.material.findUnique({ where: { nombre: data.material } }),
      db.reglaMargen.findMany(), // <--- CORRECCIÓN: Quitamos el WHERE restrictivo
    ]);

    if (!fabricante) {
      return NextResponse.json({ message: \`Fabricante "\${data.fabricante}" no encontrado.\` }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ message: \`Material "\${data.material}" no encontrado.\` }, { status: 400 });
    }
    
    // 2. Calcular Precio Base y Peso Unitario
    const { precioBase: calculatedPrecioBase, peso: calculatedPeso } = await calculateBaseCost(
        material.id, 
        parseFloat(data.espesor), 
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );
    
    // 3. Calcular Precios de Venta por Tier
    const calculatedSalesPrices = await calculateSalesPrices(calculatedPrecioBase, margenes);


    // 4. Generar el nombre del producto: (Referencia fabricante + Material + Fabricante)
    const newNombre = \`\${data.modelo} - \${material.nombre} - \${fabricante.nombre}\`;


    const nuevoProducto = await db.producto.create({
      data: {
        nombre: newNombre, 
        referenciaFabricante: data.modelo,
        espesor: parseFloat(data.espesor) || 0,
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        
        precioUnitario: calculatedPrecioBase, // <-- Precio Base (Costo Materia Prima)
        precioVentaFab: calculatedSalesPrices.precioVentaFab,
        precioVentaInt: calculatedSalesPrices.precioVentaInt,
        precioVentaFin: calculatedSalesPrices.precioVentaFin,

        pesoUnitario: calculatedPeso || 0, 
        costoUnitario: 0, // Lo eliminamos conceptualmente (guardamos 0)
        fabricanteId: fabricante.id, 
        materialId: material.id,
        clienteId: data.clienteId || null,
        tieneTroquel: data.tieneTroquel || false,
      },
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}
PRODUCTOS_POST_API_EOF
echo "✅ Modificación 1 (POST API) aplicada."

# --- MODIFICACIÓN 2: prisma/api/productos/[id]/route.js (PUT API) ---
cat > $PRODUCTOS_PUT_API <<PRODUCTOS_PUT_API_EOF
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

${CALCULATE_SALES_PRICES}

${CALCULATE_BASE_COST}

// GET /api/productos/[id] - Obtiene un producto por su ID
// ... (GET sin cambios)
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    const producto = await db.producto.findUnique({
      where: { id: id },
      include: {
        fabricante: true,
        material: true,
        cliente: true,
      },
    });

    if (!producto) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(producto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT /api/productos/[id] - Actualiza un producto
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    const data = await request.json();

    // 1. Buscar Fabricante, Material y Márgenes
    const [fabricante, material, margenes] = await db.$transaction([
      db.fabricante.findUnique({ where: { nombre: data.fabricante } }),
      db.material.findUnique({ where: { nombre: data.material } }),
      db.reglaMargen.findMany(), // <--- CORRECCIÓN: Quitamos el WHERE restrictivo
    ]);

    if (!fabricante) {
      return NextResponse.json({ message: \`Fabricante "\${data.fabricante}" no encontrado.\` }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ message: \`Material "\${data.material}" no encontrado.\` }, { status: 400 });
    }
    
    // 2. Calcular Precio Base y Peso Unitario
    const { precioBase: calculatedPrecioBase, peso: calculatedPeso } = await calculateBaseCost(
        material.id, 
        parseFloat(data.espesor), 
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );
    
    // 3. Calcular Precios de Venta por Tier
    const calculatedSalesPrices = await calculateSalesPrices(calculatedPrecioBase, margenes);
    
    // 4. Generar el nombre del producto: (Referencia fabricante + Material + Fabricante)
    const newNombre = \`\${data.modelo} - \${material.nombre} - \${fabricante.nombre}\`;


    // Prepara los datos para la actualización
    const updateData = {
        nombre: newNombre, 
        referenciaFabricante: data.modelo, 
        espesor: parseFloat(data.espesor) || 0,
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        
        precioUnitario: calculatedPrecioBase, // <-- Precio Base (Costo Materia Prima)
        precioVentaFab: calculatedSalesPrices.precioVentaFab,
        precioVentaInt: calculatedSalesPrices.precioVentaInt,
        precioVentaFin: calculatedSalesPrices.precioVentaFin,

        pesoUnitario: calculatedPeso || 0, 
        costoUnitario: 0, // Lo eliminamos conceptualmente (guardamos 0)
        fabricanteId: fabricante.id,
        materialId: material.id,
        clienteId: data.clienteId || null,
        tieneTroquel: data.tieneTroquel || false,
    };


    const updatedProducto = await db.producto.update({
      where: { id: id },
      data: updateData,
    });
    
    return NextResponse.json(updatedProducto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE /api/productos/[id] - Elimina un producto
export async function DELETE(request, { params: paramsPromise }) {
// ... (DELETE sin cambios)
  try {
    const { id } = await paramsPromise; 
    await db.producto.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Producto eliminado' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    // Error de clave foránea (si el producto está en un pedido)
    if (error.code === 'P2003' || error.code === 'P2014') {
      return NextResponse.json({ message: 'Error: El producto está siendo usado en pedidos o presupuestos y no se puede eliminar.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al eliminar producto' }, { status: 500 });
  }
}
PRODUCTOS_PUT_API_EOF
echo "✅ Modificación 2 (PUT API) aplicada."

# --- MODIFICACIÓN 3: prisma/api/pricing/calculate/route.js (Lógica de Margen) ---
cat > $PRICING_CALCULATE_API <<'PRICING_CALCULATE_API_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/pricing/calculate
export async function POST(request) {
  try {
    const { items, clienteId, tierMargenOverride } = await request.json(); 

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Se requiere un array de "items"' }, { status: 400 });
    }

    // Definir mapeo de Tier a campo de precio pre-calculado
    const tierToPriceField = {
        'FABRICANTE': 'precioVentaFab',
        'INTERMEDIARIO': 'precioVentaInt',
        'CLIENTE FINAL': 'precioVentaFin',
    };

    // 1. Obtener datos de la DB
    // CORRECCIÓN: Cargamos los margenes para que el filtro por Tier de cliente siga funcionando
    const [cliente, descuentos, preciosEspeciales] = await db.$transaction([
      db.cliente.findUnique({ where: { id: clienteId } }),
      db.reglaDescuento.findMany({ include: { tiers: true } }),
      db.precioEspecial.findMany({ where: { clienteId: clienteId } }),
    ]);

    const preciosEspecialesMap = new Map(preciosEspeciales.map(p => [p.productoId, p.precio]));
    const descuentosMap = new Map(descuentos.map(d => [d.tipo === 'cliente' ? d.tierCliente : d.tipo, d]));

    const calculatedItems = [];

    // 2. Procesar cada item
    for (const item of items) {
      if (!item.productId) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0 });
        continue;
      }
      
      // Incluir los campos de precios pre-calculados en la búsqueda del producto
      const producto = await db.producto.findUnique({ 
        where: { id: item.productId },
        select: { 
            id: true, 
            precioUnitario: true, // Precio Base de materia prima
            precioVentaFab: true,
            precioVentaInt: true,
            precioVentaFin: true,
            material: { select: { nombre: true } }
        } 
      }); 

      if (!producto) {
        calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, error: 'Producto no encontrado' });
        continue;
      }

      let precioFinal = producto.precioUnitario; // Por defecto: Precio Base de materia prima

      // --- LÓGICA DE PRECIOS V7 (Lectura de Precio Pre-calculado) ---
      
      // 1. Aplicar Precio Especial (Máxima prioridad)
      const precioEspecial = preciosEspecialesMap.get(producto.id);
      if (precioEspecial) {
        precioFinal = precioEspecial;
      } else {
        // 2. Leer el precio pre-calculado basado en el Tier seleccionado
        const targetTier = tierMargenOverride || cliente?.tier;
        const priceField = tierToPriceField[targetTier];

        if (priceField && producto[priceField]) {
            // USAMOS EL PRECIO PRE-CALCULADO DEL CAMPO CORRESPONDIENTE
            precioFinal = producto[priceField];
        } 
        // Si no hay tier o el tier no existe, precioFinal se mantiene en precioUnitario (Precio Base)

        // 3. Lógica de Descuentos (se aplica SOBRE el precioFinal)
        let descuentoAplicado = 0;

        // Descuento por cliente (Tier)
        if (cliente?.tier) {
            const descuentoCliente = descuentosMap.get(cliente.tier)?.descuento || 0;
            if (descuentoCliente > descuentoAplicado) {
                descuentoAplicado = descuentoCliente;
            }
        }
        
        // Descuento por volumen 
        const descuentoVolumen = descuentosMap.get('volumen');
        if (descuentoVolumen?.tiers) {
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
PRICING_CALCULATE_API_EOF
echo "✅ Modificación 3 (Pricing API) aplicada: Lógica de consumo simplificada."

echo "--- 🎉 ¡CORRECCIONES APLICADAS! ---"
echo "--- ⚠️ PASO CRUCIAL PARA SOLUCIONAR EL N/A: ---"
echo "1. Ejecuta el seeder para que los productos se re-calculen y los márgenes se carguen:"
echo "   \$ node scripts/clean-seeder.js"
echo "2. Reinicia tu servidor Next.js."