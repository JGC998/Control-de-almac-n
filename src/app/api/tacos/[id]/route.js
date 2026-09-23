import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    await db.taco.delete({ where: { id: numId } });
    return NextResponse.json({ message: 'Taco eliminado correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Taco no encontrado' });
  }
}
