'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

export default function GuiasPage() {
  const [allGuias, setAllGuias] = useState([]);
  const [filteredGuias, setFilteredGuias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');

  useEffect(() => {
    async function fetchGuias() {
      try {
        const response = await fetch('/api/guias');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAllGuias(data);
        setFilteredGuias(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGuias();
  }, []);

  useEffect(() => {
    if (selectedMaterial === 'Todos') {
      setFilteredGuias(allGuias);
    } else {
      setFilteredGuias(allGuias.filter(guia => guia.material === selectedMaterial));
    }
  }, [selectedMaterial, allGuias]);

  const uniqueMaterials = useMemo(() => {
    const materials = allGuias.map(guia => guia.material).filter(Boolean);
    const distinctMaterials = new Set(materials.filter(m => m !== 'Todos'));
    return ['Todos', ...Array.from(distinctMaterials)];
  }, [allGuias]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Cargando guías...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-error">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Manuales y Guías de Procesos</h1>

      <div className="mb-4">
        <label htmlFor="material-select" className="label">
          <span className="label-text">Filtrar por Material:</span>
        </label>
        <select
          id="material-select"
          className="select select-bordered w-full max-w-xs"
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
        >
          {uniqueMaterials.map(material => (
            <option key={material} value={material}>
              {material}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuias.map((guia) => (
          <div key={guia.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{guia.title}</h2>
              <p className="text-sm text-gray-500">Categoría: {guia.category}</p>
              <p className="text-sm text-gray-500">Material: {guia.material}</p>
              <div className="card-actions justify-end">
                <Link href={`/guias/${guia.id}`} className="btn btn-primary">
                  Ver Guía
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredGuias.length === 0 && (
        <div className="text-center mt-8 text-gray-600">
          No hay guías disponibles para el material seleccionado.
        </div>
      )}
    </div>
  );
}
