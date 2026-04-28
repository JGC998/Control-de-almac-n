"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Save,
  Package, Search, ArrowRight, User, Box, ChevronDown, Ruler
} from 'lucide-react';
import { BaseQuickCreateModal } from "@/componentes/modales/ModalCreacionRapida";
import QuickProductForm from "@/componentes/productos/FormularioProductoRapido";
import ModalCalculadoraBandas from "@/componentes/modales/ModalCalculadoraBandas";
import EditorFilaItem from './EditorFilaItem';
import TemplateManager from '@/componentes/presupuestos/TemplateManager';


// --- MODAL DE BÚSQUEDA DE CLIENTES (Restaurado) ---
function ClienteSearchModal({ isOpen, onClose, onSelect, onCreateNew, clientes = [], initialSearch = '' }) {
  const [search, setSearch] = useState(initialSearch);

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
    <div className="modal modal-open z-50">
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
            <thead><tr><th>Nombre</th><th>Categoría</th><th>Contacto</th><th className="text-right">Acción</th></tr></thead>
            <tbody>
              {filteredClients.map((cli) => (
                <tr key={cli.id} className="hover:bg-base-200 cursor-pointer transition-colors" onClick={() => onSelect(cli)}>
                  <td className="font-bold">{cli.nombre}</td>
                  <td><span className="badge badge-sm badge-ghost">{cli.categoria || 'Estándar'}</span></td>
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

  const filteredProducts = useMemo(() => {
    if (!productos) return [];
    return productos.filter(p => {
      const term = search.toLowerCase();
      return p.nombre?.toLowerCase().includes(term) ||
        p.referenciaFabricante?.toLowerCase().includes(term) ||
        p.color?.toLowerCase().includes(term);
    }).slice(0, 50);
  }, [productos, search]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box w-11/12 max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Box className="w-5 h-5" /> Buscar Producto</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
        </div>
        <div className="join w-full mb-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, color, referencia fabricante..." className="input input-bordered join-item w-full" autoFocus />
          <button className="btn btn-primary join-item" onClick={() => onCreateNew(search)}><Plus className="w-4 h-4" /> Nuevo</button>
        </div>
        <div className="overflow-auto flex-1 bg-base-100 border rounded-lg">
          <table className="table table-pin-rows w-full">
            <thead><tr><th>Nombre</th><th>Color</th><th>Referencia</th><th>Precio unit.</th><th className="text-right">Acción</th></tr></thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">No se encontraron productos.</td></tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-base-200 cursor-pointer" onClick={() => onSelect(prod)}>
                    <td className="font-bold">{prod.nombre}</td>
                    <td className="text-sm">{prod.color || '-'}</td>
                    <td className="text-sm">{prod.referenciaFabricante || '-'}</td>
                    <td>{prod.precioUnitario != null ? parseFloat(prod.precioUnitario).toFixed(2) + '€' : '-'}</td>
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
export default function FormularioPedidoCliente({ initialData = null, formType = "PRESUPUESTO", onSuccess, onCancel }) {
  const router = useRouter();
  const isMarginRequired = formType === "PRESUPUESTO" || formType === "PEDIDO";
  const isEditMode = !!initialData;


  const [clienteId, setClienteId] = useState(initialData?.clienteId || '');
  const [clienteNombre, setClienteNombre] = useState(initialData?.cliente?.nombre || '');
  const [selectedMarginId, setSelectedMarginId] = useState(initialData?.marginId || '');

  // Estados para Modales
  const [modalState, setModalState] = useState(null);
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [isBandaModalOpen, setIsBandaModalOpen] = useState(false); // Modal Bandas
  const [productSearchState, setProductSearchState] = useState({ isOpen: false, rowIndex: null, initialSearch: '' });

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [items, setItems] = useState(
    initialData?.items?.map(item => ({
      ...item,
      id: item.id || Date.now() + Math.random(),
      descripcion: item.producto?.nombre || item.descripcion,
      producto: item.producto,
    })) || [{ id: Date.now(), descripcion: '', quantity: 1, unitPrice: 0, productoId: null }]
  );

  const [notes, setNotes] = useState(initialData?.notas || '');

  // Solo re-sincroniza cuando initialData cambia DESPUÉS del montaje inicial
  // (evita el render extra en modo creación/edición al abrir el formulario)
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (initialData?.items) {
      setItems(initialData.items.map(item => ({
        ...item,
        id: item.id || Date.now() + Math.random(),
        descripcion: item.producto?.nombre || item.descripcion || '',
        producto: item.producto,
      })));
    }
  }, [initialData]);

  const { data: clientes, error: clientesError } = useSWR('/api/clientes');
  const { data: margenes, error: margenesError } = useSWR(isMarginRequired ? '/api/pricing/margenes' : null);
  const { data: todosProductos, error: prodError } = useSWR('/api/productos');
  const { data: config } = useSWR('/api/config');

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
    setItems(prev => [...prev, { id: Date.now() + Math.random(), descripcion: '', quantity: 1, unitPrice: 0, productoId: null }]);
  };

  const removeItem = (itemId) => {
    const newItems = items.filter(item => item.id !== itemId);
    setItems(newItems);
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
  };

  // --- LÓGICA DE BÚSQUEDA DE PRODUCTOS ---
  const handleOpenProductSearch = (index) => {
    setProductSearchState({ isOpen: true, rowIndex: index, initialSearch: items[index].descripcion || '' });
  };

  const handleProductSelect = (product) => {
    const index = productSearchState.rowIndex;
    if (index === null) return;

    const newItems = [...items];
    newItems[index].descripcion = product.nombre;
    newItems[index].productoId = product.id;
    newItems[index].unitPrice = parseFloat(product.precio) || 0;
    newItems[index].producto = product; // Guardar referencia completa para stock display

    setItems(newItems);
    setProductSearchState({ isOpen: false, rowIndex: null, initialSearch: '' });
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
      newItems[index].descripcion = newProduct.nombre;
      newItems[index].productoId = newProduct.id;
      newItems[index].unitPrice = parseFloat(newProduct.precio) || 0;
      newItems[index].producto = newProduct;
      setItems(newItems);
    }
    setModalState(null);
    setModalState(null);
    mutate('/api/productos');
  };

  const handleBandaAdded = (bandaItem) => {
    // Convertir ítem de calculadora a formato PedidoItem
    const newItem = {
      id: Date.now() + Math.random(),
      descripcion: bandaItem.descripcion, // Ya viene formateada: "PVC 5mm - Cerrada (Sin Fin)"
      quantity: bandaItem.unidades,
      unitPrice: bandaItem.precioUnitario, // Precio unitario TOTAL (incluye servicios)
      productoId: null, // Producto a medida
      producto: null,
      pesoUnitario: bandaItem.pesoUnitario,
      detallesTecnicos: JSON.stringify({
        dimensiones: bandaItem.dimensiones,
        color: bandaItem.color || null,
        tipoConfeccion: bandaItem.tipoConfeccion,
        grapa: bandaItem.grapa || null,
        tacos: bandaItem.tacos || null,
      }),
    };
    setItems(prev => [...prev, newItem]);
    setIsBandaModalOpen(false);
  };

  const handleLoadTemplate = (template) => {
    if (!template.items || !Array.isArray(template.items)) return;

    // Regenerar IDs para evitar conflictos
    const newItems = template.items.map(item => ({
      ...item,
      id: Date.now() + Math.random(),
    }));

    setItems(newItems);
    if (template.marginId) {
      setSelectedMarginId(template.marginId);
    }
  };

  // --- TOTALES ---
  const { subtotalBase, subtotalConMargen, tax, total, ivaRate, margenAplicado } = useMemo(() => {
    const subtotalBase = items.reduce((acc, item) =>
      acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))
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
    };
  }, [items, config, selectedMarginId, margenes, isMarginRequired]);

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    if (!clienteId) { setError('Debe seleccionar un cliente.'); setIsLoading(false); return; }
    if (isMarginRequired && !selectedMarginId) { setError('Debe seleccionar una Regla de Margen.'); setIsLoading(false); return; }
    if (items.filter(item => item.quantity > 0 && item.descripcion).length === 0) { setError('Añada items válidos.'); setIsLoading(false); return; }

    const dataPayload = {
      clienteId,
      estado: initialData?.estado || 'Borrador',
      items: items
        .filter(item => item.descripcion && parseFloat(item.quantity) > 0)
        .map(item => ({
          descripcion: item.descripcion,
          quantity: Math.round(parseFloat(item.quantity)) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          productoId: item.productoId || null,
          pesoUnitario: parseFloat(item.pesoUnitario) || 0,
          detallesTecnicos: item.detallesTecnicos || null,
        })),
      subtotal: subtotalConMargen,
      tax: tax,
      total: total,
      notas: notes,
      marginId: selectedMarginId,
    };

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

      router.refresh();

      if (isEditMode) {
        if (onSuccess) onSuccess(savedData);
      } else {
        router.push(formType === 'PRESUPUESTO' ? `/presupuestos/${savedData.id}` : `/pedidos/${savedData.id}`);
      }
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="card-title text-primary">Información Principal</h2>
                <p className="text-sm opacity-70">
                  {isEditMode ? `Editando ${formType === 'PRESUPUESTO' ? 'Presupuesto' : 'Pedido'}` : `Nuevo ${formType === 'PRESUPUESTO' ? 'Presupuesto' : 'Pedido'}`}
                </p>
              </div>

              <div className="flex gap-2 items-center">
                {formType === 'PRESUPUESTO' && (
                  <TemplateManager
                    onLoadTemplate={handleLoadTemplate}
                    currentItems={items}
                    currentMarginId={selectedMarginId}
                  />
                )}
              </div>
            </div>

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
              <div>
                <h2 className="card-title text-primary">
                  Líneas del {formType === 'PRESUPUESTO' ? 'presupuesto' : 'pedido'}
                </h2>
                <p className="text-xs text-base-content/40">
                  {items.length} línea{items.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Menú unificado para añadir líneas */}
              <div className="dropdown dropdown-end">
                <button type="button" tabIndex={0} className="btn btn-primary btn-sm gap-1 m-1">
                  <Plus className="w-4 h-4" /> Añadir línea <ChevronDown className="w-3 h-3 opacity-70" />
                </button>
                <ul tabIndex={0} className="dropdown-content z-50 menu p-1.5 shadow-xl bg-base-100 rounded-box border border-base-300 w-60 mt-1 gap-0.5">
                  <li>
                    <button type="button" onClick={addItem} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-base-200">
                      <Package className="w-4 h-4 text-primary shrink-0" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Producto del catálogo</div>
                        <div className="text-xs text-base-content/50">Buscar por nombre o referencia</div>
                      </div>
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => setIsBandaModalOpen(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-base-200">
                      <Ruler className="w-4 h-4 text-secondary shrink-0" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Banda PVC</div>
                        <div className="text-xs text-base-content/50">Calculadora a medida</div>
                      </div>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="overflow-visible">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-10">Stock</th>
                    <th className="w-2/5">Producto</th>
                    <th className="w-24">Cantidad</th>
                    <th className="w-32">Precio Unit.</th>
                    <th className="text-right">Total</th>
                    <th className="w-20 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <EditorFilaItem
                      key={item.id}
                      item={item}
                      index={index}
                      handleItemChange={handleItemChange}
                      onSearchClick={() => handleOpenProductSearch(index)}
                      removeItem={removeItem}
                      handleDuplicateItem={handleDuplicateItem}
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
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error shadow-lg my-4">{error}</div>}

        <div className="flex justify-end gap-4 mt-6">
          <button type="button" onClick={onCancel || (() => router.back())} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading || !clienteId || (isMarginRequired && !selectedMarginId)}>
            <Save className="w-4 h-4" /> {isLoading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>

      <ClienteSearchModal isOpen={isClientSearchOpen} onClose={() => setIsClientSearchOpen(false)} onSelect={handleSelectClient} onCreateNew={handleOpenCreateClient} clientes={clientes} initialSearch={clienteNombre} />

      <ProductSearchModal isOpen={productSearchState.isOpen} onClose={() => setProductSearchState(prev => ({ ...prev, isOpen: false }))} onSelect={handleProductSelect} onCreateNew={handleOpenCreateProduct} productos={todosProductos} initialSearch={productSearchState.initialSearch} />

      {modalState?.type === 'CLIENTE' && (
        <BaseQuickCreateModal isOpen={true} onClose={() => setModalState(null)} onCreated={handleClienteCreado} title="Crear Nuevo Cliente" endpoint="/api/clientes" cacheKey="/api/clientes" fields={[{ name: 'nombre', placeholder: 'Nombre', required: true, defaultValue: modalState.initialName }, { name: 'email', placeholder: 'Email', type: 'email' }, { name: 'telefono', placeholder: 'Teléfono' }]} />
      )}

      {modalState?.type === 'QUICK_PRODUCT' && (
        <QuickProductForm isOpen={true} onClose={() => setModalState(null)} onCreated={handleCreatedProduct} initialReference={modalState.initialName} />
      )}

      <ModalCalculadoraBandas isOpen={isBandaModalOpen} onClose={() => setIsBandaModalOpen(false)} onAddItem={handleBandaAdded} />
    </>
  );
}