"use client";
import React from 'react'; // Se eliminó useState y useEffect
import useSWR from 'swr';
// Se eliminó el icono 'Save'

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TarifasTable() {
  const { data: tarifas, error, isLoading } = useSWR('/api/precios', fetcher);
  // Se eliminaron los estados 'editableData', 'isSaving', 'saveSuccess'
  // Se eliminaron las funciones 'handleChange' y 'handleSave'

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="text-red-500 text-center">Error al cargar las tarifas.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tabla de Tarifas por Material</h2>
          {/* Se eliminó el botón de Guardar */}
        </div>
        
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="table table-zebra table-pin-rows table-sm w-full">
            <thead>
              <tr>
                <th className="text-center">Material</th>
                <th className="text-center">Espesor (mm)</th>
                <th className="text-center">Precio (€/m²)</th>
                <th className="text-center">Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {/* Se lee directamente de 'tarifas' y se muestran los datos */}
              {tarifas?.map(row => (
                <tr key={row.id} className="hover">
                  <td className="font-bold text-center">{row.material}</td>
                  <td className="text-center">{row.espesor}</td>
                  <td className="text-center">{row.precio.toFixed(2)} €</td>
                  <td className="text-center">{row.peso.toFixed(2)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
