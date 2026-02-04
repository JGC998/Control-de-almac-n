"use client";
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Componente ContenedorCargando - Wrapper para estados de carga y error
 * 
 * Elimina código duplicado de estados de carga/error en todas las páginas.
 * Muestra spinner mientras carga, mensaje de error si falla, o el contenido.
 * 
 * @param {Object} props
 * @param {boolean} isLoading - Si está cargando
 * @param {Error|string} error - Error si existe
 * @param {React.ReactNode} children - Contenido a mostrar cuando carga correctamente
 * @param {string} mensajeCargando - Mensaje personalizado de carga
 * @param {string} mensajeError - Mensaje personalizado de error
 * @param {function} alReintentar - Callback para reintentar la carga
 * @param {string} tamaño - Tamaño del spinner: 'sm', 'md', 'lg'
 * @param {boolean} pantallCompleta - Si debe ocupar toda la pantalla
 * 
 * @example
 * <ContenedorCargando isLoading={isLoading} error={error}>
 *     <MiContenido datos={datos} />
 * </ContenedorCargando>
 */
export default function ContenedorCargando({
    isLoading,
    error,
    children,
    mensajeCargando = 'Cargando...',
    mensajeError = 'Error al cargar los datos',
    alReintentar = null,
    tamaño = 'lg',
    pantallaCompleta = false,
}) {
    const clasesContenedor = pantallaCompleta
        ? 'flex justify-center items-center h-screen'
        : 'flex justify-center items-center min-h-[200px]';

    const tamañosSpinner = {
        sm: 'loading-sm',
        md: 'loading-md',
        lg: 'loading-lg',
    };

    // Estado de carga
    if (isLoading) {
        return (
            <div className={clasesContenedor}>
                <div className="text-center">
                    <span className={`loading loading-spinner ${tamañosSpinner[tamaño]} text-primary`} />
                    {mensajeCargando && (
                        <p className="mt-2 text-base-content/70">{mensajeCargando}</p>
                    )}
                </div>
            </div>
        );
    }

    // Estado de error
    if (error) {
        const mensajeDelError = typeof error === 'string'
            ? error
            : error?.message || mensajeError;

        return (
            <div className={clasesContenedor}>
                <div className="text-center space-y-3">
                    <AlertCircle className="w-12 h-12 text-error mx-auto" />
                    <p className="text-error font-medium">{mensajeDelError}</p>
                    {alReintentar && (
                        <button
                            onClick={alReintentar}
                            className="btn btn-sm btn-outline btn-error gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reintentar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Contenido normal
    return <>{children}</>;
}

/**
 * Versión inline más compacta para uso dentro de componentes
 */
export function SpinnerCargando({ tamaño = 'md', mensaje = null }) {
    const tamañosSpinner = {
        sm: 'loading-sm',
        md: 'loading-md',
        lg: 'loading-lg',
    };

    return (
        <div className="flex items-center gap-2">
            <span className={`loading loading-spinner ${tamañosSpinner[tamaño]} text-primary`} />
            {mensaje && <span className="text-base-content/70">{mensaje}</span>}
        </div>
    );
}
