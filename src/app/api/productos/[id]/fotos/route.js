import { NextResponse } from 'next/server';
import { writeFile, unlink, mkdir, readFile, readdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

const TIPOS_VALIDOS = ['plantilla', 'troquel', 'plano'];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const EXTS_IMAGEN = ['.jpg', '.jpeg', '.png', '.webp'];
// plano acepta imágenes Y PDF (el PDF se convierte a PNG antes de guardar)
const EXTS_VALIDAS_PLANO = [...EXTS_IMAGEN, '.pdf'];

function slugify(str) {
  return (str || 'sin-nombre')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

// Convierte la primera página de un PDF a PNG usando pdftoppm
async function pdfToPng(pdfBuffer) {
  const id = `plano_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpPdf    = path.join(os.tmpdir(), `${id}.pdf`);
  const tmpPrefix = path.join(os.tmpdir(), id);

  try {
    await writeFile(tmpPdf, pdfBuffer);

    // -r 150: 150 DPI (buena resolución para planos técnicos)
    // -f 1 -l 1: solo primera página
    // -png: formato PNG
    await execFileAsync(
      'pdftoppm',
      ['-r', '150', '-png', '-f', '1', '-l', '1', tmpPdf, tmpPrefix],
      { timeout: 20_000 },
    );

    // pdftoppm nombra el archivo como: prefix-1.png / prefix-01.png / prefix-001.png
    const tmpFiles = await readdir(os.tmpdir());
    const outName  = tmpFiles.find(f => f.startsWith(id) && f.endsWith('.png'));
    if (!outName) throw new Error('pdftoppm no generó ningún archivo PNG');

    return await readFile(path.join(os.tmpdir(), outName));
  } finally {
    // Limpiar temporales
    const tmpFiles = await readdir(os.tmpdir()).catch(() => []);
    await Promise.all(
      tmpFiles
        .filter(f => f.startsWith(id))
        .map(f => unlink(path.join(os.tmpdir(), f)).catch(() => {})),
    );
    await unlink(tmpPdf).catch(() => {});
  }
}

// POST /api/productos/[id]/fotos
// body: multipart/form-data { tipo: 'plantilla'|'troquel'|'plano', archivo: File }
export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const producto = await db.producto.findUnique({
      where: { id },
      include: { fabricante: { select: { nombre: true } } },
    });
    if (!producto) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });

    const formData = await request.formData();
    const tipo     = formData.get('tipo');
    const archivo  = formData.get('archivo');

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ message: 'Tipo inválido (plantilla|troquel|plano)' }, { status: 400 });
    }
    if (!archivo || typeof archivo === 'string') {
      return NextResponse.json({ message: 'Archivo requerido' }, { status: 400 });
    }
    if (archivo.size > MAX_BYTES) {
      return NextResponse.json({ message: 'El archivo no puede superar 20 MB' }, { status: 400 });
    }

    const ext = path.extname(archivo.name).toLowerCase();
    const extsAceptadas = tipo === 'plano' ? EXTS_VALIDAS_PLANO : EXTS_IMAGEN;
    if (!extsAceptadas.includes(ext)) {
      return NextResponse.json({
        message: tipo === 'plano'
          ? 'Solo se permiten JPG, PNG, WEBP o PDF'
          : 'Solo se permiten JPG, PNG o WEBP',
      }, { status: 400 });
    }
    if (ext === '.pdf' && tipo !== 'plano') {
      return NextResponse.json({ message: 'PDF solo permitido para el tipo "plano"' }, { status: 400 });
    }

    // Carpeta organizada por fabricante
    const fabricanteSlug = slugify(producto.fabricante?.nombre || 'sin-fabricante');
    const nombreSlug     = slugify(producto.nombre);
    const subcarpeta     = fabricanteSlug.toUpperCase();
    const dirAbsoluto    = path.join(process.cwd(), 'public', 'fotos-producto', subcarpeta);
    await mkdir(dirAbsoluto, { recursive: true });

    // Borrar archivo anterior del mismo tipo
    const campo = tipo === 'plantilla' ? 'fotoPlantilla' : tipo === 'troquel' ? 'fotoTroquel' : 'fotoPlano';
    const rutaAnterior = producto[campo];
    if (rutaAnterior) {
      const relAnterior = rutaAnterior.replace(/^\/api\/fotos\//, 'fotos-producto/');
      await unlink(path.join(process.cwd(), 'public', relAnterior)).catch(() => {});
    }

    // Si es PDF → convertir a PNG con pdftoppm; si es imagen → usar tal cual
    let buffer   = Buffer.from(await archivo.arrayBuffer());
    let extFinal = ext;

    if (ext === '.pdf') {
      try {
        buffer   = await pdfToPng(buffer);
        extFinal = '.png';
      } catch (convErr) {
        logApiError(convErr, 'pdfToPng');
        return NextResponse.json({ message: 'No se pudo convertir el PDF a imagen. Comprueba que pdftoppm esté instalado.' }, { status: 500 });
      }
    }

    const nombreArchivo = `${tipo}_${fabricanteSlug}_${nombreSlug}${extFinal}`;
    const rutaRelativa  = `/api/fotos/${subcarpeta}/${nombreArchivo}`;
    await writeFile(path.join(dirAbsoluto, nombreArchivo), buffer);

    await db.producto.update({ where: { id }, data: { [campo]: rutaRelativa } });

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
