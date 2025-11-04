#!/bin/zsh
echo "--- INICIANDO SCRIPT (Refactorización de Calculadora a Multi-Item v2) ---"

echo "Modificando: src/app/calculadora/page.js"

# Sobrescribimos la página de la calculadora con la nueva lógica de multi-item
cat <<'EOF' > src/app/calculadora/page.js
"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Calculator, Plus, Trash2 } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const TotalDisplay = ({ label, value, unit }) => (
  <div className="stat bg-primary text-primary-content rounded-lg">
    <div className="stat-title">{label}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-desc">{unit}</div>
  </div>
);

export default function CalculadoraPage() {
  // --- Estado para el item actual ---
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedEspesor, setSelectedEspesor] = useState('');
  const [unidades, setUnidades] = useState(1);
  const [ancho, setAncho] = useState(0);
  const [largo, setLargo] = useState(0);
  
  // --- Estado para la lista de items ---
  const [itemsAgregados, setItemsAgregados] = useState([]);

  // 1. Cargar todas las tarifas de la BD
  const { data: tarifas, error, isLoading } = useSWR('/api/precios', fetcher);

  // 2. Derivar listas únicas para los selectores
  const uniqueMaterials = useMemo(() => {
    if (!tarifas) return [];
    return [...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const availableEspesores = useMemo(() => {
    if (!tarifas || !selectedMaterial) return [];
    return [...new Set(
      tarifas
        .filter(t => t.material === selectedMaterial)
        .map(t => t.espesor)
    )].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, selectedMaterial]);

  // 3. Resetear espesor si el material cambia
  useEffect(() => {
    setSelectedEspesor('');
  }, [selectedMaterial]);

  // 4. Calcular los totales generales de la lista
  const totalesGenerales = useMemo(() => {
    const totalPrecio = itemsAgregados.reduce((acc, item) => acc + item.precioTotal, 0);
    const totalPeso = itemsAgregados.reduce((acc, item) => acc + item.pesoTotal, 0);
    return { totalPrecio, totalPeso };
  }, [itemsAgregados]);

  // 5. Handler para añadir un item a la lista
  const handleAddItem = () => {
    if (!tarifas || !selectedMaterial || !selectedEspesor || !unidades || unidades <= 0 || !ancho || ancho <= 0 || !largo || largo <= 0) {
      alert("Por favor, completa todos los campos (Material, Espesor, Unidades, Ancho y Largo) con valores válidos.");
      return;
    }

    const tarifa = tarifas.find(t => 
      t.material === selectedMaterial && 
      t.espesor === selectedEspesor
    );

    if (!tarifa) {
      alert("Tarifa no encontrada para la selección.");
      return;
    }

    const precioPorM2 = tarifa.precio || 0;
    const pesoPorM2 = tarifa.peso || 0;
    
    // Calcular área de una pieza (convirtiendo mm a m)
    const areaPorPieza = (ancho / 1000) * (largo / 1000); 
    
    // Calcular precio y peso por CADA PIEZA
    const precioUnitario = precioPorM2 * areaPorPieza; 
    const pesoUnitario = pesoPorM2 * areaPorPieza;

    const newItem = {
      id: Date.now(), // Usamos un timestamp como key simple
      descripcion: `${selectedMaterial} - ${selectedEspesor}mm`,
      medidas: `${ancho} x ${largo}`,
      unidades: unidades,
      precioUnitario: precioUnitario, // Precio por pieza
      pesoUnitario: pesoUnitario, // Peso por pieza
      precioTotal: precioUnitario * unidades, // Precio total línea
      pesoTotal: pesoUnitario * unidades, // Peso total línea
    };

    setItemsAgregados(prev => [...prev, newItem]);
    
    // Resetear inputs
    setSelectedMaterial('');
    setSelectedEspesor('');
    setUnidades(1);
    setAncho(0);
    setLargo(0);
  };

  // 6. Handler para eliminar un item
  const handleRemoveItem = (id) => {
    setItemsAgregados(prev => prev.filter(item => item.id !== id));
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="text-red-500 text-center">Error al cargar las tarifas.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Calculator className="mr-2" /> Simulador de Cálculo
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (Inputs y Lista) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Configuración de Item */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Añadir Item</h2>
              
              {/* Primera fila de inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Material</span></div>
                  <select 
                    className="select select-bordered"
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                  >
                    <option value="">Selecciona material</option>
                    {uniqueMaterials.map(material => (
                      <option key={material} value={material}>{material}</option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Espesor (mm)</span></div>
                  <select 
                    className="select select-bordered"
                    value={selectedEspesor}
                    onChange={(e) => setSelectedEspesor(e.target.value)}
                    disabled={!selectedMaterial}
                  >
                    <option value="">Selecciona espesor</option>
                    {availableEspesores.map(espesor => (
                      <option key={espesor} value={espesor}>{espesor} mm</option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Unidades</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 5" 
                    className="input input-bordered"
                    value={unidades}
                    onChange={(e) => setUnidades(parseInt(e.target.value) || 1)}
                  />
                </label>
              </div>

              {/* Segunda fila de inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <label className="form-control w-full">
                  <div className="label"><span className="label-text">Ancho (mm)</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 1200" 
                    className="input input-bordered"
                    value={ancho}
                    onChange={(e) => setAncho(parseInt(e.target.value) || 0)}
                  />
                </label>
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Largo (mm)</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 2000" 
                    className="input input-bordered"
                    value={largo}
                    onChange={(e) => setLargo(parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>

              <div className="card-actions justify-end mt-4">
                <button onClick={handleAddItem} className="btn btn-primary">
                  <Plus className="w-4 h-4" /> Añadir Item al Cálculo
                </button>
              </div>
            </div>
          </div>

          {/* Card de Lista de Items */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Items Agregados</h2>
              <div className="overflow-x-auto">
                <table className="table w-full table-zebra">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th className="text-center">Medidas (mm)</th>
                      <th className="text-center">Unidades</th>
                      <th className="text-right">P. Unitario</th>
                      <th className="text-right">P. Total</th>
                      <th className="text-right">Peso Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsAgregados.length === 0 && (
                      <tr><td colSpan="7" className="text-center">Añade items para verlos aquí.</td></tr>
                    )}
                    {itemsAgregados.map(item => (
                      <tr key={item.id} className="hover">
                        <td className="font-medium">{item.descripcion}</td>
                        <td className="text-center">{item.medidas}</td>
                        <td className="text-center">{item.unidades}</td>
                        <td className="text-right">{item.precioUnitario.toFixed(2)} €</td>
                        <td className="text-right font-bold">{item.precioTotal.toFixed(2)} €</td>
                        <td className="text-right">{item.pesoTotal.toFixed(2)} kg</td>
                        <td className="text-center">
                          <button onClick={() => handleRemoveItem(item.id)} className="btn btn-ghost btn-sm btn-circle">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha (Resultados Totales) */}
        <div className="lg:col-span-1 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Total General</h2>
            
            <div className="stats stats-vertical shadow">
              <TotalDisplay label="Precio Total General" value={`${totalesGenerales.totalPrecio.toFixed(2)} €`} unit="Sin IVA" />
              <TotalDisplay label="Peso Total General" value={`${totalesGenerales.totalPeso.toFixed(2)} kg`} unit="Aproximado" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
EOF

echo "--- ¡Página de Calculadora refactorizada a multi-item v2! ---"
echo "El servidor de desarrollo debería recargarse automáticamente."


