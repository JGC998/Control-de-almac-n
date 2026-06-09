"use client";
import React from 'react';

/**
 * Componente Boton - Botón reutilizable con variantes DaisyUI
 * 
 * @param {Object} props
 * @param {'primario'|'secundario'|'fantasma'|'peligro'|'exito'|'info'|'advertencia'} variant - Variante visual
 * @param {'xs'|'sm'|'md'|'lg'} size - Tamaño del botón
 * @param {boolean} loading - Muestra spinner de carga
 * @param {boolean} outline - Estilo con borde
 * @param {boolean} block - Ancho completo
 * @param {React.ReactNode} icono - Icono a mostrar
 * @param {'izquierda'|'derecha'} iconoPosicion - Posición del icono
 * @param {boolean} disabled - Estado deshabilitado
 * @param {string} className - Clases CSS adicionales
 * @param {React.ReactNode} children - Contenido del botón
 */

const variantMap = {
    primario: 'btn-primary',
    secundario: 'btn-secondary',
    fantasma: 'btn-ghost',
    peligro: 'btn-error',
    exito: 'btn-success',
    info: 'btn-info',
    advertencia: 'btn-warning',
    neutral: 'btn-neutral',
};

const sizeMap = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
};

export default function Boton({
    children,
    variant = 'primario',
    size = 'md',
    loading = false,
    cargando = false,        // alias español
    outline = false,
    block = false,
    icono: Icono = null,
    iconoPosicion = 'izquierda',
    disabled = false,
    deshabilitado = false,   // alias español
    className = '',
    type = 'button',
    onClick,
    ...props
}) {
    const isLoading = loading || cargando;
    const isDisabled = disabled || deshabilitado;

    const clases = [
        'btn',
        variantMap[variant] || 'btn-primary',
        sizeMap[size] || '',
        outline && 'btn-outline',
        block && 'btn-block',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type={type}
            className={clases}
            disabled={isDisabled || isLoading}
            onClick={onClick}
            {...props}
        >
            {isLoading && (
                <span className="loading loading-spinner loading-sm" />
            )}
            {!isLoading && Icono && iconoPosicion === 'izquierda' && (
                <Icono className={`w-4 h-4 ${children ? 'mr-1' : ''}`} />
            )}
            {children}
            {!isLoading && Icono && iconoPosicion === 'derecha' && (
                <Icono className={`w-4 h-4 ${children ? 'ml-1' : ''}`} />
            )}
        </button>
    );
}

// Exportaciones adicionales para uso directo
export const BotonPrimario = (props) => <Boton variant="primario" {...props} />;
export const BotonSecundario = (props) => <Boton variant="secundario" {...props} />;
export const BotonPeligro = (props) => <Boton variant="peligro" {...props} />;
export const BotonFantasma = (props) => <Boton variant="fantasma" {...props} />;
