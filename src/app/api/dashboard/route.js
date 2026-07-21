import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function GET(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`dashboard:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  try {
    const [
      totalPedidos,
      totalPresupuestos,
      pedidosProveedorPorLlegarCount,
      productosBajoStock,
      movimientosRecientes,
      familias,
    ] = await Promise.all([
      db.pedido.count(),
      db.presupuesto.count(),
      db.pedidoProveedor.count({ where: { estado: { not: 'Recibido' } } }),
      db.stock.findMany({
        where: { metrosDisponibles: { lt: 100 } },
        select: { id: true, material: true, metrosDisponibles: true, espesor: true, stockMinimo: true },
        orderBy: { metrosDisponibles: 'asc' },
        take: 10,
      }),
      db.movimientoStock.findMany({
        orderBy: { fecha: 'desc' },
        include: { stockItem: { select: { material: true } } },
        take: 10,
      }),
      db.familia.findMany({
        orderBy: { nombre: 'asc' },
        select: {
          id: true, nombre: true, color: true,
          subfamilias: { select: { _count: { select: { productos: true } } } },
        },
      }),
    ]);

    const kpiData = [
      { title: "Total Pedidos Cliente", value: totalPedidos, icon: "Package", href: "/pedidos" },
      { title: "Total Presupuestos", value: totalPresupuestos, icon: "FileText", href: "/presupuestos" },
      { title: "Pedidos Proveedor Pendientes", value: pedidosProveedorPorLlegarCount, icon: "Truck", href: "/proveedores" },
    ];

    return NextResponse.json({
      kpiData,
      nivelesStock: productosBajoStock
        .filter(item => (item.stockMinimo ?? 0) > 0 && item.metrosDisponibles < item.stockMinimo)
        .map(item => ({
          id: item.id,
          material: item.material,
          metrosDisponibles: item.metrosDisponibles,
          stockMinimo: item.stockMinimo,
          espesor: item.espesor,
        })),
      movimientosRecientes: movimientosRecientes.map(mov => ({
        ...mov,
        materialNombre: mov.stockItem?.material,
      })),
      facturasPendientes: null,
      familiaStats: familias.map(f => ({
        id: f.id,
        nombre: f.nombre,
        color: f.color,
        totalProductos: f.subfamilias.reduce((s, sub) => s + sub._count.productos, 0),
      })),
    });

  } catch (error) {
    logApiError(error, 'Error completo fetching dashboard data:');
    return NextResponse.json({ message: "Error al obtener datos del dashboard" }, { status: 500 });
  }
}
