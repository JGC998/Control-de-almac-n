"use client";
import React from 'react';
import { Trash2, Copy, Search, X, Package, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function EditorFilaItem({
    item,
    index,
    handleItemChange,
    onSearchClick,
    removeItem,
    handleDuplicateItem
}) {
    // Calculamos el total de la fila
    const total = (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2);

    // Simple Lógica de Stock
    const getStockStatus = () => {
        if (!item.producto) return 'manual';
        // Si no tenemos el dato de stock en item.producto, asumimos desconocido
        if (item.producto.stock === undefined || item.producto.stock === null) return 'unknown';

        const qty = parseFloat(item.quantity) || 0;
        if (item.producto.stock >= qty) return 'ok';
        if (item.producto.stock > 0) return 'low';
        return 'out';
    };

    const stockStatus = getStockStatus();

    return (
        <tr className="hover">
            {/* 1. Icono de Stock */}
            <td className="text-center">
                <div className="tooltip" data-tip={
                    stockStatus === 'ok' ? 'En Stock' :
                        stockStatus === 'low' ? 'Stock Insuficiente' :
                            stockStatus === 'out' ? 'Agotado' :
                                stockStatus === 'manual' ? 'Item Manual' : 'Stock Desconocido'
                }>
                    {stockStatus === 'ok' && <CheckCircle className="w-5 h-5 text-success" />}
                    {stockStatus === 'low' && <AlertTriangle className="w-5 h-5 text-warning" />}
                    {stockStatus === 'out' && <XCircle className="w-5 h-5 text-error" />}
                    {stockStatus === 'manual' && <Package className="w-5 h-5 text-gray-400" />}
                    {stockStatus === 'unknown' && <Package className="w-5 h-5 text-gray-300" />}
                </div>
            </td>

            {/* 2. Descripción / Búsqueda de Producto */}
            <td>
                <div className="form-control w-full">
                    <div className="input-group cursor-pointer flex items-center" onClick={onSearchClick}>
                        <input
                            type="text"
                            readOnly
                            value={item.descripcion || ''}
                            placeholder="Buscar producto..."
                            className={`input input-bordered input-sm w-full cursor-pointer ${item.productoId ? 'input-success' : ''}`}
                        />
                        {item.productoId ? (
                            <button
                                type="button"
                                className="btn btn-square btn-sm btn-ghost text-error ml-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemChange(index, 'descripcion', '');
                                    handleItemChange(index, 'productoId', null);
                                    handleItemChange(index, 'unitPrice', 0);
                                    // Limpiamos la referencia al producto completo también si queremos actualizar el stock icon
                                    // Pero ClientOrderForm maneja el estado item, asi que al limpiar productoId deberíamos limpiar producto también idealmente
                                }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : (
                            <button type="button" className="btn btn-square btn-sm btn-primary ml-1">
                                <Search className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {item.producto && (
                        <div className="text-xs text-gray-500 mt-1 ml-1 flex items-center gap-2">
                            <span className="badge badge-xs badge-ghost">{item.producto.categoria || 'Sin Cat'}</span>
                            <span>Stock: {item.producto.stock}</span>
                        </div>
                    )}
                </div>
            </td>

            {/* 3. Cantidad */}
            <td>
                <input
                    type="number"
                    className="input input-bordered input-sm w-full text-center font-bold"
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
                    className="input input-bordered input-sm w-full text-right"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                />
            </td>

            {/* 5. Total Fila */}
            <td className="font-mono text-right font-semibold">
                {total} €
            </td>

            {/* 6. Acciones */}
            <td className="text-center">
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