'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';

export default function PedidoDetailPage() {
    const [pedido, setPedido] = useState(null);
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetch(`/api/pedidos/${id}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error('No se pudo cargar el pedido.');
                    }
                    return res.json();
                })
                .then(async (data) => {
                    setPedido(data);
                    if (data.clienteId) {
                        const clientRes = await fetch(`/api/clientes/${data.clienteId}`);
                        if (clientRes.ok) {
                            const clientData = await clientRes.json();
                            setCliente(clientData);
                        }
                    }
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message);
                    setLoading(false);
                });
        }
    }, [id]);

    if (loading) {
        return (
            <main className="p-8 flex justify-center items-center">
                <span className="loading loading-spinner loading-lg"></span>
            </main>
        );
    }

    if (error) {
        return (
            <main className="p-8 text-center">
                <p className="text-error">{error}</p>
                <button onClick={() => router.back()} className="btn btn-primary mt-4">Volver</button>
            </main>
        );
    }

    if (!pedido) {
        return null; // Or a not found component
    }

    const productosNormalizados = (pedido.productos || pedido.items || []).map(p => ({
        id: p.id || p.item_id,
        nombre: p.nombre || p.descripcion,
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario || p.precio_unitario || 0,
        pesoUnitario: p.pesoUnitario || 0,
    }));

    const totalPedido = productosNormalizados.reduce((acc, prod) => acc + (prod.cantidad * prod.precioUnitario), 0);
    const totalPeso = productosNormalizados.reduce((acc, prod) => acc + (prod.cantidad * prod.pesoUnitario), 0);
    const clienteNombre = cliente ? cliente.nombre : pedido.cliente;

    return (
        <main className="p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => router.back()} className="btn btn-ghost mb-4">
                    <FaArrowLeft /> Volver al listado
                </button>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="card-title text-3xl">Pedido: {pedido.numero || pedido.id}</h1>
                                <p>Cliente: <span className="font-semibold">{clienteNombre}</span></p>
                                <p>Fecha: <span className="font-semibold">{new Date(pedido.fechaCreacion || pedido.fecha).toLocaleDateString('es-ES')}</span></p>
                                <p>Estado: <span className={`badge ${pedido.estado === 'Activo' || pedido.estado === 'Pendiente' ? 'badge-success' : 'badge-warning'}`}>{pedido.estado}</span></p>
                            </div>
                            <a href={`/api/pedidos/${id}/pdf`} className="btn btn-primary">
                                <FaFilePdf /> Descargar PDF
                            </a>
                        </div>

                        <div className="divider"></div>

                        <h2 className="text-xl font-bold">Productos</h2>
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th className="text-right">Cantidad</th>
                                        <th className="text-right">Peso Unit.</th>
                                        <th className="text-right">Peso Total</th>
                                        <th className="text-right">Precio Unit.</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productosNormalizados.map((producto, index) => (
                                        <tr key={producto.id || index}>
                                            <td>{producto.nombre}</td>
                                            <td className="text-right font-mono">{producto.cantidad}</td>
                                            <td className="text-right font-mono">{parseFloat(producto.pesoUnitario).toFixed(2)} kg</td>
                                            <td className="text-right font-mono">{(producto.cantidad * producto.pesoUnitario).toFixed(2)} kg</td>
                                            <td className="text-right font-mono">{parseFloat(producto.precioUnitario).toFixed(2)} €</td>
                                            <td className="text-right font-mono">{(producto.cantidad * producto.precioUnitario).toFixed(2)} €</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colSpan="3" className="text-right text-lg">Total Peso</th>
                                        <th className="text-right text-lg font-mono">{totalPeso.toFixed(2)} kg</th>
                                        <th className="text-right text-lg">Total Pedido</th>
                                        <th className="text-right text-lg font-mono">{totalPedido.toFixed(2)} €</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {pedido.notas && (
                            <>
                                <div className="divider"></div>
                                <h2 className="text-xl font-bold">Notas</h2>
                                <p>{pedido.notas}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
