"use client";
import { History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const getTipoBadge = (tipo) => {
    switch (tipo) {
        case 'Entrada':
        case 'Entrada Manual':
            return 'badge-success';
        case 'Salida':
            return 'badge-error';
        default:
            return 'badge-info';
    }
};

export default function MovimientosRecientesTable({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="card bg-base-100 shadow-xl h-full">
                <div className="card-body p-6">
                    <h2 className="card-title text-xl flex items-center mb-4">
                        <History className="w-6 h-6 mr-2 text-primary" /> Historial de Movimientos
                    </h2>
                    <p className="text-gray-500">No se encontraron movimientos recientes.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-base-100 shadow-xl h-full">
            <div className="card-body p-6">
                <h2 className="card-title text-xl flex items-center mb-4">
                    <History className="w-6 h-6 mr-2 text-primary" /> Movimientos Recientes
                </h2>
                
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Material</th>
                                <th>Cantidad (m)</th>
                                <th>Referencia</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((movimiento) => (
                                <tr key={movimiento.id}>
                                    <td>
                                        <div className={`badge ${getTipoBadge(movimiento.tipo)} badge-outline`}>
                                            {movimiento.tipo}
                                        </div>
                                    </td>
                                    <td className="font-medium">{movimiento.materialNombre || 'N/A'}</td>
                                    <td className="font-semibold text-right">
                                        {movimiento.tipo.includes('Entrada') ? '+' : '-'}
                                        {movimiento.cantidad?.toFixed(2)}
                                    </td>
                                    <td className="text-sm text-gray-500">{movimiento.referencia || 'N/A'}</td>
                                    <td>
                                        {format(new Date(movimiento.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="card-actions justify-end mt-4">
                    <a href="/almacen" className="btn btn-sm btn-outline">Ver todos</a>
                </div>
            </div>
        </div>
    );
}
