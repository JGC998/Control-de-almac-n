import { useState, useEffect } from 'react';

export function useTarifasData() {
  const [data, setData] = useState({ precios: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const preciosRes = await fetch('/api/precios');

        if (!preciosRes.ok) {
          throw new Error(`Error en la carga de datos (status: ${preciosRes.status})`);
        }

        const preciosData = await preciosRes.json();

        setData({
          precios: preciosData,
        });

      } catch (err) {
        console.error("Error al cargar los datos de tarifas:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
