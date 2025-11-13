"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlusCircle, Edit, Trash2, Download, ExternalLink, Upload, Search, Package, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fetcher = (url) => fetch(url).then((res) => res.json());

// Constantes para el modal
const initialFormData = {
  id: null, tipo: 'PLANO', referencia: '', descripcion: '', rutaArchivo: '', productoId: '', maquinaUbicacion: '', file: null, productoBusqueda: ''
};
const TIPOS_DOCUMENTO = [
    { value: 'PLANO', label: 'Plano de Producto' },
    { value: 'GUIA', label: 'Guía de Máquina/Manual' },
    { value: 'PROCESO', label: 'Proceso Interno/Instrucción' },
];

// --- COMPONENTE DE MODAL DE CREACIÓN RÁPIDA (COHERENTE CON /api/productos) ---
function QuickProductForm({ isOpen, onClose, onCreated, catalogos }) {
    const { fabricantes, materiales, tarifas } = catalogos;
    
    // Estado inicial que refleja los inputs necesarios para POST /api/productos
    const [formData, setFormData] = useState({ 
        nombre: '', modelo: '', espesor: '', largo: '', ancho: '', 
        material: '', fabricante: ''
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Lógica para obtener espesores disponibles según el material (COPIADA DE GestionProductos)
    const availableEspesores = useMemo(() => {
        if (!tarifas || !formData.material) return [];
        
        const espesores = tarifas
            .filter(t => t.material === formData.material)
            .map(t => String(t.espesor));
        
        return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
    }, [tarifas, formData.material]);

    // Resetear espesor si el material cambia (COPIADA DE GestionProductos)
    useEffect(() => {
        setFormData(prev => ({ ...prev, espesor: '' }));
    }, [formData.material]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const dataToSend = {
            ...formData,
            espesor: parseFloat(formData.espesor) || 0,
            largo: parseFloat(formData.largo) || 0,
            ancho: parseFloat(formData.ancho) || 0,
            precioUnitario: 0, 
            pesoUnitario: 0,
            costo: 0,
        };
        
        try {
            const res = await fetch('/api/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorMessage = 'Error al crear el producto';
                try {
                    const errData = JSON.parse(errorText);
                    errorMessage = errData.message || errorMessage;
                } catch {}
                throw new Error(errorMessage);
            }
            
            const newProduct = await res.json();
            onCreated(newProduct); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl">
            <button type="button" onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2"><X /></button>
            <h3 className="font-bold text-lg flex items-center mb-4">
                <Package className="mr-2" /> Nueva Plantilla de Producto Rápido
            </h3>
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre/Descripción" className="input input-bordered w-full md:col-span-2" required />
                <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Referencia Fabricante" className="input input-bordered w-full" required />
                
                <select name="fabricante" value={formData.fabricante} onChange={handleChange} className="select select-bordered w-full" required>
                    <option value="">Selecciona Fabricante</option>
                    {fabricantes?.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
                </select>
                
                <select name="material" value={formData.material} onChange={handleChange} className="select select-bordered w-full" required>
                    <option value="">Selecciona Material</option>
                    {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                </select>
                
                {/* Selector de Espesor Dinámico */}
                <label className="form-control w-full">
                    <div className="label"><span className="label-text">Espesor (mm)</span></div>
                    <select 
                        name="espesor" 
                        value={formData.espesor} 
                        onChange={handleChange} 
                        className="select select-bordered w-full" 
                        disabled={!formData.material || availableEspesores.length === 0}
                        required
                    >
                        <option value="">{formData.material ? (availableEspesores.length > 0 ? 'Selecciona Espesor' : 'Sin tarifas para este material') : 'Selecciona Material primero'}</option>
                        {availableEspesores.map(e => (
                            <option key={e} value={e}>{e} mm</option>
                        ))}
                    </select>
                </label>
                
                <input type="number" step="1" name="largo" value={formData.largo} onChange={handleChange} placeholder="Largo (mm)" className="input input-bordered w-full" required />
                <input type="number" step="1" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="Ancho (mm)" className="input input-bordered w-full" required />
                
                {error && <p className="text-error text-sm md:col-span-2">{error}</p>}
                
                <div className="modal-action md:col-span-2">
                    <button type="button" onClick={onClose} className="btn">Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
          </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL (DocumentoModal y GestionDocumentos) ---

function DocumentoModal({ isOpen, onClose, initialData, productos, fabricantes, materiales, tarifas }) {
    const router = useRouter();
    
    // --- HOOKS INCONDICIONALES ---
    const [formData, setFormData] = useState(initialData);
    const [error, setError] = useState(null);
    const [modalState, setModalState] = useState(null); 
    
    // Obtener producto seleccionado (para auto-rellenar referencia)
    const selectedProduct = useMemo(() => {
        if (!formData.productoId || !productos) return null;
        return productos.find(p => p.id === formData.productoId);
    }, [formData.productoId, productos]);

    // Productos para el selector (HOOK INCONDICIONAL)
    const todosProductos = useMemo(() => productos || [], [productos]);
    const filteredProducts = useMemo(() => {
        if (formData.productoBusqueda.length < 2) return [];
        return todosProductos.filter(p => 
            p.nombre.toLowerCase().includes(formData.productoBusqueda.toLowerCase()) ||
            p.referenciaFabricante?.toLowerCase().includes(formData.productoBusqueda.toLowerCase())
        ).slice(0, 5);
    }, [todosProductos, formData.productoBusqueda]);
    // --- FIN HOOKS INCONDICIONALES ---


    const handleFileChange = useCallback((file) => {
        if (file) {
            const newRuta = `/planos/${file.name}`; 
            setFormData(prev => ({
                ...prev,
                rutaArchivo: newRuta,
                referencia: prev.referencia || file.name.split('.')[0], 
                file: file,
            }));
        }
    }, []);

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        handleFileChange(file);
    };

    const handleSelectProduct = (product) => {
        const defaultRef = product?.referenciaFabricante || product?.nombre || '';
        
        setFormData(prev => ({ 
            ...prev, 
            productoId: product.id,
            referencia: defaultRef,
            productoBusqueda: product.nombre,
        }));
    };
    
    const handleCreatedProduct = (newProduct) => {
         handleSelectProduct(newProduct);
         setModalState(null);
         mutate('/api/productos'); 
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        
        if (name === 'fileUpload' && files && files[0]) {
            handleFileChange(files[0]);
            return;
        }
        
        if (name === 'productoBusqueda') {
            setFormData(prev => ({ ...prev, [name]: value, productoId: null }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };
    

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (formData.tipo === 'PLANO' && !formData.productoId) {
            setError('Debe seleccionar o crear un Producto Asociado.');
            return;
        }
        if (!formData.rutaArchivo) {
             setError('Debe adjuntar un archivo.');
             return;
        }
        
        const docId = formData.id;
        const method = docId ? 'PUT' : 'POST';
        const url = docId ? `/api/documentos/${docId}` : '/api/documentos';
        
        const finalFormData = new FormData();
        
        // 1. Añadir campos de texto
        for (const key in formData) {
            if (key !== 'file' && key !== 'productoBusqueda' && key !== 'fileUpload' && formData[key] !== null && formData[key] !== undefined) {
                finalFormData.append(key, formData[key]);
            }
        }
        finalFormData.set('tipo', 'PLANO'); // Aseguramos que el tipo sea siempre PLANO
        
        // 2. Adjuntar el archivo real
        if (formData.file) {
            finalFormData.append('fileUpload', formData.file, formData.file.name);
        }
        
        // 3. Limpiar campos que no aplican
        finalFormData.set('maquinaUbicacion', '');

        try {
            const res = await fetch(url, {
                method: method,
                body: finalFormData, 
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorMessage = 'Error al guardar el documento.';
                try {
                    const errData = JSON.parse(errorText);
                    errorMessage = errData.message || errorMessage;
                } catch {}
                throw new Error(errorMessage);
            }

            mutate('/api/documentos'); 
            onClose();
            router.refresh(); 
            
        } catch (err) {
            setError(err.message);
        }
    };

    if (!isOpen) return null;

    const dragAndDropArea = (
        <div 
            className="border-2 border-dashed border-primary/50 rounded-lg p-6 text-center cursor-pointer hover:bg-base-300 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileUpload').click()}
        >
            <Upload className="w-6 h-6 mx-auto text-primary" />
            <p className="mt-2 text-sm">Arrastra y suelta el archivo, o haz clic para examinar.</p>
            {formData.rutaArchivo && <p className="text-xs text-success mt-1">Archivo adjunto: {formData.rutaArchivo.split('/').pop()}</p>}
            <input type="file" id="fileUpload" name="fileUpload" className="hidden" onChange={handleChange} />
        </div>
    );


    return (
        <>
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-xl flex items-center mb-4">
                <FileText className="mr-2 h-6 w-6" /> {formData.id ? 'Editar Documento' : 'Nuevo Documento'}
            </h3>
            
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Tipo de Documento */}
                <label className="form-control w-full">
                    <div className="label"><span className="label-text">Tipo</span></div>
                    <select name="tipo" value={'PLANO'} onChange={handleChange} className="select select-bordered w-full" disabled>
                        <option value="PLANO">Plano de Producto</option>
                        <option value="GUIA">Guía de Máquina/Manual</option>
                        <option value="PROCESO">Proceso Interno/Instrucción</option>
                    </select>
                </label>

                {/* Búsqueda y Creación de Producto (Solo si es Plano) */}
                <label className="form-control w-full relative">
                    <div className="label"><span className="label-text">Producto Asociado (Requerido)</span></div>
                    <div className="dropdown w-full">
                             <div className="input-group">
                                <input
                                    type="text"
                                    name="productoBusqueda"
                                    placeholder={selectedProduct ? selectedProduct.nombre : "Buscar o crear producto..."}
                                    value={formData.productoBusqueda}
                                    onChange={handleChange}
                                    className={`input input-bordered w-full ${formData.productoId ? 'border-success' : ''}`}
                                    tabIndex={0}
                                />
                                <button type="button" onClick={() => setModalState('PRODUCTO')} className="btn btn-primary" title="Crear Producto Rápido">
                                    <Plus className="w-4 h-4" />
                                </button>
                             </div>
                             
                             {/* Resultados de Búsqueda */}
                             {formData.productoBusqueda.length >= 2 && filteredProducts.length > 0 && formData.productoId === null && (
                                <ul tabIndex={0} className="absolute left-0 top-100% z-10 menu p-2 shadow bg-base-200 rounded-box w-full mt-1">
                                    {filteredProducts.map(product => (
                                        <li key={product.id} onClick={() => handleSelectProduct(product)}>
                                            <a><Search className="w-4 h-4 mr-2" />{product.nombre} ({product.referenciaFabricante})</a>
                                        </li>
                                    ))}
                                </ul>
                             )}
                             
                             {selectedProduct && (
                                 <div className="text-sm mt-2 text-success font-semibold flex items-center">
                                     <Package className="w-4 h-4 mr-1" />
                                     {selectedProduct.nombre} ({selectedProduct.referenciaFabricante})
                                 </div>
                             )}
                        </div>
                    </label>
                )}

                {/* Referencia/Título (Auto-rellenado para Plano) */}
                <label className={`form-control w-full md:col-span-2`}>
                    <div className="label"><span className="label-text">Referencia / Título (Se autocompleta con Ref. Fab.)</span></div>
                    <input 
                        type="text" 
                        name="referencia" 
                        value={formData.referencia} 
                        onChange={handleChange} 
                        placeholder={selectedProduct ? selectedProduct.referenciaFabricante : "Título del Documento"} 
                        className="input input-bordered w-full" 
                        required 
                    />
                </label>
                
                {/* Área de Subida de Archivo (Drag & Drop REAL) */}
                 <div className={`form-control w-full md:col-span-2`}>
                    <div className="label"><span className="label-text">Adjuntar Archivo</span></div>
                    {dragAndDropArea}
                </div>
                
                {/* Descripción */}
                <label className="form-control w-full md:col-span-2">
                    <div className="label"><span className="label-text">Descripción</span></div>
                    <textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange} placeholder="Detalles, notas importantes o pasos clave." className="textarea textarea-bordered h-24" />
                </label>


                {error && <p className="text-error text-sm md:col-span-2 mt-2 p-2 bg-red-100 rounded">{error}</p>}
                
                <div className="modal-action md:col-span-2 mt-6">
                    <button type="button" onClick={onClose} className="btn">Cancelar</button>
                    <button type="submit" className="btn btn-primary">Guardar Documento</button>
                </div>
            </form>
          </div>
        </div>
        
        {/* Modal de Creación Rápida de Producto */}
        {modalState === 'PRODUCTO' && (
            <QuickProductForm 
                isOpen={true}
                onClose={() => setModalState(null)}
                onCreated={handleCreatedProduct}
                catalogos={{ 
                    fabricantes: fabricantes, 
                    materiales: materiales, 
                    tarifas: tarifas 
                }}
            />
        )}
        </>
    );
}


export default function GestionDocumentos() {
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDocumento, setCurrentDocumento] = useState(initialFormData);
    
    // Solo necesitamos el filtro por referencia/título/fabricante
    const [filtroReferencia, setFiltroReferencia] = useState('');
    
    // HARDCODEADO: Solo PLANOS
    const { data: documentos, error: docsError, isLoading: docsLoading } = useSWR(`/api/documentos?tipo=PLANO&referencia=${filtroReferencia}`, fetcher);
    const { data: productos, error: prodError, isLoading: prodLoading } = useSWR('/api/productos', fetcher);
    const { data: fabricantes, error: fabError, isLoading: fabLoading } = useSWR('/api/fabricantes', fetcher);
    const { data: materiales, error: matError, isLoading: matLoading } = useSWR('/api/materiales', fetcher);
    const { data: tarifas } = useSWR('/api/precios', fetcher);

    
    const isLoading = docsLoading || prodLoading || fabLoading || matLoading;

    const openModal = (doc = null) => {
        const initial = doc ? { 
            ...doc, 
            productoBusqueda: todosProductos.find(p => p.id === doc.productoId)?.nombre || '',
        } : initialFormData;

        setCurrentDocumento(initial);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentDocumento(initialFormData);
        mutate('/api/productos'); 
    };

    const handleDelete = async (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar este documento? Esta acción es irreversible y eliminará el archivo del disco.')) {
            try {
                const res = await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Error al eliminar el documento.');
                }
                mutate(`/api/documentos?tipo=PLANO&referencia=${filtroReferencia}`);
                router.refresh(); 

            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        }
    };

    const getProductoInfo = (id) => {
        if (!id || !productos || !fabricantes) return { nombre: 'N/A', fabricanteNombre: 'N/A' };
        const prod = productos.find(p => p.id === id);
        if (!prod) return { nombre: 'N/A', fabricanteNombre: 'N/A' };
        
        const fab = fabricantes.find(f => f.id === prod.fabricanteId);
        return { 
            nombre: prod.nombre, 
            fabricanteNombre: fab?.nombre || 'Desconocido' 
        };
    }
    
    // Obtenemos todos los productos del cache para el manejo interno
    const todosProductos = useMemo(() => productos || [], [productos]);


    if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
    if (docsError || prodError || fabError || matError) return <div className="text-red-500 text-center">Error al cargar datos necesarios.</div>;

    // --- CORRECCIÓN CRÍTICA: Usar una lista segura ---
    const documentosList = Array.isArray(documentos) ? documentos : [];

    return (
        <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 flex items-center"><FileText className="mr-2" /> Gestión de Planos de Producto</h1>
        
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => openModal()} className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> Nuevo Plano
            </button>
        </div>

        {/* --- SECCIÓN DE FILTROS SIMPLIFICADA --- */}
        <div className="flex justify-start gap-4 mb-6 p-4 bg-base-200 rounded-lg shadow-inner">
            {/* Buscador único por Referencia/Título/Fabricante */}
            <input
            type="text"
            placeholder="Buscar por Referencia, Título o Fabricante..."
            value={filtroReferencia}
            onChange={(e) => setFiltroReferencia(e.target.value)}
            className="input input-bordered w-full max-w-xl"
            />
        </div>
        {/* ------------------------------------- */}

        <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
            <table className="table w-full">
            <thead>
                <tr>
                    <th>Referencia / Título</th>
                    <th>Fecha Subida</th>
                    <th>Producto (Fabricante)</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {documentosList.map((doc) => {
                    const prodInfo = getProductoInfo(doc.productoId);
                    
                    // Solo es PLANO, usamos un color simple
                    let rowClass = 'hover bg-base-300/70';

                    return (
                        <tr key={doc.id} className={rowClass}>
                            <td className="font-semibold">{doc.referencia}</td>
                            <td>{new Date(doc.fechaSubida).toLocaleDateString()}</td>
                            <td>
                                {doc.productoId ? 
                                    <span className="tooltip tooltip-right" data-tip={prodInfo.nombre}>
                                        {prodInfo.fabricanteNombre}
                                    </span>
                                    : 'N/A'
                                }
                            </td>
                            <td className="flex gap-2">
                                {doc.rutaArchivo && (
                                    <a 
                                    href={doc.rutaArchivo} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-sm btn-ghost tooltip" 
                                    data-tip="Abrir Ruta (Local/Red)"
                                    >
                                        <ExternalLink className="w-4 h-4 text-primary" />
                                    </a>
                                )}
                                <button onClick={() => openModal(doc)} className="btn btn-sm btn-outline btn-info">
                                <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(doc.id)} className="btn btn-sm btn-outline btn-error">
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
            </table>
            {documentosList.length === 0 && !isLoading && (
                <div className="text-center p-6 text-gray-500">No se encontraron planos.</div>
            )}
        </div>

        <DocumentoModal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
            initialData={currentDocumento}
            productos={todosProductos}
            fabricantes={fabricantes}
            materiales={materiales}
            tarifas={tarifas}
        />
        </div>
    );
}
