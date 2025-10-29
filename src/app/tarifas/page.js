'use client';

import React, { useState, useEffect } from 'react';

import { formatCurrency, formatWeight } from '@/utils/utils'; // Importamos las funciones de utilidad
import { FaEuroSign } from 'react-icons/fa';

function TarifasPage() {
  const [precios, setPrecios] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrecios = async () => {
      try {
        // Next.js sirve los archivos de /public en la raíz
        const response = await fetch('/data/precios.json');
        if (!response.ok) {
          throw new Error('No se pudo cargar el archivo de precios.');
        }
        const data = await response.json();
        setPrecios(data);
      } catch (error) {
        console.error('Error fetching precios:', error);
        setError(error.message);
      }
    };

    fetchPrecios();
  }, []); // El array vacío asegura que se ejecute solo una vez

  return (
    <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                <FaEuroSign />
                Gestión de Tarifas
            </h1>
            <button className="btn btn-primary">Añadir Tarifa</button>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                {error ? (
                    <div role="alert" className="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Error: {error}</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full shadow-lg">
                            {/* Encabezado de la tabla */}
                            <thead className="text-base">
                                <tr>
                                    <th>Material</th>
                                    <th>Espesor</th>
                                    <th className="text-right">Precio</th>
                                    <th className="text-right">Peso (por m²)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {precios.map((item, index) => (
                                    <tr key={index} className="hover">
                                        <td>{item.material}</td>
                                        <td>{item.espesor}</td>
                                        <td className="text-right font-mono">{formatCurrency(item.precio)}</td>
                                        <td className="text-right font-mono">{formatWeight(item.peso)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      </div>
    </main>
  );
};

export default TarifasPage;