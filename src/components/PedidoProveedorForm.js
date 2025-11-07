"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, UserPlus, X } from 'lucide-react';
import "react-day-picker/style.css";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BaseQuickCreateModal } from "@/components/BaseQuickCreateModal"; // IMPORTACIÓN REFACTORIZADA

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- Estado inicial por defecto para un formulario nuevo ---
const defaultFormState = {
  proveedorId: '',
  material: '',
  notas: '',
  tasaCambio: 1,
  gastosTotales: 0,
  bobinas: [],
  numeroContenedor: '',
  naviera: '',
  fechaLlegadaEstimada: null,
};

// --- Componente Principal del Formulario ---
export default function PedidoProveedorForm({ tipo, initialData = null }) {
  const router = useRouter();
  
  // Estado para modals y búsqueda
  const [modalState, setModalState] = useState(null); // 'PROVEEDOR', 'REFERENCIA'
  const [proveedorBusqueda, setProveedorBusqueda] = useState(initialData?.proveedor?.nombre || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const parseInitialData = (data) => {
    if (!data) return { ...defaultFormState, tipo: tipo };
    return {
      proveedorId: data.proveedorId,
      material: data.material,
      notas: data.notas || '',
      tasaCambio: data.tasaCambio || 1,
      gastosTotales: data.gastosTotales || 0,
      numeroContenedor: data.numeroContenedor || '',
      naviera: data.naviera || '',
      fechaLlegadaEstimada: data.fechaLlegadaEstimada ? new Date(data.fechaLlegadaEstimada) : null,
      bobinas: data.bobinas.map(b => ({
        ...b,
        referenciaId: b.referenciaId || '', 
        referenciaNombre: b.referencia?.nombre || '',
        referenciaBusqueda: b.referencia?.nombre || '', 
        color: b.color || '', 
      })) || [],
    };
  };

  const [formData, setFormData] = useState(parseInitialData(initialData));

  useEffect(() => {
    setFormData(parseInitialData(initialData));
    if (initialData?.proveedor?.nombre) setProveedorBusqueda(initialData.proveedor.nombre);
  }, [initialData]);

  // --- Carga de datos para Selectores ---
  const { data: proveedores, error: provError } = useSWR('/api/proveedores', fetcher);
  const { data: materiales, error: matError } = useSWR('/api/materiales', fetcher);
  const { data: referencias, error: refError } = useSWR('/api/configuracion/referencias', fetcher);
  const { data: tarifas, error: tarifasError } = useSWR('/api/precios', fetcher); 
  
  // Colores de PVC 
  const pvcColors = ['Blanco', 'Verde', 'Azul', 'Rojo'];

  // --- Lógica de Espesores Dinámicos (SIMPLIFICADA - usa solo tarifas) ---
  const availableEspesores = useMemo(() => {
    if (!tarifas || !formData.material) return [];
    
    const espesores = tarifas
      .filter(t => t.material.toLowerCase() === formData.material.toLowerCase()) // Filtrar por material
      .map(t => String(t.espesor)); // Mapear a string para usar en <select>

    // Asegurar unicidad y ordenar
    return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, formData.material]);
  // ----------------------------------------------------

  // --- Lógica de Búsqueda de Proveedores ---
  const filteredProveedores = proveedores?.filter(p => 
    p.nombre.toLowerCase().includes(proveedorBusqueda.toLowerCase()) && p.id !== formData.proveedorId
  ).slice(0, 5) || [];

  const handleSelectProveedor = (proveedorId, proveedorName) => {
    setFormData(prev => ({ ...prev, proveedorId }));
    setProveedorBusqueda(proveedorName);
  };
  
  const handleClearProveedor = () => {
    setFormData(prev => ({ ...prev, proveedorId: '' }));
    setProveedorBusqueda('');
  };
  
  const handleProveedorCreado = (nuevoProveedor) => {
    setFormData(prev => ({ ...prev, proveedorId: nuevoProveedor.id }));
    setProveedorBusqueda(nuevoProveedor.nombre);
    setModalState(null);
  };
  // ------------------------------------------

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Si cambia el material, limpiar espesores y colores de bobinas
    if (name === 'material') {
        // Al cambiar el material, limpiamos espesor y color
        const newBobinas = formData.bobinas.map(b => ({ ...b, espesor: '', color: '' }));
        setFormData(prev => ({ ...prev, [name]: value, bobinas: newBobinas }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBobinaChange = (index, field, value) => {
    const newBobinas = [...formData.bobinas];
    newBobinas[index][field] = value;
    
    if (field === 'referenciaBusqueda') {
        newBobinas[index].referenciaNombre = value;
    }
    
    setFormData(prev => ({ ...prev, bobinas: newBobinas }));
  };
  
  const handleSelectReferencia = (index, refId, refName) => {
      const newBobinas = [...formData.bobinas];
      newBobinas[index].referenciaId = refId;
      newBobinas[index].referenciaBusqueda = refName;
      newBobinas[index].referenciaNombre = refName;
      
      // Intentar rellenar ancho/largo/espesor si es posible (solo funciona si se cargan con el producto)
      const selectedRef = referencias.find(r => r.id === refId);
      if (selectedRef) {
          // Si la referencia tiene ancho/lonas/peso precargado, lo usamos
          newBobinas[index].ancho = selectedRef.ancho || newBobinas[index].ancho;
          // Dejamos largo y espesor para que el usuario los ajuste si es necesario.
      }
      
      setFormData(prev => ({ ...prev, bobinas: newBobinas }));
  };
  
  const handleReferenciaCreada = (index, newRef) => {
      const newBobinas = [...formData.bobinas];
      newBobinas[index].referenciaId = newRef.id;
      newBobinas[index].referenciaBusqueda = newRef.nombre; // Usamos 'nombre' del objeto creado
      newBobinas[index].referenciaNombre = newRef.nombre;
      
      // Rellenar campos opcionales con el valor creado si existen
      newBobinas[index].ancho = newRef.ancho || newBobinas[index].ancho;
      
      setFormData(prev => ({ ...prev, bobinas: newBobinas }));
      setModalState(null);
  };

  const addBobina = () => {
    setFormData(prev => ({ 
        ...prev, 
        bobinas: [...prev.bobinas, { 
            referenciaId: '', 
            referenciaBusqueda: '', 
            ancho: 0, 
            largo: 0, 
            espesor: '',
            color: '',
            precioMetro: 0 
        }] 
    }));
  };

  const removeBobina = (index) => {
    setFormData(prev => ({ ...prev, bobinas: prev.bobinas.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const isEditMode = !!initialData;
    
    if (!formData.proveedorId) {
        setError('Debe seleccionar o crear un proveedor.');
        setIsLoading(false);
        return;
    }

    const dataToSend = {
      ...formData,
      proveedorId: formData.proveedorId, 
      tipo: tipo,
      gastosTotales: parseFloat(formData.gastosTotales) || 0,
      tasaCambio: parseFloat(formData.tasaCambio) || 1,
      fechaLlegadaEstimada: formData.fechaLlegadaEstimada ? formData.fechaLlegadaEstimada.toISOString() : null,
      bobinas: formData.bobinas.map(b => ({
        ...b,
        referenciaId: b.referenciaId || null,
        ancho: parseFloat(b.ancho) || null,
        largo: parseFloat(b.largo) || null,
        // Usar null para que Prisma use el tipo Float?
        espesor: b.espesor ? parseFloat(b.espesor) : null, 
        color: b.color || null,
        precioMetro: parseFloat(b.precioMetro) || 0,
        referenciaBusqueda: undefined,
        referenciaNombre: undefined,
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
              {/* Selector de Proveedor con Búsqueda/Creación */}
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Proveedor</span></div>
                <div className="dropdown w-full">
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Escribe para buscar o crea uno nuevo..."
                            value={proveedorBusqueda}
                            onChange={(e) => {
                                setProveedorBusqueda(e.target.value);
                                if (e.target.value.length === 0) setFormData(prev => ({ ...prev, proveedorId: '' }));
                            }}
                            className={`input input-bordered w-full ${formData.proveedorId ? 'border-success' : ''}`}
                            tabIndex={0}
                            required
                        />
                        {formData.proveedorId && (
                            <button type="button" onClick={handleClearProveedor} className="btn btn-ghost btn-square">
                                <X className="w-4 h-4 text-error" />
                            </button>
                        )}
                        <button type="button" onClick={() => setModalState({ type: 'PROVEEDOR' })} className="btn btn-primary">
                            <UserPlus className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {proveedorBusqueda.length >= 2 && filteredProveedores.length > 0 && formData.proveedorId === '' && (
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-full">
                            {filteredProveedores.map(p => (
                                <li key={p.id} onClick={() => handleSelectProveedor(p.id, p.nombre)}>
                                    <a>{p.nombre}</a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
              </label>

              {/* Selector de Material */}
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Material</span></div>
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
            
            {/* --- CAMPOS DE IMPORTACIÓN --- */}
            {tipo === 'IMPORTACION' && (
              <div className="p-4 border border-base-300 rounded-lg mt-4">
                <h3 className="font-bold mb-2">Datos de Importación</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="form-control w-full">
                    <div className="label"><span className="label-text">Nº Contenedor</span></div>
                    <input 
                      type="text" 
                      name="numeroContenedor" 
                      value={formData.numeroContenedor} 
                      onChange={handleFormChange} 
                      className="input input-bordered w-full" 
                      placeholder="YMLU3456940"
                    />
                  </label>
                  <label className="form-control w-full">
                    <div className="label"><span className="label-text">Naviera</span></div>
                    <select 
                      name="naviera"
                      value={formData.naviera}
                      onChange={handleFormChange}
                      className="select select-bordered w-full" 
                    >
                      <option value="">Selecciona naviera</option>
                      <option value="Yang Ming">Yang Ming</option>
                      <option value="MSC">MSC</option>
                      <option value="Maersk">Maersk</option>
                      <option value="CMA CGM">CMA CGM</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </label>
                  
                  <label className="form-control w-full">
                    <div className="label"><span className="label-text">Fecha Llegada (ETA)</span></div>
                    <div className="dropdown">
                      <input 
                        type="text" 
                        readOnly
                        value={formData.fechaLlegadaEstimada ? format(formData.fechaLlegadaEstimada, 'P', { locale: es }) : ''}
                        placeholder="Selecciona fecha"
                        className="input input-bordered w-full" 
                        tabIndex={0}
                      />
                      <div className="dropdown-content bg-base-100 p-2 shadow rounded-lg z-10">
                        <DayPicker
                          mode="single"
                          selected={formData.fechaLlegadaEstimada}
                          onSelect={(date) => setFormData(prev => ({ ...prev, fechaLlegadaEstimada: date }))}
                          locale={es}
                        />
                      </div>
                    </div>
                  </label>

                </div>
              </div>
            )}
            
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
            <label className="form-control w-full mt-4">
              <div className="label"><span className="label-text">Notas del Pedido</span></div>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleFormChange}
                className="textarea textarea-bordered h-24"
                placeholder="Ej: Sin comentarios"
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
                    {/* Campo adicional para PVC */}
                    {formData.material === 'PVC' && <th>Color</th>} 
                    <th>Ancho (mm)</th>
                    <th>Largo (m)</th>
                    <th>Espesor (mm)</th>
                    <th>Precio/m ({tipo === 'IMPORTACION' ? '$' : '€'})</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.bobinas.length === 0 && (
                    <tr><td colSpan={formData.material === 'PVC' ? "7" : "6"} className="text-center">Añade al menos una bobina.</td></tr>
                  )}
                  {formData.bobinas.map((bobina, index) => {
                      // Filtrar referencias disponibles en tiempo real (BUG FIX: Añadir '?.' para r.referencia)
                      const filteredRefs = referencias?.filter(r => 
                          r?.referencia?.toLowerCase().includes(bobina.referenciaBusqueda?.toLowerCase() || '')
                      ).slice(0, 5) || [];
                      
                      return (
                        <tr key={index}>
                          <td>
                            {/* Búsqueda de Referencia Bobina con Quick Create */}
                            <div className="dropdown w-full">
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        value={bobina.referenciaBusqueda || ''} 
                                        onChange={(e) => {
                                            handleBobinaChange(index, 'referenciaBusqueda', e.target.value);
                                            handleBobinaChange(index, 'referenciaId', ''); // Limpiar ID al buscar
                                        }} 
                                        className="input input-bordered input-sm w-full"
                                        placeholder="Buscar Ref."
                                        tabIndex={0}
                                    />
                                    <button type="button" onClick={() => setModalState({ type: 'REFERENCIA', index })} className="btn btn-primary btn-sm">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                {/* Resultados de búsqueda (Ajuste de estilo para que no se oculte) */}
                                {bobina.referenciaBusqueda?.length >= 2 && filteredRefs.length > 0 && (
                                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-96 max-w-lg mt-1">
                                        {filteredRefs.map(r => (
                                            <li key={r.id} onClick={() => handleSelectReferencia(index, r.id, r.referencia)}>
                                                <a>{r.referencia}</a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                
                                {bobina.referenciaId && (
                                    <p className="text-xs text-success mt-1">Seleccionado: {bobina.referenciaNombre}</p>
                                )}
                            </div>
                          </td>
                          
                          {/* CAMPO CONDICIONAL: Color para PVC */}
                          {formData.material === 'PVC' && (
                              <td>
                                  <select 
                                      value={bobina.color || ''} 
                                      onChange={(e) => handleBobinaChange(index, 'color', e.target.value)} 
                                      className="select select-bordered select-sm w-24"
                                      required
                                  >
                                      <option value="">Color</option>
                                      {pvcColors.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                              </td>
                          )}

                          <td><input type="number" step="0.1" value={bobina.ancho || ''} onChange={(e) => handleBobinaChange(index, 'ancho', e.target.value)} className="input input-bordered input-sm w-24" /></td>
                          <td><input type="number" step="0.1" value={bobina.largo || ''} onChange={(e) => handleBobinaChange(index, 'largo', e.target.value)} className="input input-bordered input-sm w-24" /></td>
                          <td>
                            {/* Selector de espesor (filtrado dinámicamente) */}
                            <select 
                              value={bobina.espesor || ''} 
                              onChange={(e) => handleBobinaChange(index, 'espesor', e.target.value)} 
                              className="select select-bordered select-sm w-24"
                              disabled={!formData.material}
                              required
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
                      )}
                  )}
                </tbody>
              </table>
              {tarifasError && <p className="text-red-500 text-xs mt-2">Error al cargar espesores (tarifas).</p>}
            </div>
          </div>
        </div>
        
        {error && <div className="alert alert-error shadow-lg">{error}</div>}

        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={() => router.push('/proveedores')} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading || !formData.proveedorId}>
            <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : (initialData ? "Actualizar Pedido" : "Guardar Pedido")}
          </button>
        </div>
      </form>

      {modalState?.type === 'PROVEEDOR' && (
        <BaseQuickCreateModal 
          isOpen={true}
          onClose={() => setModalState(null)} 
          onCreated={handleProveedorCreado}
          title="Proveedor"
          endpoint="/api/proveedores"
          cacheKey="/api/proveedores"
          fields={[
              { name: 'nombre', placeholder: 'Nombre' },
              { name: 'email', placeholder: 'Email', required: false },
              { name: 'telefono', placeholder: 'Teléfono', required: false },
              { name: 'direccion', placeholder: 'Dirección', required: false }
          ]}
        />
      )}

      {modalState?.type === 'REFERENCIA' && (
        <BaseQuickCreateModal 
          isOpen={true}
          onClose={() => setModalState(null)} 
          onCreated={(newRef) => handleReferenciaCreada(modalState.index, newRef)}
          title="Referencia Bobina"
          endpoint="/api/configuracion/referencias"
          cacheKey="/api/configuracion/referencias"
          fields={[
              // Usamos 'nombre' que es el campo mapeado en Prisma a 'referencia'
              { name: 'nombre', placeholder: 'Referencia (ej: EP-250-2-400)' }, 
              { name: 'ancho', placeholder: 'Ancho (mm)', type: 'number', required: false, step: '0.01' },
              { name: 'lonas', placeholder: 'Número de Lonas', type: 'number', required: false },
              { name: 'pesoPorMetroLineal', placeholder: 'Peso por Metro Lineal (kg)', type: 'number', required: false, step: '0.01' }
          ]}
        />
      )}
    </>
  );
}
