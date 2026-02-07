"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import {
    Search, Filter, Clock, FileText, User,
    ChevronLeft, ChevronRight, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fetcher = url => fetch(url).then(r => r.json());

export default function LogViewer() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [entityFilter, setEntityFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    // Construir URL con filtros
    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(entityFilter && { entity: entityFilter }),
        ...(actionFilter && { action: actionFilter }),
    });

    const { data, isLoading } = useSWR(`/api/audit-log?${queryParams}`, fetcher);

    const logs = data?.data || [];
    const meta = data?.meta || { totalPages: 1 };

    // Formatear detalles para mostrar
    const renderDetails = (details) => {
        if (!details) return <span className="text-gray-400">-</span>;

        // Si es un cambio simple
        if (details.changes) {
            return (
                <div className="text-xs space-y-1">
                    {Object.keys(details.changes).map(key => (
                        <div key={key} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                            <span className="font-semibold text-gray-500">{key}</span>
                            <span className="text-gray-400">→</span>
                            <span className="truncate max-w-[150px]" title={String(details.changes[key].to)}>
                                {String(details.changes[key].to)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }

        // Si es creación o eliminación
        const content = details.newValue || details.oldValue || details;
        return (
            <pre className="text-xs bg-base-200 p-1 rounded overflow-x-auto max-w-[200px] max-h-[60px]">
                {JSON.stringify(content, null, 2)}
            </pre>
        );
    };

    // Badge color según acción
    const getActionBadge = (action) => {
        switch (action) {
            case 'CREATE': return 'badge-success';
            case 'UPDATE': return 'badge-warning';
            case 'DELETE': return 'badge-error';
            default: return 'badge-ghost';
        }
    };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 bg-base-200 p-4 rounded-lg">
                <div className="form-control w-full sm:w-auto">
                    <label className="label">
                        <span className="label-text flex items-center gap-2"><FileText size={14} /> Entidad</span>
                    </label>
                    <select
                        className="select select-bordered select-sm w-full"
                        value={entityFilter}
                        onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">Todas</option>
                        <option value="Producto">Producto</option>
                        <option value="TarifaTransporte">Tarifa Transporte</option>
                        <option value="ConfigPaletizado">Config Paletizado</option>
                        <option value="ReglaMargen">Regla Margen</option>
                        <option value="Cliente">Cliente</option>
                    </select>
                </div>

                <div className="form-control w-full sm:w-auto">
                    <label className="label">
                        <span className="label-text flex items-center gap-2"><Activity size={14} /> Acción</span>
                    </label>
                    <select
                        className="select select-bordered select-sm w-full"
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">Todas</option>
                        <option value="CREATE">Creación</option>
                        <option value="UPDATE">Edición</option>
                        <option value="DELETE">Eliminación</option>
                    </select>
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto bg-base-100 rounded-lg shadow border border-base-200">
                <table className="table table-zebra w-full text-sm">
                    <thead className="bg-base-200">
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Entidad</th>
                            <th>ID</th>
                            <th>Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" className="text-center p-8">Cargando historial...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="6" className="text-center p-8 text-gray-500">No hay registros</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover">
                                    <td className="whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {format(new Date(log.createdAt), 'dd MMM yyyy', { locale: es })}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {format(new Date(log.createdAt), 'HH:mm:ss')}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-gray-400" />
                                            {log.user || 'System'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`badge ${getActionBadge(log.action)} badge-sm gap-1`}>
                                            {log.action}
                                        </div>
                                    </td>
                                    <td className="font-medium text-primary">{log.entity}</td>
                                    <td className="font-mono text-xs text-gray-500 select-all">{log.entityId}</td>
                                    <td className="min-w-[200px]">{renderDetails(log.details)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            <div className="flex justify-between items-center mt-4 px-2">
                <div className="text-xs text-gray-500">
                    Página {page} de {meta.totalPages} • Total {meta.total || 0} registros
                </div>
                <div className="join">
                    <button
                        className="join-item btn btn-sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button className="join-item btn btn-sm no-animation">
                        {page}
                    </button>
                    <button
                        className="join-item btn btn-sm"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
