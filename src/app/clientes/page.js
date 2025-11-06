'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaClipboardList, FaSpinner } from 'react-icons/fa';

// Importar los componentes recién creados
import NuevoPedidoForm from '@/components/clientes/NuevoPedidoForm';
import PedidosHistorial from '@/components/clientes/PedidosHistorial';
import EditarPedidoModal from '@/components/clientes/EditarPedidoModal';

// --- Componente Principal (Orquestador) ---

function PedidosClientesPage() {
    const [pedidos, setPedidos] = useState([]);
    const [productos, setProductos] = useState([]);
    const [fabricantes, setFabricantes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [datosMateriales, setDatosMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pedidoEnEdicion, setPedidoEnEdicion] = useState(null);

    // Carga de datos de materiales (precios.json)
    useEffect(() => {
        const fetchMateriales = async () => {
            try {
                const response = await fetch('/api/precios');
                if (!response.ok) throw new Error('No se pudo cargar precios.json');
                setDatosMateriales(await response.json());
            } catch (error) {
                console.error('Error fetching materiales:', error);
                setError('No se pudieron cargar los datos de materiales.');
            }
        };
        fetchMateriales();
    }, []);

    // Función para cargar catálogos y pedidos, envuelta en useCallback
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [productosRes, pedidosRes, fabricantesRes, clientesRes] = await Promise.all([
                fetch('/api/productos'),
                fetch('/api/pedidos'),
                fetch('/api/fabricantes'),
                fetch('/api/clientes')
            ]);
            if (!productosRes.ok || !pedidosRes.ok || !fabricantesRes.ok || !clientesRes.ok) {
                throw new Error('Error al cargar los datos del servidor');
            }
            setProductos(await productosRes.json());
            setPedidos(await pedidosRes.json());
            setFabricantes(await fabricantesRes.json());
            setClientes(await clientesRes.json());
        } catch (err) {
            console.error("Fallo al cargar datos:", err);
            setError(err.message || 'Ocurrió un error desconocido.');
        } finally {
            setLoading(false);
        }
    }, []); // useCallback con array vacío para que la función no se recree

    // Carga inicial de datos
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGuardarEdicion = async (pedidoActualizado) => {
        try {
            const res = await fetch(`/api/pedidos/${pedidoActualizado.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoActualizado)
            });
            if (!res.ok) throw new Error('Error al guardar los cambios del pedido');
            
            setPedidoEnEdicion(null); // Cierra el modal
            fetchData(); // Recarga todos los datos
        } catch (error) {
            console.error("Error guardando cambios del pedido:", error);
            alert('No se pudieron guardar los cambios.');
        }
    };

    if (error) {
        return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    }

    if (loading && pedidos.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FaSpinner className="animate-spin text-4xl text-primary" />
            </div>
        );
    }

    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaClipboardList /> Pedidos de Clientes
            </h1>

            <NuevoPedidoForm productos={productos} clientes={clientes} onPedidoCreado={fetchData} />

            <PedidosHistorial pedidos={pedidos} clientes={clientes} onUpdate={fetchData} onEdit={setPedidoEnEdicion} />

            {pedidoEnEdicion && (
                <EditarPedidoModal 
                    pedido={pedidoEnEdicion}
                    productos={productos}
                    clientes={clientes}
                    onClose={() => setPedidoEnEdicion(null)}
                    onSave={handleGuardarEdicion}
                />
            )}
        </main>
    );
}

export default PedidosClientesPage;
