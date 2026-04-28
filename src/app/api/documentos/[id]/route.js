import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

// Función de utilidad para manejar tipos
const getSafeString = (value) => {
  return (typeof value === 'string' && value.trim() !== '') ? value.trim() : null;
};

// ... (GET y PUT se mantienen iguales, la lógica de borrado del archivo solo va en DELETE)

// DELETE /api/documentos/[id] - Elimina un documento (CORREGIDO: Borra el archivo físico)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // 1. Encontrar el documento para obtener la ruta
    const documento = await db.documento.findUnique({
      where: { id: id },
      select: { rutaArchivo: true }
    });

    if (!documento) {
      return NextResponse.json({ message: 'Documento no encontrado' }, { status: 404 });
    }

    // 2. Eliminar el registro de la base de datos
    await db.documento.delete({
      where: { id: id },
    });

    // 3. Eliminar el archivo físico del disco (si existe)
    if (documento.rutaArchivo) {
      // La ruta se guarda como /planos/nombre.pdf, necesitamos el path completo.
      const filePath = path.join(process.cwd(), 'public', documento.rutaArchivo);
      try {
        await fs.unlink(filePath);

      } catch (fileError) {
        // Manejar error EXDEV si fuera necesario, pero en este caso es un unlink simple.
        // Ignoramos el error si el archivo no existe (ENOENT), ya que el objetivo es que no esté.
        if (fileError.code !== 'ENOENT') {
          console.error(`[DOC-DELETE] Error al eliminar archivo físico: ${fileError.message}`);
          // Podrías lanzar un error 500 aquí si el borrado del archivo es CRÍTICO.
        }
      }
    }

    return NextResponse.json({ message: 'Documento y archivo eliminados' }, { status: 200 });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Documento no encontrado' });
  }
}

// GET /api/documentos/[id] - Obtiene un documento por su ID (Mantenido)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const documento = await db.documento.findUnique({
      where: { id: id },
      include: {
        producto: {
          select: { nombre: true, fabricanteId: true, referenciaFabricante: true }
        }
      }
    });

    if (!documento) {
      return NextResponse.json({ message: 'Documento no encontrado' }, { status: 404 });
    }
    return NextResponse.json(documento);
  } catch (error) {
    return handlePrismaError(error);
  }
}

// PUT /api/documentos/[id] - Actualiza un documento (Mantenido)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { tipo, referencia, descripcion, rutaArchivo, productoId, maquinaUbicacion } = data;

    if (!getSafeString(tipo) || !getSafeString(referencia) || !getSafeString(rutaArchivo)) {
      return NextResponse.json({ message: 'Tipo, Referencia y Ruta del Archivo son requeridos.' }, { status: 400 });
    }

    const updatedDocumento = await db.documento.update({
      where: { id: id },
      data: {
        tipo: tipo,
        referencia: referencia,
        descripcion: getSafeString(descripcion),
        rutaArchivo: rutaArchivo,
        productoId: getSafeString(productoId),
        maquinaUbicacion: getSafeString(maquinaUbicacion)
      },
    });

    return NextResponse.json(updatedDocumento);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Documento no encontrado',
      conflict: 'Ya existe un documento con la misma Referencia y Ruta de Archivo.',
    });
  }
}
