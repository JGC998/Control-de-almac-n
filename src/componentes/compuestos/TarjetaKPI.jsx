"use client";
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Tarjeta from '../primitivos/Tarjeta';

/**
 * Componente TarjetaKPI - Tarjeta para indicadores clave
 * 
 * @param {Object} props
 * @param {string} titulo - Título del KPI
 * @param {string|number} valor - Valor principal
 * @param {string} formato - Formato: 'moneda', 'porcentaje', 'numero'
 * @param {number} cambio - Cambio porcentual (positivo/negativo)
 * @param {string} periodo - Texto del periodo (ej: "vs. mes anterior")
 * @param {React.ElementType} icono - Icono del KPI
 * @param {'primario'|'secundario'|'exito'|'error'|'info'} color - Color de acento
 */

const colorClasses = {
    primario: 'text-primary',
    secundario: 'text-secondary',
    exito: 'text-success',
    error: 'text-error',
    info: 'text-info',
};

export default function TarjetaKPI({
    titulo,
    valor,
    formato = 'numero',
    cambio = null,
    periodo = null,
    icono: Icono = null,
    color = 'primario',
    className = '',
}) {
    // Formatear valor
    const valorFormateado = useMemo(() => {
        if (valor === null || valor === undefined) return '-';

        switch (formato) {
            case 'moneda':
                return `${Number(valor).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
            case 'porcentaje':
                return `${Number(valor).toFixed(1)}%`;
            case 'numero':
            default:
                return Number(valor).toLocaleString('es-ES');
        }
    }, [valor, formato]);

    // Determinar icono y color del cambio
    const cambioInfo = useMemo(() => {
        if (cambio === null || cambio === undefined) return null;

        if (cambio > 0) {
            return { icono: TrendingUp, clase: 'text-success', texto: `+${cambio.toFixed(1)}%` };
        } else if (cambio < 0) {
            return { icono: TrendingDown, clase: 'text-error', texto: `${cambio.toFixed(1)}%` };
        } else {
            return { icono: Minus, clase: 'text-base-content/50', texto: '0%' };
        }
    }, [cambio]);

    return (
        <div className={`card bg-base-100 shadow-md border border-base-200 ${className}`}>
            <div className="card-body p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-base-content/70 font-medium">{titulo}</span>
                    {Icono && (
                        <div className={`p-2 rounded-lg bg-base-200 ${colorClasses[color]}`}>
                            <Icono className="w-5 h-5" />
                        </div>
                    )}
                </div>

                {/* Valor principal */}
                <div className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
                    {valorFormateado}
                </div>

                {/* Cambio */}
                {cambioInfo && (
                    <div className="flex items-center gap-1 mt-2">
                        <cambioInfo.icono className={`w-4 h-4 ${cambioInfo.clase}`} />
                        <span className={`text-sm font-medium ${cambioInfo.clase}`}>
                            {cambioInfo.texto}
                        </span>
                        {periodo && (
                            <span className="text-sm text-base-content/50 ml-1">{periodo}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
