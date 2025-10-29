import { formatCurrency, formatWeight } from '../utils/utils';

function TarifasTable({ precios }) {
  if (!precios || precios.length === 0) {
    return <p>Cargando precios...</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full shadow-lg">
        {/* Encabezado de la tabla */}
        <thead className="text-base">
          <tr>
            <th>Material</th>
            <th>Espesor</th>
            <th className="text-right">Precio</th>
            <th className="text-right">Peso (por m²)</th>
          </tr>
        </thead>
        <tbody>
          {precios.map((item, index) => (
            <tr key={index} className="hover">
              <td>{item.material}</td>
              <td>{item.espesor}</td>
              <td className="text-right font-mono">{formatCurrency(item.precio)}</td>
              <td className="text-right font-mono">{formatWeight(item.peso)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TarifasTable;