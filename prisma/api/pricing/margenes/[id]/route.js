import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/pricing/margenes/[id] - Actualiza una regla de margen
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { descripcion, tipo, valor, categoria, tierCliente } = data; // Añadido tierCliente

    const parsedValor = parseFloat(valor);

    // Validación de datos
    if (!descripcion || !tipo || isNaN(parsedValor) || parsedValor <= 0) {
      return NextResponse.json(
        { message: 'Datos de margen incompletos o inválidos.' }, 
        { status: 400 }
      );
    }
    
    const updatedRegla = await db.reglaMargen.update({
      where: { id: id },
      data: {
        descripcion: descripcion,
        tipo: tipo,
        categoria: categoria,
        valor: parsedValor,
        tierCliente: tierCliente, // Guardar el nuevo campo
      },
    });

    return NextResponse.json(updatedRegla);
  } catch (error) {
    console.error('Error al actualizar margen:', error);
    if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Regla de margen no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al actualizar margen' }, { status: 500 });
  }
}

// DELETE /api/pricing/margenes/[id] - Elimina una regla de margen
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await db.reglaMargen.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Regla de margen eliminada' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar margen:', error);
    if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Regla de margen no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar margen' }, { status: 500 });
  }
}
