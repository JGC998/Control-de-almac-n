'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { FaBoxes, FaClipboardList, FaTruck, FaWrench, FaWarehouse, FaEuroSign, FaSpinner } from "react-icons/fa";
import MovimientosRecientesTable from "@/components/MovimientosRecientesTable";
import NivelesStock from "@/components/NivelesStock";

export default function Home() {
  const [stats, setStats] = useState({ pedidosClientes: 0, pedidosProveedores: 0, stockBajo: 0 });
  const [movimientos, setMovimientos] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carga de datos desde APIs y archivos JSON
        const [stockRes, movimientosRes, pedidosClientesRes, pedidosProveedoresRes] = await Promise.all([
          fetch('/data/stock.json'),
          fetch('/data/movimientos.json'),
          fetch('/api/pedidos'), // Nueva API para pedidos de clientes
          fetch('/api/proveedores').catch(e => { // Asumimos una API para proveedores, si no existe, devuelve un error manejable
            console.warn("API de proveedores no encontrada, usando datos vacíos.", e);
            return { ok: true, json: async () => [] }; // Devuelve una respuesta OK con array vacío
          })
        ]);

        // Verificar si todas las respuestas son correctas antes de procesar
        for (const res of [stockRes, movimientosRes, pedidosClientesRes, pedidosProveedoresRes]) {
          if (!res.ok) {
            throw new Error(`No se pudo cargar un archivo de datos (status: ${res.status}). Revisa que los archivos JSON existan en la carpeta /public/data/`);
          }
        }

        const stockData = await stockRes.json();
        const movimientosData = await movimientosRes.json();
        const pedidosClientesData = await pedidosClientesRes.json();
        const pedidosProveedoresData = await pedidosProveedoresRes.json();

        // Contamos los pedidos de clientes en estado 'Activo'
        const pedidosClientes = pedidosClientesData.filter(p => p.estado === 'Activo').length;
        const pedidosProveedores = pedidosProveedoresData.filter(p => p.estado === 'Pendiente').length;
        const stockBajo = stockData.filter(s => s.stock < s.stock_minimo).length;

        setStats({ pedidosClientes, pedidosProveedores, stockBajo });
        setMovimientos(movimientosData);
        setStock(stockData);
      } catch (error) {
        console.error("Error al cargar los datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="p-8 bg-base-200 min-h-screen flex justify-center items-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-primary flex items-center gap-3">
          <FaWarehouse /> Dashboard de Taller
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="stats shadow-lg stats-vertical lg:stats-horizontal">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <FaClipboardList className="text-3xl" />
                </div>
                <div className="stat-title">Pedidos de Clientes</div>
                <div className="stat-value text-primary">{stats.pedidosClientes}</div>
                <div className="stat-desc">Pendientes de fabricar</div>
              </div>
              
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <FaBoxes className="text-3xl" />
                </div>
                <div className="stat-title">Items con Stock Bajo</div>
                <div className="stat-value text-warning">{stats.stockBajo}</div>
                <div className="stat-desc">Necesitan reposición</div>
              </div>
              
              <div className="stat">
                <div className="stat-figure text-accent">
                  <FaTruck className="text-3xl" />
                </div>
                <div className="stat-title">Pedidos a Proveedores</div>
                <div className="stat-value text-accent">{stats.pedidosProveedores}</div>
                <div className="stat-desc">Pendientes de recibir</div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-accent">Últimos Movimientos de Almacén</h2>
                <MovimientosRecientesTable movimientos={movimientos} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <NivelesStock stockItems={stock} />

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-accent">Navegación Rápida</h2>                <Link href="/clientes" className="btn btn-outline btn-secondary w-full mt-2"><FaClipboardList /> Pedidos Clientes</Link>
                <Link href="/proveedores" className="btn btn-outline btn-secondary w-full mt-2"><FaTruck /> Pedidos Proveedores</Link>
                <Link href="/calculadora" className="btn btn-outline btn-primary w-full mt-2"><FaWrench /> Calculadora</Link>
                <Link href="/tarifas" className="btn btn-outline btn-info w-full mt-2"><FaEuroSign /> Consultar Tarifas</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
