import { useState, useEffect } from 'react';

export function useDashboardData() {
  const [data, setData] = useState({ stats: { pedidosClientes: 0, pedidosProveedores: 0, stockBajo: 0 }, movimientos: [], stock: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Usamos las rutas de la API en lugar de los archivos directos
        const [stockRes, movimientosRes, pedidosRes, pedidosProveedoresRes] = await Promise.all([
          fetch('/api/almacen-stock'), // API que ya calcula el stock
          fetch('/api/movimientos'),     // Nueva API para movimientos
          fetch('/api/pedidos'),         // API existente para pedidos de clientes
          fetch('/api/pedidos-proveedores-data') // API existente para pedidos a proveedores
        ]);

        // Verificar si todas las respuestas son correctas
        const responses = [stockRes, movimientosRes, pedidosRes, pedidosProveedoresRes];
        for (const res of responses) {
          if (!res.ok) {
            throw new Error(`Error en la carga de datos (status: ${res.status})`);
          }
        }

        const stockData = await stockRes.json();
        const movimientosData = await movimientosRes.json();
        const pedidosClientesData = await pedidosRes.json();
        const pedidosProveedoresData = await pedidosProveedoresRes.json();

        // Procesamiento de los datos para las estadísticas
        const pedidosClientesActivos = pedidosClientesData.filter(p => p.estado === 'Activo').length;
        const pedidosProveedoresPendientes = pedidosProveedoresData.filter(p => p.estado === 'Pendiente').length;
        const stockBajo = stockData.filter(s => parseFloat(s.metrosDisponibles) < parseFloat(s.stock_minimo)).length;

        setData({
          stats: {
            pedidosClientes: pedidosClientesActivos,
            pedidosProveedores: pedidosProveedoresPendientes,
            stockBajo,
          },
          movimientos: movimientosData,
          stock: stockData,
        });

      } catch (err) {
        console.error("Error al cargar los datos del dashboard:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // El array vacío asegura que el efecto se ejecute solo una vez

  return { data, loading, error };
}
