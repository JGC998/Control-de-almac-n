import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Función central de cálculo (Ahora calcula precio y asume dimensiones en milímetros)
async function calculateCostAndWeight(materialId, espesor, largo, ancho) {
    if (!materialId || !espesor || !largo || !ancho || largo <= 0 || ancho <= 0) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 1. Obtener el nombre del material para buscar la tarifa
    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { nombre: true }
    });

    if (!material) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 2. Buscar la TarifaMaterial usando el nombre del material
    const tarifa = await db.tarifaMaterial.findUnique({
        where: { 
            material_espesor: { 
                material: material.nombre,
                espesor: espesor
            }
        },
    });

    if (!tarifa || tarifa.precio <= 0) {
        return { costo: 0, peso: 0, precio: 0 };
    }

    // 3. Aplicar las fórmulas de cálculo (Dimensiones EN MILÍMETROS, conversión a M²)
    const largo_m = parseFloat(largo) / 1000;
    const ancho_m = parseFloat(ancho) / 1000;
    
    // Área M2 = Largo(m) * Ancho(m)
    const areaM2 = largo_m * ancho_m; 
    
    const costo = areaM2 * tarifa.precio; 
    const peso = areaM2 * tarifa.peso;     
    const precio = costo; // Precio Unitario base (sin margen)

    return { 
        costo: parseFloat(costo.toFixed(2)), 
        peso: parseFloat(peso.toFixed(2)),
        precio: parseFloat(precio.toFixed(2))
    };
}


// Función auxiliar para aplicar reglas de margen pre-calculadas (REUTILIZADA DE PUT)
async function calculateTieredPrices(costoBase) {
    const margenes = await db.reglaMargen.findMany();
    
    const applyMargin = (costo, tier) => {
        const regla = margenes.find(m => m.tierCliente === tier);
        if (!regla) return null;
        
        const multiplicador = regla.multiplicador || 1;
        const gastoFijo = regla.gastoFijo || 0;
        
        return (costo * multiplicador) + gastoFijo;
    };

    return {
        precioVentaFab: applyMargin(costoBase, 'FABRICANTE'),
        precioVentaInt: applyMargin(costoBase, 'INTERMEDIARIO'),
        precioVentaFin: applyMargin(costoBase, 'CLIENTE FINAL'),
    };
}


// GET /api/productos - Obtiene todos los productos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

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

// POST /api/productos - Crea un nuevo producto (AÑADIDA LÓGICA DE PRECIOS)
export async function POST(request) {
  try {
    const data = await request.json();
    
    // 1. Buscar IDs de Fabricante y Material
    const fabricante = await db.fabricante.findUnique({
      where: { nombre: data.fabricante },
    });
    const material = await db.material.findUnique({
      where: { nombre: data.material },
    });

    if (!fabricante) {
      return NextResponse.json({ message: `Fabricante "${data.fabricante}" no encontrado.` }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ message: `Material "${data.material}" no encontrado.` }, { status: 400 });
    }
    
    // 2. Calcular Costo Unitario, Peso Unitario y Precio Unitario
    const { costo: calculatedCosto, peso: calculatedPeso, precio: calculatedPrecio } = await calculateCostAndWeight(
        material.id, 
        parseFloat(data.espesor), 
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );
    
    // 3. CALCULAR PRECIOS DE VENTA POR TIER
    const { precioVentaFab, precioVentaInt, precioVentaFin } = await calculateTieredPrices(calculatedPrecio);


    // 4. Generar el nombre del producto
    const newNombre = `${data.modelo} - ${material.nombre} - ${fabricante.nombre}`;


    const nuevoProducto = await db.producto.create({
      data: {
        nombre: newNombre, 
        referenciaFabricante: data.modelo,
        espesor: parseFloat(data.espesor) || 0,
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        precioUnitario: calculatedPrecio || 0, 
        pesoUnitario: calculatedPeso || 0, 
        costoUnitario: calculatedCosto, 
        fabricanteId: fabricante.id, 
        materialId: material.id,
        clienteId: data.clienteId || null,
        tieneTroquel: data.tieneTroquel || false,
        // AÑADIDO: Guardar los precios de venta
        precioVentaFab: precioVentaFab,
        precioVentaInt: precioVentaInt,
        precioVentaFin: precioVentaFin,
      },
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}