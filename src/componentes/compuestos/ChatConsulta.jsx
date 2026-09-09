'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Send, Zap, History, Scissors, Tag, ArrowRight } from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtEur(v) {
  return (typeof v === 'number' ? v : 0).toLocaleString('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  });
}

function parseDims(text) {
  const s = text.trim()
    .replace(/,/g, '.').replace(/por/gi, 'x')
    .replace(/[×*·]/g, 'x').replace(/\s+/g, 'x');
  const m = s.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const a = parseFloat(m[1]), b = parseFloat(m[2]);
  return a > 0 && b > 0 ? { ancho: a, largo: b } : null;
}

function parseDimsEstricto(text) {
  const clean = text.trim().replace(/\s+/g, '').replace(/[×xXpP]/gi, 'x');
  const m = clean.match(/^(\d{2,5})x(\d{2,5})$/);
  if (!m) return null;
  return { ancho: parseInt(m[1], 10), largo: parseInt(m[2], 10) };
}

function parsePositive(text) {
  const n = parseFloat(String(text).replace(',', '.'));
  return n > 0 ? n : null;
}

const COLOR_ABR = { AZUL: 'AZ', BLANCO: 'BL', NEGRO: 'NG', VERDE: 'VD' };
const MATERIALES_CAUCHO = ['GOMA', 'FIELTRO', 'CARAMELO', 'PLANCHA DE GOMA'];

// ─── BandaCard ────────────────────────────────────────────────────────────────

function confFromNombre(nombre) {
  if (!nombre) return null;
  if (/-SF-/.test(nombre)) return 'Sin Fin';
  if (/-GR-/.test(nombre)) return 'Con Grapa';
  if (/-AB-/.test(nombre)) return 'Abierta';
  return null;
}

