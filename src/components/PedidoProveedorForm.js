"use client";
import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, UserPlus } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- Componente Modal para crear Proveedor ---
const NuevoProveedorModal = ({ onClose, onProveedorCreado }) => {
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al crear proveedor');
      }
      const nuevoProveedor = await res.json();
      mutate('/api/proveedores'); // Revalida la lista de proveedores
      onProveedorCreado(nuevoProveedor); // Pasa el nuevo proveedor de vuelta
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Nuevo Proveedor</h3>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre" className="input input-bordered w-full" required />
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="input input-bordered w-full" />
          <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Teléfono" className="input input-bordered w-full" />
          <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Dirección" className="input input-bordered w-full" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Estado inicial por defecto para un formulario nuevo ---
const defaultFormState = {
  proveedorId: '',
  material: '',
  notas: '',
  tasaCambio: 1,
  gastosTotales: 0,
  bobinas: [],
};

// --- Componente Principal del Formulario ---
export default function PedidoProveedorForm({ tipo, initialData = null }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState(
    initialData ? 
    {
      proveedorId: initialData.proveedorId,
      material: initialData.material,
      notas: initialData.notas || '',
      tasaCambio: initialData.tasaCambio || 1,
      gastosTotales: initialData.gastosTotales || 0,
      bobinas: initialData.bobinas.map(b => ({
        ...b,
        referenciaId: b.referenciaId || '', // Asegurar que sea string vacío
      })) || [],
    } : 
    { ...defaultFormState, tipo: tipo }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        proveedorId: initialData.proveedorId,
        material: initialData.material,
        notas: initialData.notas || '',
        tasaCambio: initialData.tasaCambio || 1,
        gastosTotales: initialData.gastosTotales || 0,
        bobinas: initialData.bobinas.map(b => ({
          ...b,
          referenciaId: b.referenciaId || '',
        })) || [],
      });
    }
  }, [initialData]);

  // --- Carga de datos para Selectores ---
  const { data: proveedores, error: provError } = useSWR('/api/proveedores', fetcher);
  const { data: materiales, error: matError } = useSWR('/api/materiales', fetcher);
  const { data: referencias, error: refError } = useSWR('/api/configuracion/referencias', fetcher);
  const { data: tarifas, error: tarifasError } = useSWR('/api/precios', fetcher); // Para espesores

  // --- Lógica de Espesores Dinámicos ---
  const availableEspesores = useMemo(() => {
    if (!tarifas || !formData.material) return [];
    const espesores = tarifas
      .filter(t => t.material === formData.material)
      .map(t => t.espesor); // Son strings, ej "10", "15"
    return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, formData.material]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBobinaChange = (index, field, value) => {
    const newBobinas = [...formData.bobinas];
    newBobinas[index][field] = value;
    setFormData(prev => ({ ...prev, bobinas: newBobinas }));
  };

  const addBobina = () => {
    setFormData(prev => ({ ...prev, bobinas: [...prev.bobinas, { referenciaId: '', ancho: 0, largo: 0, espesor: 0, precioMetro: 0 }] }));
  };

  const removeBobina = (index) => {
    setFormData(prev => ({ ...prev, bobinas: prev.bobinas.filter((_, i) => i !== index) }));
  };

  const handleProveedorCreado = (nuevoProveedor) => {
    setFormData(prev => ({ ...prev, proveedorId: nuevoProveedor.id }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const isEditMode = !!initialData;
    
    const dataToSend = {
      ...formData,
      tipo: tipo,
      // Convertir campos numéricos
      gastosTotales: parseFloat(formData.gastosTotales) || 0,
      tasaCambio: parseFloat(formData.tasaCambio) || 1,
      bobinas: formData.bobinas.map(b => ({
        ...b,
        referenciaId: b.referenciaId || null,
        ancho: parseFloat(b.ancho) || 0,
        largo: parseFloat(b.largo) || 0,
        espesor: parseFloat(b.espesor) || 0,
        precioMetro: parseFloat(b.precioMetro) || 0,
      })),
    };

    const url = isEditMode 
      ? `/api/pedidos-proveedores-data/${initialData.id}` 
      : '/api/pedidos-proveedores-data';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el pedido');
      }
      mutate('/api/pedidos-proveedores-data'); 
      router.push('/proveedores'); 
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card de Datos Principales */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Datos del Pedido</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector de Proveedor con Botón de Añadir */}
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Proveedor</span></div>
                <div className="join w-full">
                  <select 
                    name="proveedorId"
                    value={formData.proveedorId}
                    onChange={handleFormChange}
                    className="select select-bordered join-item w-full" 
                    required
                  >
                    <option value="">Selecciona un proveedor</option>
                    {provError && <option disabled>Error al cargar</option>}
                    {proveedores?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsModalOpen(true)} className="btn btn-primary join-item">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </label>

              {/* Selector de Material */}
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Material Principal</span></div>
                <select 
                  name="material"
                  value={formData.material}
                  onChange={handleFormChange}
                  className="select select-bordered w-full" 
                  required
                >
                  <option value="">Selecciona un material</option>
                  {matError && <option disabled>Error al cargar</option>}
                  {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                </select>
              </label>
            </div>
            
            {/* Campos de Costes y Notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
             <label className="form-control w-full">
              <div className="label"><span className="label-text">Gastos Totales ({tipo === 'IMPORTACION' ? '$' : '€'})</span></div>
              <input 
                type="number" 
                step="0.01" 
                name="gastosTotales" 
                value={formData.gastosTotales} 
                onChange={handleFormChange} 
                className="input input-bordered w-full" 
              />
            </label>
            {tipo === 'IMPORTACION' && (
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Tasa de Cambio (USD a EUR)</span></div>
                <input 
                  type="number" 
                  step="0.0001" 
                  name="tasaCambio" 
                  value={formData.tasaCambio} 
                  onChange={handleFormChange} 
                  className="input input-bordered w-full" 
                />
              </label>
            )}
            </div>
            {/* Campo de Notas */}
            <label className="form-control w-full mt-4">
              <div className="label"><span className="label-text">Notas del Pedido</span></div>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleFormChange}
                className="textarea textarea-bordered h-24"
                placeholder="Ej: El envoltorio llegó roto..."
              ></textarea>
            </label>
          </div>
        </div>

        {/* Card de Bobinas */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Bobinas</h2>
              <button type="button" onClick={addBobina} className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Añadir Bobina
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Ancho (mm)</th>
                    <th>Largo (m)</th>
                    <th>Espesor (mm)</th>
                    <th>Precio/m ({tipo === 'IMPORTACION' ? '$' : '€'})</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.bobinas.length === 0 && (
                    <tr><td colSpan="6" className="text-center">Añade al menos una bobina.</td></tr>
                  )}
                  {formData.bobinas.map((bobina, index) => (
                    <tr key={index}>
                      <td>
                        <select 
                          value={bobina.referenciaId} 
                          onChange={(e) => handleBobinaChange(index, 'referenciaId', e.target.value)} 
                          className="select select-bordered select-sm w-full"
                        >
                          <option value="">Selecciona ref.</option>
                          {refError && <option disabled>Error</option>}
                          {referencias?.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                      </td>
                      <td><input type="number" step="0.1" value={bobina.ancho || ''} onChange={(e) => handleBobinaChange(index, 'ancho', e.target.value)} className="input input-bordered input-sm w-24" /></td>
                      <td><input type="number" step="0.1" value={bobina.largo || ''} onChange={(e) => handleBobinaChange(index, 'largo', e.target.value)} className="input input-bordered input-sm w-24" /></td>
                      <td>
                        <select 
                          value={bobina.espesor || ''} 
                          onChange={(e) => handleBobinaChange(index, 'espesor', e.target.value)} 
                          className="select select-bordered select-sm w-24"
                          disabled={!formData.material}
                        >
                          <option value="">Espesor</option>
                          {availableEspesores.map(e => <option key={e} value={e}>{e} mm</option>)}
                        </select>
                      </td>
                      <td><input type="number" step="0.01" value={bobina.precioMetro} onChange={(e) => handleBobinaChange(index, 'precioMetro', e.target.value)} className="input input-bordered input-sm w-28" /></td>
                      <td>
                        <button type="button" onClick={() => removeBobina(index)} className="btn btn-ghost btn-sm btn-circle">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tarifasError && <p className="text-red-500 text-xs mt-2">Error al cargar espesores (tarifas).</p>}
            </div>
          </div>
        </div>
        
        {error && <div className="alert alert-error shadow-lg">{error}</div>}

        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={() => router.push('/proveedores')} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : (initialData ? "Actualizar Pedido" : "Guardar Pedido")}
          </button>
        </div>
      </form>

      {isModalOpen && (
        <NuevoProveedorModal 
          onClose={() => setIsModalOpen(false)} 
          onProveedorCreado={handleProveedorCreado}
        />
      )}
    </>
  );
}
