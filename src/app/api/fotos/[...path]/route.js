import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const CONTENT_TYPES = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.pdf':  'application/pdf',
};

// GET /api/fotos/SUBCARPETA/nombre-archivo.jpg
// Sirve fotos almacenadas en public/fotos-producto/
export async function GET(request, { params }) {
  const { path: parts } = await params;

  const base = path.join(process.cwd(), 'public', 'fotos-producto');
  const filePath = path.join(base, ...parts);

  // Seguridad: evitar path traversal
  if (!filePath.startsWith(base + path.sep) && filePath !== base) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new NextResponse('Tipo de archivo no permitido', { status: 400 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Foto no encontrada', { status: 404 });
  }
}
