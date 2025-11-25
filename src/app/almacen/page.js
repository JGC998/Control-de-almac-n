"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Warehouse, PlusCircle, ArrowRightLeft, MinusCircle, History } from 'lucide-react'; 
import MovimientoStockModal from '@/components/MovimientoStockModal'; // Importar el nuevo modal

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AlmacenPage() {
  const [formData, setFormData] = useState({ material: '', espesor: '', metrosDisponibles: 0, proveedor: '', ubicacion: 'Almacén', stockMinimo: 100 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({ stockId: '', material: '', espesor: '', cantidad: 0, disponible: 0, referencia: '' });
  const [error, setError] = useState(null);

  // Estado para el modal de historial
  const [historyModalState, setHistoryModalState] = useState({ isOpen: false, stockId: null, materialNombre: '' });

  const { data, error: stockError, isLoading: stockLoading } = useSWR('/api/almacen-stock', fetcher);
  const { data: movimientos, error: movError, isLoading: movLoading } = useSWR('/api/movimientos', fetcher);

  const isLoading = stockLoading || movLoading;

  // --- Lógica de Modales ---
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  const openWithdrawalModal = (item) => {
      setWithdrawalData({
          stockId: item.id,
          material: item.material,
          espesor: item.espesor,
          cantidad: item.metrosDisponibles.toFixed(2),
          disponible: item.metrosDisponibles, 
          referencia: `Salida para Material: ${item.material} ${item.espesor}mm`
      });
      setIsWithdrawalModalOpen(true);
  };
  const closeWithdrawalModal = () => setIsWithdrawalModalOpen(false);

  // Handlers para el nuevo modal de historial
  const openHistoryModal = (stockId, materialNombre) => {
    setHistoryModalState({ isOpen: true, stockId, materialNombre });
  };
  const closeHistoryModal = () => {
    setHistoryModalState({ isOpen: false, stockId: null, materialNombre: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/almacen-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          metrosDisponibles: parseFloat(formData.metrosDisponibles),
          stockMinimo: parseFloat(formData.stockMinimo)
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al añadir stock');
      }
      mutate('/api/almacen-stock');
      mutate('/api/movimientos');
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleWithdrawalChange = (e) => {
    const { name, value } = e.target;
    setWithdrawalData(prev => ({ ...prev, [name]: value }));
  };
  
  const setMaxQuantity = () => {
      setWithdrawalData(prev => ({ ...prev, cantidad: prev.disponible.toFixed(2) }));
  };
  
  const handleWithdrawalSubmit = async (e) => {
      e.preventDefault();
      setError(null);
      const cantidadRetirar = parseFloat(withdrawalData.cantidad);
      
      if (cantidadRetirar <= 0) {
          setError('La cantidad a retirar debe ser positiva.');
          return;
      }
      if (cantidadRetirar > withdrawalData.disponible + 0.001) {
          setError(`No puedes retirar más de ${withdrawalData.disponible.toFixed(2)}m.`);
          return;
      }
      
      let finalReferencia = withdrawalData.referencia;
      if (cantidadRetirar > withdrawalData.disponible - 0.001) {
           finalReferencia = `BAJA TOTAL: ${withdrawalData.referencia}`;
      }

      try {
          const res = await fetch('/api/almacen-stock?action=salida', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  stockId: withdrawalData.stockId,
                  cantidad: cantidadRetirar,
                  referencia: finalReferencia,
              }),
          });
          if (!res.ok) {
              const errorText = await res.text(); 
              try {
                  const errData = JSON.parse(errorText);
                  throw new Error(errData.message || 'Error al dar de baja el stock');
              } catch {
                  throw new Error(`Error ${res.status}: ${errorText.substring(0, 50)}...`);
              }
          }
          
          // Forzar revalidación explícita
          await mutate('/api/almacen-stock', fetcher('/api/almacen-stock'));
          await mutate('/api/movimientos');
          closeWithdrawalModal();
      } catch (err) {
          setError(err.message);
      }
  };

  if (isLoading || !data) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (stockError || movError) return <div className="text-red-500 text-center">Error al cargar datos del almacén.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Warehouse className="mr-2" /> Gestión de Almacén</h1>
      
      <button onClick={openModal} className="btn btn-primary mb-6">
        <PlusCircle className="w-4 h-4" /> Añadir Stock Manual
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Inventario Actual</h2>
            <div className="overflow-x-auto max-h-96">
              <table className="table table-pin-rows table-sm">
                <thead><tr>
                  <th>Material</th>
                  <th>Espesor</th>
                  <th>Metros Disp.</th>
                  <th>Cant. Bobinas</th>
                  <th>Proveedor</th>
                  <th>Acción</th>
                </tr></thead>
                <tbody>
                  {data?.stock?.map(item => (
                    <tr key={item.id} className="hover">
                      <td className="font-bold">{item.material}</td>
                      <td>{item.espesor}</td>
                      <td>{item.metrosDisponibles.toFixed(2)} m</td>
                      <td>{item.cantidadBobinas || 0}</td>
                      <td>{item.proveedorNombre}</td>
                      <td className="flex gap-1">
                          <button 
                              onClick={() => openWithdrawalModal(item)} 
                              className="btn btn-xs btn-error btn-outline"
                              disabled={item.metrosDisponibles <= 0}
                          >
                              <MinusCircle className="w-4 h-4" /> Baja
                          </button>
                          <button 
                              onClick={() => openHistoryModal(item.id, `${item.material} ${item.espesor}mm`)}
                              className="btn btn-xs btn-info btn-outline"
                          >
                              <History className="w-4 h-4" /> Historial
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Movimientos Recientes</h2>
            <div className="overflow-y-auto max-h-96">
              <ul className="timeline timeline-vertical">
                {movimientos?.map((mov, index) => (
                  <li key={mov.id}>
                    {index > 0 && <hr />}
                    <div className="timeline-start">{new Date(mov.fecha).toLocaleDateString()}</div>
                    <div className="timeline-middle">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div className="timeline-end timeline-box">
                      <p className="font-bold">{mov.tipo} ({mov.cantidad}m)</p>
                      <p className="text-xs">{mov.referencia}</p>
                    </div>
                    {index < movimientos.length - 1 && <hr />}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALES --- */}
      {isModalOpen && (
        <div className="modal modal-open">
          {/* ... Modal de Añadir Stock ... */}
        </div>
      )}
      
      {isWithdrawalModalOpen && (
        <div className="modal modal-open">
          {/* ... Modal de Dar de Baja Stock ... */}
        </div>
      )}

      {/* Modal para Añadir Stock (Entrada) */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Añadir Stock Manualmente</h3>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <input type="text" name="material" value={formData.material} onChange={handleChange} placeholder="Material" className="input input-bordered w-full" required />
              <input type="text" name="espesor" value={formData.espesor} onChange={handleChange} placeholder="Espesor" className="input input-bordered w-full" />
              <input type="number" step="0.01" name="metrosDisponibles" value={formData.metrosDisponibles} onChange={handleChange} placeholder="Metros Disponibles" className="input input-bordered w-full" required />
              <input type="number" step="0.01" name="stockMinimo" value={formData.stockMinimo} onChange={handleChange} placeholder="Stock Mínimo" className="input input-bordered w-full" required />
              <input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} placeholder="Proveedor" className="input input-bordered w-full" />
              <input type="text" name="ubicacion" value={formData.ubicacion} onChange={handleChange} placeholder="Ubicación" className="input input-bordered w-full" />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="modal-action">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">Añadir</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal para Dar de Baja Stock (Salida) */}
      {isWithdrawalModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Dar de Baja Stock</h3>
            <p className="text-sm text-gray-500 mb-4">
                Retirando {withdrawalData.material} ({withdrawalData.espesor}mm). Disponible: 
                <span className="font-semibold text-warning"> {withdrawalData.disponible.toFixed(2)}m</span>
            </p>
            <form onSubmit={handleWithdrawalSubmit} className="py-4 space-y-4">
              <div className="flex gap-2">
                 <input 
                    type="number" 
                    step="0.01" 
                    name="cantidad" 
                    value={withdrawalData.cantidad} 
                    onChange={handleWithdrawalChange} 
                    placeholder="Cantidad a Retirar (metros)" 
                    className="input input-bordered w-full" 
                    required 
                />
                <button type="button" onClick={setMaxQuantity} className="btn btn-outline btn-sm whitespace-nowrap">
                    Baja Total ({withdrawalData.disponible.toFixed(2)}m)
                </button>
              </div>

              <input 
                  type="text" 
                  name="referencia" 
                  value={withdrawalData.referencia} 
                  onChange={handleWithdrawalChange} 
                  placeholder="Referencia de Salida (Ej: Pedido Cliente #)" 
                  className="input input-bordered w-full"
              />
              {error && <p className="text-error text-sm">{error}</p>}
              <div className="modal-action">
                <button type="button" onClick={closeWithdrawalModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-error">Confirmar Baja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModalState.isOpen && (
        <MovimientoStockModal 
          stockId={historyModalState.stockId}
          materialNombre={historyModalState.materialNombre}
          onClose={closeHistoryModal}
        />
      )}
    </div>
  );
}
