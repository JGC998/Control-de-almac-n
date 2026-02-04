"use client";
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Componente Modal - Diálogo modal reutilizable
 * 
 * @param {Object} props
 * @param {boolean} abierto - Estado de visibilidad
 * @param {function} alCerrar - Callback al cerrar
 * @param {string} titulo - Título del modal
 * @param {React.ReactNode} acciones - Botones del footer
 * @param {'sm'|'md'|'lg'|'xl'|'full'} size - Tamaño del modal
 * @param {boolean} cerrarConFondo - Cerrar al hacer clic en el fondo
 * @param {boolean} cerrarConEscape - Cerrar con tecla Escape
 */

const sizeMap = {
    sm: 'modal-box max-w-sm',
    md: 'modal-box max-w-md',
    lg: 'modal-box max-w-lg',
    xl: 'modal-box max-w-xl',
    full: 'modal-box max-w-full w-11/12',
};

export default function Modal({
    children,
    abierto = false,
    alCerrar,
    titulo = null,
    acciones = null,
    size = 'md',
    cerrarConFondo = true,
    cerrarConEscape = true,
    className = '',
    ...props
}) {
    const modalRef = useRef(null);

    // Manejar cierre con Escape
    useEffect(() => {
        if (!cerrarConEscape || !abierto) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                alCerrar?.();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [abierto, cerrarConEscape, alCerrar]);

    // Bloquear scroll del body cuando está abierto
    useEffect(() => {
        if (abierto) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [abierto]);

    if (!abierto) return null;

    const handleBackdropClick = (e) => {
        if (cerrarConFondo && e.target === e.currentTarget) {
            alCerrar?.();
        }
    };

    return (
        <div
            className="modal modal-open"
            onClick={handleBackdropClick}
            {...props}
        >
            <div ref={modalRef} className={`${sizeMap[size] || sizeMap.md} ${className}`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    {titulo && <h3 className="font-bold text-lg">{titulo}</h3>}
                    <button
                        onClick={alCerrar}
                        className="btn btn-sm btn-circle btn-ghost"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="py-4">
                    {children}
                </div>

                {/* Footer con acciones */}
                {acciones && (
                    <div className="modal-action">
                        {acciones}
                    </div>
                )}
            </div>
        </div>
    );
}

// Subcomponentes para composición
export function ModalContenido({ children, className = '' }) {
    return <div className={`py-4 ${className}`}>{children}</div>;
}

export function ModalAcciones({ children, className = '' }) {
    return <div className={`modal-action ${className}`}>{children}</div>;
}
