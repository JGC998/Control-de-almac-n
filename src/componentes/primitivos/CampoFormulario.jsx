"use client";
import React from 'react';

/**
 * Componente CampoFormulario - Wrapper para inputs con label y error
 * 
 * @param {Object} props
 * @param {string} etiqueta - Texto del label
 * @param {string} error - Mensaje de error
 * @param {string} ayuda - Texto de ayuda
 * @param {boolean} requerido - Muestra asterisco de requerido
 * @param {boolean} horizontal - Layout horizontal (label a la izquierda)
 * @param {React.ReactNode} children - Input/Selector/AreaTexto a envolver
 */

export default function CampoFormulario({
    children,
    etiqueta,
    error = null,
    ayuda = null,
    requerido = false,
    horizontal = false,
    className = '',
    ...props
}) {
    if (horizontal) {
        return (
            <div className={`form-control ${className}`} {...props}>
                <label className="label cursor-pointer justify-start gap-4">
                    <span className="label-text font-medium min-w-[120px]">
                        {etiqueta}
                        {requerido && <span className="text-error ml-1">*</span>}
                    </span>
                    <div className="flex-1">
                        {children}
                        {error && <span className="label-text-alt text-error">{error}</span>}
                        {ayuda && !error && <span className="label-text-alt text-base-content/60">{ayuda}</span>}
                    </div>
                </label>
            </div>
        );
    }

    return (
        <div className={`form-control w-full ${className}`} {...props}>
            {etiqueta && (
                <label className="label">
                    <span className="label-text font-medium">
                        {etiqueta}
                        {requerido && <span className="text-error ml-1">*</span>}
                    </span>
                </label>
            )}
            {children}
            {(error || ayuda) && (
                <label className="label">
                    {error && <span className="label-text-alt text-error">{error}</span>}
                    {ayuda && !error && <span className="label-text-alt text-base-content/60">{ayuda}</span>}
                </label>
            )}
        </div>
    );
}
