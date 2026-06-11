"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, ScanLine, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';

// Extrae campos de una etiqueta a partir del texto bruto del OCR.
// Devuelve los valores que detecta; los que no detecta quedan vacíos
// para que el usuario los rellene manualmente.
function parsearEtiqueta(texto) {
  const resultado = {
    tipo: 'BOBINA',
    referencia: '',
    espesor: '',
    ancho: '',
    longitud: '',
    numRollos: '1',
    notas: '',
  };

  // El OCR a veces separa los dígitos con espacios ("1 5 0 0 mm").
  // Compactar dígitos consecutivos separados solo por espacios es arriesgado
  // porque puede unir cosas que no deben unirse. Usamos el texto original
  // para la lógica de líneas y un texto pre-procesado para los regex numéricos.
  const textoNum = texto
    .replace(/(\d)\s+(\d)/g, '$1$2')       // "1 5 0" → "150"
    .replace(/(\d)\s*[,]\s*(\d)/g, '$1.$2'); // "1,5" → "1.5"

  // Metros lineales: "500m", "500 m", "500LM", "500 ML", "500metros"
  // Excluir "mm" (dos m consecutivas)
  const mMetros = textoNum.match(/(\d+(?:\.\d+)?)\s*(?:lm|ml|metros?)\b/i)
    || textoNum.match(/(\d+(?:\.\d+)?)\s*m\b(?!\s*m)/i);
  if (mMetros) resultado.longitud = mMetros[1];

  // Milímetros: distinguir espesor (≤ 20) de ancho (> 20)
  const regMm = /(\d+(?:\.\d+)?)\s*mm/gi;
  let mMm;
  while ((mMm = regMm.exec(textoNum)) !== null) {
    const val = parseFloat(mMm[1]);
    if (val <= 20 && !resultado.espesor) {
      resultado.espesor = mMm[1];
    } else if (val > 20 && !resultado.ancho) {
      resultado.ancho = mMm[1];
    }
  }

  // Centímetros → convertir a mm si no tenemos ancho
  if (!resultado.ancho) {
    const mCm = textoNum.match(/(\d+(?:\.\d+)?)\s*cm\b/i);
    if (mCm) {
      const mm = parseFloat(mCm[1]) * 10;
      if (mm > 20) resultado.ancho = String(mm);
    }
  }

  // Número de rollos / cajas: "5 rollos", "QTY: 5", "5 PCS", "ROLLS: 3"
  const mRollos = textoNum.match(/(?:rollos?|bobinas?|qty|quantity|pcs|pzas?|unidades?|rolls?)\s*:?\s*(\d+)/i)
    || textoNum.match(/(\d+)\s*(?:rollos?|bobinas?|pcs|pzas?|rolls?)\b/i);
  if (mRollos) resultado.numRollos = mRollos[1];

  // Referencia: buscar líneas cortas con mezcla de letras y dígitos
  // (típico de referencias de material: "PVC-4-BL", "FLT-300", "A4-1500", etc.)
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  for (const linea of lineas) {
    if (linea.length < 3 || linea.length > 25) continue;
    if (/[A-Z]/i.test(linea) && /\d/.test(linea) && /^[A-Z0-9/_\-.]+$/i.test(linea)) {
      resultado.referencia = linea;
      break;
    }
  }
  // Fallback: buscar patrón dentro del texto si ninguna línea coincidió
  if (!resultado.referencia) {
    const mRef = texto.match(/\b([A-Z]{1,5}[-/]?[0-9]{1,4}(?:[-/][A-Z0-9]{1,6})?)\b/);
    if (mRef) resultado.referencia = mRef[1];
  }

  return resultado;
}

