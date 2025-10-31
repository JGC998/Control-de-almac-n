'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FaBoxOpen, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';

function ProductosPage() {
    const [productos, setProductos] = useState([]);
    const [datosMateriales, setDatosMateriales] = useState([]);
    const [fabricantes, setFabricantes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [productosRes, materialesRes, fabricantesRes] = await Promise.all([
                fetch('/api/productos'),
                fetch('/api/precios'),
                fetch('/api/fabricantes'),
            ]);
            if (!productosRes.ok || !materialesRes.ok || !fabricantesRes.ok) throw new Error('Error al cargar los datos');
            setProductos(await productosRes.json());
            setDatosMateriales(await materialesRes.json());
            setFabricantes(await fabricantesRes.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleProductUpdate = () => {
        fetchData();
    };

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
                <FaBoxOpen /> Gestión de Productos
            </h1>

            <AddProductForm onProductAdded={handleProductUpdate} datosMateriales={datosMateriales} fabricantes={fabricantes} />

            <ProductList productos={productos} onProductDeleted={handleProductUpdate} onProductUpdated={handleProductUpdate} />
        </main>
    );
}

function AddProductForm({ onProductAdded, datosMateriales, fabricantes }) {
    const [fabricante, setFabricante] = useState('');
    const [modelo, setModelo] = useState('');
    const [material, setMaterial] = useState('');
    const [espesor, setEspesor] = useState('');
    const [largo, setLargo] = useState('');
    const [ancho, setAncho] = useState('');

    const materialesUnicos = useMemo(() => [...new Set(datosMateriales.map(item => item.material))], [datosMateriales]);
    const espesoresDisponibles = useMemo(() => {
        if (material) {
            return datosMateriales.filter(item => item.material === material).map(item => item.espesor);
        }
        return [];
    }, [material, datosMateriales]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const materialInfo = datosMateriales.find(m => m.material === material && m.espesor == espesor);
        if (!materialInfo) {
            alert('No se encontraron datos de precio/peso para el material seleccionado.');
            return;
        }

        const areaM2 = (parseFloat(largo) / 1000) * (parseFloat(ancho) / 1000);
        const precioUnitario = areaM2 * materialInfo.precio;
        const pesoUnitario = areaM2 * materialInfo.peso;

        const nuevoProducto = {
            nombre: `${fabricante} - ${modelo}`,
            fabricante,
            modelo,
            material,
            espesor: parseFloat(espesor),
            largo: parseFloat(largo),
            ancho: parseFloat(ancho),
            precioUnitario,
            pesoUnitario,
        };

        try {
            const res = await fetch('/api/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoProducto),
            });
            if (!res.ok) throw new Error('Error al añadir el producto');
            
            // Limpiar formulario
            setFabricante('');
            setModelo('');
            setMaterial('');
            setEspesor('');
            setLargo('');
            setAncho('');

            onProductAdded();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
                <h2 className="card-title mb-4"><FaPlus /> Añadir Nuevo Producto</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-control">
                        <label className="label"><span className="label-text">Fabricante</span></label>
                        <input type="text" list="fabricantes-list" placeholder="Escribe o selecciona" className="input input-bordered" value={fabricante} onChange={e => setFabricante(e.target.value)} required />
                        <datalist id="fabricantes-list">
                            {fabricantes.map(f => <option key={f.id} value={f.nombre} />)}
                        </datalist>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Modelo</span></label>
                        <input type="text" placeholder="Ej: Faldeta 300x400" className="input input-bordered" value={modelo} onChange={e => setModelo(e.target.value)} required />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Material</span></label>
                        <select className="select select-bordered" value={material} onChange={e => setMaterial(e.target.value)} required>
                            <option value="" disabled>Selecciona material</option>
                            {materialesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Espesor (mm)</span></label>
                        <select className="select select-bordered" value={espesor} onChange={e => setEspesor(e.target.value)} disabled={!material} required>
                            <option value="" disabled>Selecciona espesor</option>
                            {espesoresDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Largo (mm)</span></label>
                        <input type="number" placeholder="Largo" className="input input-bordered" value={largo} onChange={e => setLargo(e.target.value)} required />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Ancho (mm)</span></label>
                        <input type="number" placeholder="Ancho" className="input input-bordered" value={ancho} onChange={e => setAncho(e.target.value)} required />
                    </div>
                    <div className="card-actions justify-end md:col-span-3 mt-4">
                        <button type="submit" className="btn btn-primary"><FaPlus /> Añadir Producto</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ProductList({ productos, onProductDeleted, onProductUpdated }) {

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            try {
                const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error al eliminar el producto');
                onProductDeleted();
            } catch (error) {
                alert(error.message);
            }
        }
    };

    // TODO: Implementar edición
    const handleEdit = (id) => {
        alert('La función de editar aún no está implementada.');
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title mb-4">Listado de Productos</h2>
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Material</th>
                                <th>Dimensiones</th>
                                <th>Precio Unit.</th>
                                <th>Peso Unit.</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map(producto => (
                                <tr key={producto.id}>
                                    <td>{producto.nombre}</td>
                                    <td>{producto.material} {producto.espesor}mm</td>
                                    <td>{producto.largo}x{producto.ancho}mm</td>
                                    <td>{producto.precioUnitario.toFixed(2)} €</td>
                                    <td>{producto.pesoUnitario.toFixed(2)} kg</td>
                                    <td>
                                        <button onClick={() => handleEdit(producto.id)} className="btn btn-ghost btn-xs"><FaEdit /></button>
                                        <button onClick={() => handleDelete(producto.id)} className="btn btn-ghost btn-xs"><FaTrash /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ProductosPage;