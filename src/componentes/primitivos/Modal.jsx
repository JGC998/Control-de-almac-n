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

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
    const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;

    // Focus trap + mover foco al abrir
    useEffect(() => {
        if (!abierto || !modalRef.current) return;

        const focusable = Array.from(modalRef.current.querySelectorAll(FOCUSABLE));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        // Mover foco al primer elemento interactivo
        first?.focus();

        function trap(e) {
            if (e.key !== 'Tab') return;
            if (focusable.length === 0) { e.preventDefault(); return; }
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
        }
        document.addEventListener('keydown', trap);
        return () => document.removeEventListener('keydown', trap);
    }, [abierto]);

    // Cerrar con Escape
    useEffect(() => {
        if (!cerrarConEscape || !abierto) return;
        const handleEscape = (e) => { if (e.key === 'Escape') alCerrar?.(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [abierto, cerrarConEscape, alCerrar]);

    // Bloquear scroll del body
    useEffect(() => {
        if (abierto) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [abierto]);

    if (!abierto) return null;

    const handleBackdropClick = (e) => {
        if (cerrarConFondo && e.target === e.currentTarget) alCerrar?.();
    };

    return (
        <div
            className="modal modal-open"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titulo ? titleId : undefined}
            {...props}
        >
            <div ref={modalRef} className={`${sizeMap[size] || sizeMap.md} ${className}`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    {titulo && <h3 id={titleId} className="font-bold text-lg">{titulo}</h3>}
                    <button
                        onClick={alCerrar}
                        className="btn btn-sm btn-circle btn-ghost ml-auto"
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
