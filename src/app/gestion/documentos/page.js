"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { FileText, PlusCircle, Edit, Trash2, ExternalLink, Upload, Search, Package, Plus, X, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import QuickProductForm from '../../../components/QuickProductForm'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

const initialFormData = {
  id: null, tipo: 'PLANO', referencia: '', descripcion: '', rutaArchivo: '', productoId: '', maquinaUbicacion: '', file: null, productoNombre: ''
};

// --- NUEVO COMPONENTE: MODAL DE BÚSQUEDA DE PRODUCTOS ---
function ProductSearchModal({ isOpen, onClose, onSelect, onCreateNew, productos = [], fabricantes = [], initialSearch = '' }) {
    const [search, setSearch] = useState(initialSearch);

    useEffect(() => {
        if (isOpen) setSearch(initialSearch);
    }, [isOpen, initialSearch]);

    const filteredProducts = useMemo(() => {
        if (!productos) return [];
        return productos.filter(p => {
            const term = search.toLowerCase();
            return p.nombre?.toLowerCase().includes(term) ||
                   p.referenciaFabricante?.toLowerCase().includes(term);
        }).slice(0, 50);
    }, [productos, search]);

    const getFabricanteName = (fabId) => {
        return fabricantes?.find(f => f.id === fabId)?.nombre || '-';
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-[9999]">
            <div className="modal-box w-11/12 max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Package className="w-5 h-5" /> Buscar Producto
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>

                <div className="join w-full mb-4">
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Escribe nombre, referencia fab..."
                        className="input input-bordered join-item w-full"
                        autoFocus
                    />
                    <button 
                        className="btn btn-primary join-item"
                        onClick={() => onCreateNew(search)}
                    >
                        <Plus className="w-4 h-4" /> Crear Nuevo
                    </button>
                </div>

                <div className="overflow-auto flex-1 bg-base-100 border rounded-lg">
                    <table className="table table-pin-rows w-full">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Ref. Fabricante</th>
                                <th>Fabricante</th>
                                <th className="text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">
                                        <p>No se encontraron productos.</p>
                                        <button onClick={() => onCreateNew(search)} className="btn btn-link btn-sm mt-2">
                                            Crear "{search}" ahora
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((prod) => (
                                    <tr key={prod.id} className="hover:bg-base-200 cursor-pointer transition-colors" onClick={() => onSelect(prod)}>
                                        <td className="font-bold">{prod.nombre}</td>
                                        <td>{prod.referenciaFabricante || '-'}</td>
                                        <td>{getFabricanteName(prod.fabricanteId)}</td>
                                        <td className="text-right">
                                            <button className="btn btn-xs btn-ghost"><ArrowRight className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="modal-action mt-4">
                    <button className="btn" onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL DEL MODAL DE DOCUMENTO ---

function DocumentoModal({ isOpen, onClose, initialData, productos, fabricantes, materiales, tarifas }) {
    const [formData, setFormData] = useState(initialData);
    const [error, setError] = useState(null);
    
    // Estados para los modales secundarios
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [quickCreateInitialRef, setQuickCreateInitialRef] = useState('');

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

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

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'fileUpload' && files && files[0]) {
            handleFileChange(files[0]);
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Lógica de selección desde el nuevo modal
    const handleSelectProduct = (product) => {
        const defaultRef = product?.referenciaFabricante || product?.nombre || '';
        setFormData(prev => ({ 
            ...prev, 
            productoId: product.id,
            productoNombre: product.nombre, // Guardamos nombre para mostrar en input
            referencia: prev.referencia || defaultRef, 
        }));
        setIsProductSearchOpen(false);
    };

    const handleOpenCreateNew = (searchTerm) => {
        setIsProductSearchOpen(false);
        setQuickCreateInitialRef(searchTerm);
        setIsQuickCreateOpen(true);
    };
    
    const handleCreatedProduct = (newProduct) => {
         handleSelectProduct(newProduct);
         setIsQuickCreateOpen(false);
         mutate('/api/productos'); 
    };

    const handleClearProduct = (e) => {
        e.stopPropagation();
        setFormData(prev => ({ ...prev, productoId: '', productoNombre: '' }));
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
            if (key !== 'file' && key !== 'productoNombre' && key !== 'fileUpload' && formData[key] !== null && formData[key] !== undefined) {
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

    return (
        <>
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-xl flex items-center mb-4">
                <FileText className="mr-2 h-6 w-6" /> {formData.id ? 'Editar Plano' : 'Nuevo Plano de Producto'}
            </h3>
            
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* SELECTOR DE PRODUCTO MEJORADO */}
                <div className="form-control w-full md:col-span-2">
                    <div className="label"><span className="label-text">Producto Asociado (Requerido)</span></div>
                    <div className="input-group cursor-pointer" onClick={() => setIsProductSearchOpen(true)}>
                        <input
                            type="text"
                            readOnly
                            placeholder="Seleccionar producto..."
                            value={formData.productoNombre || ''}
                            className={`input input-bordered w-full cursor-pointer ${formData.productoId ? 'input-success' : ''}`}
                        />
                        {formData.productoId && (
                            <button 
                                type="button" 
                                onClick={handleClearProduct} 
                                className="btn btn-square btn-ghost text-error"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <button type="button" className="btn btn-square btn-primary">
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                    {!formData.productoId && <span className="text-xs text-gray-500 mt-1 ml-1">Haga clic para buscar o crear</span>}
                </div>

                {/* Referencia/Título */}
                <label className={`form-control w-full md:col-span-2`}>
                    <div className="label"><span className="label-text">Referencia / Título (Sugerido por Ref. Fab.)</span></div>
                    <input 
                        type="text" 
                        name="referencia" 
                        value={formData.referencia} 
                        onChange={handleChange} 
                        placeholder="Título del Documento" 
                        className="input input-bordered w-full" 
                        required 
                    />
                </label>
                
                {/* Área de Subida */}
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
        
        {/* MODALES SECUNDARIOS */}
        <ProductSearchModal 
            isOpen={isProductSearchOpen}
            onClose={() => setIsProductSearchOpen(false)}
            onSelect={handleSelectProduct}
            onCreateNew={handleOpenCreateNew}
            productos={productos}
            fabricantes={fabricantes}
            initialSearch={formData.productoNombre}
        />

        {isQuickCreateOpen && (
            <QuickProductForm 
                isOpen={true}
                onClose={() => setIsQuickCreateOpen(false)}
                onCreated={handleCreatedProduct}
                catalogos={{ 
                    fabricantes: fabricantes, 
                    materiales: materiales, 
                    tarifas: tarifas 
                }}
                initialReference={quickCreateInitialRef}
            />
        )}
        </>
    );
}


export default function GestionDocumentos() {
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

    const todosProductos = useMemo(() => productos || [], [productos]);

    const openModal = (doc = null) => {
        const initial = doc ? { 
            ...doc, 
            productoNombre: todosProductos.find(p => p.id === doc.productoId)?.nombre || '',
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