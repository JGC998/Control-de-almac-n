import { NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const TIPOS_VALIDOS = ['plantilla', 'troquel', 'plano'];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB (PDF puede ser mayor)
const EXTS_IMAGEN = ['.jpg', '.jpeg', '.png', '.webp'];
const EXTS_VALIDAS = [...EXTS_IMAGEN, '.pdf'];

function slugify(str) {
  return (str || 'sin-nombre')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

// POST /api/productos/[id]/fotos
// body: multipart/form-data { tipo: 'plantilla'|'troquel', archivo: File }
export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const producto = await db.producto.findUnique({
      where: { id },
      include: { fabricante: { select: { nombre: true } } },
    });
    if (!producto) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });

    const formData = await request.formData();
    const tipo = formData.get('tipo');
    const archivo = formData.get('archivo');

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ message: 'Tipo inválido (plantilla|troquel)' }, { status: 400 });
    }
    if (!archivo || typeof archivo === 'string') {
      return NextResponse.json({ message: 'Archivo requerido' }, { status: 400 });
    }
    if (archivo.size > MAX_BYTES) {
      return NextResponse.json({ message: 'El archivo no puede superar 8 MB' }, { status: 400 });
    }

    const ext = path.extname(archivo.name).toLowerCase();
    if (!EXTS_VALIDAS.includes(ext)) {
      return NextResponse.json({ message: 'Solo se permiten JPG, PNG, WEBP o PDF (planos)' }, { status: 400 });
    }
    if (ext === '.pdf' && tipo !== 'plano') {
      return NextResponse.json({ message: 'PDF solo permitido para el tipo "plano"' }, { status: 400 });
    }
    if (tipo === 'plano' && ext !== '.pdf') {
      return NextResponse.json({ message: 'El plano debe ser un archivo PDF' }, { status: 400 });
    }

    // Carpeta organizada por fabricante
    const fabricanteSlug = slugify(producto.fabricante?.nombre || 'sin-fabricante');
    const nombreSlug = slugify(producto.nombre);
    const nombreArchivo = `${tipo}_${fabricanteSlug}_${nombreSlug}${ext}`;
    const subcarpeta = fabricanteSlug.toUpperCase();

    const dirAbsoluto = path.join(process.cwd(), 'public', 'fotos-producto', subcarpeta);
    await mkdir(dirAbsoluto, { recursive: true });

    // Si ya había foto anterior del mismo tipo, borrarla del disco
    const campo = tipo === 'plantilla' ? 'fotoPlantilla' : tipo === 'troquel' ? 'fotoTroquel' : 'fotoPlano';
    const rutaAnterior = producto[campo];
    if (rutaAnterior) {
      // rutaAnterior = '/api/fotos/SUBCARPETA/nombre.ext' → disco: public/fotos-producto/...
      const relAnterior = rutaAnterior.replace(/^\/api\/fotos\//, 'fotos-producto/');
      await unlink(path.join(process.cwd(), 'public', relAnterior)).catch(() => {});
    }

    // Escribir nuevo archivo
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const rutaRelativa = `/api/fotos/${subcarpeta}/${nombreArchivo}`;
    await writeFile(path.join(dirAbsoluto, nombreArchivo), buffer);

    // Actualizar BD
    await db.producto.update({
      where: { id },
      data: { [campo]: rutaRelativa },
    });

    revalidatePath(`/gestion/productos/${id}`);
    return NextResponse.json({ ruta: rutaRelativa });
  } catch (error) {
    logApiError(error, 'POST /api/productos/[id]/fotos');
    return NextResponse.json({ message: 'Error al guardar la foto' }, { status: 500 });
  }
}

// DELETE /api/productos/[id]/fotos?tipo=plantilla
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ message: 'Tipo inválido (plantilla|troquel|plano)' }, { status: 400 });
    }

    const campo = tipo === 'plantilla' ? 'fotoPlantilla' : tipo === 'troquel' ? 'fotoTroquel' : 'fotoPlano';
    const producto = await db.producto.findUnique({ where: { id }, select: { [campo]: true } });
    if (!producto) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });

    const ruta = producto[campo];
    if (ruta) {
      const relRuta = ruta.replace(/^\/api\/fotos\//, 'fotos-producto/');
      await unlink(path.join(process.cwd(), 'public', relRuta)).catch(() => {});
    }

    await db.producto.update({ where: { id }, data: { [campo]: null } });

    revalidatePath(`/gestion/productos/${id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError(error, 'DELETE /api/productos/[id]/fotos');
    return NextResponse.json({ message: 'Error al eliminar la foto' }, { status: 500 });
  }
}
