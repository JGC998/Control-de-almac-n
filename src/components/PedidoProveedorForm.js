"use client";
import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, UserPlus, X, Search, AlertCircle, ArrowRight } from 'lucide-react';
import "react-day-picker/style.css";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BaseQuickCreateModal } from "@/components/BaseQuickCreateModal";

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- MODAL DE BÚSQUEDA DE PROVEEDORES (NUEVO) ---
function ProveedorSearchModal({ isOpen, onClose, onSelect, onCreateNew, proveedores = [], initialSearch = '' }) {
    const [search, setSearch] = useState(initialSearch);
    
    useEffect(() => {
        if (isOpen) setSearch(initialSearch);
    }, [isOpen, initialSearch]);

    const filteredProveedores = useMemo(() => {
        if (!proveedores) return [];
        return proveedores.filter(p => {
            const matchesText = !search || 
                p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
                p.email?.toLowerCase().includes(search.toLowerCase());
            return matchesText;
        }).slice(0, 50);
    }, [proveedores, search]);

    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-[9999]">
            <div className="modal-box w-11/12 max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" /> Buscar Proveedor
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>

                <div className="join w-full mb-4">
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Escribe nombre o email..."
                        className="input input-bordered join-item w-full"
                        autoFocus
                    />
                    <button 
                        className="btn btn-primary join-item"
                        onClick={() => onCreateNew(search)}
                    >
                        <Plus className="w-4 h-4" /> Crear Nuevo
                    </button>
                </div>

                <div className="overflow-auto flex-1 bg-base-100 border rounded-lg">
                    <table className="table table-pin-rows w-full">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th className="text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProveedores.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">
                                        <p>No se encontraron proveedores.</p>
                                        <button onClick={() => onCreateNew(search)} className="btn btn-link btn-sm mt-2">
                                            Crear "{search}" ahora
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredProveedores.map((prov) => (
                                    <tr key={prov.id} className="hover:bg-base-200 cursor-pointer transition-colors" onClick={() => onSelect(prov)}>
                                        <td className="font-bold">{prov.nombre}</td>
                                        <td>{prov.email || '-'}</td>
                                        <td>{prov.telefono || '-'}</td>
                                        <td className="text-right">
                                            <button className="btn btn-xs btn-ghost"><ArrowRight className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="modal-action mt-4">
                    <button className="btn" onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}

// --- MODAL DE BÚSQUEDA DE REFERENCIAS ---
function ReferenciaSearchModal({ isOpen, onClose, onSelect, onCreateNew, referencias = [], initialSearch = '', materialFilter = '' }) {
    const [search, setSearch] = useState(initialSearch);
    
    useEffect(() => {
        if (isOpen) setSearch(initialSearch);
    }, [isOpen, initialSearch]);

    const filteredRefs = useMemo(() => {
        if (!referencias) return [];
        return referencias.filter(r => {
            const matchesText = !search || 
                r.referencia?.toLowerCase().includes(search.toLowerCase()) ||
                (r.ancho && r.ancho.toString().includes(search));
            return matchesText;
        }).slice(0, 50);
    }, [referencias, search]);

    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-[9999]">
            <div className="modal-box w-11/12 max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" /> Buscar Referencia
                        {materialFilter && <span className="badge badge-ghost text-xs font-normal">Filtro sugerido: {materialFilter}</span>}
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>

                <div className="join w-full mb-4">
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Escribe nombre, ancho..."
                        className="input input-bordered join-item w-full"
                        autoFocus
                    />
                    <button 
                        className="btn btn-primary join-item"
                        onClick={() => onCreateNew(search)}
                    >
                        <Plus className="w-4 h-4" /> Crear Nueva
                    </button>
                </div>

                <div className="overflow-auto flex-1 bg-base-100 border rounded-lg">
                    <table className="table table-pin-rows w-full">
                        <thead>
                            <tr>
                                <th>Referencia</th>
                                <th>Ancho</th>
                                <th>Lonas</th>
                                <th>Peso/m</th>
                                <th className="text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRefs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">
                                        <p>No se encontraron referencias.</p>
                                        <button onClick={() => onCreateNew(search)} className="btn btn-link btn-sm mt-2">
                                            Crear "{search}" ahora
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredRefs.map((ref) => (
                                    <tr key={ref.id} className="hover:bg-base-200 cursor-pointer transition-colors" onClick={() => onSelect(ref)}>
                                        <td className="font-bold">{ref.referencia}</td>
                                        <td>{ref.ancho ? `${ref.ancho} mm` : '-'}</td>
                                        <td>{ref.lonas || '-'}</td>
                                        <td>{ref.pesoPorMetroLineal ? `${ref.pesoPorMetroLineal} kg` : '-'}</td>
                                        <td className="text-right">
                                            <button className="btn btn-xs btn-ghost"><ArrowRight className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="modal-action mt-4">
                    <button className="btn" onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---

const defaultFormState = {
  proveedorId: '',
  numeroFactura: '', // AÑADIDO
  material: '',
  notas: '',
  tasaCambio: 1,
  gastosTotales: 0,
  bobinas: [],
  numeroContenedor: '',
  naviera: '',
  fechaLlegadaEstimada: null,
};

export default function PedidoProveedorForm({ tipo, initialData = null }) {
  const router = useRouter();
  
  const [modalState, setModalState] = useState(null); 
  const [refSearchModalOpen, setRefSearchModalOpen] = useState(false);
  const [provSearchModalOpen, setProvSearchModalOpen] = useState(false); // NUEVO ESTADO
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  const [proveedorBusqueda, setProveedorBusqueda] = useState(initialData?.proveedor?.nombre || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const parseInitialData = (data) => {
    if (!data) return { ...defaultFormState, tipo: tipo };
    return {
      proveedorId: data.proveedorId,
      numeroFactura: data.numeroFactura || '', // AÑADIDO
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
        referenciaNombre: b.referencia?.referencia || b.referencia?.nombre || '', 
        cantidad: b.cantidad || 1, 
        color: b.color || '', 
      })) || [],
    };
  };

  const [formData, setFormData] = useState(parseInitialData(initialData));

  useEffect(() => {
    setFormData(parseInitialData(initialData));
    if (initialData?.proveedor?.nombre) setProveedorBusqueda(initialData.proveedor.nombre);
  }, [initialData]);

  const { data: proveedores } = useSWR('/api/proveedores', fetcher);
  const { data: materiales, error: matError } = useSWR('/api/materiales', fetcher);
  const { data: referencias } = useSWR('/api/configuracion/referencias', fetcher);
  const { data: tarifas, error: tarifasError } = useSWR('/api/precios', fetcher); 
  
  const pvcColors = ['Blanco', 'Verde', 'Azul', 'Rojo'];

  const availableEspesores = useMemo(() => {
    if (!tarifas || !formData.material) return [];
    const espesores = tarifas
      .filter(t => t.material.toLowerCase() === formData.material.toLowerCase())
      .map(t => String(t.espesor));
    return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, formData.material]);

  // LOGICA PROVEEDOR
  const handleSelectProveedor = (prov) => {
    setFormData(prev => ({ ...prev, proveedorId: prov.id }));
    setProveedorBusqueda(prov.nombre);
    setProvSearchModalOpen(false);
  };

  const handleCreateNewProveedor = (searchTerm) => {
      setProvSearchModalOpen(false);
      setModalState({ type: 'PROVEEDOR', initialName: searchTerm });
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'material') {
        const newBobinas = formData.bobinas.map(b => ({ ...b, espesor: '', color: '' }));
        setFormData(prev => ({ ...prev, [name]: value, bobinas: newBobinas }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBobinaChange = (index, field, value) => {
    const newBobinas = [...formData.bobinas];
    newBobinas[index][field] = value;
    setFormData(prev => ({ ...prev, bobinas: newBobinas }));
  };
  
  // LOGICA REFERENCIAS
  const openRefSearchModal = (index) => {
      setActiveRowIndex(index);
      setRefSearchModalOpen(true);
  };

  const handleSelectReferencia = (ref) => {
      if (activeRowIndex === null) return;
      const newBobinas = [...formData.bobinas];
      newBobinas[activeRowIndex].referenciaId = ref.id;
      newBobinas[activeRowIndex].referenciaNombre = ref.referencia;
      if (ref.ancho) newBobinas[activeRowIndex].ancho = ref.ancho;
      
      setFormData(prev => ({ ...prev, bobinas: newBobinas }));
      setRefSearchModalOpen(false);
  };
  
  const handleCreateNewReferencia = (searchTerm) => {
      const newBobinas = [...formData.bobinas];
      newBobinas[activeRowIndex].referenciaNombre = searchTerm;
      setFormData(prev => ({ ...prev, bobinas: newBobinas }));
      
      setRefSearchModalOpen(false);
      setModalState({ type: 'REFERENCIA_NEW', index: activeRowIndex });
  };

  const handleReferenciaCreada = (index, newRef) => {
      const newBobinas = [...formData.bobinas];
      newBobinas[index].referenciaId = newRef.id;
      newBobinas[index].referenciaNombre = newRef.referencia || newRef.nombre; 
      newBobinas[index].ancho = newRef.ancho || newBobinas[index].ancho;
      setFormData(prev => ({ ...prev, bobinas: newBobinas }));
      setModalState(null);
  };

  // Busca la función addBobina y cámbiala por esta:
  const addBobina = () => {
    setFormData(prev => ({ 
        ...prev, 
        bobinas: [...prev.bobinas, { 
            referenciaId: '', 
            referenciaNombre: '', 
            cantidad: 1,    
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
    
    if (!formData.proveedorId) {
        setError('Debe seleccionar o crear un proveedor.');
        setIsLoading(false);
        return;
    }

    const bobinasInvalidas = formData.bobinas.filter(b => !b.referenciaId);
    if (bobinasInvalidas.length > 0) {
        setError(`Hay ${bobinasInvalidas.length} línea(s) sin referencia asignada.`);
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
        cantidad: parseInt(b.cantidad) || 1, 
        ancho: parseFloat(b.ancho) || null,
        largo: parseFloat(b.largo) || null,
        espesor: b.espesor ? parseFloat(b.espesor) : null, 
        color: b.color || null,
        precioMetro: parseFloat(b.precioMetro) || 0,
      })),
    };

    const url = !!initialData 
      ? `/api/pedidos-proveedores-data/${initialData.id}` 
      : '/api/pedidos-proveedores-data';
    const method = !!initialData ? 'PUT' : 'POST';

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
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Datos del Pedido</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SELECCION DE PROVEEDOR MEJORADA */}
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Proveedor</span></div>
                <div className="input-group cursor-pointer" onClick={() => setProvSearchModalOpen(true)}>
                    <input
                        type="text"
                        readOnly
                        value={proveedorBusqueda}
                        placeholder="Seleccionar proveedor..."
                        className={`input input-bordered w-full cursor-pointer ${formData.proveedorId ? 'input-success' : ''}`}
                    />
                    {formData.proveedorId && (
                        <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleClearProveedor(); }} 
                            className="btn btn-square btn-ghost text-error"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button type="button" className="btn btn-square btn-primary">
                        <Search className="w-4 h-4" />
                    </button>
                </div>
                {!formData.proveedorId && <span className="text-xs text-gray-500 mt-1 ml-1">Haga clic para buscar o crear</span>}
              </label>

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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
               <label className="form-control w-full">
                <div className="label"><span className="label-text font-bold">Fecha de Entrega Prevista</span></div>
                <div className="dropdown">
                  <input 
                    type="text" 
                    readOnly
                    value={formData.fechaLlegadaEstimada ? format(formData.fechaLlegadaEstimada, 'P', { locale: es }) : ''}
                    placeholder="Selecciona fecha"
                    className="input input-bordered w-full cursor-pointer" 
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

              <label className="form-control w-full">
                <div className="label"><span className="label-text">Gastos Totales ({tipo === 'IMPORTACION' ? '$' : '€'})</span></div>
                <input 
                    type="number" step="0.01" name="gastosTotales" 
                    value={formData.gastosTotales} onChange={handleFormChange} 
                    className="input input-bordered w-full" 
                />
              </label>

              {/* CAMPO NUMERO DE FACTURA AÑADIDO */}
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Nº Factura Proveedor</span></div>
                <input 
                    type="text" 
                    name="numeroFactura" 
                    value={formData.numeroFactura} 
                    onChange={handleFormChange} 
                    className="input input-bordered w-full" 
                    placeholder="Ej: INV-2025-001"
                />
              </label>

              {tipo === 'IMPORTACION' && (
                 <label className="form-control w-full">
                    <div className="label"><span className="label-text">Tasa Cambio ($/€)</span></div>
                    <input type="number" step="0.0001" name="tasaCambio" value={formData.tasaCambio} onChange={handleFormChange} className="input input-bordered w-full" />
                 </label>
              )}
            </div>
            
            <label className="form-control w-full mt-4">
              <div className="label"><span className="label-text">Notas del Pedido</span></div>
              <textarea name="notas" value={formData.notas} onChange={handleFormChange} className="textarea textarea-bordered h-20" placeholder="Comentarios..."></textarea>
            </label>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Bobinas del Pedido</h2>
              <button type="button" onClick={addBobina} className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Añadir Bobina
              </button>
            </div>
            
            <div className="overflow-x-auto"> 
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-1/3">Referencia</th>
                    {formData.material === 'PVC' && <th>Color</th>}
                    <th className="w-16">Cantidad</th>
                    <th>Ancho (mm)</th>
                    <th>Largo (m)</th>
                    <th>Espesor (mm)</th>
                    <th>Precio/m</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.bobinas.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-gray-500 py-4">Añade al menos una bobina para comenzar.</td></tr>
                  )}
                  {formData.bobinas.map((bobina, index) => {
                      const cantidad = parseInt(bobina.cantidad) || 1;
                      const subtotal = (parseFloat(bobina.largo) || 0) * (parseFloat(bobina.precioMetro) || 0) * cantidad;
                      return (
                        <tr key={index} className="hover">
                          <td>
                            <div className="form-control w-full">
                                <div className="input-group cursor-pointer" onClick={() => openRefSearchModal(index)}>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={bobina.referenciaNombre || ''} 
                                        placeholder="Seleccionar referencia..." 
                                        className={`input input-bordered input-sm w-full cursor-pointer ${!bobina.referenciaId ? 'input-warning' : 'input-success'}`}
                                    />
                                    <button type="button" className="btn btn-square btn-sm">
                                        <Search className="w-4 h-4" />
                                    </button>
                                </div>
                                {!bobina.referenciaId && <span className="text-xs text-warning mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Selecciona ref.</span>}
                            </div>
                          </td>
                          {/* Columna de Cantidad */}
                          <td className="border p-2">
                            <input
                              type="number"
                              min="1"
                              className="w-16 p-1 border rounded text-center font-bold text-blue-600"
                              // ↓↓↓ ESTA ES LA CLAVE DEL ERROR ↓↓↓
                              value={bobina.cantidad || 1} 
                              onChange={(e) => handleBobinaChange(index, 'cantidad', e.target.value)}
                            />
                          </td>
                          
                          {formData.material === 'PVC' && (
                              <td>
                                  <select value={bobina.color || ''} onChange={(e) => handleBobinaChange(index, 'color', e.target.value)} className="select select-bordered select-sm w-24" required>
                                      <option value="">Color</option>
                                      {pvcColors.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                              </td>
                          )}

                          <td><input type="number" step="0.1" placeholder="0" value={bobina.ancho || ''} onChange={(e) => handleBobinaChange(index, 'ancho', e.target.value)} className="input input-bordered input-sm w-20" /></td>
                          <td><input type="number" step="0.1" placeholder="0" value={bobina.largo || ''} onChange={(e) => handleBobinaChange(index, 'largo', e.target.value)} className="input input-bordered input-sm w-20" /></td>
                          <td>
                            <select value={bobina.espesor || ''} onChange={(e) => handleBobinaChange(index, 'espesor', e.target.value)} className="select select-bordered select-sm w-20" disabled={!formData.material} required>
                              <option value="">Espesor</option>
                              {availableEspesores.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                          </td>
                          <td><input type="number" step="0.01" placeholder="0.00" value={bobina.precioMetro} onChange={(e) => handleBobinaChange(index, 'precioMetro', e.target.value)} className="input input-bordered input-sm w-24" /></td>
                          
                          <td className="font-bold text-right text-primary">
                              {subtotal.toLocaleString('es-ES', { style: 'currency', currency: tipo === 'IMPORTACION' ? 'USD' : 'EUR' })}
                          </td>

                          <td>
                            <button type="button" onClick={() => removeBobina(index)} className="btn btn-ghost btn-sm btn-circle text-error">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )}
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {error && <div className="alert alert-error shadow-lg"><AlertCircle className="w-6 h-6"/><span>{error}</span></div>}

        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={() => router.push('/proveedores')} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading || !formData.proveedorId}>
            <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : "Guardar Pedido"}
          </button>
        </div>
      </form>

      {/* MODALS */}
      <ReferenciaSearchModal 
          isOpen={refSearchModalOpen} onClose={() => setRefSearchModalOpen(false)}
          onSelect={handleSelectReferencia} onCreateNew={handleCreateNewReferencia}
          referencias={referencias} initialSearch={formData.bobinas[activeRowIndex]?.referenciaNombre || ''}
          materialFilter={formData.material}
      />
      
      {/* MODAL DE BÚSQUEDA DE PROVEEDOR (NUEVO) */}
      <ProveedorSearchModal 
          isOpen={provSearchModalOpen} onClose={() => setProvSearchModalOpen(false)}
          onSelect={handleSelectProveedor} onCreateNew={handleCreateNewProveedor}
          proveedores={proveedores} initialSearch={proveedorBusqueda}
      />

      {modalState?.type === 'PROVEEDOR' && (
        <BaseQuickCreateModal 
          isOpen={true} onClose={() => setModalState(null)} onCreated={handleProveedorCreado}
          title="Proveedor" endpoint="/api/proveedores" cacheKey="/api/proveedores"
          fields={[
            { name: 'nombre', placeholder: 'Nombre', defaultValue: modalState.initialName }, // Pre-rellenar nombre
            { name: 'email', placeholder: 'Email', required: false }
          ]}
        />
      )}
      {modalState?.type === 'REFERENCIA_NEW' && (
        <BaseQuickCreateModal 
          isOpen={true} onClose={() => setModalState(null)} 
          onCreated={(newRef) => handleReferenciaCreada(modalState.index, newRef)}
          title="Referencia Bobina" endpoint="/api/configuracion/referencias" cacheKey="/api/configuracion/referencias"
          fields={[
              { name: 'nombre', placeholder: 'Referencia', defaultValue: formData.bobinas[modalState.index]?.referenciaNombre }, 
              { name: 'ancho', placeholder: 'Ancho (mm)', type: 'number', defaultValue: formData.bobinas[modalState.index]?.ancho },
              { name: 'lonas', placeholder: 'Lonas', type: 'number' },
              { name: 'pesoPorMetroLineal', placeholder: 'Peso/m (kg)', type: 'number', step: '0.01' }
          ]}
        />
      )}
    </>
  );
}