function BandaCard({ banda }) {
  const dim  = banda.det?.dimensiones;
  const conf = confFromNombre(banda.descripcion);
  const esp  = dim?.espesor;
  return (
    <div className="bg-base-100 border border-base-300 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-bold leading-snug">{banda.descripcion}</span>
          <div className="flex flex-wrap gap-1">
            {esp  != null && <span className="badge badge-ghost badge-xs">{esp} mm</span>}
            {banda.det?.color && <span className="badge badge-ghost badge-xs">{banda.det.color}</span>}
            {conf && <span className="badge badge-ghost badge-xs">{conf}</span>}
            {dim  && <span className="text-xs text-base-content/40">{dim.ancho}×{dim.largo} mm</span>}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="font-mono text-sm font-bold">{fmtEur(banda.unitPrice ?? 0)}</div>
          {banda.pesoUnitario > 0 && (
            <div className="text-xs text-base-content/40">{Number(banda.pesoUnitario).toFixed(3)} kg</div>
          )}
        </div>
      </div>
      {banda.pedido && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/40 truncate">
            {banda.pedido.numero}
            {banda.pedido.cliente?.nombre && ` · ${banda.pedido.cliente.nombre}`}
          </span>
          <Link href={`/pedidos/${banda.pedido.id}`}
            className="btn btn-xs btn-ghost gap-1 shrink-0 ml-2 text-secondary">
            Ver <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── PrecioCard ───────────────────────────────────────────────────────────────

function PrecioCard({ tarifa }) {
  let tiers = null;
  if (tarifa.preciosVenta) {
    try {
      const pv = typeof tarifa.preciosVenta === 'string' ? JSON.parse(tarifa.preciosVenta) : tarifa.preciosVenta;
      if (pv && typeof pv === 'object') tiers = pv;
    } catch { /* sin tiers */ }
  }
  if (!tiers) {
    tiers = {
      'FABRICANTE (×1.5)':    tarifa.precio * 1.5,
      'CLIENTE FINAL (×2)':   tarifa.precio * 2,
      'INTERMEDIARIO (×1.75)': tarifa.precio * 1.75,
    };
  }
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-base-300 text-sm">
      <div className="bg-base-200 px-3 py-2">
        <p className="font-semibold">{tarifa.material} {tarifa.espesor}mm
          {tarifa.lonas ? ` · ${tarifa.lonas}L` : ''}
          {tarifa.acabado ? ` · ${tarifa.acabado}` : ''}
          {tarifa.color ? ` · ${tarifa.color}` : ''}
        </p>
        {tarifa.peso > 0 && <p className="text-xs text-base-content/40">{tarifa.peso} kg/m²</p>}
      </div>
      <div className="px-3 py-2 bg-base-100 space-y-1.5">
        <div className="flex justify-between text-xs text-base-content/50">
          <span>Precio base</span>
          <span className="font-mono font-semibold">{fmtEur(tarifa.precio)}/m²</span>
        </div>
        {Object.entries(tiers).map(([label, precio]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-base-content/50">{label}</span>
            <span className="font-mono font-medium">{fmtEur(precio)}/m²</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MODOS ────────────────────────────────────────────────────────────────────

const MODOS_IZQ = [
  { id: 'crear_banda',      label: 'Crear banda PVC',  icon: Zap      },
  { id: 'buscar_banda',     label: 'Buscar banda PVC', icon: History  },
  { id: 'calcular_metraje', label: 'Calcular metraje', icon: Scissors },
];
const MODO_DER = { id: 'precio_material', label: 'Precio de material', icon: Tag };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatConsulta() {
  const [modo,      setModo]      = useState(null);
  const [mensajes,  setMensajes]  = useState([]);
  const [paso,      setPaso]      = useState('');
  const [datos,     setDatos]     = useState({});
  const [input,     setInput]     = useState('');
  const [cargando,  setCargando]  = useState(false);
  const [inputErr,  setInputErr]  = useState('');

  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const { data: todasTarifas }     = useSWR('/api/precios');
  const { data: modelosGrapaData } = useSWR('/api/modelos-grapa');
  const { data: tacosData }        = useSWR('/api/tacos');
  const { data: configData }       = useSWR('/api/config');

  const costeVulcMetro = configData?.costeVulcanizadoMetro ?? 0;
  const tarifasPVC     = useMemo(() => (todasTarifas ?? []).filter(t => t.material === 'PVC'), [todasTarifas]);
  const tarifasCaucho  = useMemo(() => (todasTarifas ?? []).filter(t => MATERIALES_CAUCHO.includes(t.material)), [todasTarifas]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes, cargando]);

  const pushBot  = useCallback((texto, chips = null, extra = {}) =>
    setMensajes(prev => [...prev, { role: 'bot', texto, chips, ...extra }]), []);
  const pushUser = useCallback((texto) =>
    setMensajes(prev => [...prev, { role: 'user', texto }]), []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE: crear_banda (CB_*)
  // ═══════════════════════════════════════════════════════════════════════════

  const cbEspesoresDisp = useMemo(() => {
    const s = [...new Set(tarifasPVC.map(t => String(t.espesor)))];
    return s.sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifasPVC]);

  const cbAskEspesor = useCallback((dims, d0) => {
    const d = { ...d0, ...dims };
    setDatos(d);
    const chips = cbEspesoresDisp.map(esp => {
      const vars    = tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(esp)) < 0.001);
      const acabados = [...new Set(vars.map(t => t.acabado).filter(Boolean))];
      const colores  = [...new Set(vars.map(t => t.color).filter(Boolean))];
      const nota = acabados.length ? ` — ${acabados.join(', ')}` : colores.length ? ` — ${colores.join(', ')}` : '';
      return { label: `${esp} mm${nota}`, valor: esp };
    });
    pushBot(`Medidas: ${dims.ancho} × ${dims.largo} mm ✓\n\n¿Qué espesor de PVC necesitas?`, chips);
    setPaso('CB_ESPESOR');
  }, [cbEspesoresDisp, tarifasPVC, pushBot]);

  const cbAfterLonas = useCallback((lonas, d0, tarsEsp) => {
    const tarsL = lonas == null ? tarsEsp.filter(t => t.lonas == null) : tarsEsp.filter(t => String(t.lonas) === lonas);
    const aOpts = [...new Set(tarsL.map(t => t.acabado == null ? '__null' : t.acabado))];
    if (aOpts.length > 1) {
      pushBot('¿Qué acabado?', aOpts.map(a => ({ label: a === '__null' ? 'Sin acabado especial' : a, valor: a })));
      setDatos({ ...d0, lonas });
      setPaso('CB_ACABADO');
      return;
    }
    cbAfterAcabado(aOpts[0] === '__null' ? null : aOpts[0], { ...d0, lonas }, tarsL); // eslint-disable-line no-use-before-define
  }, [pushBot]); // eslint-disable-line react-hooks/exhaustive-deps

  const cbAskConf = useCallback((d0) => {
    setDatos(d0);
    pushBot('¿Cómo va la banda?', [
      { label: 'Sin Fin (Vulcanizada)', valor: 'VULCANIZADA' },
      { label: 'Con Grapa',             valor: 'GRAPA'       },
      { label: 'Abierta',               valor: 'ABIERTA'     },
    ]);
    setPaso('CB_CONF');
  }, [pushBot]);

  const cbAfterAcabado = useCallback((acabado, d0, tarsL0) => {
    const tarsA = acabado == null ? tarsL0.filter(t => !t.acabado) : tarsL0.filter(t => t.acabado === acabado);
    const cOpts = [...new Set(tarsA.map(t => t.color == null ? '__null' : t.color))];
    if (cOpts.length > 1) {
      pushBot('¿Qué color?', cOpts.map(c => ({ label: c === '__null' ? 'Sin color específico' : c, valor: c })));
      setDatos({ ...d0, acabado });
      setPaso('CB_COLOR');
      return;
    }
    const coloresReales = cOpts.filter(c => c !== '__null');
    if (coloresReales.length === 1) { cbAskConf({ ...d0, acabado, color: coloresReales[0] }); return; }
    const espNum = parseFloat(d0.espesor ?? 0);
    if (espNum === 2 || espNum === 3) {
      pushBot('¿De qué color es la banda?', [
        { label: 'Blanco', valor: 'BLANCO' },
        { label: 'Verde',  valor: 'VERDE'  },
        { label: 'Azul',   valor: 'AZUL'   },
      ]);
      setDatos({ ...d0, acabado });
      setPaso('CB_COLOR');
      return;
    }
    cbAskConf({ ...d0, acabado, color: cOpts[0] === '__null' ? null : cOpts[0] });
  }, [cbAskConf, pushBot]);

  const cbAfterEspesor = useCallback((espesor, d0) => {
    const tarsEsp = tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(espesor)) < 0.001);
    const lOpts   = [...new Set(tarsEsp.map(t => t.lonas == null ? '__null' : String(t.lonas)))];
    if (lOpts.length > 1) {
      pushBot('¿Cuántas lonas?', lOpts.map(l => ({ label: l === '__null' ? 'Estándar' : `${l} lonas`, valor: l })));
      setDatos({ ...d0, espesor });
      setPaso('CB_LONAS');
      return;
    }
    cbAfterLonas(lOpts[0] === '__null' ? null : lOpts[0], { ...d0, espesor }, tarsEsp);
  }, [tarifasPVC, pushBot, cbAfterLonas]);

  const cbAskTacos = useCallback((d0) => {
    setDatos(d0);
    pushBot('¿La banda llevará tacos?', [
      { label: 'No, sin tacos', valor: 'NO' },
      { label: 'Sí, con tacos', valor: 'SI' },
    ]);
    setPaso('CB_TACOS_YN');
  }, [pushBot]);

  const cbAfterConf = useCallback((conf, d0) => {
    if (conf === 'GRAPA') {
      const modelos = modelosGrapaData?.modelos ?? [];
      const esp = parseFloat(d0.espesor);
      const compat = modelos.filter(m => m.tipo === 'NORMAL' && esp >= m.espesorDesde && esp <= (m.espesorHasta ?? Infinity));
      if (compat.length > 1) {
        pushBot('¿Qué modelo de grapa?', compat.map(m => ({ label: m.nombre, valor: String(m.id) })));
        setDatos({ ...d0, conf });
        setPaso('CB_GRAPA_MODELO');
        return;
      }
      cbAskTacos({ ...d0, conf, grapaId: compat[0]?.id ?? null });
      return;
    }
    cbAskTacos({ ...d0, conf });
  }, [modelosGrapaData, pushBot, cbAskTacos]);

  const cbCalcular = useCallback((d0) => {
    const { ancho, largo, espesor, conf, grapaId, tacos } = d0;
    let candidates = tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(espesor)) < 0.001);
    if ('lonas'   in d0) candidates = d0.lonas   == null ? candidates.filter(t => t.lonas == null)    : candidates.filter(t => String(t.lonas) === String(d0.lonas));
    if ('acabado' in d0) candidates = d0.acabado  == null ? candidates.filter(t => !t.acabado)         : candidates.filter(t => t.acabado === d0.acabado);
    if ('color'   in d0) {
      const hayVariantes = candidates.some(t => t.color != null);
      if (hayVariantes) candidates = d0.color == null ? candidates.filter(t => !t.color) : candidates.filter(t => t.color === d0.color);
    }
    const tarifa = candidates[0];
    if (!tarifa) { pushBot('No encontré tarifa para esa combinación.', [{ label: 'Empezar de nuevo', valor: '__reiniciar' }]); return; }

    const ancM = ancho / 1000, larM = largo / 1000, area = ancM * larM;
    const costeMat = tarifa.precio * area;
    let costeConf = 0;
    if (conf === 'VULCANIZADA') {
      costeConf = costeVulcMetro * ancM;
    } else if (conf === 'GRAPA') {
      const modelos = modelosGrapaData?.modelos ?? [];
      const modelo  = grapaId
        ? modelos.find(m => m.id === parseInt(grapaId, 10))
        : modelos.filter(m => { const e = parseFloat(espesor); return m.tipo === 'NORMAL' && e >= m.espesorDesde && e <= (m.espesorHasta ?? Infinity); })[0];
      costeConf = modelo ? (ancho / 100) * modelo.precioPor100mm : 0;
    }
    const costeTacos      = tacos?.costeTacos ?? 0;
    const precioUnitario  = Math.round((costeMat + costeConf + costeTacos) * 100) / 100;
    const confLabel = { VULCANIZADA: 'Sin Fin', GRAPA: 'Con Grapa', ABIERTA: 'Abierta' }[conf];
    const ac = 'acabado' in d0 ? d0.acabado : (tarifa.acabado ?? null);
    const co = 'color'   in d0 ? d0.color   : (tarifa.color   ?? null);

    const lineas = [
      `📐  ${ancho} × ${largo} mm`,
      `🔧  PVC ${espesor} mm${ac ? ` · ${ac}` : co ? ` · ${co}` : ''}`,
      `⚙️  ${confLabel}`,
      tacos ? `📌  ${tacos.cantidadTacos} tacos ${tacos.tipo === 'RECTO' ? 'rectos' : 'inclinados'} de ${tacos.altura} mm · paso ${tacos.paso} mm` : null,
      '',
      `Material:     ${fmtEur(costeMat)}`,
      costeConf  > 0 ? `Confección:   ${fmtEur(costeConf)}`  : null,
      costeTacos > 0 ? `Tacos:        ${fmtEur(costeTacos)}` : null,
      '──────────────────────────',
      `TOTAL:        ${fmtEur(precioUnitario)}`,
    ].filter(l => l !== null).join('\n');

    pushBot(lineas, [{ label: 'Nuevo cálculo', valor: '__reiniciar' }]);
    setPaso('CB_RESULTADO');
  }, [tarifasPVC, costeVulcMetro, modelosGrapaData, pushBot]);

  const cbAfterTacoLongitud = useCallback((longitud, d0) => {
    const taco = (tacosData ?? []).find(t => t.tipo === d0.tacoTipo && t.altura === d0.tacoAltura);
    const cantidadTacos = Math.floor(d0.largo / d0.tacoPaso);
    const metrosLineales = (longitud / 1000) * cantidadTacos;
    cbCalcular({ ...d0, tacos: { tipo: d0.tacoTipo, altura: d0.tacoAltura, paso: d0.tacoPaso, longitudTaco: longitud, cantidadTacos, metrosLineales, precioMetro: taco?.precioMetro ?? 0, costeTacos: taco ? metrosLineales * taco.precioMetro : 0 } });
  }, [tacosData, cbCalcular]);

  const cbAfterTacoPaso = useCallback((p, d0) => {
    const defaultLong = d0.ancho > 10 ? Math.round(d0.ancho - 10) : d0.ancho;
    pushBot(`Paso: ${p} mm ✓\n\n¿Longitud del taco?\nPor defecto: ${defaultLong} mm (ancho − 10 mm)`,
      [{ label: `${defaultLong} mm (por defecto)`, valor: String(defaultLong) }]);
    setDatos({ ...d0, tacoPaso: p });
    setPaso('CB_TACO_LONGITUD');
  }, [pushBot]);

  const cbAfterTacoAltura = useCallback((altura, d0) => {
    pushBot(`Altura ${altura} mm ✓\n\n¿Cuál es el paso entre tacos en mm?\n(Distancia de taco a taco, ej: 200)`);
    setDatos({ ...d0, tacoAltura: parseInt(altura, 10) });
    setPaso('CB_TACO_PASO');
  }, [pushBot]);

  const cbAfterTacoTipo = useCallback((tipo, d0) => {
    const disponibles = (tacosData ?? []).filter(t => t.tipo === tipo).sort((a, b) => a.altura - b.altura);
    pushBot(`Tacos ${tipo === 'RECTO' ? 'rectos' : 'inclinados'}. ¿Qué altura?`,
      disponibles.map(t => ({ label: `${t.altura} mm`, valor: String(t.altura) })));
    setDatos({ ...d0, tacoTipo: tipo });
    setPaso('CB_TACO_ALTURA');
  }, [tacosData, pushBot]);

  const cbAfterTacosYN = useCallback((resp, d0) => {
    if (resp === 'NO') { cbCalcular({ ...d0, tacos: null }); return; }
    pushBot('¿Qué tipo de tacos?', [
      { label: 'Rectos',     valor: 'RECTO'     },
      { label: 'Inclinados', valor: 'INCLINADO' },
    ]);
    setDatos(d0);
    setPaso('CB_TACO_TIPO');
  }, [cbCalcular, pushBot]);

  const initCrearBanda = useCallback(() => {
    setMensajes([{ role: 'bot', texto: '¡Hola! Vamos a crear una banda PVC paso a paso.\n¿Cuáles son las medidas? Ancho × largo en mm.\nEj: 600×4500', chips: null }]);
    setPaso('CB_DIMS');
    setDatos({});
    setInput('');
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE: buscar_banda (BB_*)
  // ═══════════════════════════════════════════════════════════════════════════

  const bbCargarBandasCliente = useCallback(async (cId, cNombre) => {
    setCargando(true);
    try {
      const res  = await fetch(`/api/bandas-historial?clienteId=${cId}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        pushBot(`No encontré bandas para ${cNombre}.`, [{ label: '🔄 Nueva búsqueda', valor: '__reiniciar' }]);
      } else {
        pushBot(`${data.length} banda${data.length !== 1 ? 's' : ''} de ${cNombre}:`, [], { bandas: data });
      }
    } catch {
      pushBot('Error al cargar bandas.', [{ label: '🔄 Nueva búsqueda', valor: '__reiniciar' }]);
    } finally {
      setCargando(false);
      setPaso('BB_RESULTADOS');
    }
  }, [pushBot]);

  const bbBuscarClientes = useCallback(async (nombre) => {
    setCargando(true);
    try {
      const res     = await fetch(`/api/bandas-historial?modo=clientes&clienteNombre=${encodeURIComponent(nombre)}`);
      const clientes = await res.json();
      if (!Array.isArray(clientes) || clientes.length === 0) {
        pushBot(`No encontré clientes con bandas para "${nombre}".`, [{ label: '🔄 Nueva búsqueda', valor: '__reiniciar' }]);
        setPaso('BB_RESULTADOS');
      } else if (clientes.length === 1) {
        pushBot(`Cargando bandas de ${clientes[0].nombre}…`);
        await bbCargarBandasCliente(clientes[0].id, clientes[0].nombre);
      } else {
        pushBot(`${clientes.length} clientes encontrados. ¿De cuál?`, [], { clientes });
        setPaso('BB_SELECCIONAR_CLIENTE');
      }
    } catch {
      pushBot('Error al buscar clientes.', [{ label: '🔄 Nueva búsqueda', valor: '__reiniciar' }]);
      setPaso('BB_RESULTADOS');
    } finally {
      setCargando(false);
    }
  }, [pushBot, bbCargarBandasCliente]);

  const bbBuscarPorDims = useCallback(async (ancho, largo) => {
    setCargando(true);
    try {
      const res  = await fetch(`/api/bandas-historial?ancho=${ancho}&largo=${largo}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        pushBot(`No encontré bandas de ${ancho}×${largo} mm.`, [{ label: '🔄 Nueva búsqueda', valor: '__reiniciar' }]);
      } else {
        pushBot(`${data.length} banda${data.length !== 1 ? 's' : ''} de ${ancho}×${largo} mm:`, [], { bandas: data });
      }
    } catch {
      pushBot('Error al buscar.', [{ label: '🔄 Nueva búsqueda', valor: '__reiniciar' }]);
    } finally {
      setCargando(false);
      setPaso('BB_RESULTADOS');
    }
  }, [pushBot]);

  const initBuscarBanda = useCallback(() => {
    setMensajes([{ role: 'bot', texto: '¿Qué bandas buscas?', chips: [
      { label: '👤 Por cliente', valor: 'BB_POR_CLIENTE' },
      { label: '📐 Por medidas', valor: 'BB_POR_DIMS'    },
    ] }]);
    setPaso('BB_INICIO');
    setDatos({});
    setInput('');
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE: calcular_metraje (CM_*)
  // ═══════════════════════════════════════════════════════════════════════════

  const cmMaterialesDisp = useMemo(() => {
    const set = new Set(tarifasCaucho.map(t => t.material));
    return MATERIALES_CAUCHO.filter(m => set.has(m));
  }, [tarifasCaucho]);

  const cmCalcular = useCallback((d0) => {
    const { material, espesor, lonas, acabado, ancho, largo, cantidad, tipoPieza } = d0;
    let cands = tarifasCaucho.filter(t => t.material === material);
    cands = cands.filter(t => Math.abs(Number(t.espesor) - parseFloat(espesor)) < 0.001);
    if ('lonas'   in d0) cands = lonas   == null ? cands.filter(t => t.lonas == null)  : cands.filter(t => String(t.lonas) === String(lonas));
    if ('acabado' in d0) cands = acabado == null ? cands.filter(t => !t.acabado)        : cands.filter(t => t.acabado === acabado);
    const tarifa = cands[0];
    if (!tarifa) { pushBot('No encontré tarifa para esa combinación.', [{ label: 'Empezar de nuevo', valor: '__reiniciar' }]); return; }

    const ancM = ancho / 1000, larM = largo / 1000, area = ancM * larM;
    const precioUnitario = Math.round(tarifa.precio * area * 100) / 100;
    const precioTotal    = Math.round(precioUnitario * cantidad * 100) / 100;
    const pesoTotal      = Math.round((tarifa.peso ?? 0) * area * cantidad * 1000) / 1000;

    const lineas = [
      tipoPieza === 'TIRAS' ? `📐  ${cantidad} tiras de ${ancho} × ${largo} mm` : `📐  ${ancho} × ${largo} mm`,
      `🔧  ${material} ${parseFloat(espesor)} mm${lonas ? ` · ${lonas} lonas` : ''}${acabado ? ` · ${acabado}` : ''}`,
      '',
      `Tarifa:     ${tarifa.precio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/m²`,
      `Superficie: ${area.toLocaleString('es-ES', { minimumFractionDigits: 4 })} m²`,
      tipoPieza === 'TIRAS' ? `Precio/tira: ${fmtEur(precioUnitario)}` : null,
      '──────────────────────────',
      `TOTAL:      ${fmtEur(precioTotal)}`,
      pesoTotal > 0 ? `Peso:       ${pesoTotal.toLocaleString('es-ES', { minimumFractionDigits: 3 })} kg` : null,
    ].filter(l => l !== null).join('\n');

    pushBot(lineas, [{ label: 'Nuevo cálculo', valor: '__reiniciar' }]);
    setPaso('CM_RESULTADO');
  }, [tarifasCaucho, pushBot]);

  const cmAfterDims = useCallback((dims, d0) => {
    if (d0.tipoPieza === 'TIRAS') {
      pushBot(`Tiras de ${dims.ancho} × ${dims.largo} mm ✓\n\n¿Cuántas tiras?`);
      setDatos({ ...d0, ...dims });
      setPaso('CM_CANTIDAD');
    } else {
      cmCalcular({ ...d0, ...dims, cantidad: 1 });
    }
  }, [cmCalcular, pushBot]);

  const cmAfterTipoPieza = useCallback((tipo, d0) => {
    pushBot(tipo === 'TIRAS' ? 'Ancho × largo de cada tira, en mm.\nEj: 250×1200' : '¿Cuáles son las dimensiones?\nAncho × largo en mm.\nEj: 500×1200');
    setDatos({ ...d0, tipoPieza: tipo });
    setPaso('CM_DIMS');
  }, [pushBot]);

  const cmAfterLonas = useCallback((lonas, d0, tarsEsp) => {
    const tarsL = lonas == null ? tarsEsp.filter(t => t.lonas == null) : tarsEsp.filter(t => String(t.lonas) === lonas);
    const aOpts = [...new Set(tarsL.map(t => t.acabado == null ? '__null' : t.acabado))];
    if (aOpts.length > 1) {
      pushBot('¿Qué acabado?', aOpts.map(a => ({ label: a === '__null' ? 'Sin acabado especial' : a, valor: a })));
      setDatos({ ...d0, lonas });
      setPaso('CM_ACABADO');
      return;
    }
    const ac = aOpts[0] === '__null' ? null : aOpts[0];
    pushBot('¿Cómo va la pieza?', [{ label: 'Pieza completa', valor: 'PIEZA' }, { label: 'Tiras', valor: 'TIRAS' }]);
    setDatos({ ...d0, lonas, acabado: ac });
    setPaso('CM_TIPO_PIEZA');
  }, [pushBot]);

  const cmAfterEspesor = useCallback((espesor, d0) => {
    const tarsEsp = tarifasCaucho.filter(t => t.material === d0.material && Math.abs(Number(t.espesor) - parseFloat(espesor)) < 0.001);
    const lOpts   = [...new Set(tarsEsp.map(t => t.lonas == null ? '__null' : String(t.lonas)))];
    if (lOpts.length > 1) {
      const chips = lOpts.sort((a, b) => a === '__null' ? -1 : b === '__null' ? 1 : Number(a) - Number(b))
        .map(l => ({ label: l === '__null' ? 'Estándar' : `${l} lonas`, valor: l }));
      pushBot('¿Cuántas lonas?', chips);
      setDatos({ ...d0, espesor });
      setPaso('CM_LONAS');
      return;
    }
    cmAfterLonas(lOpts[0] === '__null' ? null : lOpts[0], { ...d0, espesor }, tarsEsp);
  }, [tarifasCaucho, pushBot, cmAfterLonas]);

  const cmAfterMaterial = useCallback((material) => {
    const tarsM = tarifasCaucho.filter(t => t.material === material);
    const espesores = [...new Set(tarsM.map(t => String(t.espesor)))].sort((a, b) => parseFloat(a) - parseFloat(b));
    const chips = espesores.map(esp => {
      const lonas = [...new Set(tarsM.filter(t => Math.abs(Number(t.espesor) - parseFloat(esp)) < 0.001).map(t => t.lonas).filter(Boolean))].sort();
      return { label: `${parseFloat(esp)} mm${lonas.length ? ` (${lonas.join('/')}L)` : ''}`, valor: esp };
    });
    pushBot(`Material: ${material} ✓\n\n¿Qué espesor?`, chips);
    setDatos({ material });
    setPaso('CM_ESPESOR');
  }, [tarifasCaucho, pushBot]);

  const initCalcularMetraje = useCallback(() => {
    const chips = cmMaterialesDisp.map(m => ({ label: m, valor: m }));
    setMensajes([{ role: 'bot', texto: '¡Hola! Vamos a añadir un metraje de caucho.\n¿Qué material necesitas?', chips }]);
    setPaso('CM_MATERIAL');
    setDatos({});
    setInput('');
  }, [cmMaterialesDisp]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE: precio_material (PM_*)
  // ═══════════════════════════════════════════════════════════════════════════

  const pmAfterEspesor = useCallback((espesorStr, d0) => {
    const espesor = parseFloat(espesorStr);
    const cands = (todasTarifas ?? []).filter(t =>
      t.material === d0.material && Math.abs(Number(t.espesor) - espesor) < 0.001);

    if (cands.length === 0) {
      pushBot('No encontré tarifa para ese espesor.', [{ label: 'Volver al inicio', valor: '__reiniciar' }]);
      return;
    }
    if (cands.length === 1) {
      pushBot(`${d0.material} ${espesor}mm`, [{ label: 'Consultar otro material', valor: '__reiniciar' }], { tarifa: cands[0] });
      setPaso('PM_RESULTADO');
      return;
    }
    // Múltiples variantes (color/acabado) — mostrar la primera como resumen y los chips
    pushBot(
      `${cands.length} variantes de ${d0.material} ${espesor}mm:`,
      cands.map(t => ({
        label: [t.acabado, t.color, t.lonas ? `${t.lonas}L` : null].filter(Boolean).join(' · ') || 'Estándar',
        valor: String(cands.indexOf(t)),
        _tarifa: t,
      })),
    );
    setDatos({ ...d0, espesor, _cands: cands });
    setPaso('PM_VARIANTE');
  }, [todasTarifas, pushBot]);

  const pmAfterMaterial = useCallback((material) => {
    const cands = (todasTarifas ?? []).filter(t => t.material === material);
    const espesores = [...new Set(cands.map(t => String(t.espesor)))].sort((a, b) => parseFloat(a) - parseFloat(b));
    pushBot(`Material: ${material} ✓\n\n¿Qué espesor?`,
      espesores.map(e => ({ label: `${parseFloat(e)} mm`, valor: e })));
    setDatos({ material });
    setPaso('PM_ESPESOR');
  }, [todasTarifas, pushBot]);

  const initPrecioMaterial = useCallback(() => {
    const materiales = [...new Set((todasTarifas ?? []).map(t => t.material))].sort();
    const chips = materiales.map(m => ({ label: m, valor: m }));
    setMensajes([{ role: 'bot', texto: '¿Qué material quieres consultar?', chips: chips.length ? chips : null }]);
    setPaso('PM_MATERIAL');
    setDatos({});
    setInput('');
  }, [todasTarifas]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPATCHER
  // ═══════════════════════════════════════════════════════════════════════════

  const iniciarModo = useCallback((id) => {
    setModo(id);
    setInputErr('');
    switch (id) {
      case 'crear_banda':      initCrearBanda();      break;
      case 'buscar_banda':     initBuscarBanda();     break;
      case 'calcular_metraje': initCalcularMetraje(); break;
      case 'precio_material':  initPrecioMaterial();  break;
    }
  }, [initCrearBanda, initBuscarBanda, initCalcularMetraje, initPrecioMaterial]);

  const procesarChip = useCallback((valor, chip, currentPaso, d) => {
    if (valor === '__reiniciar') { iniciarModo(modo); return; }

    if (currentPaso.startsWith('CB_')) {
      switch (currentPaso) {
        case 'CB_ESPESOR':      cbAfterEspesor(valor, d); break;
        case 'CB_LONAS':        cbAfterLonas(valor === '__null' ? null : valor, d, tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(d.espesor)) < 0.001)); break;
        case 'CB_ACABADO':      cbAfterAcabado(valor === '__null' ? null : valor, d, tarifasPVC.filter(t => { if (Math.abs(Number(t.espesor) - Number(d.espesor)) >= 0.001) return false; return d.lonas == null ? t.lonas == null : String(t.lonas) === d.lonas; })); break;
        case 'CB_COLOR':        cbAskConf({ ...d, color: valor === '__null' ? null : valor }); break;
        case 'CB_CONF':         cbAfterConf(valor, d); break;
        case 'CB_GRAPA_MODELO': cbAskTacos({ ...d, grapaId: parseInt(valor, 10) }); break;
        case 'CB_TACOS_YN':     cbAfterTacosYN(valor, d); break;
        case 'CB_TACO_TIPO':    cbAfterTacoTipo(valor, d); break;
        case 'CB_TACO_ALTURA':  cbAfterTacoAltura(valor, d); break;
        case 'CB_TACO_LONGITUD': cbAfterTacoLongitud(parseFloat(valor), d); break;
        default: break;
      }
      return;
    }

    if (currentPaso.startsWith('BB_')) {
      switch (valor) {
        case 'BB_POR_CLIENTE':
          addUser_('Por cliente');
          pushBot('¿Qué cliente buscas? Escribe el nombre o parte de él.');
          setPaso('BB_BUSCANDO_CLIENTE');
          setInput('');
          break;
        case 'BB_POR_DIMS':
          addUser_('Por medidas');
          pushBot('¿Qué medidas? Escríbelas como ancho×largo en mm (ej: 750×6850)');
          setPaso('BB_BUSCANDO_DIMS');
          setInput('');
          break;
        default: break;
      }
      // Cliente seleccionado de lista
      if (chip?._cliente) {
        pushBot(`Cargando bandas de ${chip._cliente.nombre}…`);
        bbCargarBandasCliente(chip._cliente.id, chip._cliente.nombre);
      }
      return;
    }

    if (currentPaso.startsWith('CM_')) {
      switch (currentPaso) {
        case 'CM_MATERIAL':   cmAfterMaterial(valor); break;
        case 'CM_ESPESOR':    cmAfterEspesor(valor, d); break;
        case 'CM_LONAS':      cmAfterLonas(valor === '__null' ? null : valor, d,
                                tarifasCaucho.filter(t => t.material === d.material && Math.abs(Number(t.espesor) - parseFloat(d.espesor)) < 0.001)); break;
        case 'CM_ACABADO': {
                                const tarsL = tarifasCaucho.filter(t => t.material === d.material && Math.abs(Number(t.espesor) - parseFloat(d.espesor)) < 0.001 && (d.lonas == null ? t.lonas == null : String(t.lonas) === d.lonas));
                                pushBot('¿Cómo va la pieza?', [{ label: 'Pieza completa', valor: 'PIEZA' }, { label: 'Tiras', valor: 'TIRAS' }]);
                                setDatos({ ...d, acabado: valor === '__null' ? null : valor });
                                setPaso('CM_TIPO_PIEZA');
                                break; }
        case 'CM_TIPO_PIEZA': cmAfterTipoPieza(valor, d); break;
        default: break;
      }
      return;
    }

    if (currentPaso.startsWith('PM_')) {
      switch (currentPaso) {
        case 'PM_MATERIAL': pmAfterMaterial(valor); break;
        case 'PM_ESPESOR':  pmAfterEspesor(valor, d); break;
        case 'PM_VARIANTE':
          if (chip?._tarifa) {
            pushBot('', [{ label: 'Consultar otro material', valor: '__reiniciar' }], { tarifa: chip._tarifa });
            setPaso('PM_RESULTADO');
          }
          break;
        default: break;
      }
    }
  }, [modo, iniciarModo, tarifasPVC, tarifasCaucho, cbAfterEspesor, cbAfterLonas, cbAfterAcabado, cbAskConf, cbAfterConf, cbAskTacos, cbAfterTacosYN, cbAfterTacoTipo, cbAfterTacoAltura, cbAfterTacoLongitud, cmAfterMaterial, cmAfterEspesor, cmAfterLonas, cmAfterTipoPieza, pmAfterMaterial, pmAfterEspesor, bbCargarBandasCliente, pushBot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper para pushUser desde procesarChip (avoids stale closure)
  const addUser_ = (texto) => setMensajes(prev => [...prev, { role: 'user', texto }]);

  const procesarTexto = useCallback((txt, currentPaso, d) => {
    if (currentPaso === 'CB_DIMS') {
      const dims = parseDims(txt);
      if (!dims) { pushBot('No entendí las medidas. Prueba: 600×4500'); return; }
      cbAskEspesor(dims, d);
    } else if (currentPaso === 'CB_TACO_PASO') {
      const n = parsePositive(txt);
      if (!n) { pushBot('Escribe el paso en mm, ej: 200'); return; }
      cbAfterTacoPaso(n, d);
    } else if (currentPaso === 'CB_TACO_LONGITUD') {
      const n = parsePositive(txt);
      if (!n) { pushBot('Escribe la longitud en mm'); return; }
      cbAfterTacoLongitud(n, d);
    } else if (currentPaso === 'BB_BUSCANDO_CLIENTE') {
      setPaso('BB_CARGANDO');
      pushBot(`Buscando clientes que coincidan con "${txt}"…`);
      bbBuscarClientes(txt);
    } else if (currentPaso === 'BB_BUSCANDO_DIMS') {
      const dims = parseDimsEstricto(txt);
      if (!dims) { setInputErr('Formato no reconocido. Prueba: 750×6850 o 750x6850'); return; }
      setInputErr('');
      pushBot(`Buscando bandas de ${dims.ancho}×${dims.largo} mm…`);
      setPaso('BB_CARGANDO');
      bbBuscarPorDims(dims.ancho, dims.largo);
    } else if (currentPaso === 'CM_DIMS') {
      const dims = parseDims(txt);
      if (!dims) { pushBot('No entendí las medidas. Prueba: 500×1200'); return; }
      cmAfterDims(dims, d);
    } else if (currentPaso === 'CM_CANTIDAD') {
      const n = parseInt(txt, 10);
      if (!n || n <= 0) { pushBot('Escribe el número de tiras, ej: 10'); return; }
      cmCalcular({ ...d, cantidad: n });
    } else {
      pushBot('Usa los botones de arriba para elegir.');
    }
  }, [pushBot, cbAskEspesor, cbAfterTacoPaso, cbAfterTacoLongitud, bbBuscarClientes, bbBuscarPorDims, cmAfterDims, cmCalcular]);

  const handleChip = useCallback((chip) => {
    if (!chip.valor && !chip.action) return;
    const v = chip.valor ?? chip.action;
    if (v !== '__reiniciar' && v !== '__copiar') pushUser(chip.label);
    procesarChip(v, chip, paso, datos);
  }, [pushUser, procesarChip, paso, datos]);

  const handleSeleccionarCliente = useCallback((cliente) => {
    pushUser(cliente.nombre);
    pushBot(`Cargando ${cliente.count} banda${cliente.count !== 1 ? 's' : ''} de ${cliente.nombre}…`);
    setPaso('BB_CARGANDO');
    bbCargarBandasCliente(cliente.id, cliente.nombre);
  }, [pushUser, pushBot, bbCargarBandasCliente]);

  const handleEnviar = useCallback(() => {
    const txt = input.trim();
    if (!txt) return;
    pushUser(txt);
    setInput('');
    setInputErr('');
    procesarTexto(txt, paso, datos);
  }, [input, pushUser, procesarTexto, paso, datos]);

  const INPUT_PASOS = {
    CB_DIMS: 'Ej: 600×4500',
    CB_TACO_PASO: 'Paso en mm, ej: 200',
    CB_TACO_LONGITUD: 'Longitud en mm',
    BB_BUSCANDO_CLIENTE: 'Nombre del cliente…',
    BB_BUSCANDO_DIMS: 'Ej: 750×6850',
    CM_DIMS: 'Ej: 500×1200',
    CM_CANTIDAD: 'Número de tiras',
  };
  const inputActivo   = paso in INPUT_PASOS;
  const inputPlaceholder = INPUT_PASOS[paso] ?? 'Usa los botones de arriba';

  // Focus cuando el paso cambia y el input es necesario
  useEffect(() => {
    if (inputActivo) setTimeout(() => inputRef.current?.focus(), 60);
  }, [paso, inputActivo]);

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-0">

      {/* Selector de modos — dos columnas */}
      <div className="flex gap-2 pb-3 border-b border-base-200 shrink-0">
        {/* Izquierda: 3 botones */}
        <div className="flex flex-col gap-1.5 flex-1">
          {MODOS_IZQ.map(m => (
            <button key={m.id} onClick={() => iniciarModo(m.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-left transition-colors border ${
                modo === m.id
                  ? 'bg-primary text-primary-content border-primary'
                  : 'bg-primary/5 hover:bg-primary/10 border-primary/20 text-base-content'
              }`}
            >
              <m.icon className="w-3.5 h-3.5 shrink-0" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Derecha: 1 botón grande */}
        <div className="flex-1">
          <button onClick={() => iniciarModo(MODO_DER.id)}
            className={`w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-medium transition-colors border ${
              modo === MODO_DER.id
                ? 'bg-secondary text-secondary-content border-secondary'
                : 'bg-secondary/5 hover:bg-secondary/10 border-secondary/20 text-base-content'
            }`}
          >
            <MODO_DER.icon className="w-5 h-5" />
            {MODO_DER.label}
          </button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2">
        {modo === null ? (
          <p className="text-sm text-base-content/40 text-center mt-10">
            Selecciona una opción arriba para empezar
          </p>
        ) : (
          mensajes.map((m, i) => {
            const isBot       = m.role === 'bot';
            const esUltimoBot = isBot && i === mensajes.map(x => x.role).lastIndexOf('bot');
            return (
              <div key={i} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[92%]">
                  {m.texto && (
                    <div className={`rounded-2xl px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      isBot
                        ? 'bg-base-200 text-base-content rounded-bl-none'
                        : 'bg-primary text-primary-content rounded-br-none'
                    }`}>
                      {m.texto}
                    </div>
                  )}

                  {/* Tarifa card (precio_material) */}
                  {isBot && m.tarifa && <PrecioCard tarifa={m.tarifa} />}

                  {/* Banda cards (buscar_banda) */}
                  {isBot && m.bandas?.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      {m.bandas.map((banda, j) => <BandaCard key={j} banda={banda} />)}
                    </div>
                  )}

                  {/* Lista de clientes (buscar_banda) */}
                  {isBot && m.clientes?.length > 0 && paso === 'BB_SELECCIONAR_CLIENTE' && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {m.clientes.map(cli => (
                        <button key={cli.id} onClick={() => handleSeleccionarCliente(cli)}
                          className="btn btn-sm btn-ghost justify-between border border-base-300 hover:border-secondary hover:text-secondary">
                          <span>{cli.nombre}</span>
                          <span className="badge badge-ghost badge-sm">{cli.count} banda{cli.count !== 1 ? 's' : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chips de selección */}
                  {isBot && esUltimoBot && m.chips?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {m.chips.map((chip, j) => (
                        <button key={j} onClick={() => handleChip(chip)}
                          className={`btn btn-xs btn-ghost border ${
                            chip.valor === '__reiniciar'
                              ? 'border-base-300 text-base-content/50'
                              : 'border-base-300 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {cargando && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-2xl rounded-bl-none px-4 py-3">
              <span className="loading loading-dots loading-xs" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      {modo && (
        <div className="pt-2 border-t border-base-200 shrink-0">
          {inputErr && <p className="text-xs text-error mb-1.5 px-1">{inputErr}</p>}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setInputErr(''); }}
              onKeyDown={e => e.key === 'Enter' && inputActivo && handleEnviar()}
              placeholder={inputPlaceholder}
              disabled={!inputActivo}
              className="input input-bordered input-sm flex-1 text-sm"
            />
            <button onClick={handleEnviar} disabled={!inputActivo || !input.trim()}
              className="btn btn-sm btn-primary btn-square">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
