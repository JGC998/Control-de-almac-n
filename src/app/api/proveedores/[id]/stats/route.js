import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/proveedores/[id]/stats
// Estadísticas del proveedor a partir de ImportacionContenedor (la fuente real de datos).
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const proveedor = await db.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
    }

    const importaciones = await db.importacionContenedor.findMany({
      where: { proveedorId: id },
      select: {
        id: true,
        creadaEn: true,
        estado: true,
        bobinas: true,
        totalDesembolso: true,
        numContenedor: true,
      },
      orderBy: { creadaEn: 'desc' },
    });

    const totalPedidos = importaciones.length;
    let totalBobinas = 0;
    let totalGastos  = 0;
    const matCount   = {};

    // Parseo único de cada importacion — resultado reutilizado abajo
    const importacionesParsed = importaciones.map(imp => {
      let bobs;
      try {
        bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
      } catch { bobs = []; }
      if (!Array.isArray(bobs)) bobs = [];
      return { imp, bobs: bobs.filter(b => b.tipo === 'BOBINA' || !b.tipo) };
    });

    for (const { imp, bobs } of importacionesParsed) {
      totalGastos += imp.totalDesembolso || 0;
      for (const b of bobs) {
        const qty = parseFloat(b.numRollos) || 1;
        totalBobinas += qty;
        const mat = b.referencia?.split('-')[0]?.toUpperCase() || null;
        if (mat) matCount[mat] = (matCount[mat] ?? 0) + qty;
      }
    }

    const ultimoPedido = importaciones[0]?.creadaEn ?? null;
    const primerPedido = importaciones.length > 0
      ? importaciones[importaciones.length - 1].creadaEn
      : null;

    const materialesMasComprados = Object.entries(matCount)
      .map(([material, bobinas]) => ({ material, bobinas: Math.round(bobinas) }))
      .sort((a, b) => b.bobinas - a.bobinas)
      .slice(0, 5);

    const ultimosPedidos = importacionesParsed.slice(0, 10).map(({ imp, bobs }) => {
      const numBobinas = Math.round(bobs.reduce((s, b) => s + (parseFloat(b.numRollos) || 1), 0));

      // Material más frecuente en esta importacion
      const mc = {};
      for (const b of bobs) {
        const mat = b.referencia?.split('-')[0]?.toUpperCase() || '—';
        mc[mat] = (mc[mat] ?? 0) + 1;
      }
      const material = Object.entries(mc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

      return {
        id:               imp.id,
        fecha:            imp.creadaEn,
        material,
        tipo:             'IMPORTACION',
        estado:           imp.estado,
        gastosTotales:    imp.totalDesembolso || 0,
        numBobinas,
        numeroContenedor: imp.numContenedor ?? null,
      };
    });

    return NextResponse.json({
      proveedor,
      stats: {
        totalPedidos,
        totalBobinas: Math.round(totalBobinas),
        totalGastos,
        ultimoPedido,
        primerPedido,
        materialesMasComprados,
      },
      ultimosPedidos,
    });
  } catch (error) {
    logApiError(error, 'GET /api/proveedores/[id]/stats');
    return NextResponse.json({ message: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
