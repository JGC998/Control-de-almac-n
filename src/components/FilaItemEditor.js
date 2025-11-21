import React from 'react';
import { Trash2, Copy, Search, X, Package, CheckCircle, XCircle } from 'lucide-react';

export default function FilaItemEditor({
    item,
    index,
    handleItemChange,
    onSearchClick, // <--- Recibe la función para abrir el modal
    removeItem,
    handleDuplicateItem,
    getStockIcon
}) {
    // Calculamos el total de la fila
    const total = (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2);
    const pesoTotal = (parseFloat(item.quantity || 0) * parseFloat(item.pesoUnitario || 0)).toFixed(3);

    return (
        <tr className="hover">
            {/* 1. Icono de Stock */}
            <td className="text-center">
                <div className="tooltip" data-tip="Estado del Stock">
                    {getStockIcon(item)}
                </div>
            </td>

            {/* 2. Descripción / Búsqueda de Producto (MODIFICADO PARA MODAL) */}
            <td>
                <div className="form-control w-full">
                    <div className="input-group cursor-pointer" onClick={onSearchClick}>
                        <input 
                            type="text" 
                            readOnly // IMPORTANTE: No editable a mano para forzar el modal
                            value={item.description || ''} 
                            placeholder="Buscar producto..." 
                            className={`input input-bordered input-sm w-full cursor-pointer ${item.productId ? 'input-success' : ''}`}
                        />
                        {item.productId ? (
                             <button 
                                type="button" 
                                className="btn btn-square btn-sm btn-ghost text-error"
                                onClick={(e) => {
                                    e.stopPropagation(); // Evitar abrir el modal al borrar
                                    handleItemChange(index, 'description', '');
                                    handleItemChange(index, 'productId', null);
                                    handleItemChange(index, 'unitPrice', 0);
                                    handleItemChange(index, 'pesoUnitario', 0);
                                }}
                             >
                                <X className="w-3 h-3" />
                             </button>
                        ) : (
                            <button type="button" className="btn btn-square btn-sm btn-primary">
                                <Search className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </td>

            {/* 3. Cantidad */}
            <td>
                <input 
                    type="number" 
                    className="input input-bordered input-sm w-20 text-center font-bold" 
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                />
            </td>

            {/* 4. Precio Unitario */}
            <td>
                <input 
                    type="number" 
                    step="0.01" 
                    className="input input-bordered input-sm w-24 text-right" 
                    value={item.unitPrice} 
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} 
                />
            </td>

            {/* 5. Peso Unitario */}
            <td className="text-right">
                <span className="text-sm font-mono">{item.pesoUnitario?.toFixed(3) || '0.000'}</span>
            </td>

            {/* 6. Peso Total */}
            <td className="font-mono text-right font-semibold">
                {pesoTotal} kg
            </td>

            {/* 7. Total Fila */}
            <td className="font-mono text-right font-semibold">
                {total} €
            </td>

            {/* 8. Acciones */}
            <td>
                <div className="flex gap-1 justify-center">
                    <button type="button" onClick={() => handleDuplicateItem(item.id)} className="btn btn-ghost btn-xs tooltip" data-tip="Duplicar">
                        <Copy className="w-4 h-4 text-info" />
                    </button>
                    <button type="button" onClick={() => removeItem(item.id)} className="btn btn-ghost btn-xs tooltip" data-tip="Eliminar">
                        <Trash2 className="w-4 h-4 text-error" />
                    </button>
                </div>
            </td>
        </tr>
    );
}