'use client';

import { useState, useMemo } from 'react';
import { FaArrowUp, FaArrowDown, FaSort } from 'react-icons/fa';

const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
};

const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

const SortableHeader = ({ name, sortKey, requestSort, sortConfig }) => {
    const isSorted = sortConfig && sortConfig.key === sortKey;
    const directionIcon = isSorted ? (
        sortConfig.direction === 'ascending' ? <FaArrowUp className="inline ml-1"/> : <FaArrowDown className="inline ml-1"/>
    ) : <FaSort className="inline ml-1 text-gray-400"/>;

    return (
        <th onClick={() => requestSort(sortKey)} className="cursor-pointer">
            {name} {directionIcon}
        </th>
    );
};

export default function MovimientosRecientesTable({ movimientos }) {
    const [filter, setFilter] = useState('');
    const { items, requestSort, sortConfig } = useSortableData(movimientos);

    const filteredItems = useMemo(() => {
        if (!filter) return items;
        return items.filter(item => 
            Object.values(item).some(value => 
                String(value).toLowerCase().includes(filter.toLowerCase())
            )
        );
    }, [items, filter]);

    return (
        <div className="overflow-x-auto">
            <div className="form-control mb-4">
                <input 
                    type="text"
                    placeholder="Buscar en movimientos..."
                    className="input input-bordered w-full"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <table className="table table-sm">
                <thead>
                    <tr>
                        <SortableHeader name="Tipo" sortKey="tipo" requestSort={requestSort} sortConfig={sortConfig} />
                        <SortableHeader name="Material" sortKey="material" requestSort={requestSort} sortConfig={sortConfig} />
                        <SortableHeader name="Cantidad" sortKey="cantidad" requestSort={requestSort} sortConfig={sortConfig} />
                        <SortableHeader name="Fecha" sortKey="fecha" requestSort={requestSort} sortConfig={sortConfig} />
                    </tr>
                </thead>
                <tbody>
                    {filteredItems.map(mov => (
                        <tr key={mov.id} className="hover">
                            <td><span className={`badge ${mov.tipo === 'Entrada' ? 'badge-success' : 'badge-error'} badge-sm`}>{mov.tipo}</span></td>
                            <td>{mov.stock_id}</td>
                            <td className="text-right font-mono">{mov.cantidad}</td>
                            <td>{formatDate(mov.fecha)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
