"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { 
    Plus, X, UserPlus, Save, CheckCircle, 
    Trash2, Package, XCircle, Search, ArrowRight, User, Box 
} from 'lucide-react'; 
import { BaseQuickCreateModal } from "@/components/BaseQuickCreateModal";
import QuickProductForm from "@/components/QuickProductForm";
import FilaItemEditor from './FilaItemEditor'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- MODAL DE BÚSQUEDA DE CLIENTES (Restaurado) ---
function ClienteSearchModal({ isOpen, onClose, onSelect, onCreateNew, clientes = [], initialSearch = '' }) {
    const [search, setSearch] = useState(initialSearch);
    useEffect(() => { if (isOpen) setSearch(initialSearch); }, [isOpen, initialSearch]);

    const filteredClients = useMemo(() => {
        if (!clientes) return [];
        return clientes.filter(c => {
            const term = search.toLowerCase();
            return c.nombre?.toLowerCase().includes(term) ||
                   c.email?.toLowerCase().includes(term) ||
                   c.telefono?.includes(term);
        }).slice(0, 50);
    }, [clientes, search]);

    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-[9999]">
            <div className="modal-box w-11/12 max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <User className="w-5 h-5" /> Buscar Cliente
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>
                <div className="join w-full mb-4">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, email o teléfono..." className="input input-bordered join-item w-full" autoFocus />
                    <button className="btn btn-primary join-item" onClick={() => onCreateNew(search)}><Plus className="w-4 h-4" /> Nuevo</button>
                </div>
                <div className="overflow-auto flex-1 bg-base-100 border rounded-lg">
                    <table className="table table-pin-rows w-full">
                        <thead><tr><th>Nombre</th><th>Tier/Cat.</th><th>Contacto</th><th className="text-right">Acción</th></tr></thead>
                        <tbody>
                            {filteredClients.map((cli) => (
                                <tr key={cli.id} className="hover:bg-base-200 cursor-pointer transition-colors" onClick={() => onSelect(cli)}>
                                    <td className="font-bold">{cli.nombre}</td>
                                    <td><span className="badge badge-sm badge-ghost">{cli.tier || cli.categoria || 'Estándar'}</span></td>
                                    <td className="text-sm opacity-70"><div className="flex flex-col"><span>{cli.email}</span><span>{cli.telefono}</span></div></td>
                                    <td className="text-right"><button className="btn btn-xs btn-ghost"><ArrowRight className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- MODAL DE BÚSQUEDA DE PRODUCTOS (Nuevo) ---
function ProductSearchModal({ isOpen, onClose, onSelect, onCreateNew, productos = [], initialSearch = '' }) {
    const [search, setSearch] = useState(initialSearch);
    useEffect(() => { if (isOpen) setSearch(initialSearch); }, [isOpen, initialSearch]);

    const filteredProducts = useMemo(() => {
        if (!productos) return [];
        return productos.filter(p => {
            const term = search.toLowerCase();
            return p.nombre?.toLowerCase().includes(term) ||
                   p.referenciaFabricante?.toLowerCase().includes(term);
        }).slice(0, 50);
    }, [productos, search]);

    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-[9999]">
            <div className="modal-box w-11/12 max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Box className="w-5 h-5" /> Buscar Producto</h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>
                <div className="join w-full mb-4">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, referencia..." className="input input-bordered join-item w-full" autoFocus />
                    <button className="btn btn-primary join-item" onClick={() => onCreateNew(search)}><Plus className="w-4 h-4" /> Nuevo</button>
                </div>
                <div className="overflow-auto flex-1 bg-base-100 border rounded-lg">
                    <table className="table table-pin-rows w-full">
                        <thead><tr><th>Nombre</th><th>Referencia</th><th>Precio</th><th className="text-right">Acción</th></tr></thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-500">No se encontraron productos.</td></tr>
                            ) : (
                                filteredProducts.map((prod) => (
                                    <tr key={prod.id} className="hover:bg-base-200 cursor-pointer" onClick={() => onSelect(prod)}>
                                        <td className="font-bold">{prod.nombre}</td>
                                        <td className="text-sm font-mono">{prod.referenciaFabricante || '-'}</td>
                                        <td>{prod.precioUnitario?.toFixed(2)}€</td>
                                        <td className="text-right"><button className="btn btn-xs btn-ghost"><ArrowRight className="w-4 h-4" /></button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="modal-action mt-4"><button className="btn" onClick={onClose}>Cancelar</button></div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function ClientOrderForm({ initialData = null, formType = "PRESUPUESTO" }) {
  const router = useRouter();
  const isMarginRequired = formType === "PRESUPUESTO" || formType === "PEDIDO"; 

  const [clienteId, setClienteId] = useState(initialData?.clienteId || ''); 
  const [clienteNombre, setClienteNombre] = useState(initialData?.cliente?.nombre || ''); 
  const [selectedMarginId, setSelectedMarginId] = useState(initialData?.marginId || '');
  
  // Estados para Modales
  const [modalState, setModalState] = useState(null); 
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [productSearchState, setProductSearchState] = useState({ isOpen: false, rowIndex: null, initialSearch: '' });

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [items, setItems] = useState(initialData?.items?.map(item => ({...item, id: item.id || Date.now() + Math.random(), pesoUnitario: item.pesoUnitario || 0})) || [{ id: Date.now(), description: '', quantity: 1, unitPrice: 0, productId: null, pesoUnitario: 0 }]);
  const [stockStatus, setStockStatus] = useState({}); 
  const [notes, setNotes] = useState(initialData?.notas || '');
  
  const { data: clientes, error: clientesError } = useSWR('/api/clientes', fetcher);
  const { data: margenes, error: margenesError } = useSWR(isMarginRequired ? '/api/pricing/margenes' : null, fetcher);
  const { data: todosProductos, error: prodError } = useSWR('/api/productos', fetcher);
  const { data: config } = useSWR('/api/config', fetcher);
  
  const { data: fabricantes, error: fabError } = useSWR('/api/fabricantes', fetcher);
  const { data: materiales, error: matError } = useSWR('/api/materiales', fetcher);
  const { data: tarifas, error: tarifasError } = useSWR('/api/precios', fetcher); 
  
  const isCatalogLoading = !clientes || (isMarginRequired && !margenes) || !todosProductos;

  // --- LÓGICA DE CLIENTES ---
  const handleSelectClient = (client) => {
    setClienteId(client.id);
    setClienteNombre(client.nombre);
    setIsClientSearchOpen(false);
  };

  const handleOpenCreateClient = (searchTerm) => {
      setIsClientSearchOpen(false);
      setModalState({ type: 'CLIENTE', initialName: searchTerm });
  };
  
  const handleClearClient = (e) => {
    e.stopPropagation();
    setClienteId('');
    setClienteNombre('');
  };
  
  const handleClienteCreado = (nuevoCliente) => {
    setClienteId(nuevoCliente.id);
    setClienteNombre(nuevoCliente.nombre);
    setModalState(null);
    mutate('/api/clientes');
  };

  // --- LÓGICA DE MÁRGENES ---
  const filteredMargenes = margenes?.filter(m => m.base !== 'GENERAL_FALLBACK') || [];
  const handleMarginChange = (marginId) => setSelectedMarginId(marginId);
  
  // --- LÓGICA DE ITEMS ---
  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now() + Math.random(), description: '', quantity: 1, unitPrice: 0, productId: null, pesoUnitario: 0 }]);
  };

  const removeItem = (itemId) => {
    const newItems = items.filter(item => item.id !== itemId);
    setItems(newItems);
    setStockStatus(prev => { const { [itemId]: removed, ...rest } = prev; return rest; });
  };

  const handleDuplicateItem = (itemId) => {
    const itemToDuplicate = items.find(item => item.id === itemId);
    const duplicatedItem = { ...itemToDuplicate, id: Date.now() + Math.random() };
    const index = items.findIndex(item => item.id === itemId);
    const newItems = [...items.slice(0, index + 1), duplicatedItem, ...items.slice(index + 1)];
    setItems(newItems);
  };
  
  const handleItemChange = (index, field, value) => {
    const newItems = items.map((item, i) => (i === index ? { ...item } : item));
    const item = newItems[index];
    
    if (field === 'unitPrice') {
        item.unitPrice = parseFloat(parseFloat(value).toFixed(2)) || 0;
    } else {
        item[field] = value;
        if (field === 'quantity') item[field] = parseFloat(value) || 0;
    }
    setItems(newItems);
    if (field === 'quantity' && item.productId) checkStockStatus(item, item.id);
  };
  
  // --- LÓGICA DE BÚSQUEDA DE PRODUCTOS (NUEVA) ---
  const handleOpenProductSearch = (index) => {
      setProductSearchState({ isOpen: true, rowIndex: index, initialSearch: items[index].description || '' });
  };

  const handleProductSelect = (product) => {
      const index = productSearchState.rowIndex;
      if (index === null) return;

      const newItems = [...items];
      newItems[index].description = product.nombre;
      newItems[index].productId = product.id;
      newItems[index].unitPrice = parseFloat(product.precioUnitario.toFixed(2));
      newItems[index].pesoUnitario = parseFloat(product.pesoUnitario || 0);
      
      setItems(newItems);
      setProductSearchState({ isOpen: false, rowIndex: null, initialSearch: '' });
      checkStockStatus(newItems[index], newItems[index].id);
  };

  const handleOpenCreateProduct = (searchTerm) => {
      const rowIndex = productSearchState.rowIndex;
      setProductSearchState({ isOpen: false, rowIndex: null, initialSearch: '' });
      setModalState({ type: 'QUICK_PRODUCT', itemId: items[rowIndex].id, initialName: searchTerm });
  };

  const handleCreatedProduct = (newProduct) => {
      const index = items.findIndex(item => item.id === modalState.itemId);
      if (index !== -1) {
          const newItems = [...items];
          newItems[index].description = newProduct.nombre;
          newItems[index].productId = newProduct.id;
          newItems[index].unitPrice = parseFloat(newProduct.precioUnitario.toFixed(2));
          newItems[index].pesoUnitario = parseFloat(newProduct.pesoUnitario || 0);
          setItems(newItems);
          checkStockStatus(newItems[index], newItems[index].id);
      }
      setModalState(null);
      mutate('/api/productos'); 
  };

  // --- STOCK ---
  const checkStockStatus = useCallback(async (item, key) => {
      if (!todosProductos) return; 
      const product = todosProductos.find(p => p.id === item.productId);
      if (!product || !product.material?.nombre || !product.espesor || !product.largo) {
          setStockStatus(prev => ({ ...prev, [key]: { status: 'N/A' } }));
          return;
      }
      setStockStatus(prev => ({ ...prev, [key]: { status: 'loading' } }));
      const largo_m = product.largo / 1000; 
      const metrosNecesarios = item.quantity * largo_m;
      try {
          const res = await fetch(`/api/stock-info/available-meters?material=${product.material.nombre}&espesor=${product.espesor}`);
          if (!res.ok) throw new Error('Error');
          const { totalMetros } = await res.json();
          let status = 'unavailable';
          if (totalMetros >= metrosNecesarios) status = 'available';
          else if (totalMetros > 0) status = 'low';
          setStockStatus(prev => ({ ...prev, [key]: { status, totalMetros } }));
      } catch (err) {
          setStockStatus(prev => ({ ...prev, [key]: { status: 'error' } }));
      }
  }, [todosProductos]);

  const getStockIcon = (item) => { 
    const stockData = stockStatus[item.id];
    const product = todosProductos?.find(p => p.id === item.productId);
    if (!product) return <Package className="w-5 h-5 text-gray-400" title="Item manual" />;
    if (!stockData || stockData.status === 'N/A') return <Package className="w-5 h-5 text-gray-500" title="Sin datos" />;
    if (stockData.status === 'loading') return <span className="loading loading-spinner loading-xs text-primary" />;
    if (stockData.status === 'available') return <CheckCircle className="w-5 h-5 text-success" title="Stock OK" />;
    if (stockData.status === 'low') return <XCircle className="w-5 h-5 text-warning" title="Stock BAJO" />;
    return <XCircle className="w-5 h-5 text-error" title="SIN Stock" />;
  };
  
  // --- TOTALES (MANTENIDOS COMPLETOS) ---
  const { subtotalBase, subtotalConMargen, tax, total, ivaRate, margenAplicado, pesoTotalGlobal } = useMemo(() => {
    const subtotalBase = items.reduce((acc, item) => 
        acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))
    , 0);

    const pesoTotalGlobal = items.reduce((acc, item) =>
        acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.pesoUnitario) || 0))
    , 0);
    
    const ivaRate = config?.iva_rate ? parseFloat(config.iva_rate) : 0.21;
    
    let subtotalConMargen = subtotalBase;
    let margenAplicado = { multiplicador: 1, gastoFijo: 0 };
    
    if (isMarginRequired && selectedMarginId && margenes) {
        const regla = margenes.find(m => m.id === selectedMarginId);
        if (regla) {
            const multiplicador = regla.multiplicador || 1;
            const gastoFijo = regla.gastoFijo || 0;
            subtotalConMargen = (subtotalBase * multiplicador) + gastoFijo;
            margenAplicado = { multiplicador, gastoFijo };
        }
    }
    
    const tax = subtotalConMargen * ivaRate;
    const total = subtotalConMargen + tax;
    
    return { 
        subtotalBase: parseFloat(subtotalBase.toFixed(2)), 
        subtotalConMargen: parseFloat(subtotalConMargen.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)), 
        total: parseFloat(total.toFixed(2)), 
        ivaRate,
        margenAplicado,
        pesoTotalGlobal: parseFloat(pesoTotalGlobal.toFixed(3)),
    };
  }, [items, config, selectedMarginId, margenes, isMarginRequired]);

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
      if (!clienteId) { setError('Debe seleccionar un cliente.'); setIsLoading(false); return; }
      if (isMarginRequired && !selectedMarginId) { setError('Debe seleccionar una Regla de Margen.'); setIsLoading(false); return; }
      if (items.filter(item => item.quantity > 0 && item.description).length === 0) { setError('Añada items válidos.'); setIsLoading(false); return; }
      
      const dataPayload = {
          clienteId,
          estado: initialData?.estado || 'Borrador',
          items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              productId: item.productId,
              pesoUnitario: item.pesoUnitario,
          })),
          subtotal: subtotalConMargen,
          tax: tax,
          total: total,
          notas: notes,
          marginId: selectedMarginId,
      };

      const isEditMode = !!initialData;
      const endpoint = formType === 'PRESUPUESTO' 
        ? (isEditMode ? `/api/presupuestos/${initialData.id}` : '/api/presupuestos')
        : (isEditMode ? `/api/pedidos/${initialData.id}` : '/api/pedidos');
      const method = isEditMode ? 'PUT' : 'POST';
      
      try {
          const res = await fetch(endpoint, {
              method: method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dataPayload),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
          
          const savedData = await res.json();
          router.push(formType === 'PRESUPUESTO' ? `/presupuestos/${savedData.id}` : `/pedidos/${savedData.id}`);
      } catch (err) {
          setError(err.message);
          setIsLoading(false);
      }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-primary">Información Principal</h2>
          {isCatalogLoading && <span className="loading loading-spinner loading-sm"></span>}
          
          <div className="grid grid-cols-1 gap-4">
            <div className="form-control w-full">
                <label className="label"><span className="label-text">Cliente (Requerido)</span></label>
                <div className="input-group cursor-pointer" onClick={() => setIsClientSearchOpen(true)}>
                    <input type="text" readOnly placeholder="Seleccionar cliente..." value={clienteNombre} className={`input input-bordered w-full cursor-pointer ${clienteId ? 'input-success' : ''}`} />
                    {clienteId && <button type="button" onClick={handleClearClient} className="btn btn-square btn-ghost text-error"><X className="w-4 h-4" /></button>}
                    <button type="button" className="btn btn-square btn-primary"><Search className="w-4 h-4" /></button>
                </div>
                {!clienteId && <span className="text-xs text-gray-500 mt-1 ml-1">Clic para buscar o crear</span>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-primary">Items del Pedido</h2>
            <button type="button" onClick={addItem} className="btn btn-primary btn-sm"><Plus className="w-4 h-4" /> Añadir Fila</button>
          </div>
          
          <div className="overflow-visible">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-10">Stock</th>
                  <th className="w-2/5">Producto (Plantilla)</th> 
                  <th>Cantidad</th>
                  <th>Precio Costo</th>
                  <th>Peso U.</th>
                  <th>Peso Total</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <FilaItemEditor
                    key={item.id}
                    item={item}
                    index={index}
                    handleItemChange={handleItemChange}
                    onSearchClick={() => handleOpenProductSearch(index)} // <--- NUEVO: Abre modal
                    removeItem={removeItem}
                    handleDuplicateItem={handleDuplicateItem}
                    getStockIcon={getStockIcon}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Notas Adicionales</h2>
            <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="textarea textarea-bordered h-24" placeholder="Notas internas..."></textarea>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Resumen del Total</h2>
            
            {isMarginRequired && (
                <div className="form-control w-full mb-4">
                    <label className="label"><span className="label-text font-bold">Regla de Margen / Tier</span></label>
                    <select className="select select-bordered w-full" value={selectedMarginId} onChange={(e) => handleMarginChange(e.target.value)} disabled={!margenes} required={isMarginRequired}>
                        <option value="">Selecciona Margen</option>
                        {filteredMargenes.map(m => {
                          const tierText = m.tierCliente ? ` (${m.tierCliente})` : '';
                          const gastoFijoText = m.gastoFijo ? ` + ${m.gastoFijo}€ Fijo` : '';
                          return <option key={m.id} value={m.id}>{m.descripcion}{tierText} (x{m.multiplicador}){gastoFijoText}</option>;
                        })}
                    </select>
                </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between"><span>Subtotal (Costo Base)</span><span>{subtotalBase.toFixed(2)} €</span></div>
              
              {isMarginRequired && margenAplicado.multiplicador !== 1 && (
                  <div className="flex justify-between text-accent"><span>Margen (x{margenAplicado.multiplicador.toFixed(2)})</span><span>+ {(subtotalBase * (margenAplicado.multiplicador - 1)).toFixed(2)} €</span></div>
              )}
              {isMarginRequired && margenAplicado.gastoFijo > 0 && (
                  <div className="flex justify-between text-accent"><span>Gasto Fijo</span><span>+ {margenAplicado.gastoFijo.toFixed(2)} €</span></div>
              )}
              
              <div className="divider my-1"></div>
              
              <div className="flex justify-between font-semibold"><span>Subtotal (con Margen)</span><span>{subtotalConMargen.toFixed(2)} €</span></div>
              <div className="flex justify-between"><span>IVA ({((ivaRate || 0) * 100).toFixed(0)}%)</span><span>{tax.toFixed(2)} €</span></div>
              
              <div className="divider my-1"></div>
              
              <div className="flex justify-between font-bold text-lg text-primary"><span>Total</span><span>{total.toFixed(2)} €</span></div>
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t"><span>Peso Total Global</span><span>{pesoTotalGlobal.toFixed(3)} kg</span></div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error shadow-lg my-4">{error}</div>}

      <div className="flex justify-end gap-4 mt-6">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={isLoading || !clienteId || (isMarginRequired && !selectedMarginId)}>
          <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
    
    <ClienteSearchModal isOpen={isClientSearchOpen} onClose={() => setIsClientSearchOpen(false)} onSelect={handleSelectClient} onCreateNew={handleOpenCreateClient} clientes={clientes} initialSearch={clienteNombre} />
    
    <ProductSearchModal isOpen={productSearchState.isOpen} onClose={() => setProductSearchState(prev => ({...prev, isOpen: false}))} onSelect={handleProductSelect} onCreateNew={handleOpenCreateProduct} productos={todosProductos} initialSearch={productSearchState.initialSearch} />

    {modalState?.type === 'CLIENTE' && (
      <BaseQuickCreateModal isOpen={true} onClose={() => setModalState(null)} onCreated={handleClienteCreado} title="Crear Nuevo Cliente" endpoint="/api/clientes" cacheKey="/api/clientes" fields={[{ name: 'nombre', placeholder: 'Nombre', required: true, defaultValue: modalState.initialName }, { name: 'email', placeholder: 'Email', type: 'email' }, { name: 'telefono', placeholder: 'Teléfono' }]} />
    )}
    
    {modalState?.type === 'QUICK_PRODUCT' && (
        <QuickProductForm isOpen={true} onClose={() => setModalState(null)} onCreated={handleCreatedProduct} catalogos={{ fabricantes, materiales, tarifas }} initialReference={modalState.initialName} />
    )}
    </>
  );
}