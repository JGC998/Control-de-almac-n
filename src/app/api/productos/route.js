import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función central de cálculo (Ahora usa materialId para la búsqueda)
async function calculateCostAndWeight(materialId, espesor, largo, ancho) {
    if (!materialId || !espesor || !largo || !ancho || largo <= 0 || ancho <= 0) {
        return { costo: 0, peso: 0 };
    }

    // 1. Obtener el nombre del material para buscar la tarifa
    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { nombre: true }
    });

    if (!material) {
        return { costo: 0, peso: 0 };
    }

    // 2. Buscar la TarifaMaterial usando el ID del material (clave única compuesta)
    const tarifa = await db.tarifaMaterial.findUnique({
        where: { 
            materialId_espesor: { 
                materialId: materialId,
                espesor: espesor
            }
        },
    });

    if (!tarifa || tarifa.precio <= 0) {
        return { costo: 0, peso: 0 };
    }

    // 3. Aplicar las fórmulas de cálculo (Ancho y Largo están en mm)
    const areaM2 = (ancho / 1000) * (largo / 1000);
    const costo = areaM2 * tarifa.precio; // Costo = Área * Precio Tarifa (€/m²)
    const peso = areaM2 * tarifa.peso;     // Peso = Área * Peso Tarifa (kg/m²)

    return { costo: parseFloat(costo.toFixed(2)), peso: parseFloat(peso.toFixed(2)) };
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

// POST /api/productos - Crea un nuevo producto
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
    
    // 2. Calcular Costo Unitario y Peso Unitario
    const { costo: calculatedCosto, peso: calculatedPeso } = await calculateCostAndWeight(
        material.id, // Usar ID de Material
        parseFloat(data.espesor), 
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );

    const nuevoProducto = await db.producto.create({
      data: {
        nombre: data.nombre,
        referenciaFabricante: data.modelo,
        espesor: parseFloat(data.espesor) || 0,
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        precioUnitario: parseFloat(data.precioUnitario),
        pesoUnitario: calculatedPeso, 
        costoUnitario: calculatedCosto, 
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
