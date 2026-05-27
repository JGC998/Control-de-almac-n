import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';



export async function GET() {
  try {
    const hoy = new Date();

    const [
      totalPedidos,
      totalPresupuestos,
      pedidosProveedorPorLlegarCount,
      productosBajoStock,
      movimientosRecientes,
      facturasPendientes,
      statsFacturasPendientes,
      facturasVencidas,
    ] = await Promise.all([
      db.pedido.count(),
      db.presupuesto.count(),
      db.pedidoProveedor.count({ where: { estado: { not: 'Recibido' } } }),
      db.stock.findMany({
        where: { metrosDisponibles: { lt: 100 } },
        select: { id: true, material: true, metrosDisponibles: true, espesor: true },
        orderBy: { metrosDisponibles: 'asc' },
        take: 10,
      }),
      db.movimientoStock.findMany({
        orderBy: { fecha: 'desc' },
        include: { stockItem: { select: { material: true } } },
        take: 10,
      }),
      // Facturas EMITIDA más urgentes (vencidas primero, luego por vencimiento más próximo)
      db.factura.findMany({
        where: { estado: 'EMITIDA' },
        include: { cliente: { select: { nombre: true } } },
        orderBy: [{ fechaVencimiento: 'asc' }, { fechaCreacion: 'asc' }],
        take: 8,
      }),
      // Suma total pendiente de cobro
      db.factura.aggregate({
        where: { estado: 'EMITIDA' },
        _sum: { total: true },
        _count: true,
      }),
      // Cuenta de facturas vencidas
      db.factura.count({
        where: { estado: 'EMITIDA', fechaVencimiento: { lt: hoy } },
      }),
    ]);

    const kpiData = [
      { title: "Total Pedidos Cliente", value: totalPedidos, icon: "Package", href: "/pedidos" },
      { title: "Total Presupuestos", value: totalPresupuestos, icon: "FileText", href: "/presupuestos" },
      { title: "Pedidos Proveedor Pendientes", value: pedidosProveedorPorLlegarCount, icon: "Truck", href: "/proveedores" },
    ];

    return NextResponse.json({
      kpiData,
      nivelesStock: productosBajoStock.map(item => ({
        id: item.id,
        material: item.material,
        metrosDisponibles: item.metrosDisponibles,
        stockMinimo: 100,
        espesor: item.espesor,
      })),
      movimientosRecientes: movimientosRecientes.map(mov => ({
        ...mov,
        materialNombre: mov.stockItem?.material,
      })),
      facturasPendientes: {
        total: Number(statsFacturasPendientes._sum.total || 0),
        count: statsFacturasPendientes._count,
        vencidas: facturasVencidas,
        lista: facturasPendientes.map(f => ({
          id: f.id,
          numero: f.numero,
          cliente: f.cliente?.nombre ?? '—',
          total: Number(f.total),
          fechaVencimiento: f.fechaVencimiento,
          vencida: f.fechaVencimiento ? new Date(f.fechaVencimiento) < hoy : false,
        })),
      },
    });

  } catch (error) {
    logApiError(error, 'Error completo fetching dashboard data:');
    return NextResponse.json({ message: "Error al obtener datos del dashboard" }, { status: 500 });
  }
}
