import React from 'react';
import LogViewer from '@/componentes/admin/LogViewer';
import { ShieldCheck } from 'lucide-react';

export default function AuditLogPage() {
    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Registro de Auditoría</h1>
                    <p className="text-gray-500">Historial completo de cambios y acciones en el sistema</p>
                </div>
            </div>

            <LogViewer />
        </div>
    );
}
