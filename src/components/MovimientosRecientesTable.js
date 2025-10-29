import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
};

export default function MovimientosRecientesTable({ movimientos }) {
    return (
        <div className="overflow-x-auto">
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Material</th>
                        <th className="text-right">Cantidad</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    {movimientos.map(mov => (
                        <tr key={mov.id} className="hover">
                            <td><span className={`badge ${mov.tipo === 'Entrada' ? 'badge-success' : 'badge-error'} badge-sm`}>{mov.tipo === 'Entrada' ? <FaArrowUp/> : <FaArrowDown/>}</span></td>
                            <td>{mov.material}</td>
                            <td className="text-right font-mono">{mov.cantidad}</td>
                            <td>{formatDate(mov.fecha)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}