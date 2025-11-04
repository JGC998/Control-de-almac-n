"use client";
import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Save } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TarifasTable() {
  const { data: tarifas, error, isLoading } = useSWR('/api/precios', fetcher);
  const [editableData, setEditableData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (tarifas) {
      setEditableData(tarifas);
    }
  }, [tarifas]);

  const handleChange = (id, field, value) => {
    setEditableData(prevData =>
      prevData.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/precios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar tarifas');
      }
      mutate('/api/precios'); // Revalida
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000); // Oculta mensaje de éxito
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="text-red-500 text-center">Error al cargar las tarifas.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tabla de Tarifas por Material</h2>
          <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
            <Save className="w-4 h-4" /> {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
        {saveSuccess && <div className="alert alert-success">Tarifas guardadas con éxito.</div>}
        
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="table table-pin-rows table-sm w-full">
            <thead>
              <tr>
                <th>Material</th>
                <th>Espesor (mm)</th>
                <th>Precio (€/m²)</th>
                <th>Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {editableData?.map(row => (
                <tr key={row.id} className="hover">
                  <td className="font-bold">{row.material}</td>
                  <td>{row.espesor}</td>
                  <td>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={row.precio} 
                      onChange={(e) => handleChange(row.id, 'precio', parseFloat(e.target.value) || 0)} 
                      className="input input-bordered input-sm w-full"
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={row.peso} 
                      onChange={(e) => handleChange(row.id, 'peso', parseFloat(e.target.value) || 0)} 
                      className="input input-bordered input-sm w-full"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
