"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Layers } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';

const CONFECCION_LABELS = {
  VULCANIZADA: 'Vulcanizada (sin fin)',
  GRAPA: 'Con grapa',
  ABIERTA: 'Abierta (extremos libres)',
};

function ChatBubble({ pregunta, respuesta }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-start">
        <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-2 max-w-xs text-sm">
          {pregunta}
        </div>
      </div>
      {respuesta != null && (
        <div className="flex justify-end">
          <div className="bg-primary text-primary-content rounded-2xl rounded-tr-sm px-4 py-2 max-w-xs text-sm font-medium">
            {respuesta}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculadoraBandasVentasPage() {
  const { data: tarifas } = useSWR('/api/precios', fetcher);
  const { data: modelosData } = useSWR('/api/modelos-grapa', fetcher);
  const { data: configData } = useSWR('/api/config', fetcher);

  const costeVulc = configData?.costeVulcanizadoMetro ?? 0;

  const [historial, setHistorial] = useState([]);
  const [vals, setVals] = useState({});
  const [inputVal, setInputVal] = useState('');
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historial, done]);

  const espesores = useMemo(() => {
    if (!tarifas) return [];
    return [...new Set(tarifas.filter(t => t.material === 'PVC').map(t => String(t.espesor)))]
      .sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas]);

  const tarifasEsp = useMemo(() => {
    if (!tarifas || !vals.espesor) return [];
    return tarifas.filter(t =>
      t.material === 'PVC' &&
      Math.abs(Number(t.espesor) - Number(vals.espesor)) < 0.001
    );
  }, [tarifas, vals.espesor]);

  const lOptions = useMemo(() => [...new Set(tarifasEsp.map(t => t.lonas == null ? '__std' : String(t.lonas)))], [tarifasEsp]);
  const needsLonas = lOptions.length > 1;

  const tarifasL = useMemo(() => {
    if (!needsLonas || !vals.lonas) return tarifasEsp;
    return tarifasEsp.filter(t => vals.lonas === '__std' ? t.lonas == null : String(t.lonas) === vals.lonas);
  }, [tarifasEsp, needsLonas, vals.lonas]);

  const aOptions = useMemo(() => [...new Set(tarifasL.map(t => t.acabado == null ? '__std' : t.acabado))], [tarifasL]);
  const needsAcabado = aOptions.length > 1;

  const tarifasA = useMemo(() => {
    if (!needsAcabado || !vals.acabado) return tarifasL;
    return tarifasL.filter(t => vals.acabado === '__std' ? !t.acabado : t.acabado === vals.acabado);
  }, [tarifasL, needsAcabado, vals.acabado]);

  const cOptions = useMemo(() => [...new Set(tarifasA.map(t => t.color == null ? '__std' : t.color))], [tarifasA]);
  const needsColor = cOptions.length > 1;

  const currentStep = useMemo(() => {
    if (!tarifas) return null;
    if (!vals.espesor) return 'espesor';
    if (needsLonas && !vals.lonas) return 'lonas';
    if (needsAcabado && !vals.acabado) return 'acabado';
    if (needsColor && !vals.color) return 'color';
    if (!vals.confeccion) return 'confeccion';
    if (!vals.ancho) return 'ancho';
    if (!vals.largo) return 'largo';
    if (!vals.unidades) return 'unidades';
    return 'done';
  }, [tarifas, vals, needsLonas, needsAcabado, needsColor]);

  const stepConfig = useMemo(() => ({
    espesor: {
      pregunta: '¿Qué espesor necesitas?',
      tipo: 'select',
      opciones: espesores.map(e => ({ value: e, label: `${e} mm` })),
    },
    lonas: {
      pregunta: '¿Cuántas lonas?',
      tipo: 'select',
      opciones: lOptions.map(l => ({ value: l, label: l === '__std' ? 'Estándar' : `${l} lonas` })),
    },
    acabado: {
      pregunta: '¿Qué acabado?',
      tipo: 'select',
      opciones: aOptions.map(a => ({ value: a, label: a === '__std' ? 'Estándar' : a })),
    },
    color: {
      pregunta: '¿Qué color?',
      tipo: 'select',
      opciones: cOptions.map(c => ({ value: c, label: c === '__std' ? 'Estándar' : c })),
    },
    confeccion: {
      pregunta: '¿Cómo va confeccionada la banda?',
      tipo: 'select',
      opciones: [
        { value: 'VULCANIZADA', label: 'Vulcanizada (sin fin)' },
        { value: 'GRAPA', label: 'Con grapa' },
        { value: 'ABIERTA', label: 'Abierta (extremos libres)' },
      ],
    },
    ancho: {
      pregunta: '¿Qué ancho necesitas? (mm)',
      tipo: 'number',
      placeholder: 'Ej: 600',
      min: 1,
    },
    largo: {
      pregunta: '¿Cuánto largo necesitas? (mm)',
      tipo: 'number',
      placeholder: 'Ej: 4500',
      min: 1,
    },
    unidades: {
      pregunta: '¿Cuántas unidades?',
      tipo: 'number',
      placeholder: '1',
      min: 1,
      step: '1',
    },
  }), [espesores, lOptions, aOptions, cOptions]);

  const modelos = modelosData?.modelos ?? [];

  const modeloGrapa = useMemo(() => {
    if (!vals.espesor || !modelos.length) return null;
    const esp = parseFloat(vals.espesor);
    return modelos.find(m => {
      if (m.tipo !== 'NORMAL') return false;
      return esp >= m.espesorDesde && esp <= (m.espesorHasta ?? Infinity);
    }) ?? null;
  }, [modelos, vals.espesor]);

  const tarifa = useMemo(() => {
    if (!tarifasA.length) return null;
    if (tarifasA.length === 1) return tarifasA[0];
    if (!needsColor || !vals.color) return null;
    return tarifasA.find(t => vals.color === '__std' ? !t.color : t.color === vals.color) ?? null;
  }, [tarifasA, needsColor, vals.color]);

  const resultado = useMemo(() => {
    if (currentStep !== 'done' || !tarifa) return null;
    if (vals.confeccion === 'GRAPA' && !modeloGrapa) {
      return { sinModeloGrapa: true };
    }
    const ancMm = parseFloat(vals.ancho);
    const larMm = parseFloat(vals.largo);
    const uds = parseInt(vals.unidades, 10) || 1;
    const ancM = ancMm / 1000;
    const larM = larMm / 1000;
    const area = ancM * larM;
    const costeMat = tarifa.precio * area;

    let costeConf = 0;
    let confLabel = '';
    if (vals.confeccion === 'VULCANIZADA') {
      costeConf = costeVulc * ancM;
      confLabel = `+ vulcanizado ${formatCurrency(costeConf)}`;
    } else if (vals.confeccion === 'GRAPA' && modeloGrapa) {
      costeConf = (ancMm / 100) * (modeloGrapa.precioPor100mm ?? 0);
      confLabel = `+ grapa ${formatCurrency(costeConf)}`;
    }

    const precioUnit = Math.round((costeMat + costeConf) * 100) / 100;
    const precioTotal = Math.round(precioUnit * uds * 100) / 100;
    const peso = (tarifa.peso ?? 0) * area;

    return { precioUnit, precioTotal, uds, peso: Math.round(peso * 1000) / 1000, costeMat, costeConf, confLabel, area };
  }, [currentStep, tarifa, vals, costeVulc, modeloGrapa]);

  const labelFor = (step, value) => {
    const cfg = stepConfig[step];
    if (!cfg) return value;
    if (cfg.tipo === 'select') {
      const opt = cfg.opciones.find(o => o.value === value);
      return opt?.label ?? value;
    }
    return value;
  };

  // Selects confirman directamente al hacer clic
  const handleSelectOption = (value) => {
    if (!currentStep || currentStep === 'done') return;
    const pregunta = stepConfig[currentStep]?.pregunta ?? '';
    const respLabel = labelFor(currentStep, value);
    setHistorial(prev => [...prev, { pregunta, respuesta: respLabel }]);
    setVals(prev => ({ ...prev, [currentStep]: value }));
  };

  // Números confirman con Enter o botón →
  const handleConfirmNumber = () => {
    if (!inputVal || !currentStep || currentStep === 'done') return;
    const pregunta = stepConfig[currentStep]?.pregunta ?? '';
    setHistorial(prev => [...prev, { pregunta, respuesta: inputVal }]);
    setVals(prev => ({ ...prev, [currentStep]: inputVal }));
    setInputVal('');
  };

  const handleReset = () => {
    setHistorial([]);
    setVals({});
    setInputVal('');
    setDone(false);
  };

  useEffect(() => {
    if (currentStep === 'done') setDone(true);
  }, [currentStep]);

  const cfg = currentStep ? stepConfig[currentStep] : null;

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-base-200 bg-base-100 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/ventas" className="btn btn-ghost btn-sm btn-circle">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">Calculadora Bandas PVC</p>
              <p className="text-xs text-base-content/50">Cotización rápida</p>
            </div>
          </div>
        </div>
        {historial.length > 0 && (
          <button onClick={handleReset} className="btn btn-ghost btn-sm gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!tarifas && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner" />
          </div>
        )}

        {tarifas && historial.length === 0 && !done && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-2 max-w-xs text-sm">
              ¡Hola! Vamos a calcular el precio de tu banda PVC.
            </div>
          </div>
        )}

        {historial.map((h, i) => (
          <ChatBubble key={i} pregunta={h.pregunta} respuesta={h.respuesta} />
        ))}

        {/* Pregunta actual como burbuja en el chat */}
        {cfg && !done && historial.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-2 max-w-xs text-sm">
              {cfg.pregunta}
            </div>
          </div>
        )}

        {done && resultado && !resultado.sinModeloGrapa && (
          <div className="flex justify-start">
            <div className="card bg-primary/5 border border-primary/20 w-full max-w-sm">
              <div className="card-body py-3 px-4 gap-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Precio calculado</p>
                <p className="text-3xl font-bold">{formatCurrency(resultado.precioTotal)}</p>
                <p className="text-xs text-base-content/60">
                  {resultado.uds} ud × {formatCurrency(resultado.precioUnit)} ud
                </p>
                <div className="divider my-1" />
                <div className="text-xs space-y-0.5 text-base-content/70">
                  <div className="flex justify-between">
                    <span>Material</span>
                    <span className="font-mono">{formatCurrency(resultado.costeMat)}</span>
                  </div>
                  {resultado.costeConf > 0 && (
                    <div className="flex justify-between">
                      <span>Confección</span>
                      <span className="font-mono">{formatCurrency(resultado.costeConf)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base-content/40">
                    <span>Peso aprox.</span>
                    <span className="font-mono">{resultado.peso} kg/ud</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {done && resultado?.sinModeloGrapa && (
          <div role="alert" className="alert alert-warning text-sm">
            <span>No hay modelo de grapa configurado para ese espesor. Ve a <strong>Configuración → Grapas</strong> y añade el modelo.</span>
          </div>
        )}

        {done && !resultado && (
          <div role="alert" className="alert alert-warning text-sm">
            <span>No se encontró tarifa para esa combinación.</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area — solo opciones, sin repetir la pregunta */}
      {!done && cfg && (
        <div className="shrink-0 px-4 py-3 border-t border-base-200 bg-base-100">
          {cfg.tipo === 'select' ? (
            <div className="flex flex-wrap gap-2">
              {cfg.opciones.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSelectOption(opt.value)}
                  className="btn btn-sm btn-ghost border border-base-300 hover:btn-primary"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered flex-1 input-sm"
                placeholder={cfg.placeholder}
                min={cfg.min}
                step={cfg.step ?? 'any'}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirmNumber()}
                autoFocus
              />
              <button
                onClick={handleConfirmNumber}
                disabled={!inputVal || parseFloat(inputVal) <= 0}
                className="btn btn-sm btn-primary"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="shrink-0 px-4 py-3 border-t border-base-200">
          <button onClick={handleReset} className="btn btn-outline btn-sm w-full gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> Nueva consulta
          </button>
        </div>
      )}
    </div>
  );
}
