import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const familiaFiltro = searchParams.get('familia');

    const where = {
      fechaCompletado: { not: null },
      ...(desde ? { fechaCreacion: { gte: new Date(desde) } } : {}),
      ...(hasta ? { fechaCreacion: { lte: new Date(hasta) } } : {}),
    };

    const pedidos = await db.pedido.findMany({
      where,
      select: {
        id: true,
        numero: true,
        fechaCreacion: true,
        fechaCompletado: true,
        estado: true,
        tallerEstado: true,
        items: {
          select: {
            productoId: true,
            producto: {
              select: {
                subfamilia: {
                  select: { familia: { select: { nombre: true, color: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { fechaCompletado: 'desc' },
      take: 500,
    });

    // Enriquecer con días y familia principal
    const enriquecidos = pedidos.map(p => {
      const dias = Math.max(0, Math.round(
        (new Date(p.fechaCompletado) - new Date(p.fechaCreacion)) / (1000 * 60 * 60 * 24)
      ));
      const numItems = p.items.length;

      // Familia más frecuente entre los ítems con producto
      const cuentas = {};
      const colores = {};
      p.items.forEach(item => {
        const nombre = item.producto?.subfamilia?.familia?.nombre ?? 'Sin categoría';
        const color = item.producto?.subfamilia?.familia?.color ?? null;
        cuentas[nombre] = (cuentas[nombre] ?? 0) + 1;
        if (!colores[nombre]) colores[nombre] = color;
      });
      const familia = Object.entries(cuentas).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin categoría';
      const familiaColor = colores[familia] ?? null;

      return { id: p.id, numero: p.numero, dias, numItems, familia, familiaColor, fechaCompletado: p.fechaCompletado, fechaCreacion: p.fechaCreacion };
    });

    const filtrados = familiaFiltro ? enriquecidos.filter(p => p.familia === familiaFiltro) : enriquecidos;

    if (filtrados.length === 0) {
      return NextResponse.json({ total: 0, mediaDias: null, mediana: null, familias: [], porFamilia: [], porTamano: [], tendencia: [], detalle: [] });
    }

    // Estadísticas globales
    const diasOrdenados = [...filtrados].map(p => p.dias).sort((a, b) => a - b);
    const mediaDias = Math.round(diasOrdenados.reduce((s, d) => s + d, 0) / diasOrdenados.length);
    const mid = Math.floor(diasOrdenados.length / 2);
    const mediana = diasOrdenados.length % 2 === 0
      ? Math.round((diasOrdenados[mid - 1] + diasOrdenados[mid]) / 2)
      : diasOrdenados[mid];

    // Por familia
    const porFamiliaMap = {};
    filtrados.forEach(p => {
      if (!porFamiliaMap[p.familia]) {
        porFamiliaMap[p.familia] = { familia: p.familia, color: p.familiaColor, totalDias: 0, count: 0 };
      }
      porFamiliaMap[p.familia].totalDias += p.dias;
      porFamiliaMap[p.familia].count++;
    });
    const porFamilia = Object.values(porFamiliaMap)
      .map(f => ({ ...f, mediaDias: Math.round(f.totalDias / f.count) }))
      .sort((a, b) => b.count - a.count);

    const familias = porFamilia.map(f => f.familia);

    // Por tamaño de pedido
    const tramos = [
      { label: '1–3 productos', min: 1, max: 3 },
      { label: '4–10 productos', min: 4, max: 10 },
      { label: '> 10 productos', min: 11, max: Infinity },
    ];
    const porTamano = tramos
      .map(t => {
        const grupo = filtrados.filter(p => p.numItems >= t.min && p.numItems <= t.max);
        if (grupo.length === 0) return null;
        return {
          label: t.label,
          count: grupo.length,
          mediaDias: Math.round(grupo.reduce((s, p) => s + p.dias, 0) / grupo.length),
        };
      })
      .filter(Boolean);

    // Tendencia mensual (últimos 12 meses)
    const tendenciaMap = {};
    filtrados.forEach(p => {
      const key = new Date(p.fechaCompletado).toISOString().slice(0, 7);
      if (!tendenciaMap[key]) tendenciaMap[key] = { mes: key, totalDias: 0, count: 0 };
      tendenciaMap[key].totalDias += p.dias;
      tendenciaMap[key].count++;
    });
    const tendencia = Object.values(tendenciaMap)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12)
      .map(t => ({ mes: t.mes, mediaDias: Math.round(t.totalDias / t.count), count: t.count }));

    return NextResponse.json({
      total: filtrados.length,
      mediaDias,
      mediana,
      familias,
      porFamilia,
      porTamano,
      tendencia,
      detalle: filtrados.slice(0, 100),
    });
  } catch (error) {
    logApiError(error, 'GET /api/pedidos/estadisticas-tiempo');
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
