import { useState, useEffect } from 'react';

export function useProveedoresData() {
  const [data, setData] = useState({ materiales: [], proveedores: [], pedidosProveedores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [materialesRes, proveedoresRes, pedidosProveedoresRes] = await Promise.all([
          fetch('/api/materiales'),
          fetch('/api/proveedores'),
          fetch('/api/pedidos-proveedores-data'), // Nueva llamada para pedidos de proveedores
        ]);

        const responses = [materialesRes, proveedoresRes, pedidosProveedoresRes];
        for (const res of responses) {
          if (!res.ok) {
            throw new Error(`Error en la carga de datos (status: ${res.status})`);
          }
        }

        const materialesData = await materialesRes.json();
        const proveedoresData = await proveedoresRes.json();
        const pedidosProveedoresData = await pedidosProveedoresRes.json();

        setData({
          materiales: materialesData,
          proveedores: proveedoresData,
          pedidosProveedores: pedidosProveedoresData,
        });

      } catch (err) {
        console.error("Error al cargar los datos de proveedores:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
