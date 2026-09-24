import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req, { params }) {
  const { id } = await params;

  try {
    // Historial de cambios de tarifa originados por esta importación
    const historial = await db.tarifaCostoHistorial.findMany({
      where: { importacionId: id },
      orderBy: { creadoEn: 'asc' },
    });

    if (historial.length === 0) {
      return NextResponse.json({ entradas: [] });
    }

    // Para cada entrada del historial, buscar productos afectados por esa combinación
    // y si la tarifa activa actual sigue vinculada a esta importación
    const entradas = await Promise.all(
      historial.map(async (h) => {
        const [productos, tarifaActual] = await Promise.all([
          db.producto.findMany({
            where: {
              activo: true,
              espesor: h.espesor,
              material: { nombre: h.material },
              ...(h.color != null ? { color: h.color } : {}),
              ...(h.lonas != null ? { lonas: h.lonas } : {}),
              ...(h.acabado != null ? { acabado: h.acabado } : {}),
            },
            select: {
              id: true,
              nombre: true,
              tipo: true,
            },
          }),
          db.tarifaCoste.findFirst({
            where: {
              material: h.material,
              espesor: h.espesor,
              color: h.color ?? null,
              lonas: h.lonas ?? null,
              acabado: h.acabado ?? null,
              importacionId: id,
            },
            select: { id: true, precio: true, actualizadoEn: true },
          }),
        ]);

        return {
          id: h.id,
          material: h.material,
          espesor: h.espesor,
          precio: h.precio,
          color: h.color,
          lonas: h.lonas,
          acabado: h.acabado,
          creadoEn: h.creadoEn,
          tarifaActivaVigente: tarifaActual !== null,
          precioActual: tarifaActual?.precio ?? null,
          productos,
        };
      })
    );

    return NextResponse.json({ entradas });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener impacto de tarifas' }, { status: 500 });
  }
}
