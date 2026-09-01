'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { X, Zap, Send } from 'lucide-react';

const COLOR_ABR = { AZUL: 'AZ', BLANCO: 'BL', NEGRO: 'NG', VERDE: 'VD' };

function fmtEur(v) {
  return (typeof v === 'number' ? v : 0).toLocaleString('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  });
}

function parseDims(text) {
  const s = text.trim()
    .replace(/,/g, '.')
    .replace(/por/gi, 'x')
    .replace(/[×*·]/g, 'x')
    .replace(/\s+/g, 'x');
  const m = s.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const ancho = parseFloat(m[1]);
  const largo = parseFloat(m[2]);
  return ancho > 0 && largo > 0 ? { ancho, largo } : null;
}

function parsePositive(text) {
  const n = parseFloat(String(text).replace(',', '.'));
  return n > 0 ? n : null;
}

const PASOS_TEXTO = {
  DIMS: 'Ej: 600×4500',
  TACO_PASO: 'Paso en mm, ej: 200',
  TACO_LONGITUD: 'Longitud en mm',
};

export default function ModalCrearBandaChat({ isOpen, onClose, onAddItem }) {
  const [mensajes, setMensajes] = useState([]);
  const [paso, setPaso] = useState('DIMS');
  const [datos, setDatos] = useState({});
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const { data: tarifas } = useSWR('/api/precios');
  const { data: modelosGrapaData } = useSWR('/api/modelos-grapa');
  const { data: tacosData } = useSWR('/api/tacos');
  const { data: config } = useSWR('/api/config');

  const costeVulcanizadoMetro = config?.costeVulcanizadoMetro ?? 0;

  const tarifasPVC = useMemo(() => (tarifas ?? []).filter(t => t.material === 'PVC'), [tarifas]);

  const espesoresDisp = useMemo(() => {
    const set = [...new Set(tarifasPVC.map(t => String(t.espesor)))];
    return set.sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifasPVC]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const pushBot = (texto, chips = null) =>
    setMensajes(prev => [...prev, { role: 'bot', texto, chips }]);

  const pushUser = (texto) =>
    setMensajes(prev => [...prev, { role: 'user', texto }]);

  const reiniciar = () => {
    setMensajes([{
      role: 'bot',
      texto: '¡Vamos de nuevo! ¿Cuáles son las medidas? Ancho × largo en mm.\nEj: 600×4500',
      chips: null,
    }]);
    setPaso('DIMS');
    setDatos({});
    setInput('');
  };

  // ── mount / reset ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    setMensajes([{
      role: 'bot',
      texto: '¡Hola! Vamos a crear una banda PVC paso a paso.\n¿Cuáles son las medidas? Ancho × largo en mm.\nEj: 600×4500',
      chips: null,
    }]);
    setPaso('DIMS');
    setDatos({});
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // ── step chain ─────────────────────────────────────────────────────────────

  const askEspesor = (dims) => {
    const d = { ...datos, ...dims };
    setDatos(d);

    const chips = espesoresDisp.map(esp => {
      const vars = tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(esp)) < 0.001);
      const acabados = [...new Set(vars.map(t => t.acabado).filter(Boolean))];
      const colores  = [...new Set(vars.map(t => t.color).filter(Boolean))];
      let nota = '';
      if (acabados.length) nota = ` — ${acabados.join(', ')}`;
      else if (colores.length) nota = ` — ${colores.join(', ')}`;
      return { label: `${esp} mm${nota}`, valor: esp };
    });

    pushBot(`Medidas: ${dims.ancho} × ${dims.largo} mm ✓\n\n¿Qué espesor de PVC necesitas?`, chips);
    setPaso('ESPESOR');
  };

  const afterEspesor = (espesor, d0) => {
    const tarsEsp = tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(espesor)) < 0.001);
    const lOpts = [...new Set(tarsEsp.map(t => t.lonas == null ? '__null' : String(t.lonas)))];

    if (lOpts.length > 1) {
      const chips = lOpts.map(l => ({ label: l === '__null' ? 'Estándar' : `${l} lonas`, valor: l }));
      pushBot('¿Cuántas lonas?', chips);
      setDatos({ ...d0, espesor });
      setPaso('LONAS');
      return;
    }
    afterLonas(lOpts[0] === '__null' ? null : lOpts[0], { ...d0, espesor }, tarsEsp);
  };

  const afterLonas = (lonas, d0, tarsEsp0) => {
    const tarsL = lonas == null
      ? tarsEsp0.filter(t => t.lonas == null)
      : tarsEsp0.filter(t => String(t.lonas) === lonas);
    const aOpts = [...new Set(tarsL.map(t => t.acabado == null ? '__null' : t.acabado))];

    if (aOpts.length > 1) {
      const chips = aOpts.map(a => ({ label: a === '__null' ? 'Sin acabado especial' : a, valor: a }));
      pushBot('¿Qué acabado?', chips);
      setDatos({ ...d0, lonas });
      setPaso('ACABADO');
      return;
    }
    afterAcabado(aOpts[0] === '__null' ? null : aOpts[0], { ...d0, lonas }, tarsL);
  };

  const afterAcabado = (acabado, d0, tarsL0) => {
    const tarsA = acabado == null
      ? tarsL0.filter(t => !t.acabado)
      : tarsL0.filter(t => t.acabado === acabado);
    const cOpts = [...new Set(tarsA.map(t => t.color == null ? '__null' : t.color))];

    if (cOpts.length > 1) {
      const chips = cOpts.map(c => ({ label: c === '__null' ? 'Sin color específico' : c, valor: c }));
      pushBot('¿Qué color?', chips);
      setDatos({ ...d0, acabado });
      setPaso('COLOR');
      return;
    }

    // Para 2 mm y 3 mm siempre preguntar color aunque en BD solo haya una entrada genérica
    const espNum = parseFloat(d0.espesor ?? 0);
    if (espNum === 2 || espNum === 3) {
      pushBot('¿De qué color es la banda?', [
        { label: 'Blanco', valor: 'BLANCO' },
        { label: 'Verde', valor: 'VERDE' },
        { label: 'Azul', valor: 'AZUL' },
      ]);
      setDatos({ ...d0, acabado });
      setPaso('COLOR');
      return;
    }

    askConf({ ...d0, acabado, color: cOpts[0] === '__null' ? null : cOpts[0] });
  };

  const askConf = (d0) => {
    setDatos(d0);
    pushBot('¿Cómo va la banda?', [
      { label: 'Sin Fin (Vulcanizada)', valor: 'VULCANIZADA' },
      { label: 'Con Grapa', valor: 'GRAPA' },
      { label: 'Abierta', valor: 'ABIERTA' },
    ]);
    setPaso('CONF');
  };

  const afterConf = (conf, d0) => {
    if (conf === 'GRAPA') {
      const modelos = modelosGrapaData?.modelos ?? [];
      const esp = parseFloat(d0.espesor);
      const compat = modelos.filter(m =>
        m.tipo === 'NORMAL' && esp >= m.espesorDesde && esp <= (m.espesorHasta ?? Infinity)
      );
      if (compat.length > 1) {
        const chips = compat.map(m => ({ label: m.nombre, valor: String(m.id) }));
        pushBot('¿Qué modelo de grapa?', chips);
        setDatos({ ...d0, conf });
        setPaso('GRAPA_MODELO');
        return;
      }
      askTacos({ ...d0, conf, grapaId: compat[0]?.id ?? null });
      return;
    }
    askTacos({ ...d0, conf });
  };

  const askTacos = (d0) => {
    setDatos(d0);
    pushBot('¿La banda llevará tacos?', [
      { label: 'No, sin tacos', valor: 'NO' },
      { label: 'Sí, con tacos', valor: 'SI' },
    ]);
    setPaso('TACOS_YN');
  };

  const afterTacosYN = (resp, d0) => {
    if (resp === 'NO') { calcular({ ...d0, tacos: null }); return; }
    pushBot('¿Qué tipo de tacos?', [
      { label: 'Rectos', valor: 'RECTO' },
      { label: 'Inclinados', valor: 'INCLINADO' },
    ]);
    setDatos(d0);
    setPaso('TACO_TIPO');
  };

  const afterTacoTipo = (tipo, d0) => {
    const disponibles = (tacosData ?? []).filter(t => t.tipo === tipo).sort((a, b) => a.altura - b.altura);
    const chips = disponibles.map(t => ({ label: `${t.altura} mm`, valor: String(t.altura) }));
    pushBot(`Tacos ${tipo === 'RECTO' ? 'rectos' : 'inclinados'}. ¿Qué altura?`, chips);
    setDatos({ ...d0, tacoTipo: tipo });
    setPaso('TACO_ALTURA');
  };

  const afterTacoAltura = (altura, d0) => {
    pushBot(`Altura ${altura} mm ✓\n\n¿Cuál es el paso entre tacos en mm?\n(Distancia de taco a taco, ej: 200)`);
    setDatos({ ...d0, tacoAltura: parseInt(altura, 10) });
    setPaso('TACO_PASO');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const afterTacoPaso = (paso, d0) => {
    const defaultLong = d0.ancho > 10 ? Math.round(d0.ancho - 10) : d0.ancho;
    pushBot(
      `Paso: ${paso} mm ✓\n\n¿Longitud del taco?\nPor defecto: ${defaultLong} mm (ancho − 10 mm)`,
      [{ label: `${defaultLong} mm (por defecto)`, valor: String(defaultLong) }],
    );
    setDatos({ ...d0, tacoPaso: paso });
    setPaso('TACO_LONGITUD');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const afterTacoLongitud = (longitud, d0) => {
    const taco = (tacosData ?? []).find(
      t => t.tipo === d0.tacoTipo && t.altura === d0.tacoAltura
    );
    const cantidadTacos = Math.floor(d0.largo / d0.tacoPaso);
    const metrosLineales = (longitud / 1000) * cantidadTacos;
    const costeTacos = taco ? metrosLineales * taco.precioMetro : 0;

    calcular({
      ...d0,
      tacos: {
        tipo: d0.tacoTipo,
        altura: d0.tacoAltura,
        paso: d0.tacoPaso,
        longitudTaco: longitud,
        cantidadTacos,
        metrosLineales,
        precioMetro: taco?.precioMetro ?? 0,
        costeTacos,
      },
    });
  };

  // ── calculation ────────────────────────────────────────────────────────────

  const calcular = (d0) => {
    const { ancho, largo, espesor, conf, grapaId, tacos } = d0;

    let candidates = tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(espesor)) < 0.001);

    // Filtros: 'key' in d0 distingue "el usuario eligió null" de "paso no visitado"
    if ('lonas' in d0) {
      candidates = d0.lonas == null
        ? candidates.filter(t => t.lonas == null)
        : candidates.filter(t => String(t.lonas) === String(d0.lonas));
    }
    if ('acabado' in d0) {
      candidates = d0.acabado == null
        ? candidates.filter(t => !t.acabado)
        : candidates.filter(t => t.acabado === d0.acabado);
    }
    if ('color' in d0) {
      // Solo filtra por color si la BD tiene variantes reales de color;
      // si todas las entradas tienen color null, el color es cosmético (2/3mm)
      const hayVariantesColor = candidates.some(t => t.color != null);
      if (hayVariantesColor) {
        candidates = d0.color == null
          ? candidates.filter(t => !t.color)
          : candidates.filter(t => t.color === d0.color);
      }
    }

    const tarifa = candidates[0];

    if (!tarifa) {
      pushBot('No encontré tarifa para esa combinación.', [
        { label: 'Empezar de nuevo', valor: '__reiniciar' },
      ]);
      return;
    }

    const ancM = ancho / 1000;
    const larM = largo / 1000;
    const area  = ancM * larM;
    const costeMat = tarifa.precio * area;

    let costeConf = 0;
    if (conf === 'VULCANIZADA') {
      costeConf = costeVulcanizadoMetro * ancM;
    } else if (conf === 'GRAPA') {
      const modelos = modelosGrapaData?.modelos ?? [];
      const modelo = grapaId
        ? modelos.find(m => m.id === parseInt(grapaId, 10))
        : modelos.filter(m => {
            const esp = parseFloat(espesor);
            return m.tipo === 'NORMAL' && esp >= m.espesorDesde && esp <= (m.espesorHasta ?? Infinity);
          })[0];
      costeConf = modelo ? (ancho / 100) * modelo.precioPor100mm : 0;
    }

    const costeTacos = tacos?.costeTacos ?? 0;
    const precioUnitario = Math.round((costeMat + costeConf + costeTacos) * 100) / 100;
    const pesoUnitario   = (tarifa.peso ?? 0) * area;

    // Nomenclatura — si el paso fue visitado usar lo que eligió el usuario,
    // si no (solo había una opción) usar el valor de la tarifa
    const confCode = conf === 'VULCANIZADA' ? 'SF' : conf === 'GRAPA' ? 'GR' : 'AB';
    const ac = 'acabado' in d0 ? d0.acabado : (tarifa.acabado ?? null);
    const co = 'color'   in d0 ? d0.color   : (tarifa.color   ?? null);
    const variant = ac ? `-${ac}` : co ? `-${COLOR_ABR[co] ?? co.slice(0, 2)}` : '';
    let descripcion = `PVC-${espesor}mm-${confCode}${variant}-${ancho}x${largo}`;
    if (tacos) descripcion += `-T${tacos.tipo === 'RECTO' ? 'R' : 'I'}${tacos.altura}`;

    const confLabel = { VULCANIZADA: 'Sin Fin', GRAPA: 'Con Grapa', ABIERTA: 'Abierta' }[conf];
    const lineas = [
      `📐  ${ancho} × ${largo} mm`,
      `🔧  PVC ${espesor} mm${ac ? ` · ${ac}` : co ? ` · ${co}` : ''}`,
      `⚙️  ${confLabel}`,
      tacos
        ? `📌  ${tacos.cantidadTacos} tacos ${tacos.tipo === 'RECTO' ? 'rectos' : 'inclinados'} de ${tacos.altura} mm · paso ${tacos.paso} mm`
        : null,
      ``,
      `Material:     ${fmtEur(costeMat)}`,
      costeConf > 0 ? `Confección:   ${fmtEur(costeConf)}` : null,
      costeTacos > 0 ? `Tacos:        ${fmtEur(costeTacos)}` : null,
      `──────────────────────────`,
      `TOTAL:        ${fmtEur(precioUnitario)}`,
    ].filter(l => l !== null).join('\n');

    const bandaItem = {
      descripcion,
      unidades: 1,
      precioUnitario,
      precioTotal: precioUnitario,
      pesoTotal: pesoUnitario,
      pesoUnitario,
      dimensiones: { ancho: String(ancho), largo: String(largo), espesor: String(espesor) },
      color: co,
      material: 'PVC',
      tipoConfeccion: conf,
      grapa: null,
      tacos: tacos ?? null,
      precioMaterial: Math.round(costeMat * 100) / 100,
      costeVulcanizado: conf === 'VULCANIZADA' ? Math.round(costeConf * 100) / 100 : 0,
      costeTacos: Math.round(costeTacos * 100) / 100,
    };

    setDatos({ ...d0, _resultado: bandaItem });
    pushBot(lineas, [
      { label: '✓ Añadir al pedido', valor: '__añadir', _item: bandaItem },
      { label: 'Empezar de nuevo', valor: '__reiniciar' },
    ]);
    setPaso('RESULTADO');
  };

  // ── input / chip handlers ──────────────────────────────────────────────────

  const procesarChip = (valor, chip, currentPaso, d) => {
    if (valor === '__reiniciar') { reiniciar(); return; }
    if (valor === '__añadir' && chip?._item) { onAddItem(chip._item); onClose(); return; }

    switch (currentPaso) {
      case 'ESPESOR':      afterEspesor(valor, d); break;
      case 'LONAS':        afterLonas(valor === '__null' ? null : valor, d,
                             tarifasPVC.filter(t => Math.abs(Number(t.espesor) - Number(d.espesor)) < 0.001));
                           break;
      case 'ACABADO':      afterAcabado(valor === '__null' ? null : valor, d,
                             tarifasPVC.filter(t => {
                               if (Math.abs(Number(t.espesor) - Number(d.espesor)) >= 0.001) return false;
                               return d.lonas == null ? t.lonas == null : String(t.lonas) === d.lonas;
                             }));
                           break;
      case 'COLOR':        askConf({ ...d, color: valor === '__null' ? null : valor }); break;
      case 'CONF':         afterConf(valor, d); break;
      case 'GRAPA_MODELO': askTacos({ ...d, grapaId: parseInt(valor, 10) }); break;
      case 'TACOS_YN':     afterTacosYN(valor, d); break;
      case 'TACO_TIPO':    afterTacoTipo(valor, d); break;
      case 'TACO_ALTURA':  afterTacoAltura(valor, d); break;
      case 'TACO_LONGITUD': afterTacoLongitud(parseFloat(valor), d); break;
      default: break;
    }
  };

  const procesarTexto = (texto, currentPaso, d) => {
    switch (currentPaso) {
      case 'DIMS': {
        const dims = parseDims(texto);
        if (!dims) { pushBot('No entendí las medidas. Prueba: 600×4500'); return; }
        askEspesor(dims);
        break;
      }
      case 'TACO_PASO': {
        const n = parsePositive(texto);
        if (!n) { pushBot('Escribe el paso en mm, ej: 200'); return; }
        afterTacoPaso(n, d);
        break;
      }
      case 'TACO_LONGITUD': {
        const n = parsePositive(texto);
        if (!n) { pushBot('Escribe la longitud en mm'); return; }
        afterTacoLongitud(n, d);
        break;
      }
      default:
        pushBot('Usa los botones de arriba para elegir.');
    }
  };

  const handleEnviar = () => {
    const txt = input.trim();
    if (!txt) return;
    pushUser(txt);
    setInput('');
    procesarTexto(txt, paso, datos);
  };

  const handleChip = (chip, currentPaso, d) => {
    pushUser(chip.label);
    procesarChip(chip.valor, chip, currentPaso, d);
  };

  const inputActivo = ['DIMS', 'TACO_PASO', 'TACO_LONGITUD'].includes(paso);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box w-full max-w-md flex flex-col p-0 overflow-hidden bg-base-100 rounded-2xl shadow-2xl" style={{ height: '82vh' }}>

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-base-200 shrink-0">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Crear banda PVC
          </h3>
          <button onClick={onClose} className="btn btn-xs btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {mensajes.map((m, i) => {
            const isBot = m.role === 'bot';
            return (
              <div key={i} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[88%]">
                  <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    isBot
                      ? 'bg-base-200 text-base-content rounded-bl-none'
                      : 'bg-primary text-primary-content rounded-br-none'
                  }`}>
                    {m.texto}
                  </div>
                  {isBot && m.chips && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {m.chips.map((chip, j) => (
                        <button
                          key={j}
                          onClick={() => handleChip(chip, paso, datos)}
                          className="btn btn-xs btn-ghost border border-base-300 hover:border-primary hover:text-primary"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t px-3 py-2 flex gap-2 bg-base-100">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inputActivo && handleEnviar()}
            placeholder={PASOS_TEXTO[paso] ?? 'Usa los botones de arriba'}
            disabled={!inputActivo}
            className="input input-bordered input-sm flex-1 text-sm"
          />
          <button
            onClick={handleEnviar}
            disabled={!inputActivo || !input.trim()}
            className="btn btn-sm btn-primary"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
