import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const getSafeString = (value) =>
  (typeof value === 'string' && value.trim() !== '') ? value.trim() : null;

// GET /api/maquinaria/procesos
export async function GET() {
  try {
    let staticProcesos = [];
    try {
      const jsonPath = path.join(process.cwd(), 'src', 'data', 'procesos.json');
      const staticData = await fs.readFile(jsonPath, 'utf-8');
      staticProcesos = JSON.parse(staticData);
    } catch {
      // procesos.json no existe en este entorno — continuar con array vacío
    }

    const dynamicProcesos = await db.documento.findMany({
      where: { tipo: 'PROCESO' },
      orderBy: { fechaSubida: 'desc' },
    });

    return NextResponse.json({ procesosEstaticos: staticProcesos, procesosDinamicos: dynamicProcesos });
  } catch (error) {
    logApiError(error, 'Error al obtener datos de procesos:');
    return NextResponse.json({ message: 'Error al obtener datos de procesos' }, { status: 500 });
  }
}

// POST /api/maquinaria/procesos
export async function POST(request) {
  try {
    const data = await request.json();
    const { titulo, descripcion, maquina } = data;

    if (!getSafeString(titulo) || !getSafeString(descripcion) || !getSafeString(maquina)) {
      return NextResponse.json({ message: 'Título, Descripción y Máquina son requeridos.' }, { status: 400 });
    }

    const nuevoProceso = await db.documento.create({
      data: {
        tipo: 'PROCESO',
        referencia: titulo,
        descripcion: descripcion,
        rutaArchivo: `INTERNAL_NOTE_${Date.now()}`,
        maquinaUbicacion: maquina,
      },
    });

    return NextResponse.json(nuevoProceso, { status: 201 });
  } catch (error) {
    logApiError(error, 'Error al crear el proceso interno:');
    return NextResponse.json({ message: 'Error al crear el proceso interno' }, { status: 500 });
  }
}
