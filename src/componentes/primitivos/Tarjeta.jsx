"use client";
import React from 'react';

/**
 * Componente Tarjeta - Card contenedor con header, body y footer
 * 
 * @param {Object} props
 * @param {string} titulo - Título de la tarjeta
 * @param {React.ElementType} icono - Componente de icono para el título
 * @param {React.ReactNode} acciones - Elementos para el header (botones, etc)
 * @param {React.ReactNode} pie - Contenido del footer
 * @param {boolean} compacta - Padding reducido
 * @param {boolean} bordered - Con borde
 * @param {boolean} colapsable - Puede colapsarse/expandirse
 * @param {boolean} colapsadaInicial - Estado inicial si es colapsable
 */

export default function Tarjeta({
    children,
    titulo = null,
    icono: Icono = null,
    acciones = null,
    pie = null,
    compacta = false,
    bordered = false,
    colapsable = false,
    colapsadaInicial = false,
    className = '',
    ...props
}) {
    // Si es colapsable, usar un collapse de DaisyUI
    if (colapsable) {
        return (
            <div className={`collapse collapse-arrow bg-base-100 shadow-xl ${bordered ? 'border border-base-200' : ''} ${className}`} {...props}>
                <input type="checkbox" defaultChecked={!colapsadaInicial} />
                <div className="collapse-title text-xl font-medium flex items-center gap-2">
                    {Icono && <Icono className="w-5 h-5" />}
                    {titulo}
                    {acciones && <div className="ml-auto flex gap-2">{acciones}</div>}
                </div>
                <div className={`collapse-content ${compacta ? 'p-2' : ''}`}>
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`card bg-base-100 shadow-xl ${bordered ? 'border border-base-200' : ''} ${className}`}
            {...props}
        >
            <div className={`card-body ${compacta ? 'p-4' : ''}`}>
                {/* Header con título y acciones */}
                {(titulo || acciones) && (
                    <div className="flex justify-between items-center mb-4">
                        {titulo && (
                            <h2 className="card-title flex items-center gap-2">
                                {Icono && <Icono className="w-6 h-6" />}
                                {titulo}
                            </h2>
                        )}
                        {acciones && (
                            <div className="flex gap-2">
                                {acciones}
                            </div>
                        )}
                    </div>
                )}

                {/* Contenido */}
                {children}

                {/* Footer/Pie */}
                {pie && (
                    <div className="card-actions justify-end mt-4">
                        {pie}
                    </div>
                )}
            </div>
        </div>
    );
}

// Subcomponentes para composición flexible
export function TarjetaTitulo({ children, icono: Icono, className = '' }) {
    return (
        <h2 className={`card-title flex items-center gap-2 ${className}`}>
            {Icono && <Icono className="w-6 h-6" />}
            {children}
        </h2>
    );
}

export function TarjetaContenido({ children, className = '' }) {
    return <div className={className}>{children}</div>;
}

export function TarjetaAcciones({ children, className = '' }) {
    return <div className={`card-actions justify-end ${className}`}>{children}</div>;
}
