// src/components/FilaItemEditor.js
"use client";

import React from 'react';
import { Plus, Trash2, Copy, Search } from 'lucide-react';

export default function FilaItemEditor({
  item,
  index,
  handleItemChange,
  handleSearchChange,
  handleSelectProduct,
  handleOpenProductModal,
  removeItem,
  handleDuplicateItem,
  getStockIcon,
  activeSearchIndex,
  searchResults,
  todosProductos,
}) {
  const isSearchActive = activeSearchIndex === index;

  return (
    <tr className="item-row hover">
      <td className="w-10 text-center">
        {getStockIcon(item)}
      </td>
      <td className="relative w-2/5">
        <div className="dropdown w-full dropdown-bottom">
          <div className="input-group">
            <input
              type="text"
              placeholder="Buscar producto o introducir descripción manual..."
              value={item.description}
              onChange={(e) => handleSearchChange(e.target.value, index)}
              onFocus={() => handleSearchChange(item.description, index)} // Re-activar búsqueda al enfocar
              onBlur={() => setTimeout(() => handleSearchChange('', null), 200)} // Limpiar índice activo
              className="input input-bordered input-sm w-full"
              required={!item.productId}
            />
            <button type="button" onClick={() => handleOpenProductModal(item)} className="btn btn-primary btn-sm" title="Crear Producto Rápido">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isSearchActive && searchResults.length > 0 && (
            <ul
              tabIndex={0}
              className="absolute left-0 top-full z-50 menu p-2 shadow bg-base-200 rounded-box w-full max-w-lg mt-1 overflow-y-auto max-h-52"
              onMouseDown={(e) => e.preventDefault()}
            >
              {searchResults.map(p => (
                <li key={p.id} onClick={() => handleSelectProduct(p, index)}>
                  <a><Search className="w-4 h-4 mr-2" />{p.nombre} ({p.referenciaFabricante})</a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {item.productId && (
          <p className="text-xs text-success mt-1">
            Plantilla: {todosProductos?.find(p => p.id === item.productId)?.referenciaFabricante}
          </p>
        )}
      </td>
      <td>
        <input
          type="number"
          step="1"
          value={item.quantity || ''}
          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
          className="input input-bordered input-sm w-20"
        />
      </td>
      <td>
        <div className="input-group input-group-sm">
          <input
            type="number"
            step="0.01"
            value={item.unitPrice || ''}
            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
            className="input input-bordered input-sm w-24"
          />
          <span className="bg-base-200 text-sm px-2">€</span>
        </div>
      </td>
      <td className="font-bold">
        {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)} €
      </td>
      <td className="flex gap-1">
        <button type="button" onClick={() => handleDuplicateItem(item.id)} className="btn btn-ghost btn-sm btn-circle" title="Duplicar Fila">
          <Copy className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => removeItem(item.id)} className="btn btn-ghost btn-sm btn-circle text-error" title="Eliminar Fila">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
