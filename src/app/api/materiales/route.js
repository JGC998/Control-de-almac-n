import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/materiales - Obtiene todos los materiales
export async function GET() {
  try {
    const materiales = await db.material.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(materiales);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener materiales' }, { status: 500 });
  }
}