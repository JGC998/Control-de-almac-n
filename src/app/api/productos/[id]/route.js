import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    
    // 2. Calcular Costo Unitario, Peso Unitario y Precio Unitario
    const { 
        costo: calculatedCosto, 
        peso: calculatedPeso,
        precio: calculatedPrecio 
    } = await calculateCostAndWeight(
        material.id, // Usar ID de Material
        parseFloat(data.espesor), 
        // PASAMOS MM
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );
    
    // 3. Generar el nombre del producto: (Referencia fabricante + Material + Fabricante)
    const newNombre = `${data.modelo} - ${material.nombre} - ${fabricante.nombre}`;


    // Prepara los datos para la actualización
    const updateData = {
        nombre: newNombre, 
        referenciaFabricante: data.modelo, 
        espesor: parseFloat(data.espesor) || 0,
        // GUARDAMOS MM
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        // Usar los valores calculados
        precioUnitario: calculatedPrecio || 0, 
        pesoUnitario: calculatedPeso || 0, 
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
