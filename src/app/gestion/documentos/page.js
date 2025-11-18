"use client";
import React, { useState, useMemo, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { FileText, PlusCircle, Edit, Trash2, ExternalLink, Upload, Search, Package, Plus, FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import QuickProductForm from '../../../components/QuickProductForm'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

const initialFormData = {
  id: null, tipo: 'PLANO', referencia: '', descripcion: '', rutaArchivo: '', productoId: '', maquinaUbicacion: '', file: null, productoBusqueda: ''
};

// --- COMPONENTE PRINCIPAL (DocumentoModal y GestionDocumentos) ---

function DocumentoModal({ isOpen, onClose, initialData, productos, fabricantes, materiales, tarifas }) {
    const router = useRouter();
    
    // --- HOOKS INCONDICIONALES ---
    const [formData, setFormData] = useState(initialData);
    const [error, setError] = useState(null);
    const [modalState, setModalState] = useState(null); 
    
    const selectedProduct = useMemo(() => {
        if (!formData.productoId || !productos) return null;
        return productos.find(p => p.id === formData.productoId);
    }, [formData.productoId, productos]);

    const todosProductos = useMemo(() => productos || [], [productos]);
    
    // MEJORA 1: Limitar los resultados a 5
    const filteredProducts = useMemo(() => {
        if (formData.productoBusqueda.length < 2) return [];
        return todosProductos.filter(p => 
            p.nombre.toLowerCase().includes(formData.productoBusqueda.toLowerCase()) ||
            p.referenciaFabricante?.toLowerCase().includes(formData.productoBusqueda.toLowerCase())
        ).slice(0, 5); // <-- Límite de 5 resultados
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
            referencia: prev.referencia || defaultRef, 
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
        
        if (!formData.productoId) {
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
        
        for (const key in formData) {
            if (key !== 'file' && key !== 'productoBusqueda' && key !== 'fileUpload' && formData[key] !== null && formData[key] !== undefined) {
                finalFormData.append(key, formData[key]);
            }
        }
        
        finalFormData.set('tipo', 'PLANO'); 
        finalFormData.set('maquinaUbicacion', ''); 
        
        if (formData.file) {
            finalFormData.append('fileUpload', formData.file, formData.file.name);
        }
        
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

    const showDropdown = formData.productoBusqueda.length >= 2 && formData.productoId === null;
    const noResults = showDropdown && filteredProducts.length === 0;


    return (
        <>
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-xl flex items-center mb-4">
                <FileText className="mr-2 h-6 w-6" /> {formData.id ? 'Editar Plano' : 'Nuevo Plano de Producto'}
            </h3>
            
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Contenedor para el desplegable */}
                <div className="form-control w-full relative md:col-span-2">
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
                             
                             {/* Resultados de Búsqueda y Opción de Creación Rápida */}
                             {showDropdown && (
                                <ul 
                                    tabIndex={0} 
                                    // z-50 para asegurar que sobresalga (corrección anterior)
                                    className="absolute left-0 top-full z-50 menu p-2 shadow bg-base-200 rounded-box w-full mt-1 border border-base-300"
                                >
                                    {/* Muestra los resultados filtrados (máx. 5) */}
                                    {filteredProducts.map(product => (
                                        <li key={product.id} onClick={() => handleSelectProduct(product)}>
                                            <a><Search className="w-4 h-4 mr-2" />{product.nombre} ({product.referenciaFabricante})</a>
                                        </li>
                                    ))}
                                    
                                    {/* MEJORA 2: Opción para crear si no hay resultados */}
                                    {noResults && (
                                        <li onClick={() => setModalState('PRODUCTO')}>
                                            <a className="bg-warning text-warning-content hover:bg-warning-focus">
                                                <FilePlus className="w-4 h-4 mr-2" />
                                                Crear nueva Referencia: {formData.productoBusqueda}
                                            </a>
                                        </li>
                                    )}
                                </ul>
                             )}
                             
                             {selectedProduct && (
                                 <div className="text-sm mt-2 text-success font-semibold flex items-center">
                                     <Package className="w-4 h-4 mr-1" />
                                     {selectedProduct.nombre} ({selectedProduct.referenciaFabricante})
                                 </div>
                             )}
                        </div>
                    </div>

                {/* Referencia/Título (Auto-rellenado para Plano) */}
                <label className={`form-control w-full md:col-span-2`}>
                    <div className="label"><span className="label-text">Referencia / Título (Sugerido por Ref. Fab.)</span></div>
                    <input 
                        type="text" 
                        name="referencia" 
                        value={formData.referencia} 
                        onChange={handleChange} 
                        placeholder={selectedProduct?.referenciaFabricante || "Título del Documento"} 
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
        
        {/* Modal de Creación Rápida de Producto (Importado) */}
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
                // Puedes pasar la búsqueda actual para auto-rellenar la referencia en el modal
                initialReference={formData.productoBusqueda}
            />
        )}
        </>
    );
}


export default function GestionDocumentos() {
// ... [El resto del componente GestionDocumentos permanece igual]
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDocumento, setCurrentDocumento] = useState(initialFormData);
    
    const [filtroReferencia, setFiltroReferencia] = useState('');
    
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
    };

    const handleDelete = async (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar este documento? Esta acción es irreversible y eliminará el archivo del disco.')) {
            try {
                const res = await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
                
                if (!res.ok) {
                    const errorText = await res.text();
                    let errorMessage = 'Error al eliminar el documento.';
                    try {
                        const errData = JSON.parse(errorText);
                        errorMessage = errData.message || errorMessage;
                    } catch {}
                    throw new Error(errorMessage);
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
    
    const todosProductos = useMemo(() => productos || [], [productos]);


    if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
    if (docsError || prodError || fabError || matError) return <div className="text-red-500 text-center">Error al cargar datos necesarios.</div>;

    const documentosList = Array.isArray(documentos) ? documentos : [];

    return (
        <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 flex items-center"><FileText className="mr-2" /> Gestión de Planos de Producto</h1>
        
        <div className="flex justify-between items-center mb-6">
            <button onClick={() => openModal()} className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> Nuevo Plano
            </button>
        </div>

        <div className="flex justify-start gap-4 mb-6 p-4 bg-base-200 rounded-lg shadow-inner">
            <input
            type="text"
            placeholder="Buscar por Referencia, Título o Fabricante..."
            value={filtroReferencia}
            onChange={(e) => setFiltroReferencia(e.target.value)}
            className="input input-bordered w-full max-w-xl"
            />
        </div>

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
                    
                    let rowClass = 'hover bg-base-300/70';

                    return (
                        <tr key={doc.id} className={rowClass}>
                            <td className="font-semibold">{doc.referencia}</td>
                            <td>{doc.fechaSubida ? format(new Date(doc.fechaSubida), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</td>
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
