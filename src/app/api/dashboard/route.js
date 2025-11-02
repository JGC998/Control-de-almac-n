import { NextResponse } from 'next/server';
import { readData } from '@/utils/dataManager';

export async function GET() {
  try {
    // 1. Cargar todos los datos necesarios en paralelo
    const [pedidos, clientes, productos, stock] = await Promise.all([
      readData('pedidos.json'),
      readData('clientes.json'),
      readData('productos.json'),
      readData('stock.json')
    ]);

    // --- 2. Calcular KPIs (Indicadores Clave de Rendimiento) ---

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // KPI: Ingresos este mes
    const ingresosMes = pedidos
      .filter(p => new Date(p.fecha) >= firstDayOfMonth)
      .reduce((sum, p) => sum + p.productos.reduce((sub, prod) => sub + (prod.precioUnitario * prod.cantidad), 0), 0);

    // KPI: Nuevos clientes este mes
    const nuevosClientesMes = clientes.filter(c => new Date(c.fechaAlta) >= firstDayOfMonth).length;

    // KPI: Pedidos activos
    const pedidosActivos = pedidos.filter(p => p.estado === 'Activo').length;

    // --- 3. Preparar datos para el gráfico de ventas (últimos 30 días) ---
    
    const salesData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateString = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      
      const dailySales = pedidos
        .filter(p => new Date(p.fecha).toDateString() === date.toDateString())
        .reduce((sum, p) => sum + p.productos.reduce((sub, prod) => sub + (prod.precioUnitario * prod.cantidad), 0), 0);

      salesData.push({ name: dateString, ventas: dailySales });
    }

    // --- 4. Calcular información adicional ---

    // Lista: Productos con bajo stock (ej. menos de 10 unidades)
    const lowStockItems = stock
      .filter(s => s.cantidad < 10)
      .map(s => {
        const productInfo = productos.find(p => p.id === s.productoId);
        return { id: s.productoId, nombre: productInfo?.nombre || 'Desconocido', cantidad: s.cantidad };
      })
      .slice(0, 5); // Limitar a 5 para el dashboard

    // Devolver todos los datos calculados en un solo objeto
    return NextResponse.json({
      kpis: {
        ingresosMes,
        nuevosClientesMes,
        pedidosActivos,
      },
      salesData,
      lowStockItems,
    });

  } catch (error) {
    console.error('Error al generar datos del dashboard:', error);
    return NextResponse.json({ message: 'Error interno al procesar los datos' }, { status: 500 });
  }
}