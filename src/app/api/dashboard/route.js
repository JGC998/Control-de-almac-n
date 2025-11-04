import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Ejecutar todas las consultas en paralelo
    const [
      totalPedidos,
      totalPresupuestos,
      totalClientes,
      ingresosData,
      movimientosRecientes,
      nivelesStock
    ] = await db.$transaction([
      db.pedido.count(),
      db.presupuesto.count(),
      db.cliente.count(),
      db.pedido.aggregate({
        _sum: {
          total: true,
        },
        where: { estado: 'Completado' }, // O el estado que consideres "ingreso"
      }),
      db.movimientoStock.findMany({
        orderBy: { fecha: 'desc' },
        take: 5,
      }),
      db.stock.findMany({
        orderBy: { metrosDisponibles: 'asc' },
      })
    ]);

    const data = {
      kpis: {
        totalPedidos,
        totalPresupuestos,
        totalClientes,
        totalIngresos: ingresosData._sum.total || 0,
      },
      movimientosRecientes,
      nivelesStock,
      // (Faltaría la lógica de 'ventasPorMes' si se necesita)
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al cargar datos del dashboard' }, { status: 500 });
  }
}
