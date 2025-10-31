'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StatsChart({ data }) {
  const chartData = [
    {
      name: 'Estadísticas',
      "Pedidos de Clientes": data.pedidosClientes,
      "Items con Stock Bajo": data.stockBajo,
      "Pedidos a Proveedores": data.pedidosProveedores,
    },
  ];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-accent">Resumen Visual</h2>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: '#1d232a', borderRadius: '0.5rem' }} />
                    <Legend />
                    <Bar dataKey="Pedidos de Clientes" fill="#570df8" />
                    <Bar dataKey="Items con Stock Bajo" fill="#facc15" />
                    <Bar dataKey="Pedidos a Proveedores" fill="#00aaff" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
