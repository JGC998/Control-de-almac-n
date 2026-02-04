"use client";
import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Componente Cargando - Spinner de carga
 * 
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'} size - Tamaño
 * @param {string} texto - Texto opcional junto al spinner
 * @param {boolean} pantalla - Ocupa toda la pantalla
 * @param {boolean} centrado - Centrado horizontalmente
 */

const sizeMap = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
};

const iconSizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
};

export default function Cargando({
    size = 'md',
    texto = null,
    pantalla = false,
    centrado = true,
    className = '',
    ...props
}) {
    const contenido = (
        <div className={`flex items-center gap-2 ${centrado ? 'justify-center' : ''} ${className}`} {...props}>
            <Loader2 className={`${iconSizeMap[size]} animate-spin`} />
            {texto && <span className="text-base-content/70">{texto}</span>}
        </div>
    );

    if (pantalla) {
        return (
            <div className="fixed inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center z-50">
                {contenido}
            </div>
        );
    }

    return contenido;
}

// Skeleton loader para placeholders
export function Esqueleto({
    lineas = 1,
    altura = 'h-4',
    ancho = 'w-full',
    className = ''
}) {
    return (
        <div className={`animate-pulse space-y-2 ${className}`}>
            {Array.from({ length: lineas }).map((_, i) => (
                <div key={i} className={`skeleton ${altura} ${ancho}`} />
            ))}
        </div>
    );
}
