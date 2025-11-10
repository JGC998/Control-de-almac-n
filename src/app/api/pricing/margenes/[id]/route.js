import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/pricing/margenes/[id] - Actualiza una regla de margen
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    let tipo = data.tipo?.trim() || 'General';
    const valorFloat = parseFloat(data.valor);
    const gastoFijoFloat = parseFloat(data.gastoFijo) || 0;
    
    let categoria = data.categoria?.trim() || null;
    
    // LÓGICA DE CORRECCIÓN para la edición
    if (tipo.toUpperCase() !== 'GENERAL' && tipo.toUpperCase() !== 'CATEGORIA' && tipo.toUpperCase() !== 'CLIENTE') {
         categoria = tipo; // Mover el valor del campo 'tipo' a 'categoria'
         tipo = 'Categoria'; // Establecer el tipo real como 'Categoria'
    }
    
    // Usamos las CLAVES DE LA BASE DE DATOS
    const updateData = {
      descripcion: data.descripcion?.trim(),
      tipo: tipo,
      
      multiplicador: valorFloat, 
      
      gastoFijo: gastoFijoFloat,
      tipo_categoria: categoria, 
      base: data.base?.trim() || null, 
    };
    
    const updatedRegla = await db.reglaMargen.update({
      where: { id: id },
      data: updateData,
    });
    return NextResponse.json(updatedRegla);
  } catch (error) {
    console.error('Error al actualizar margen:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Regla no encontrada' }, { status: 404 });
    }
    if (error.code) {
        return NextResponse.json({ message: `Error de BD (${error.code}): ${error.meta?.target || error.message}` }, { status: 500 });
    }
    return NextResponse.json({ message: error.message || 'Error al actualizar margen' }, { status: 500 });
  }
}

// DELETE /api/pricing/margenes/[id] - Elimina una regla de margen
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await db.reglaMargen.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Regla eliminada' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar margen:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Regla no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar margen' }, { status: 500 });
  }
}
