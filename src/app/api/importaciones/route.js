import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { importacionContenedorSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET /api/importaciones
export async function GET() {
  try {
    const importaciones = await db.importacionContenedor.findMany({
      orderBy: { creadaEn: 'desc' },
      take: 100,
      include: { proveedor: { select: { id: true, nombre: true } } },
    });
    return NextResponse.json(importaciones);
  } catch (error) {
    logApiError(error, 'GET /api/importaciones');
    return NextResponse.json({ error: 'Error al obtener importaciones' }, { status: 500 });
  }
}

// POST /api/importaciones
export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = importacionContenedorSchema.safeParse({
      ...body,
      tasaCambio: parseFloat(body.tasaCambio) || 0,
      totalBobinasUSD: parseFloat(body.totalBobinasUSD) || 0,
      totalBobinasEUR: parseFloat(body.totalBobinasEUR) || 0,
      totalMetros: parseFloat(body.totalMetros) || 0,
      suplidos: parseFloat(body.suplidos) || 0,
      exentos: parseFloat(body.exentos) || 0,
      sujetos: parseFloat(body.sujetos) || 0,
      gastosRepercutibles: parseFloat(body.gastosRepercutibles) || 0,
      costeProducto: parseFloat(body.costeProducto) || 0,
      totalDesembolso: parseFloat(body.totalDesembolso) || 0,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { descripcion, bobinas, ...numeros } = parsed.data;
    const proveedorId = body.proveedorId?.trim() || null;

    const registro = await db.importacionContenedor.create({
      data: {
        descripcion: descripcion?.trim() || null,
        ...numeros,
        bobinas: typeof bobinas === 'string' ? bobinas : JSON.stringify(bobinas),
        proveedorId,
        numFactura: body.numFactura?.trim() || null,
        numContenedor: body.numContenedor?.trim() || null,
        estado: body.estado || 'RECIBIDO',
        fechaPedido: body.fechaPedido ? new Date(body.fechaPedido) : null,
        fechaLlegada: body.fechaLlegada ? new Date(body.fechaLlegada) : null,
      },
      include: { proveedor: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/importaciones');
    return NextResponse.json({ error: 'Error al guardar la importación' }, { status: 500 });
  }
}
