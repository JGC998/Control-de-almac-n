// src/components/ClientOrderForm.js
"use client";
// (Paso 4) Eliminamos useRef, ya no es necesario para el debounce
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
// (Paso 4) Eliminamos Calculator, ya no es necesario
import { 
    Plus, X, UserPlus, Save, DollarSign, CheckCircle, 
    Trash2, Copy, Search, Package, XCircle 
} from 'lucide-react'; 
import { BaseQuickCreateModal } from "@/components/BaseQuickCreateModal";

const fetcher = (url) => fetch(url).then((res) => res.json());

// ------------------------------------------------
// Componente principal: ClientOrderForm
// ------------------------------------------------

export default function ClientOrderForm({ initialData = null, formType = "PRESUPUESTO" }) {
  const router = useRouter();
  // FIX: Consideramos el formulario de Pedido (que ahora requiere margen) y Presupuesto como 'tipo-margen'
  const isMarginRequired = formType === "PRESUPUESTO" || formType === "PEDIDO"; 

  // --- ESTADOS (Paso 1) ---
  const [clienteId, setClienteId] = useState(initialData?.clienteId || ''); 
  const [clienteBusqueda, setClienteBusqueda] = useState(initialData?.cliente?.nombre || ''); 
  const [selectedMarginId, setSelectedMarginId] = useState(initialData?.marginId || ''); // Incluimos initialData
  const [modalState, setModalState] = useState(null); 
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Carga para Submit
  
  // --- ESTADOS (Paso 2) ---
  const [items, setItems] = useState(initialData?.items?.map(item => ({...item, id: item.id || Date.now() + Math.random()})) || [{ id: Date.now(), description: '', quantity: 1, unitPrice: 0, productId: null }]);
  const [stockStatus, setStockStatus] = useState({}); 
  const [activeSearchIndex, setActiveSearchIndex] = useState(null); 
  const [notes, setNotes] = useState(initialData?.notas || '');
  

  // --- CARGA DE DATOS (SWR) ---
  const { data: clientes, error: clientesError, isLoading: isLoadingClientes } = useSWR('/api/clientes', fetcher);
  // FIX: Cargamos márgenes siempre que se requiera margen
  const { data: margenes, error: margenesError } = useSWR(isMarginRequired ? '/api/pricing/margenes' : null, fetcher);
  const { data: todosProductos, error: prodError } = useSWR('/api/productos', fetcher);
  const { data: config } = useSWR('/api/config', fetcher);


  // --- LÓGICA DE CLIENTE (Simplificada Paso 4) ---
  const filteredClients = useMemo(() => {
    if (!clientes || clienteBusqueda.length < 2) return [];
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase())
    ).slice(0, 5);
  }, [clientes, clienteBusqueda]);

  const handleSelectClient = (clientId, clientName) => {
    setClienteId(clientId);
    setClienteBusqueda(clientName);
  };
  
  const handleClearClient = () => {
    setClienteId('');
    setClienteBusqueda('');
  };
  
  const handleClienteCreado = (nuevoCliente) => {
    setClienteId(nuevoCliente.id);
    setClienteBusqueda(nuevoCliente.nombre);
    setModalState(null);
  };

  // --- LÓGICA DE MARGEN (Simplificada Paso 4) ---
  const filteredMargenes = margenes?.filter(m => m.base !== 'GENERAL_FALLBACK') || [];

  const handleMarginChange = (marginId) => {
    // (Paso 4) Solo actualiza el estado. El cálculo se hace en useMemo.
    setSelectedMarginId(marginId);
  };
  
  // --- LÓGICA DE ITEMS (Simplificada Paso 4) ---
  
  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now() + Math.random(), description: '', quantity: 1, unitPrice: 0, productId: null }]);
  };

  const removeItem = (itemId) => {
    const newItems = items.filter(item => item.id !== itemId);
    setItems(newItems);
    setStockStatus(prev => { 
        const { [itemId]: removed, ...rest } = prev;
        return rest;
    });
  };

  const handleDuplicateItem = (itemId) => {
    const itemToDuplicate = items.find(item => item.id === itemId);
    const duplicatedItem = { ...itemToDuplicate, id: Date.now() + Math.random() };
    const index = items.findIndex(item => item.id === itemId);
    const newItems = [...items.slice(0, index + 1), duplicatedItem, ...items.slice(index + 1)];
    setItems(newItems);
  };
  
  // (Paso 4) Manejar cambio en inputs (Simplificado)
  const handleItemChange = (index, field, value) => {
    const newItems = items.map((item, i) => (i === index ? { ...item } : item));
    const item = newItems[index];
    
    if (field === 'unitPrice') {
        item.unitPrice = parseFloat(parseFloat(value).toFixed(2)) || 0;
    } else { // 'quantity'
        item[field] = parseFloat(value) || 0;
    }
    
    setItems(newItems);
    
    // (Paso 2) Recalcular stock si cambia la cantidad
    if (field === 'quantity' && item.productId) {
        checkStockStatus(item, item.id);
    }
  };
  
  // --- LÓGICA DE BÚSQUEDA DE PRODUCTOS (Simplificada Paso 4) ---
  
  const handleSearchChange = (value, index) => {
      const newItems = items.map((item, i) => (i === index ? { ...item, description: value, productId: null } : item));
      setItems(newItems);
      setActiveSearchIndex(value.length >= 2 ? index : null); 
  };
  
  const searchResults = useMemo(() => {
      if (activeSearchIndex === null) return [];
      const query = items[activeSearchIndex]?.description || '';
      if (query.length < 2 || !todosProductos) return [];

      return todosProductos.filter(p => 
          p.nombre.toLowerCase().includes(query.toLowerCase()) ||
          p.referenciaFabricante?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5) || [];
  }, [items, todosProductos, activeSearchIndex]);
  
  // (Paso 4) Manejar la selección de un producto (Simplificado)
  const handleSelectProduct = (product, index) => {
      const newItems = items.map((item, i) => (i === index ? { ...item } : item));
      const item = newItems[index];
      
      item.description = product.nombre;
      item.productId = product.id;
      // (Paso 4) El precio unitario es AHORA el costo base del producto
      item.unitPrice = parseFloat(product.precioUnitario.toFixed(2)); 
      item.id = Date.now() + Math.random(); 
      
      setItems(newItems);
      setActiveSearchIndex(null); 
      checkStockStatus(item, item.id);
  };

  // --- LÓGICA DE STOCK (Paso 2 - Sin cambios) ---
  const checkStockStatus = useCallback(async (item, key) => {
      if (!todosProductos) return; 
      
      const product = todosProductos.find(p => p.id === item.productId);
      if (!product || !product.material?.nombre || product.espesor === undefined || product.espesor === null || !product.largo) {
          setStockStatus(prev => ({ ...prev, [key]: { status: 'N/A' } }));
          return;
      }

      setStockStatus(prev => ({ ...prev, [key]: { status: 'loading' } }));
      const largo_m = product.largo / 1000; 
      const metrosNecesarios = item.quantity * largo_m;
      
      try {
          const res = await fetch(`/api/stock-info/available-meters?material=${product.material.nombre}&espesor=${product.espesor}`);
          if (!res.ok) throw new Error('Error al obtener stock');
          const { totalMetros } = await res.json();
          const newStatus = { totalMetros };

          if (totalMetros >= metrosNecesarios) newStatus.status = 'available';
          else if (totalMetros > 0) newStatus.status = 'low';
          else newStatus.status = 'unavailable';
          
          setStockStatus(prev => ({ ...prev, [key]: newStatus }));
      } catch (err) {
          console.error(err);
          setStockStatus(prev => ({ ...prev, [key]: { status: 'error' } }));
      }
  }, [todosProductos]);

  const getStockIcon = (item) => { 
    const stockData = stockStatus[item.id];
    const product = todosProductos?.find(p => p.id === item.productId);

    if (!product) return <Package className="w-5 h-5 text-gray-400" title="Item manual (sin plantilla)" />;
    if (!stockData || stockData.status === 'N/A' || stockData.status === 'error') return <Package className="w-5 h-5 text-gray-500" title="Sin datos de stock" />;
    
    const largo_m = product.largo ? product.largo / 1000 : 0;
    const metrosNecesarios = (item.quantity * largo_m).toFixed(2);
    const totalMetros = (stockData.totalMetros || 0).toFixed(2);

    switch(stockData.status) {
        case 'available': return <CheckCircle className="w-5 h-5 text-success" title={`Stock OK: ${totalMetros}m disp. (${metrosNecesarios}m nec.)`} />;
        case 'low': return <XCircle className="w-5 h-5 text-warning" title={`Stock BAJO: ${totalMetros}m disp. (${metrosNecesarios}m nec.)`} />;
        case 'unavailable': return <XCircle className="w-5 h-5 text-error" title={`SIN Stock: ${totalMetros}m disp. (${metrosNecesarios}m nec.)`} />;
        case 'loading': return <span className="loading loading-spinner loading-xs text-primary" title="Comprobando stock..." />;
        default: return <Package className="w-5 h-5 text-gray-500" title="Datos de stock no disponibles" />;
    }
  };
  
  // --- LÓGICA DE TOTALES (PASO 4: RECONSTRUIDA) ---
  const { subtotalBase, subtotalConMargen, tax, total, ivaRate, margenAplicado } = useMemo(() => {
    // 1. Calcular el subtotal base (costo)
    const subtotalBase = items.reduce((acc, item) => 
        acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))
    , 0);
    
    const ivaRate = config?.iva_rate ? parseFloat(config.iva_rate) : 0.21;
    
    let subtotalConMargen = subtotalBase;
    let margenAplicado = { multiplicador: 1, gastoFijo: 0 };
    
    // 2. Aplicar margen (solo si se requiere margen y hay uno seleccionado)
    if (isMarginRequired && selectedMarginId && margenes) {
        const regla = margenes.find(m => m.id === selectedMarginId);
        if (regla) {
            const multiplicador = regla.multiplicador || 1;
            const gastoFijo = regla.gastoFijo || 0;
            
            // Fórmula: (Subtotal * Multiplicador) + Gasto Fijo
            subtotalConMargen = (subtotalBase * multiplicador) + gastoFijo;
            margenAplicado = { multiplicador, gastoFijo };
        }
    }
    
    // 3. Calcular IVA y Total sobre el subtotal CON margen
    const tax = subtotalConMargen * ivaRate;
    const total = subtotalConMargen + tax;
    
    return { 
        subtotalBase: parseFloat(subtotalBase.toFixed(2)), 
        subtotalConMargen: parseFloat(subtotalConMargen.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)), 
        total: parseFloat(total.toFixed(2)), 
        ivaRate,
        margenAplicado // Devolvemos el margen para mostrarlo en la UI
    };
  }, [items, config, selectedMarginId, margenes, isMarginRequired]);
  // --- FIN LÓGICA DE TOTALES ---


  // --- LÓGICA DE ENVÍO (Actualizada Paso 4) ---
  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      // Validaciones
      if (!clienteId) {
          setError('Debe seleccionar un cliente.');
          setIsLoading(false);
          return;
      }
      // FIX: La validación de margen aplica si es un tipo de documento que lo requiere
      if (isMarginRequired && !selectedMarginId) {
          setError('Debe seleccionar una Regla de Margen/Tier.');
          setIsLoading(false);
          return;
      }
      if (items.filter(item => item.quantity > 0 && item.description).length === 0) {
         setError('Debe añadir al menos un artículo con cantidad y descripción.');
         setIsLoading(false);
         return;
      }
      
      // Preparar datos finales (usando los totales calculados por useMemo)
      const dataPayload = {
          clienteId,
          // FIX: El formType debe ser 'PRESUPUESTO' o 'PEDIDO'
          formType: formType, 
          items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice, // Enviar el precio base (costo)
              productId: item.productId,
          })),
          // FIX: Enviamos los totales finales calculados CON margen
          subtotal: subtotalConMargen,
          tax: tax,
          total: total,
          notas: notes,
      };

      // FIX: Enviamos el ID del margen si se seleccionó
      if (selectedMarginId) {
          dataPayload.marginId = selectedMarginId;
      }

      const endpoint = formType === 'PRESUPUESTO' ? '/api/presupuestos' : '/api/pedidos';
      
      // (Paso 4) Habilitamos el envío real
      try {
          const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dataPayload),
          });
          
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message || `Error al guardar ${formType}`);
          }
          
          const savedData = await res.json();
          
          // Redirigir a la página de detalle
          const redirectUrl = formType === 'PRESUPUESTO' ? `/presupuestos/${savedData.id}` : `/pedidos/${savedData.id}`;
          router.push(redirectUrl);

      } catch (err) {
          setError(err.message);
          setIsLoading(false);
      }
  }


  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. INFORMACIÓN DEL CLIENTE (Paso 4: Eliminado Margen de aquí) */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary">Información Principal</h2>
          {clientesError && <div className="text-error">Error al cargar clientes.</div>}
          
          {/* (Paso 4) La rejilla ahora es siempre de 1 columna */}
          <div className="grid grid-cols-1 gap-4">
             
            {/* SELECCIÓN DE CLIENTE */}
            <div className="form-control w-full relative">
                <label className="label"><span className="label-text">Cliente (Requerido)</span></label>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder={isLoadingClientes ? "Cargando clientes..." : "Buscar o introducir cliente..."}
                        value={clienteBusqueda}
                        onChange={(e) => {
                            setClienteBusqueda(e.target.value);
                            if (clienteId && e.target.value !== clientes?.find(c => c.id === clienteId)?.nombre) {
                                setClienteId('');
                            }
                        }}
                        className={`input input-bordered w-full ${clienteId ? 'border-success' : ''}`}
                        disabled={isLoadingClientes}
                        required
                    />
                    {clienteId && (
                         <button type="button" onClick={handleClearClient} className="btn btn-ghost btn-square" title="Limpiar Cliente Seleccionado">
                            <X className="w-4 h-4 text-error" />
                        </button>
                    )}
                     <button type="button" onClick={() => setModalState('CLIENTE')} className="btn btn-primary" title="Crear Cliente Rápido">
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>
                
                {clienteBusqueda.length >= 2 && filteredClients.length > 0 && clienteId === '' && (
                     <ul tabIndex={0} className="absolute top-100% z-10 menu p-2 shadow bg-base-200 rounded-box w-full mt-1">
                        {filteredClients.map(cliente => (
                            <li key={cliente.id} onClick={() => handleSelectClient(cliente.id, cliente.nombre)}>
                                <a>{cliente.nombre} <span className="text-xs text-gray-500 ml-2">({cliente.tier || 'Estándar'})</span></a>
                            </li>
                        ))}
                    </ul>
                )}
                
                {clienteId && (
                    <div className="text-sm mt-2 text-success font-semibold flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Cliente Seleccionado.
                    </div>
                )}
            </div>
            
          </div>
        </div>
      </div>
      
      {/* 2. DETALLE DE ITEMS (Paso 4: Eliminado botón de recalcular) */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-primary">Items del Pedido</h2>
            <button type="button" onClick={addItem} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Añadir Fila
            </button>
          </div>
          
          <div className="overflow-visible">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-10">Stock</th>
                  <th className="w-2/5">Descripción / Búsqueda (Plantilla)</th> 
                  <th>Cantidad</th>
                  <th>Precio Costo (Unit.)</th>
                  <th>Total (Costo)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prodError && <tr><td colSpan="6" className="text-error">Error al cargar plantillas de producto.</td></tr>}
                {items.length === 0 && (
                    <tr><td colSpan="6" className="text-center text-gray-500 py-4">Añade una fila para empezar...</td></tr>
                )}
                
                {items.map((item, index) => {
                    return (
                        <tr key={item.id} className="item-row hover"> 
                           <td className="w-10 text-center">
                                {getStockIcon(item)}
                            </td>
                            <td className="relative w-2/5">
                                <div className="dropdown w-full dropdown-bottom">
                                    <input 
                                        type="text" 
                                        placeholder="Buscar producto o introducir descripción manual..."
                                        value={item.description} 
                                        onChange={(e) => handleSearchChange(e.target.value, index)} 
                                        onFocus={() => setActiveSearchIndex(index)} 
                                        onBlur={() => setTimeout(() => setActiveSearchIndex(null), 200)}
                                        className="input input-bordered input-sm w-full"
                                    />
                                    {activeSearchIndex === index && (searchResults.length > 0 || item.description.length >= 2) && (
                                        <ul tabIndex={0} 
                                            className="absolute left-0 top-full z-50 menu p-2 shadow bg-base-200 rounded-box w-full max-w-lg mt-1 overflow-y-auto max-h-52"
                                            onMouseDown={(e) => e.preventDefault()} 
                                        >
                                            {searchResults.map(p => (
                                                <li key={p.id} onClick={() => handleSelectProduct(p, index)}>
                                                    <a><Search className="w-4 h-4 mr-2" />{p.nombre} ({p.referenciaFabricante})</a>
                                                </li>
                                            ))}
                                            {searchResults.length > 0 && <li className="divider my-1 p-0"></li>}
                                            <li onClick={() => setModalState({ type: 'QUICK_PRODUCT', initialData: { nombre: item.description }, itemIndex: index })}>
                                                <a className="text-warning"><Plus className="w-4 h-4 mr-2" /> Crear Producto: {item.description}</a>
                                            </li>
                                        </ul>
                                    )}
                                </div>
                            </td>
                            <td><input type="number" step="1" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="input input-bordered input-sm w-20" /></td>
                            <td>
                                <div className="input-group input-group-sm">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={item.unitPrice || ''} 
                                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} 
                                        className="input input-bordered input-sm w-24" 
                                    />
                                    <span className="bg-base-200 text-sm px-2">€</span>
                                </div>
                            </td>
                            {/* (Paso 4) Este total es AHORA el total de costo */}
                            <td className="font-bold">{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)} €</td>
                            <td className="flex gap-1">
                                <button type="button" onClick={() => handleDuplicateItem(item.id)} className="btn btn-ghost btn-sm btn-circle" title="Duplicar Fila">
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => removeItem(item.id)} className="btn btn-ghost btn-sm btn-circle text-error" title="Eliminar Fila">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    )
                })}
              </tbody>
            </table>
          </div>
            
            
        </div>
      </div>

      {/* 3. NOTAS Y RESUMEN (Paso 4: RECONSTRUIDO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Notas Adicionales</h2>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="textarea textarea-bordered h-24" 
              placeholder="Notas internas o para el cliente..."
            ></textarea>
          </div>
        </div>

        {/* (Paso 4) Card de Resumen RECONSTRUIDA */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Resumen del Total</h2>
            
            {/* FIX: Selector de Margen MOVIDO AQUÍ (Activado para PEDIDO y PRESUPUESTO) */}
            {isMarginRequired && (
                <div className="form-control w-full mb-4">
                    <label className="label"><span className="label-text font-bold">Regla de Margen / Tier ({isMarginRequired ? 'Requerido' : 'Opcional'})</span></label>
                    <select 
                        className="select select-bordered w-full" 
                        value={selectedMarginId} 
                        onChange={(e) => handleMarginChange(e.target.value)} 
                        disabled={!margenes}
                        required={isMarginRequired}
                    >
                        <option value="">Selecciona Margen</option>
                        {margenesError && <option disabled>Error al cargar márgenes</option>}
                        {filteredMargenes.map(m => {
                          const tierText = m.tierCliente ? ` (${m.tierCliente})` : '';
                          const gastoFijoText = m.gastoFijo ? ` + ${m.gastoFijo}€ Fijo` : '';
                          return (
                            <option key={m.id} value={m.id}>
                                {m.descripcion}{tierText} (x{m.multiplicador}){gastoFijoText}
                            </option>
                          );
                        })}
                    </select>
                </div>
            )}
            
            {/* (Paso 4) Nueva Lógica de Totales */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal (Costo Base)</span> 
                <span>{subtotalBase.toFixed(2)} €</span>
              </div>
              
              {isMarginRequired && margenAplicado.multiplicador !== 1 && (
                  <div className="flex justify-between text-accent">
                    <span>Margen (x{margenAplicado.multiplicador.toFixed(2)})</span> 
                    <span>+ {(subtotalBase * (margenAplicado.multiplicador - 1)).toFixed(2)} €</span>
                  </div>
              )}
              {isMarginRequired && margenAplicado.gastoFijo > 0 && (
                  <div className="flex justify-between text-accent">
                    <span>Gasto Fijo</span> 
                    <span>+ {margenAplicado.gastoFijo.toFixed(2)} €</span>
                  </div>
              )}
              
              <div className="divider my-1"></div>
              
              <div className="flex justify-between font-semibold">
                <span>Subtotal (con Margen)</span> 
                <span>{subtotalConMargen.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between">
                <span>IVA ({((ivaRate || 0) * 100).toFixed(0)}%)</span> 
                <span>{tax.toFixed(2)} €</span>
              </div>
              
              <div className="divider my-1"></div>
              
              <div className="flex justify-between font-bold text-lg text-primary">
                <span>Total</span> 
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error shadow-lg my-4">{error}</div>}

      <div className="flex justify-end gap-4 mt-6">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
        {/* FIX: La validación del botón ahora usa isMarginRequired */}
        <button type="submit" className="btn btn-primary" disabled={isLoading || !clienteId || (isMarginRequired && !selectedMarginId)}>
          <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : "Guardar Documento"}
        </button>
      </div>
    </form>
    
    {/* MODALES (Paso 1 y 2 - Sin cambios) */}
    
    {modalState === 'CLIENTE' && (
      <BaseQuickCreateModal
        isOpen={true}
        onClose={() => setModalState(null)}
        onCreated={handleClienteCreado}
        title="Crear Nuevo Cliente"
        endpoint="/api/clientes"
        cacheKey="/api/clientes"
        fields={[
          { name: 'nombre', placeholder: 'Nombre o Razón Social', required: true },
          { name: 'email', placeholder: 'Email de Contacto', required: false, type: 'email' },
          { name: 'direccion', placeholder: 'Dirección Fiscal', required: false },
          { name: 'telefono', placeholder: 'Teléfono', required: false }
        ]}
      />
    )}
    
    {modalState?.type === 'QUICK_PRODUCT' && (
      <BaseQuickCreateModal
          isOpen={true}
          onClose={() => setModalState(null)}
          onCreated={(newItem) => handleSelectProduct(newItem, modalState.itemIndex)}
          title="Crear Nueva Plantilla de Producto"
          endpoint="/api/productos"
          cacheKey="/api/productos"
          initialData={modalState.initialData}
          fields={[
              { name: 'nombre', placeholder: 'Nombre/Descripción', required: true },
              { name: 'referenciaFabricante', placeholder: 'Referencia Fabricante', required: false },
              { name: 'precioUnitario', placeholder: 'Precio Coste Base (€)', type: 'number', required: true, step: '0.01' },
              { name: 'espesor', placeholder: 'Espesor (mm)', type: 'number', required: true, step: '0.1' },
              { name: 'largo', placeholder: 'Largo (mm)', type: 'number', required: true, step: '1' },
              { name: 'ancho', placeholder: 'Ancho (mm)', type: 'number', required: true, step: '1' },
              { name: 'materialId', placeholder: 'ID Material (Temporal)', required: true }, // Esto debe mejorarse
          ]}
      />
    )}
    </>
  );
}