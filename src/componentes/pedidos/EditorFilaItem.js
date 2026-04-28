"use client";
import React, { useMemo } from 'react';
import { Trash2, Copy, Search, X, Package, CheckCircle, XCircle, AlertTriangle, Ruler, Pencil } from 'lucide-react';

export default function EditorFilaItem({
    item,
    index,
    handleItemChange,
    onSearchClick,
    removeItem,
    handleDuplicateItem
}) {
    const total = (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2);

    const isPVC     = !!item.detallesTecnicos;
    const isCatalog = !!item.productoId;

    const stockStatus = useMemo(() => {
        if (isPVC) return 'pvc';
        if (!isCatalog) return 'manual';
        if (item.producto?.stock === undefined || item.producto?.stock === null) return 'unknown';
        const qty = parseFloat(item.quantity) || 0;
        if (item.producto.stock >= qty) return 'ok';
        if (item.producto.stock > 0) return 'low';
        return 'out';
    }, [isPVC, isCatalog, item.producto?.stock, item.quantity]);

    const statusIcon = {
        ok:      <CheckCircle  className="w-4 h-4 text-success" />,
        low:     <AlertTriangle className="w-4 h-4 text-warning" />,
        out:     <XCircle      className="w-4 h-4 text-error" />,
        pvc:     <Ruler        className="w-4 h-4 text-secondary" />,
        manual:  <Pencil       className="w-4 h-4 text-base-content/30" />,
        unknown: <Package      className="w-4 h-4 text-base-content/20" />,
    }[stockStatus];

    const statusTip = {
        ok:      'En stock',
        low:     'Stock insuficiente',
        out:     'Agotado',
        pvc:     'Banda PVC personalizada',
        manual:  'Línea manual',
        unknown: 'Stock desconocido',
    }[stockStatus];

    return (
        <tr className={`hover${isPVC ? ' bg-secondary/5' : ''}`}>
            {/* Indicador de tipo */}
            <td className="text-center w-10">
                <div className="tooltip tooltip-right" data-tip={statusTip}>
                    {statusIcon}
                </div>
            </td>

            {/* Descripción */}
            <td>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            readOnly
                            value={item.descripcion || ''}
                            placeholder="Buscar producto..."
                            className={`input input-bordered input-sm flex-1 cursor-pointer ${isCatalog ? 'input-success' : isPVC ? 'cursor-default input-ghost' : ''}`}
                            onClick={isPVC ? undefined : onSearchClick}
                        />
                        {isCatalog && (
                            <button
                                type="button"
                                className="btn btn-square btn-xs btn-ghost text-error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemChange(index, 'descripcion', '');
                                    handleItemChange(index, 'productoId', null);
                                    handleItemChange(index, 'unitPrice', 0);
                                }}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                        {!isCatalog && !isPVC && (
                            <button type="button" className="btn btn-square btn-xs btn-primary" onClick={onSearchClick}>
                                <Search className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Badges informativos */}
                    <div className="flex items-center gap-1 pl-1">
                        {isPVC && (
                            <span className="badge badge-xs badge-secondary gap-1">
                                <Ruler className="w-2.5 h-2.5" /> Banda PVC
                            </span>
                        )}
                        {isCatalog && item.producto && (
                            <span className="text-xs text-base-content/40">
                                Stock: {item.producto.stock ?? '—'}
                            </span>
                        )}
                    </div>
                </div>
            </td>

            {/* Cantidad */}
            <td className="w-24">
                <input
                    type="number"
                    className="input input-bordered input-sm w-full text-center font-bold"
                    value={Number.isFinite(Number(item.quantity)) ? item.quantity : 0}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                />
            </td>

            {/* Precio unitario */}
            <td className="w-32">
                <input
                    type="number"
                    step="0.01"
                    className="input input-bordered input-sm w-full text-right"
                    value={Number.isFinite(Number(item.unitPrice)) ? item.unitPrice : 0}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                />
            </td>

            {/* Total fila */}
            <td className="text-right font-mono font-semibold whitespace-nowrap w-28">
                {total} €
            </td>

            {/* Acciones */}
            <td className="text-center w-20">
                <div className="flex gap-1 justify-center">
                    <button type="button" onClick={() => handleDuplicateItem(item.id)}
                        className="btn btn-ghost btn-xs tooltip" data-tip="Duplicar">
                        <Copy className="w-3.5 h-3.5 text-info" />
                    </button>
                    <button type="button" onClick={() => removeItem(item.id)}
                        className="btn btn-ghost btn-xs tooltip" data-tip="Eliminar">
                        <Trash2 className="w-3.5 h-3.5 text-error" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
