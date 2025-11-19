// src/components/TablaGenerica.js
import React from 'react';

export default function TablaGenerica({ columns, data, renderRow, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <span className="loading loading-spinner"></span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table w-full table-compact">
        <thead>
          <tr>
            {columns.map(col => <th key={col.key}>{col.label}</th>)}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(data) && data.length > 0 ? (
            data.map(item => renderRow(item))
          ) : (
            <tr>
              <td colSpan={columns.length + 1} className="text-center text-gray-500">
                No hay registros para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
