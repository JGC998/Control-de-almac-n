"use client";
import React, { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import Boton from '../primitivos/Boton';
import ModalBusqueda from './ModalBusqueda';

/**
 * Componente SelectorEntidad - Campo para seleccionar entidades con búsqueda
 * 
 * Combina un input de solo lectura con un ModalBusqueda
 * Útil para seleccionar: Clientes, Proveedores, Productos, etc.
 * 
 * @param {Object} props
 * @param {Object} valorSeleccionado - Entidad actualmente seleccionada
 * @param {function} alSeleccionar - Callback al seleccionar
 * @param {function} alLimpiar - Callback al limpiar selección
 * @param {function} alCrearNuevo - Callback para crear nuevo
 * @param {Array} opciones - Lista de entidades disponibles
 * @param {Array<string>} camposBusqueda - Campos para buscar
 * @param {function} renderValor - Función para mostrar el valor seleccionado
 * @param {string} placeholder - Placeholder cuando no hay selección
 * @param {string} tituloModal - Título del modal de búsqueda
 * @param {string} textoCrear - Texto del botón crear
 */

export default function SelectorEntidad({
    valorSeleccionado = null,
    alSeleccionar,
    alLimpiar,
    alCrearNuevo = null,
    opciones = [],
    camposBusqueda = ['nombre'],
    renderValor = null,
    renderItem = null,
    placeholder = 'Seleccionar...',
    tituloModal = 'Buscar',
    textoCrear = 'Crear nuevo',
    disabled = false,
    className = '',
}) {
    const [modalAbierto, setModalAbierto] = useState(false);

    // Render por defecto del valor seleccionado
    const textoValor = valorSeleccionado
        ? (renderValor
            ? renderValor(valorSeleccionado)
            : valorSeleccionado[camposBusqueda[0]] || valorSeleccionado.nombre || 'Seleccionado')
        : null;

    const handleSeleccionar = (item) => {
        alSeleccionar?.(item);
        setModalAbierto(false);
    };

    const handleLimpiar = (e) => {
        e.stopPropagation();
        alLimpiar?.();
    };

    return (
        <>
            {/* Campo visual */}
            <div
                className={`
          relative flex items-center gap-2 
          input input-bordered w-full cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}
          ${className}
        `}
                onClick={() => !disabled && setModalAbierto(true)}
            >
                <Search className="w-4 h-4 opacity-50" />

                <span className={`flex-1 ${valorSeleccionado ? '' : 'text-base-content/50'}`}>
                    {textoValor || placeholder}
                </span>

                {valorSeleccionado && !disabled && (
                    <button
                        type="button"
                        onClick={handleLimpiar}
                        className="btn btn-ghost btn-xs btn-circle"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Modal de búsqueda */}
            <ModalBusqueda
                abierto={modalAbierto}
                alCerrar={() => setModalAbierto(false)}
                alSeleccionar={handleSeleccionar}
                alCrearNuevo={alCrearNuevo}
                items={opciones}
                camposBusqueda={camposBusqueda}
                renderItem={renderItem}
                titulo={tituloModal}
                textoCrear={textoCrear}
            />
        </>
    );
}
