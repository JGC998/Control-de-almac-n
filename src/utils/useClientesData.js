import { useState, useEffect, useCallback } from 'react';

export function useClientesData() {
  const [data, setData] = useState({
    pedidos: [],
    plantillas: [],
    fabricantes: [],
    datosMateriales: [], // Esto es lo que antes venía de precios.json
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plantillasRes, pedidosRes, fabricantesRes, preciosRes] = await Promise.all([
        fetch('/api/plantillas'),
        fetch('/api/pedidos'), // Asumimos que esta es la API para pedidos de clientes
        fetch('/api/fabricantes'),
        fetch('/api/precios'), // Nueva API para precios.json
      ]);

      const responses = [plantillasRes, pedidosRes, fabricantesRes, preciosRes];
      for (const res of responses) {
        if (!res.ok) {
          throw new Error(`Error en la carga de datos (status: ${res.status})`);
        }
      }

      const plantillasData = await plantillasRes.json();
      const pedidosData = await pedidosRes.json();
      const fabricantesData = await fabricantesRes.json();
      const preciosData = await preciosRes.json();

      setData({
        pedidos: pedidosData,
        plantillas: plantillasData,
        fabricantes: fabricantesData,
        datosMateriales: preciosData,
      });

    } catch (err) {
      console.error("Fallo al cargar datos de clientes:", err);
      setError(err.message || 'Ocurrió un error desconocido al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetchData: fetchData };
}
