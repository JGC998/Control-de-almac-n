import React, { useMemo } from 'react';
import { X, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/utils';

export default function PedidoProveedorDetalleModal({ pedido, onClose }) {
  if (!pedido) return null;

  const detallesCalculados = useMemo(() => {
    const tasa = pedido.tasaCambio || 1;
    const gastos = pedido.gastosTotales || 0;
    const esImportacion = pedido.tipo === 'IMPORTACION';

    // 1. Calcular el valor total real de la mercancía (incluyendo cantidades)
    const valorTotalMercanciaEUR = pedido.bobinas.reduce((acc, b) => {
      const cantidad = parseInt(b.cantidad) || 1; // <--- AÑADIDO
      const precioBaseEUR = (b.precioMetro || 0) * (esImportacion ? tasa : 1);
      return acc + (precioBaseEUR * (b.largo || 0) * cantidad); // <--- AÑADIDO MULTIPLICADOR
    }, 0);

    return pedido.bobinas.map(b => {
      const metrosPorBobina = parseFloat(b.largo) || 0;
      const cantidad = parseInt(b.cantidad) || 1; // <--- AÑADIDO
      const totalMetrosLinea = metrosPorBobina * cantidad; // Metros totales de esta referencia

      const precioBaseOriginal = parseFloat(b.precioMetro) || 0;
      const precioBaseEUR = precioBaseOriginal * (esImportacion ? tasa : 1);
      
      const costeTotalBaseLinea = precioBaseEUR * totalMetrosLinea; // Coste base de TODAS las bobinas de esta ref
      
      const factorParticipacion = valorTotalMercanciaEUR > 0 ? (costeTotalBaseLinea / valorTotalMercanciaEUR) : 0;
      const gastosAsignados = gastos * factorParticipacion;
      
      // El costo unitario final es por metro. (Gastos totales de la línea / Metros totales de la línea)
      const costoUnitarioFinal = totalMetrosLinea > 0 ? (precioBaseEUR + (gastosAsignados / totalMetrosLinea)) : 0;

      return {
        ...b,
        cantidad, 
        totalMetrosLinea,
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
    <div className="modal modal-open z-50">
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
                {/* NUEVA COLUMNA CANTIDAD */}
                <th className="text-center font-bold text-blue-600">Cant.</th>
                <th className="text-right">Precio ({pedido.tipo === 'IMPORTACION' ? '$' : '€'})</th>
                <th className="text-right border-l border-base-300">Metros Totales</th>
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
                  
                  {/* CELDA DE CANTIDAD */}
                  <td className="text-center font-bold text-blue-600 text-lg">{item.cantidad}</td>
                  
                  <td className="text-right">{item.precioMetro.toFixed(2)}</td>
                  
                  {/* METROS TOTALES (Para que la multiplicacion Precio * Metros cuadre visualmente) */}
                  <td className="text-right border-l border-base-300 font-mono">
                    {item.totalMetrosLinea.toFixed(1)} m
                    {item.cantidad > 1 && <div className="text-[10px] opacity-50 italic">({item.largo}m x {item.cantidad})</div>}
                  </td>
                  
                  <td className="text-right font-semibold border-l border-base-300">{formatCurrency(item.costeTotalBaseLinea)}</td>
                  
                  <td className="text-right text-warning border-l border-base-300">
                      <div>+{formatCurrency(item.gastosAsignados)}</div>
                      <div className="text-[10px] opacity-70 font-bold">{item.porcentajeGastos.toFixed(1)}%</div>
                  </td>
                  
                  <td className="text-right font-bold text-success text-lg border-l border-base-300">{formatCurrency(item.costoUnitarioFinal)}</td>
                  
                  {/* TOTAL FINAL (Calculado con metros totales) */}
                  <td className="text-right font-bold">{formatCurrency(item.costoUnitarioFinal * item.totalMetrosLinea)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
                <tr className="font-bold text-lg bg-base-200">
                    <td colSpan={5} className="text-right">TOTALES:</td>
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