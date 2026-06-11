'use client';
import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  QrCode, Printer, Plus, Trash2, Home, ShoppingCart, FileText,
  Package, Settings, Truck, Tablet, Users, Factory, Calculator,
  Ruler, BarChart2, Tag,
} from 'lucide-react';

const ACCESOS_DEFECTO = [
  { id: 'inicio',          label: 'Inicio',                  path: '/',                               icon: 'Home',        color: 'badge-neutral' },
  { id: 'nuevo-pedido',    label: 'Nuevo pedido',            path: '/pedidos/nuevo',                  icon: 'ShoppingCart',color: 'badge-primary' },
  { id: 'nuevo-presup',    label: 'Nuevo presupuesto',       path: '/presupuestos/nuevo',             icon: 'FileText',    color: 'badge-secondary' },
  { id: 'stock',           label: 'Almacén / Stock',         path: '/almacen/stock',                  icon: 'Package',     color: 'badge-success' },
  { id: 'productos',       label: 'Gestión de productos',    path: '/gestion/productos',              icon: 'Tag',         color: 'badge-success' },
  { id: 'tarifas',         label: 'Tarifas de material',     path: '/configuracion/margenes',         icon: 'BarChart2',   color: 'badge-warning' },
  { id: 'tarifas2',        label: 'Tarifas de venta',        path: '/tarifas',                        icon: 'BarChart2',   color: 'badge-warning' },
  { id: 'clientes',        label: 'Clientes',                path: '/gestion/clientes',               icon: 'Users',       color: 'badge-info' },
  { id: 'proveedores',     label: 'Proveedores',             path: '/proveedores',                    icon: 'Factory',     color: 'badge-info' },
  { id: 'contenedores',    label: 'Contenedores',            path: '/compras/contenedores',           icon: 'Truck',       color: 'badge-accent' },
  { id: 'tablet',          label: 'Vista tablet / OCR',      path: '/tablet',                         icon: 'Tablet',      color: 'badge-ghost' },
  { id: 'calc-bandas',     label: 'Calculadora bandas PVC',  path: '/calculadora/bandas',             icon: 'Calculator',  color: 'badge-error' },
  { id: 'calc-metrajes',   label: 'Calculadora metrajes',    path: '/calculadora/metrajes',           icon: 'Ruler',       color: 'badge-error' },
  { id: 'configuracion',   label: 'Configuración',           path: '/configuracion',                  icon: 'Settings',    color: 'badge-ghost' },
];

const ICONOS = { Home, ShoppingCart, FileText, Package, Settings, Truck, Tablet, Users, Factory, Calculator, Ruler, BarChart2, Tag };

function TarjetaQR({ item, baseUrl, onEliminar }) {
  const [qrSrc, setQrSrc] = useState('');
  const url = baseUrl + item.path;

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 180,
      margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrSrc).catch(() => {});
  }, [url]);

  const Icono = ICONOS[item.icon] ?? QrCode;

  return (
    <div className="qr-card card bg-base-100 border border-base-300 shadow-sm flex flex-col items-center p-4 gap-2 text-center">
      <div className="flex items-center gap-2 w-full justify-center">
        <Icono className="w-4 h-4 text-base-content/60" />
        <span className="font-semibold text-sm leading-tight">{item.label}</span>
      </div>
      {qrSrc
        ? <img src={qrSrc} alt={item.label} className="w-[150px] h-[150px]" />
        : <div className="w-[150px] h-[150px] bg-base-200 animate-pulse rounded" />
      }
      <span className="text-xs text-base-content/50 break-all">{item.path}</span>
      {onEliminar && (
        <button onClick={onEliminar} className="btn btn-xs btn-ghost text-error no-print">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function AccesosQRPage() {
  const [baseUrl, setBaseUrl] = useState('');
  const [extras, setExtras] = useState([]);
  const [seleccionados, setSeleccionados] = useState(() =>
    ACCESOS_DEFECTO.map(a => a.id)
  );
  const [nuevoLabel, setNuevoLabel] = useState('');
  const [nuevoPath, setNuevoPath] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const agregarPersonalizado = () => {
    if (!nuevoLabel.trim() || !nuevoPath.trim()) return;
    const path = nuevoPath.startsWith('/') ? nuevoPath : '/' + nuevoPath;
    const id = 'custom-' + Date.now();
    setExtras(prev => [...prev, { id, label: nuevoLabel.trim(), path, icon: 'QrCode', color: 'badge-neutral' }]);
    setSeleccionados(prev => [...prev, id]);
    setNuevoLabel('');
    setNuevoPath('');
  };

  const eliminarExtra = (id) => {
    setExtras(prev => prev.filter(e => e.id !== id));
    setSeleccionados(prev => prev.filter(x => x !== id));
  };

  const todosLosAccesos = [...ACCESOS_DEFECTO, ...extras];
  const visibles = todosLosAccesos.filter(a => seleccionados.includes(a.id));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .qr-card { break-inside: avoid; border: 1px solid #ccc !important; box-shadow: none !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        }
      `}</style>

      {/* Cabecera */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="w-7 h-7" /> Accesos rápidos QR
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Genera QR codes para imprimir y pegar en el taller. Escaneándolos desde el móvil se abre la página directamente.
          </p>
        </div>
        <button onClick={() => window.print()} className="btn btn-primary gap-2">
          <Printer className="w-4 h-4" /> Imprimir selección
        </button>
      </div>

      {/* Selector de accesos */}
      <div className="card bg-base-200 p-4 space-y-3 no-print">
        <p className="font-medium text-sm">Selecciona qué QRs imprimir:</p>
        <div className="flex flex-wrap gap-2">
          {ACCESOS_DEFECTO.map(a => (
            <button
              key={a.id}
              onClick={() => toggleSeleccion(a.id)}
              className={`badge badge-lg cursor-pointer select-none ${seleccionados.includes(a.id) ? a.color : 'badge-ghost opacity-50'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Añadir enlace personalizado */}
      <div className="card bg-base-200 p-4 no-print">
        <p className="font-medium text-sm mb-3">Añadir enlace personalizado:</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="form-control">
            <label className="label py-0"><span className="label-text text-xs">Etiqueta</span></label>
            <input
              type="text"
              className="input input-bordered input-sm w-48"
              placeholder="Ej: Mi página"
              value={nuevoLabel}
              onChange={e => setNuevoLabel(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label py-0"><span className="label-text text-xs">Ruta (o URL completa)</span></label>
            <input
              type="text"
              className="input input-bordered input-sm w-64"
              placeholder="Ej: /almacen o https://..."
              value={nuevoPath}
              onChange={e => setNuevoPath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarPersonalizado()}
            />
          </div>
          <button onClick={agregarPersonalizado} className="btn btn-sm btn-outline gap-1">
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </div>
      </div>

      {/* URL base detectada */}
      {baseUrl && (
        <p className="text-xs text-base-content/40 no-print">
          URL base detectada: <span className="font-mono">{baseUrl}</span> — los QRs usarán esta dirección. Asegúrate de estar en la misma red al escanear.
        </p>
      )}

      {/* Grid de QRs */}
      <div className="print-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {visibles.map(item => (
          <TarjetaQR
            key={item.id}
            item={item}
            baseUrl={baseUrl}
            onEliminar={item.id.startsWith('custom-') ? () => eliminarExtra(item.id) : null}
          />
        ))}
      </div>

      {visibles.length === 0 && (
        <div className="text-center py-12 text-base-content/40">
          Selecciona al menos un acceso para generar QR codes.
        </div>
      )}
    </div>
  );
}