export default function ModalEscanearEtiqueta({ onConfirmar, onClose }) {
  const [paso, setPaso] = useState('captura'); // 'captura' | 'procesando' | 'confirmar'
  const [imagen, setImagen] = useState(null);
  const [textoOCR, setTextoOCR] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [campos, setCampos] = useState({
    tipo: 'BOBINA', referencia: '', espesor: '', ancho: '',
    longitud: '', numRollos: '1', notas: '',
  });
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const workerRef = useRef(null);

  // BUG-13: liberar el worker de Tesseract si el modal se cierra durante el procesamiento
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {});
        workerRef.current = null;
      }
    };
  }, []);

  const procesar = useCallback(async (file) => {
    setPaso('procesando');
    setError(null);
    setProgreso(0);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['eng', 'spa'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgreso(Math.round(m.progress * 100));
          }
        },
      });
      workerRef.current = worker;
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      workerRef.current = null;

      setTextoOCR(text);
      setCampos(parsearEtiqueta(text));
      setPaso('confirmar');
    } catch (err) {
      console.error('[OCR] Error en Tesseract:', err);
      setError('No se pudo procesar la imagen. Asegúrate de que sea nítida y vuelve a intentarlo.');
      setPaso('captura');
    }
  }, []);

  const handleImagen = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagen(ev.target.result);
    reader.readAsDataURL(file);
    procesar(file);
    // Resetear input para que se pueda seleccionar la misma foto de nuevo
    e.target.value = '';
  }, [procesar]);

  const resetear = () => {
    setPaso('captura');
    setImagen(null);
    setTextoOCR('');
    setProgreso(0);
    setError(null);
    if (workerRef.current) {
      workerRef.current.terminate().catch(() => {});
      workerRef.current = null;
    }
  };

  const handleConfirmar = () => {
    onConfirmar(campos);
    onClose();
  };

  const set = (k, v) => setCampos(prev => ({ ...prev, [k]: v }));

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-2xl max-h-screen overflow-y-auto">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          Escanear etiqueta
        </h3>

        {/* ── PASO 1: Captura ── */}
        {paso === 'captura' && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/60">
              Haz una foto al cartel o etiqueta del artículo desde la tablet.
              Tesseract intentará extraer los datos; podrás corregir lo que no detecte.
            </p>

            {error && (
              <div className="alert alert-error text-sm py-2 gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div
              className="border-2 border-dashed border-base-content/20 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-base-200 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="w-12 h-12 mx-auto mb-3 text-base-content/30" />
              <p className="font-medium text-base">Toca para abrir la cámara</p>
              <p className="text-sm text-base-content/40 mt-1">o elige una imagen de la galería</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImagen}
            />

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Procesando ── */}
        {paso === 'procesando' && (
          <div className="space-y-5">
            {imagen && (
              <img
                src={imagen}
                alt="Etiqueta capturada"
                className="max-h-52 mx-auto rounded-lg object-contain border border-base-content/10"
              />
            )}
            <div className="text-center space-y-2">
              <span className="loading loading-spinner loading-md text-primary" />
              <p className="text-sm">Reconociendo texto… {progreso}%</p>
            </div>
            <progress className="progress progress-primary w-full" value={progreso} max={100} />
            <p className="text-xs text-base-content/40 text-center">
              La primera vez descarga el modelo de idioma (~10 MB). Las siguientes veces es inmediato.
            </p>
          </div>
        )}

        {/* ── PASO 3: Confirmar ── */}
        {paso === 'confirmar' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Izquierda: imagen + texto OCR */}
              <div className="space-y-3">
                {imagen && (
                  <img
                    src={imagen}
                    alt="Etiqueta"
                    className="max-h-44 mx-auto rounded-lg object-contain border border-base-content/10"
                  />
                )}
                <div>
                  <p className="text-xs font-medium text-base-content/50 mb-1">Texto detectado por OCR</p>
                  <textarea
                    className="textarea textarea-bordered textarea-xs w-full font-mono text-xs h-28 resize-none"
                    value={textoOCR}
                    readOnly
                  />
                </div>
                <button
                  className="btn btn-xs btn-ghost gap-1 w-full"
                  onClick={resetear}
                >
                  <RotateCcw className="w-3 h-3" /> Repetir foto
                </button>
              </div>

              {/* Derecha: campos extraídos */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-base-content/50">
                  Datos extraídos — revisa y corrige lo que sea necesario
                </p>

                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text text-xs">Tipo</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={campos.tipo}
                    onChange={e => set('tipo', e.target.value)}
                  >
                    <option value="BOBINA">Bobina</option>
                    <option value="TACO">Taco</option>
                    <option value="GRAPA">Grapa</option>
                    <option value="MAQUINA">Máquina</option>
                    <option value="ESTRELLA">Estrella</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text text-xs">Referencia</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm font-mono"
                    value={campos.referencia}
                    onChange={e => set('referencia', e.target.value)}
                    placeholder="PVC-4-BL"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="form-control">
                    <label className="label py-0.5">
                      <span className="label-text text-xs">Espesor (mm)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm font-mono"
                      value={campos.espesor}
                      onChange={e => set('espesor', e.target.value)}
                      placeholder="1.5"
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-0.5">
                      <span className="label-text text-xs">Ancho (mm)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm font-mono"
                      value={campos.ancho}
                      onChange={e => set('ancho', e.target.value)}
                      placeholder="1500"
                      step="1"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="form-control">
                    <label className="label py-0.5">
                      <span className="label-text text-xs">Metros lineales</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm font-mono"
                      value={campos.longitud}
                      onChange={e => set('longitud', e.target.value)}
                      placeholder="500"
                      step="1"
                      min="0"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-0.5">
                      <span className="label-text text-xs">Rollos / Uds.</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm font-mono"
                      value={campos.numRollos}
                      onChange={e => set('numRollos', e.target.value)}
                      min="1"
                      step="1"
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text text-xs">Notas (opcional)</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={campos.notas}
                    onChange={e => set('notas', e.target.value)}
                    placeholder="Color, lote, fabricante…"
                  />
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary gap-2" onClick={handleConfirmar}>
                <CheckCircle className="w-4 h-4" />
                Añadir a la tabla
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={paso !== 'procesando' ? onClose : undefined} />
    </div>
  );
}
