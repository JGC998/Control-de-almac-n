"use client";

const PVC_COLOR = {
  AZUL:   '#3B82F6',
  BLANCO: '#CBD5E1',
  NEGRO:  '#475569',
  VERDE:  '#22C55E',
};

function zigzagPath(x1, x2, yBase, amp = 5, teeth = 10) {
  const step = (x2 - x1) / teeth;
  let d = `M ${x1} ${yBase}`;
  for (let i = 0; i <= teeth; i++) {
    const py = yBase + (i % 2 === 0 ? -amp : amp);
    d += ` L ${x1 + i * step} ${py}`;
  }
  return d;
}

function seamPath(x1, x2, yBase, amp = 3, cycles = 5) {
  const W = x2 - x1;
  const steps = 60;
  let d = `M ${x1} ${yBase}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + t * W;
    const y = yBase + Math.sin(t * cycles * 2 * Math.PI) * amp;
    d += ` L ${x} ${y}`;
  }
  return d;
}

export default function PreviewBandaPVC({ ancho, largo, tipoConfeccion, configuracionTacos, color, scale = 1 }) {
  const anchoMm = parseFloat(ancho) || 0;
  const largoMm = parseFloat(largo) || 0;
  const hasData = anchoMm > 0 && largoMm > 0;

  const fill = PVC_COLOR[color] || '#94A3B8';

  // Canvas
  const CW = 160;
  const CH = 220;
  const PAD_L = 20;
  const PAD_R = 36; // extra right for largo label
  const PAD_V = 28;
  const TOTAL_W = PAD_L + CW + PAD_R;
  const TOTAL_H = PAD_V + CH + PAD_V;

  // Band rectangle — proportional but capped at ratio 6:1
  const ratio = anchoMm && largoMm ? Math.min(largoMm / anchoMm, 6) : 2.5;
  let bW, bH;
  if (ratio > CH / CW) {
    bH = CH;
    bW = bH / ratio;
  } else {
    bW = CW;
    bH = bW * ratio;
  }
  bW = Math.max(36, Math.min(bW, CW));
  bH = Math.max(60, Math.min(bH, CH));

  const bX = PAD_L + (CW - bW) / 2;
  const bY = PAD_V + (CH - bH) / 2;

  // Taco lines
  const tacoLines = [];
  if (configuracionTacos && largoMm > 0 && configuracionTacos.paso > 0) {
    const { paso, longitudTaco, tipo } = configuracionTacos;
    const tacoPct = longitudTaco ? Math.min(longitudTaco / anchoMm, 0.95) : 0.88;
    const tW = bW * tacoPct;
    const tX = bX + (bW - tW) / 2;
    const inclineOffset = tipo === 'INCLINADO' ? tW * 0.12 : 0;

    let pos = paso / 2;
    while (pos < largoMm) {
      const y = bY + (pos / largoMm) * bH;
      if (y > bY + 3 && y < bY + bH - 3) {
        tacoLines.push({ y, x1: tX, x2: tX + tW, offset: inclineOffset });
      }
      pos += paso;
    }
  }

  return (
    <div className="flex justify-center items-center">
      <svg
        width={Math.round(TOTAL_W * scale)}
        height={Math.round(TOTAL_H * scale)}
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        aria-label="Previsualización de banda PVC"
      >
        {!hasData ? (
          <text
            x={TOTAL_W / 2} y={TOTAL_H / 2}
            textAnchor="middle" fontSize={10}
            fill="currentColor" opacity={0.3}
          >
            Introduce medidas
          </text>
        ) : (
          <>
            {/* Band fill */}
            <rect
              x={bX} y={bY} width={bW} height={bH}
              fill={fill} fillOpacity={0.2}
              stroke={fill} strokeWidth={2}
              rx={tipoConfeccion === 'VULCANIZADA' ? 3 : 0}
            />

            {/* ABIERTA — extremos marcados con línea gruesa */}
            {tipoConfeccion === 'ABIERTA' && (
              <>
                <line x1={bX - 3} y1={bY}      x2={bX + bW + 3} y2={bY}      stroke="currentColor" strokeWidth={3} />
                <line x1={bX - 3} y1={bY + bH} x2={bX + bW + 3} y2={bY + bH} stroke="currentColor" strokeWidth={3} />
              </>
            )}

            {/* GRAPA — zigzag arriba y abajo */}
            {tipoConfeccion === 'GRAPA' && (
              <>
                <path d={zigzagPath(bX, bX + bW, bY,      5)} fill="none" stroke="currentColor" strokeWidth={1.5} />
                <path d={zigzagPath(bX, bX + bW, bY + bH, 5)} fill="none" stroke="currentColor" strokeWidth={1.5} />
              </>
            )}

            {/* VULCANIZADA sin fin — onda sinusoidal (costura de calor) */}
            {tipoConfeccion === 'VULCANIZADA' && (
              <>
                <path d={seamPath(bX + 3, bX + bW - 3, bY + 6,      3)} fill="none" stroke={fill} strokeWidth={2} opacity={0.85} />
                <path d={seamPath(bX + 3, bX + bW - 3, bY + bH - 6, 3)} fill="none" stroke={fill} strokeWidth={2} opacity={0.85} />
              </>
            )}

            {/* TACOS — horizontal (recto) o diagonal (inclinado) */}
            {tacoLines.map((t, i) => (
              <line
                key={i}
                x1={t.x1}             y1={t.y}
                x2={t.x2}             y2={t.y + t.offset}
                stroke="currentColor" strokeWidth={2.5} opacity={0.7}
                strokeLinecap="round"
              />
            ))}

            {/* Cota ancho */}
            <line x1={bX}      y1={bY + bH + 10} x2={bX + bW} y2={bY + bH + 10} stroke="currentColor" strokeWidth={1} opacity={0.35} />
            <line x1={bX}      y1={bY + bH + 7}  x2={bX}      y2={bY + bH + 13} stroke="currentColor" strokeWidth={1} opacity={0.35} />
            <line x1={bX + bW} y1={bY + bH + 7}  x2={bX + bW} y2={bY + bH + 13} stroke="currentColor" strokeWidth={1} opacity={0.35} />
            <text x={bX + bW / 2} y={bY + bH + 22} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.55}>
              {anchoMm} mm
            </text>

            {/* Cota largo */}
            <line x1={bX + bW + 10} y1={bY}      x2={bX + bW + 10} y2={bY + bH} stroke="currentColor" strokeWidth={1} opacity={0.35} />
            <line x1={bX + bW + 7}  y1={bY}      x2={bX + bW + 13} y2={bY}      stroke="currentColor" strokeWidth={1} opacity={0.35} />
            <line x1={bX + bW + 7}  y1={bY + bH} x2={bX + bW + 13} y2={bY + bH} stroke="currentColor" strokeWidth={1} opacity={0.35} />
            <text
              x={bX + bW + 26} y={bY + bH / 2}
              textAnchor="middle" fontSize={9}
              fill="currentColor" opacity={0.55}
              transform={`rotate(-90 ${bX + bW + 26} ${bY + bH / 2})`}
            >
              {largoMm} mm
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
