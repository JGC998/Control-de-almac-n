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
  const [selectedProducto, setSelectedProducto] = useState(null); // Producto completo
  const [unidades, setUnidades] = useState(1);
  const [ancho, setAncho] = useState(0);
  const [largo, setLargo] = useState(0);
  const [clienteId, setClienteId] = useState(''); // REQUERIDO PARA LA API
  
  // --- Estado para la lista de items ---
  const [itemsAgregados, setItemsAgregados] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false); // Loading state

  // 1. Cargar datos necesarios
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  const { data: clientes, error: clientesError, isLoading: clientesLoading } = useSWR('/api/clientes', fetcher);
  // Usamos plantillas (productos) para obtener el productId
  const { data: plantillas, error: plantillasError, isLoading: plantillasLoading } = useSWR('/api/plantillas', fetcher);

  // 2. Derivar listas únicas para los selectores
  const uniqueMaterials = useMemo(() => {
    if (!plantillas) return [];
    // Usamos 'plantillas' (productos) para obtener materiales
    return [...new Set(plantillas.map(p => p.material?.nombre).filter(Boolean))].sort();
  }, [plantillas]);

  const availableProductos = useMemo(() => {
    if (!plantillas || !selectedMaterial) return [];
    return plantillas.filter(p => p.material?.nombre === selectedMaterial);
  }, [plantillas, selectedMaterial]);

  // 3. Resetear selección si el material cambia
  useEffect(() => {
    setSelectedProducto(null);
    setAncho(0);
    setLargo(0);
    setSelectedEspesor('');
  }, [selectedMaterial]);

  // 4. Autocompletar datos cuando se selecciona un producto (plantilla)
  const handleProductoChange = (productoId) => {
    const producto = plantillas.find(p => p.id === productoId);
    if (producto) {
      setSelectedProducto(producto);
      setAncho(producto.ancho || 0);
      setLargo(producto.largo || 0);
      // El espesor lo buscamos en tarifas, ya que el producto no lo tiene de forma fiable
      const tarifaProducto = tarifas?.find(t => t.material === producto.material?.nombre && t.espesor == producto.espesor);
      setSelectedEspesor(tarifaProducto?.espesor || '');
    } else {
      setSelectedProducto(null);
      setAncho(0);
      setLargo(0);
      setSelectedEspesor('');
    }
  };

  // 5. Calcular los totales generales de la lista
  const totalesGenerales = useMemo(() => {
    const totalPrecio = itemsAgregados.reduce((acc, item) => acc + item.precioTotal, 0);
    const totalPeso = itemsAgregados.reduce((acc, item) => acc + item.pesoTotal, 0);
    return { totalPrecio, totalPeso };
  }, [itemsAgregados]);

  // 6. Handler para añadir un item a la lista (MODIFICADO PARA USAR API)
  const handleAddItem = async () => {
    if (!clienteId || !selectedProducto || !unidades || unidades <= 0) {
      alert("Por favor, selecciona un Cliente, un Producto/Plantilla y las Unidades.");
      return;
    }

    setIsAddingItem(true);

    // Preparar el item para la API de cálculo
    const itemParaCalcular = {
      productId: selectedProducto.id,
      quantity: unidades,
      unitPrice: selectedProducto.precioUnitario, // Precio base
      description: selectedProducto.nombre,
      // Añadimos ancho y largo por si los necesitamos en el futuro, aunque la API actual no los usa
      ancho: ancho,
      largo: largo
    };

    try {
      // --- LLAMADA A LA API DE PRECIOS ---
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, items: [itemParaCalcular] }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al calcular el precio");
      }

      const [calculatedItem] = await res.json(); // La API devuelve un array

      // Calcular el peso (la API de precios no devuelve peso)
      const tarifa = tarifas?.find(t => 
        t.material === selectedProducto.material?.nombre && 
        t.espesor == selectedEspesor
      );
      const pesoPorM2 = tarifa?.peso || 0;
      const areaPorPieza = (ancho / 1000) * (largo / 1000); 
      const pesoUnitario = pesoPorM2 * areaPorPieza;
      // --- FIN CÁLCULO DE PESO ---

      const newItem = {
        id: Date.now(),
        descripcion: selectedProducto.nombre,
        medidas: `${ancho} x ${largo}`,
        unidades: unidades,
        precioUnitario: calculatedItem.unitPrice, // Precio calculado por la API
        pesoUnitario: pesoUnitario,
        precioTotal: calculatedItem.unitPrice * unidades,
        pesoTotal: pesoUnitario * unidades,
      };

      setItemsAgregados(prev => [...prev, newItem]);
      
      // Resetear inputs
      setSelectedMaterial('');
      setSelectedProducto(null);
      setSelectedEspesor('');
      setUnidades(1);
      setAncho(0);
      setLargo(0);

    } catch (error) {
      console.error("Error al añadir item:", error);
      alert(`Error al calcular precio: ${error.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  // 7. Handler para eliminar un item
  const handleRemoveItem = (id) => {
    setItemsAgregados(prev => prev.filter(item => item.id !== id));
  };

  const isLoading = tarifasLoading || clientesLoading || plantillasLoading;

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || clientesError || plantillasError) return <div className="text-red-500 text-center">Error al cargar datos necesarios.</div>;

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
              
              {/* Selector de Cliente (NUEVO) */}
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Cliente (Requerido para precios)</span></div>
                <select 
                  className="select select-bordered"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  required
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </label>

              {/* Primera fila de inputs (MODIFICADA) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Material</span></div>
                  <select 
                    className="select select-bordered"
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    disabled={!clienteId}
                  >
                    <option value="">Selecciona material</option>
                    {uniqueMaterials.map(material => (
                      <option key={material} value={material}>{material}</option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Producto (Plantilla)</span></div>
                  <select 
                    className="select select-bordered"
                    value={selectedProducto?.id || ''}
                    onChange={(e) => handleProductoChange(e.target.value)}
                    disabled={!selectedMaterial || !clienteId}
                  >
                    <option value="">Selecciona producto</option>
                    {availableProductos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Segunda fila de inputs (MODIFICADA) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Unidades</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 5" 
                    className="input input-bordered"
                    value={unidades}
                    onChange={(e) => setUnidades(parseInt(e.target.value) || 1)}
                    disabled={!selectedProducto}
                  />
                </label>
                 <label className="form-control w-full">
                  <div className="label"><span className="label-text">Ancho (mm)</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 1200" 
                    className="input input-bordered"
                    value={ancho}
                    onChange={(e) => setAncho(parseInt(e.target.value) || 0)}
                    disabled={!selectedProducto}
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
                    disabled={!selectedProducto}
                  />
                </label>
              </div>

              <div className="card-actions justify-end mt-4">
                <button onClick={handleAddItem} className="btn btn-primary" disabled={isAddingItem || !selectedProducto}>
                  {isAddingItem ? <span className="loading loading-spinner loading-xs"></span> : <Plus className="w-4 h-4" />}
                  Añadir Item al Cálculo
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
