import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// Función de utilidad para manejar tipos
const getSafeString = (value) => {
    return (typeof value === 'string' && value.trim() !== '') ? value.trim() : null;
};

// GET /api/maquinaria/procesos - Obtiene los procesos estáticos (JSON) y las notas de procesos (DB)
export async function GET() {
  try {
    // 1. Leer los procesos estáticos desde JSON
    const jsonPath = path.join(process.cwd(), 'src', 'data', 'procesos.json');
    const staticData = await fs.readFile(jsonPath, 'utf-8');
    const staticProcesos = JSON.parse(staticData);
    
    // 2. Obtener la documentación de procesos dinámica de la DB
    const dynamicProcesos = await db.documento.findMany({
      where: {
        tipo: 'PROCESO'
      },
      orderBy: { fechaSubida: 'desc' }
    });

    return NextResponse.json({
        procesosEstaticos: staticProcesos,
        procesosDinamicos: dynamicProcesos
    });
  } catch (error) {
    console.error('Error al obtener datos de procesos:', error);
    return NextResponse.json({ message: 'Error al obtener datos de procesos' }, { status: 500 });
  }
}

// POST /api/maquinaria/procesos - Crea una nueva nota/proceso interno en la DB
export async function POST(request) {
  try {
    const data = await request.json();
    const { titulo, descripcion, maquina } = data;

    if (!getSafeString(titulo) || !getSafeString(descripcion) || !getSafeString(maquina)) {
      return NextResponse.json({ message: 'Título, Descripción y Máquina son requeridos.' }, { status: 400 });
    }

    // Guardar como Documento de tipo 'PROCESO'
    const nuevoProceso = await db.documento.create({
      data: {
        tipo: 'PROCESO',
        referencia: titulo,
        descripcion: descripcion,
        rutaArchivo: `INTERNAL_NOTE_${Date.now()}`, // Usamos un ID de nota como ruta simulada
        version: '1.0',
        maquinaUbicacion: maquina,
      },
    });
    
    return NextResponse.json(nuevoProceso, { status: 201 });
  } catch (error) {
    console.error('Error al crear el proceso interno:', error);
    return NextResponse.json({ message: 'Error al crear el proceso interno' }, { status: 500 });
  }
}
