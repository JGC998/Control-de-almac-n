import { NextResponse } from 'next/server';
import { db } from '@/lib/db';



export async function GET() {
  try {
    // Ejecutar todas las consultas en paralelo
    const [
      totalPedidos, 
      totalPresupuestos, 
      pedidosProveedorPorLlegarCount,
      productosBajoStock,
      movimientosRecientes
      // Se eliminan las agregaciones de valor monetario
    ] = await db.$transaction([
      // 1. Total Pedidos de Cliente
      db.pedido.count(),
      
      // 2. Total Presupuestos
      db.presupuesto.count(),
      
      // 3. Pedidos Proveedor por llegar (Estado: NO 'Recibido')
      db.pedidoProveedor.count({ 
        where: {
          estado: {
            not: 'Recibido'
          }
        }
      }),
      
      // 4. Productos Bajo Stock (Stock < Stock Mínimo)
      db.stock.findMany({ 
        where: {
          metrosDisponibles: {
              lt: 100 // Simulación: menos de 100 metros disponibles
          },
          stockMinimo: {
              gt: 0 
          }
        },
        select: {
          id: true,
          material: true,
          metrosDisponibles: true,
          stockMinimo: true,
          espesor: true,
        },
        orderBy: {
            metrosDisponibles: 'asc'
        },
        take: 10, 
      }),
      
      // 5. Movimientos Recientes
      db.movimientoStock.findMany({
        orderBy: {
          fecha: 'desc',
        },
        include: {
          stockItem: {
            select: {
              material: true,
            }
          }
        },
        take: 10, 
      }),
      // Eliminadas las queries de sumPendingOrders y sumDraftQuotes
    ]);

    // Solo se utilizan los tres KPIs originales basados en conteo.
    const kpiData = [
      {
        title: "Total Pedidos Cliente",
        value: totalPedidos,
        icon: "Package",
        href: "/pedidos",
      },
      {
        title: "Total Presupuestos",
        value: totalPresupuestos,
        icon: "FileText",
        href: "/presupuestos",
      },
      {
        title: "Pedidos Proveedor Pendientes",
        value: pedidosProveedorPorLlegarCount,
        icon: "Truck",
        href: "/proveedores", 
      },
    ];

    return NextResponse.json({
      kpiData: kpiData,
      nivelesStock: productosBajoStock.map(item => ({ 
          id: item.id, 
          material: item.material, 
          metrosDisponibles: item.metrosDisponibles, 
          stockMinimo: item.stockMinimo, 
          espesor: item.espesor 
      })),
      movimientosRecientes: movimientosRecientes.map(mov => ({ 
          ...mov, 
          materialNombre: mov.stockItem?.material 
      })),
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ message: "Error fetching dashboard data" }, { status: 500 });
  }
}
