'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaUsers, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';

function ClientesPage() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [newClientName, setNewClientName] = useState('');

    const handleAddClient = async (e) => {
        e.preventDefault();
        if (!newClientName.trim()) return;

        try {
            const res = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: newClientName }),
            });
            if (!res.ok) throw new Error('Error al añadir el cliente');
            setNewClientName('');
            fetchData(); // Recargar la lista de clientes
        } catch (error) {
            setError(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
            try {
                const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error al eliminar el cliente');
                fetchData(); // Recargar la lista de clientes
            } catch (error) {
                setError(error.message);
            }
        }
    };

    const handleEdit = async (id, currentName) => {
        const newName = prompt('Introduce el nuevo nombre para el cliente:', currentName);
        if (newName && newName.trim() && newName !== currentName) {
            try {
                const res = await fetch(`/api/clientes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: newName }),
                });
                if (!res.ok) throw new Error('Error al actualizar el cliente');
                fetchData(); // Recargar la lista de clientes
            } catch (error) {
                setError(error.message);
            }
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/clientes');
            if (!res.ok) throw new Error('Error al cargar los clientes');
            setClientes(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (error) {
        return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaUsers /> Gestión de Clientes
            </h1>

            {/* Formulario para añadir nuevo cliente */}
            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <h2 className="card-title mb-4"><FaPlus /> Añadir Nuevo Cliente</h2>
                    <form onSubmit={handleAddClient}>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Nombre del Cliente</span>
                            </label>
                            <input 
                                type="text" 
                                placeholder="Introduce el nombre"
                                className="input input-bordered w-full" 
                                value={newClientName} 
                                onChange={(e) => setNewClientName(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="card-actions justify-end mt-4">
                            <button type="submit" className="btn btn-primary">
                                <FaPlus /> Añadir Cliente
                            </button>
                        </div>
                    </form>
                </div> {/* Cierre de div.card-body del formulario */}
            </div> {/* Cierre de div.card del formulario */}

            {/* Tabla con el listado de clientes */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title mb-4">Listado de Clientes</h2>
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map(cliente => (
                                    <tr key={cliente.id}>
                                        <td>{cliente.nombre}</td>
                                        <td>
                                            <Link href={`/gestion/clientes/${cliente.id}`} className="btn btn-info btn-xs mr-2"><FaEye /> Ver Historial</Link>
                                            <button onClick={() => handleEdit(cliente.id, cliente.nombre)} className="btn btn-ghost btn-xs"><FaEdit /></button>
                                            <button onClick={() => handleDelete(cliente.id)} className="btn btn-ghost btn-xs"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default ClientesPage;
