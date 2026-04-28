import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.taco.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Taco eliminado correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Taco no encontrado' });
  }
}
