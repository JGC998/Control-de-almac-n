import React, { useMemo } from 'react';
import { X, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/utils';

export default function PedidoProveedorDetalleModal({ pedido, onClose }) {
  if (!pedido) return null;

  const detallesCalculados = useMemo(() => {
    const tasa = pedido.tasaCambio || 1;
    const gastos = pedido.gastosTotales || 0;
    const esImportacion = pedido.tipo === 'IMPORTACION';

    const valorTotalMercanciaEUR = pedido.bobinas.reduce((acc, b) => {
      const precioBaseEUR = (b.precioMetro || 0) * (esImportacion ? tasa : 1);
      return acc + (precioBaseEUR * (b.largo || 0));
    }, 0);

    return pedido.bobinas.map(b => {
      const metros = parseFloat(b.largo) || 0;
      const precioBaseOriginal = parseFloat(b.precioMetro) || 0;
      const precioBaseEUR = precioBaseOriginal * (esImportacion ? tasa : 1);
      const costeTotalBaseLinea = precioBaseEUR * metros;
      const factorParticipacion = valorTotalMercanciaEUR > 0 ? (costeTotalBaseLinea / valorTotalMercanciaEUR) : 0;
      const gastosAsignados = gastos * factorParticipacion;
      const costoUnitarioFinal = metros > 0 ? (precioBaseEUR + (gastosAsignados / metros)) : 0;

      return {
        ...b,
        costeTotalBaseLinea,
        gastosAsignados,
        porcentajeGastos: factorParticipacion * 100,
        costoUnitarioFinal
      };
    });
  }, [pedido]);

  const totalImporteBase = detallesCalculados.reduce((acc, i) => acc + i.costeTotalBaseLinea, 0);
  const totalGastos = pedido.gastosTotales || 0;
  const granTotal = totalImporteBase + totalGastos;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-6xl">
        <button onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2"><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg flex items-center mb-4">
          <Package className="mr-2" /> Detalle de Costes: {pedido.proveedor?.nombre}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-base-200 p-4 rounded-lg">
           <div><div className="text-xs uppercase opacity-50">Tipo</div><div>{pedido.tipo}</div></div>
           <div><div className="text-xs uppercase opacity-50">Gastos Totales</div><div className="text-primary font-bold">{formatCurrency(pedido.gastosTotales)}</div></div>
           {pedido.tipo === 'IMPORTACION' && (<div><div className="text-xs uppercase opacity-50">Tasa</div><div>{pedido.tasaCambio} $/€</div></div>)}
           <div><div className="text-xs uppercase opacity-50">Total Final</div><div className="text-success font-bold text-xl">{formatCurrency(granTotal)}</div></div>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr>
                <th>Ref.</th>
                <th>Medidas</th>
                <th className="text-right">Precio ({pedido.tipo === 'IMPORTACION' ? '$' : '€'})</th>
                <th className="text-right border-l border-base-300">Metros</th>
                <th className="text-right font-semibold border-l border-base-300">Total (Base)</th>
                <th className="text-right text-warning border-l border-base-300">Gastos</th>
                <th className="text-right font-bold text-success border-l border-base-300">Costo Final/m</th>
                <th className="text-right font-bold">Total Final</th>
              </tr>
            </thead>
            <tbody>
              {detallesCalculados.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-mono">{item.referencia?.referencia || item.referencia?.nombre || 'N/A'}</td>
                  <td>{item.ancho}mm x {item.largo}m ({item.espesor}mm)</td>
                  <td className="text-right">{item.precioMetro.toFixed(2)}</td>
                  <td className="text-right border-l border-base-300 font-mono">{item.largo} m</td>
                  <td className="text-right font-semibold border-l border-base-300">{formatCurrency(item.costeTotalBaseLinea)}</td>
                  <td className="text-right text-warning border-l border-base-300">
                      <div>+{formatCurrency(item.gastosAsignados)}</div>
                      <div className="text-[10px] opacity-70 font-bold">{item.porcentajeGastos.toFixed(1)}%</div>
                  </td>
                  <td className="text-right font-bold text-success text-lg border-l border-base-300">{formatCurrency(item.costoUnitarioFinal)}</td>
                  <td className="text-right font-bold">{formatCurrency(item.costoUnitarioFinal * item.largo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
                <tr className="font-bold text-lg bg-base-200">
                    <td colSpan={4} className="text-right">TOTALES:</td>
                    <td className="text-right border-l border-base-300">{formatCurrency(totalImporteBase)}</td>
                    <td className="text-right text-warning border-l border-base-300">+{formatCurrency(totalGastos)}</td>
                    <td className="text-right border-l border-base-300">-</td>
                    <td className="text-right">{formatCurrency(granTotal)}</td>
                </tr>
            </tfoot>
          </table>
        </div>
        <div className="modal-action"><button className="btn" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  );
}
