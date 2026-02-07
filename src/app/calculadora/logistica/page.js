import React from 'react';
import CalculadoraLogistica from '@/componentes/calculadoras/CalculadoraLogistica';
import { Truck, Info, Settings } from 'lucide-react';
import Link from 'next/link';

export default function CalculadoraLogisticaPage() {
    return (
        <div className="container mx-auto p-4 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Truck className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Calculadora de Envíos</h1>
                </div>
                <Link href="/configuracion/logistica" className="btn btn-ghost btn-sm">
                    <Settings className="w-4 h-4" />
                    Configurar Tarifas
                </Link>
            </div>

            {/* Calculadora */}
            <CalculadoraLogistica />

            {/* Información */}
            <div className="alert alert-info mt-6">
                <Info className="w-5 h-5" />
                <div>
                    <h3 className="font-bold">ℹ️ Información sobre el cálculo</h3>
                    <div className="text-sm mt-2 space-y-1">
                        <p><strong>Coste de Paletizado:</strong> Incluye el palé base + materiales consumibles (film, fleje, precinto)</p>
                        <p><strong>Coste de Transporte:</strong> Según tarifas Pallex 2026, calculado automáticamente según peso, altura y destino</p>
                        <p><strong>Tipologías disponibles:</strong> PARCEL, MINI QUARTER, QUARTER, MINI LIGHT, HALF, LIGHT, MEGA LIGHT, FULL, MEGA FULL</p>
                    </div>
                </div>
            </div>

            {/* Guía rápida */}
            <div className="card bg-base-200 mt-4">
                <div className="card-body">
                    <h3 className="card-title text-sm">📋 Guía Rápida</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                        <li><strong>Palé Europeo:</strong> 120x80cm (estándar)</li>
                        <li><strong>Medio Palé:</strong> 60x80cm (más económico para envíos pequeños)</li>
                        <li>El sistema selecciona automáticamente la tipología más económica según peso y altura</li>
                        <li>Puedes actualizar las tarifas desde el panel de configuración</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
