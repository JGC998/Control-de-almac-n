"use client";
import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusCircle, Edit, Trash2, Package } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GestionProductos() {
  const [formData, setFormData] = useState({ 
    id: null, nombre: '', modelo: '', espesor: '', largo: '', ancho: '', 
    precioUnitario: '', pesoUnitario: '', costo: '', 
    fabricante: '', material: '' 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const { data: productos, error: productosError, isLoading: productosLoading } = useSWR('/api/productos', fetcher);
  const { data: fabricantes, error: fabError, isLoading: fabLoading } = useSWR('/api/fabricantes', fetcher);
  const { data: materiales, error: matError, isLoading: matLoading } = useSWR('/api/materiales', fetcher);
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);

  const isLoading = productosLoading || fabLoading || matLoading || tarifasLoading;

  const openModal = (producto = null) => {
    if (producto) {
      const mapNumField = (value) => (value === 0 || value === null || value === undefined) ? '' : value;

      setFormData({ 
        id: producto.id, 
        nombre: producto.nombre, 
        modelo: producto.referenciaFabricante || '', 
        espesor: mapNumField(producto.espesor), 
        largo: mapNumField(producto.largo), 
        ancho: mapNumField(producto.ancho), 
        precioUnitario: mapNumField(producto.precioUnitario), 
        pesoUnitario: mapNumField(producto.pesoUnitario), 
        costo: mapNumField(producto.costoUnitario), 
        fabricante: producto.fabricante?.nombre || '', 
        material: producto.material?.nombre || ''
      });
    } else {
      setFormData({ 
        id: null, nombre: '', modelo: '', espesor: '', largo: '', ancho: '', 
        precioUnitario: '', pesoUnitario: '', costo: '', 
        fabricante: '', material: '' 
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // --- LÓGICA DE CÁLCULO AUTOMÁTICO (COSTO Y PESO) ---
  const { calculatedCoste, calculatedPeso } = useMemo(() => {
    const { material, espesor, ancho, largo } = formData;
    
    const esp = parseFloat(espesor);
    const w = parseFloat(ancho);
    const l = parseFloat(largo);
    
    if (!tarifas || !material || isNaN(esp) || isNaN(w) || isNaN(l) || w <= 0 || l <= 0) {
      return { calculatedCoste: '', calculatedPeso: '' }; 
    }

    const tarifa = tarifas.find(t => 
      t.material === material && parseFloat(t.espesor) === esp
    );
    
    if (!tarifa) {
        return { calculatedCoste: '', calculatedPeso: '' }; 
    }

    const areaM2 = (w / 1000) * (l / 1000); 
    
    // 1. Costo Unitario = Área * Precio Tarifa (€/m²)
    const costo = areaM2 * (tarifa.precio || 0);
    
    // 2. Peso Unitario = Área * Peso Tarifa (kg/m²)
    const peso = areaM2 * (tarifa.peso || 0);

    return { 
        calculatedCoste: costo.toFixed(2), 
        calculatedPeso: peso.toFixed(2) 
    };
    
  }, [formData.material, formData.espesor, formData.ancho, formData.largo, tarifas]);
  
  // Sincronizar el costo calculado
  useEffect(() => {
    if (isModalOpen && calculatedCoste !== '' && calculatedCoste !== formData.costo) {
        setFormData(prev => ({ ...prev, costo: calculatedCoste }));
    }
  }, [calculatedCoste, isModalOpen]);

  // Sincronizar el peso calculado
  useEffect(() => {
    if (isModalOpen && calculatedPeso !== '' && calculatedPeso !== formData.pesoUnitario) {
        setFormData(prev => ({ ...prev, pesoUnitario: calculatedPeso }));
    }
  }, [calculatedPeso, isModalOpen]);


  const isCostoAutoCalculado = useMemo(() => calculatedCoste !== '', [calculatedCoste]);
  const isPesoAutoCalculado = useMemo(() => calculatedPeso !== '', [calculatedPeso]);
  // --- FIN LÓGICA DE CÁLCULO AUTOMÁTICO ---


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = formData.id ? `/api/productos/${formData.id}` : '/api/productos';
    const method = formData.id ? 'PUT' : 'POST';
    
    const parseNum = (value) => (value === '' || value === null || value === undefined) ? 0 : parseFloat(value);

    // Aseguramos que se envíe el valor calculado si existe
    const finalCosto = isCostoAutoCalculado ? parseNum(calculatedCoste) : parseNum(formData.costo);
    const finalPeso = isPesoAutoCalculado ? parseNum(calculatedPeso) : parseNum(formData.pesoUnitario);

    const dataToSend = {
      ...formData,
      espesor: parseNum(formData.espesor),
      largo: parseNum(formData.largo),
      ancho: parseNum(formData.ancho),
      precioUnitario: parseNum(formData.precioUnitario),
      pesoUnitario: finalPeso, // Usar peso calculado
      costo: finalCosto, // Usar costo calculado
      modelo: formData.modelo,
    };
    
    if (dataToSend.precioUnitario === 0) {
        setError("El precio unitario no puede ser 0.");
        return;
    }


    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el producto');
      }

      mutate('/api/productos');
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar el producto');
        }
        mutate('/api/productos');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (productosError || fabError || matError || tarifasError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Package className="mr-2" /> Gestión de Productos</h1>
      
      <button onClick={() => openModal()} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Nuevo Producto
      </button>

      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Ref. Fab.</th>
              <th>Material</th>
              <th>P. Unitario</th>
              <th>Costo Unit.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(productos) && productos.map((p) => (
              <tr key={p.id} className="hover"><td className="font-bold">{p.nombre}</td><td>{p.referenciaFabricante || 'N/A'}</td><td>{p.material?.nombre || 'N/A'}</td><td>{p.precioUnitario.toFixed(2)} €</td><td>{p.costoUnitario ? p.costoUnitario.toFixed(2) + ' €' : 'N/A'}</td><td className="flex gap-2"><button onClick={() => openModal(p)} className="btn btn-sm btn-outline btn-info"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(p.id)} className="btn btn-sm btn-outline btn-error"><Trash2 className="w-4 h-4" /></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear/Editar Producto */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl">
            <h3 className="font-bold text-lg">{formData.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre" className="input input-bordered w-full md:col-span-2" required />
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Referencia Fabricante" className="input input-bordered w-full" />
              
              <select name="fabricante" value={formData.fabricante} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Fabricante</option>
                {fabricantes?.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
              </select>
              
              <select name="material" value={formData.material} onChange={handleSelectChange} className="select select-bordered w-full" required>
                <option value="">Selecciona Material</option>
                {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </select>
              
              {/* CAMPO DE COSTO UNITARIO (Automático) */}
              <input 
                type="number" 
                step="0.01" 
                name="costo" 
                value={isCostoAutoCalculado ? calculatedCoste : formData.costo} 
                onChange={handleChange} 
                placeholder={isCostoAutoCalculado ? `Auto-Calculado: ${calculatedCoste} €` : "Costo Unitario (€)"} 
                className={`input input-bordered w-full ${isCostoAutoCalculado ? 'bg-base-200 text-success font-bold' : ''}`}
                readOnly={isCostoAutoCalculado}
                title={isCostoAutoCalculado ? "El costo se calcula automáticamente basado en la tarifa del material." : "Ingrese el costo unitario manualmente."}
              />
              {/* CAMPO DE PRECIO UNITARIO */}
              <input type="number" step="0.01" name="precioUnitario" value={formData.precioUnitario} onChange={handleChange} placeholder="Precio Unitario (€)" className="input input-bordered w-full" required />
              
              {/* CAMPO DE PESO UNITARIO (Automático) */}
              <input 
                type="number" 
                step="0.01" 
                name="pesoUnitario" 
                value={isPesoAutoCalculado ? calculatedPeso : formData.pesoUnitario} 
                onChange={handleChange} 
                placeholder={isPesoAutoCalculado ? `Auto-Calculado: ${calculatedPeso} kg` : "Peso Unitario (kg)"} 
                className={`input input-bordered w-full ${isPesoAutoCalculado ? 'bg-base-200 text-success font-bold' : ''}`}
                readOnly={isPesoAutoCalculado}
                title={isPesoAutoCalculado ? "El peso se calcula automáticamente basado en la tarifa del material." : "Ingrese el peso unitario manualmente."}
              />

              {/* CAMPOS DE DIMENSIONES */}
              <input type="number" step="0.01" name="espesor" value={formData.espesor} onChange={handleChange} placeholder="Espesor (mm)" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="largo" value={formData.largo} onChange={handleChange} placeholder="Largo (mm)" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="Ancho (mm)" className="input input-bordered w-full" />
              
              {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
              
              <div className="modal-action md:col-span-2">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
