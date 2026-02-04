"use client";
import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Componente Alerta - Mensajes de feedback
 * 
 * @param {Object} props
 * @param {'exito'|'error'|'advertencia'|'info'} tipo - Tipo de alerta
 * @param {string} titulo - Título opcional
 * @param {boolean} cerrable - Puede cerrarse
 * @param {function} alCerrar - Callback al cerrar
 */

const tipoConfig = {
    exito: {
        clase: 'alert-success',
        icono: CheckCircle,
    },
    error: {
        clase: 'alert-error',
        icono: AlertCircle,
    },
    advertencia: {
        clase: 'alert-warning',
        icono: AlertTriangle,
    },
    info: {
        clase: 'alert-info',
        icono: Info,
    },
};

export default function Alerta({
    children,
    tipo = 'info',
    titulo = null,
    cerrable = false,
    alCerrar,
    className = '',
    ...props
}) {
    const config = tipoConfig[tipo] || tipoConfig.info;
    const Icono = config.icono;

    return (
        <div className={`alert ${config.clase} ${className}`} {...props}>
            <Icono className="w-5 h-5 shrink-0" />
            <div className="flex-1">
                {titulo && <h3 className="font-bold">{titulo}</h3>}
                <div className="text-sm">{children}</div>
            </div>
            {cerrable && (
                <button
                    onClick={alCerrar}
                    className="btn btn-sm btn-ghost btn-circle"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

// Exportaciones directas
export const AlertaExito = (props) => <Alerta tipo="exito" {...props} />;
export const AlertaError = (props) => <Alerta tipo="error" {...props} />;
export const AlertaAdvertencia = (props) => <Alerta tipo="advertencia" {...props} />;
export const AlertaInfo = (props) => <Alerta tipo="info" {...props} />;
