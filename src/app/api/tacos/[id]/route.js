import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.taco.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Taco eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Taco no encontrado' }, { status: 404 });
    }
    console.error('Error al eliminar taco:', error);
    return NextResponse.json({ message: 'Error al eliminar el taco' }, { status: 500 });
  }
}
