"use client";
import React, { useState, useMemo } from 'react';
import { Search, Plus, ArrowRight } from 'lucide-react';
import Modal from '../primitivos/Modal';
import Entrada from '../primitivos/Entrada';
import Boton from '../primitivos/Boton';

/**
 * Componente ModalBusqueda - Modal genérico de búsqueda y selección
 * 
 * REEMPLAZA:
 * - ClienteSearchModal
 * - ProductSearchModal  
 * - ProveedorSearchModal
 * - ReferenciaSearchModal
 * 
 * @param {Object} props
 * @param {boolean} abierto - Estado de visibilidad
 * @param {function} alCerrar - Callback al cerrar
 * @param {function} alSeleccionar - Callback al seleccionar un item
 * @param {function} alCrearNuevo - Callback para crear nuevo (opcional)
 * @param {Array} items - Array de elementos a buscar
 * @param {Array<string>} camposBusqueda - Campos en los que buscar (ej: ['nombre', 'email'])
 * @param {function} renderItem - Función para renderizar cada item
 * @param {string} titulo - Título del modal
 * @param {string} placeholder - Placeholder del buscador
 * @param {string} textoCrear - Texto del botón crear nuevo
 * @param {string} busquedaInicial - Valor inicial de búsqueda
 * @param {string} mensajeVacio - Mensaje cuando no hay resultados
 */

export default function ModalBusqueda({
    abierto = false,
    alCerrar,
    alSeleccionar,
    alCrearNuevo = null,
    items = [],
    camposBusqueda = ['nombre'],
    renderItem = null,
    titulo = 'Buscar',
    placeholder = 'Buscar...',
    textoCrear = 'Crear nuevo',
    busquedaInicial = '',
    mensajeVacio = 'No se encontraron resultados.',
}) {
    const [busqueda, setBusqueda] = useState(busquedaInicial);

    // Filtrar items según término de búsqueda
    const itemsFiltrados = useMemo(() => {
        if (!busqueda.trim()) return items;

        const termino = busqueda.toLowerCase();
        return items.filter(item =>
            camposBusqueda.some(campo => {
                const valor = obtenerValorAnidado(item, campo);
                return valor && String(valor).toLowerCase().includes(termino);
            })
        );
    }, [items, busqueda, camposBusqueda]);

    const handleSeleccionar = (item) => {
        alSeleccionar?.(item);
        alCerrar?.();
    };

    const handleCrearNuevo = () => {
        alCrearNuevo?.(busqueda);
    };

    // Render por defecto de cada item
    const renderItemDefault = (item) => {
        const nombreCampo = camposBusqueda[0];
        const nombre = obtenerValorAnidado(item, nombreCampo) || 'Sin nombre';
        const segundoCampo = camposBusqueda[1];
        const subtitulo = segundoCampo ? obtenerValorAnidado(item, segundoCampo) : null;

        return (
            <div className="flex flex-col">
                <span className="font-medium">{nombre}</span>
                {subtitulo && <span className="text-sm text-base-content/60">{subtitulo}</span>}
            </div>
        );
    };

    return (
        <Modal
            abierto={abierto}
            alCerrar={alCerrar}
            titulo={titulo}
            size="md"
        >
            {/* Buscador */}
            <div className="mb-4">
                <Entrada
                    tipo="busqueda"
                    placeholder={placeholder}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    iconoIzquierda={Search}
                    autoFocus
                />
            </div>

            {/* Lista de resultados */}
            <div className="max-h-64 overflow-y-auto border border-base-200 rounded-lg">
                {itemsFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-base-content/60">
                        {mensajeVacio}
                    </div>
                ) : (
                    <ul className="menu bg-base-100 p-0">
                        {itemsFiltrados.map((item, index) => (
                            <li key={item.id || index}>
                                <button
                                    type="button"
                                    onClick={() => handleSeleccionar(item)}
                                    className="flex justify-between items-center w-full hover:bg-base-200"
                                >
                                    {renderItem ? renderItem(item) : renderItemDefault(item)}
                                    <ArrowRight className="w-4 h-4 opacity-50" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Botón crear nuevo */}
            {alCrearNuevo && (
                <div className="mt-4 pt-4 border-t border-base-200">
                    <Boton
                        variant="fantasma"
                        block
                        icono={Plus}
                        onClick={handleCrearNuevo}
                    >
                        {textoCrear} {busqueda && `"${busqueda}"`}
                    </Boton>
                </div>
            )}
        </Modal>
    );
}

// Utilidad para obtener valores anidados (ej: "cliente.nombre")
function obtenerValorAnidado(obj, ruta) {
    return ruta.split('.').reduce((acc, parte) => acc?.[parte], obj);
}
