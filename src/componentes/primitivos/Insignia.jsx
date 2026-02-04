"use client";
import React from 'react';

/**
 * Componente Insignia - Badge para estados y etiquetas
 * 
 * @param {Object} props
 * @param {'exito'|'advertencia'|'error'|'info'|'neutral'|'primario'|'secundario'} variant - Variante visual
 * @param {'xs'|'sm'|'md'|'lg'} size - Tamaño
 * @param {boolean} outline - Estilo con borde
 * @param {React.ReactNode} children - Contenido
 */

const variantMap = {
    exito: 'badge-success',
    advertencia: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
    neutral: 'badge-neutral',
    primario: 'badge-primary',
    secundario: 'badge-secondary',
    fantasma: 'badge-ghost',
};

const sizeMap = {
    xs: 'badge-xs',
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg',
};

export default function Insignia({
    children,
    variant = 'neutral',
    size = 'md',
    outline = false,
    className = '',
    ...props
}) {
    const clases = [
        'badge',
        variantMap[variant] || 'badge-neutral',
        sizeMap[size] || '',
        outline && 'badge-outline',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={clases} {...props}>
            {children}
        </span>
    );
}

// Exportaciones para uso directo
export const InsigniaExito = (props) => <Insignia variant="exito" {...props} />;
export const InsigniaError = (props) => <Insignia variant="error" {...props} />;
export const InsigniaAdvertencia = (props) => <Insignia variant="advertencia" {...props} />;
export const InsigniaInfo = (props) => <Insignia variant="info" {...props} />;
