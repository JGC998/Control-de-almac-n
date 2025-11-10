import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función central de cálculo (replicada para el PUT)
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


// GET /api/productos/[id] - Obtiene un producto por su ID
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

    // Prepara los datos para la actualización
    const updateData = {
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
