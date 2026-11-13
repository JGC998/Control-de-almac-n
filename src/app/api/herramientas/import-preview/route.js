import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import candidatos from '../../../../../data/candidatos_precios.json';

function simNombre(a, b) {
  const tokens = s => s.toUpperCase()
    .replace(/[()[\].,\-_\/]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^\d+$/.test(w));
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach(w => { if (tb.has(w)) common++; });
  return common / Math.max(ta.size, tb.size);
}

function dimClose(a, b) {
  if (a == null || b == null) return null;
  return Math.abs(a - b) <= 0.5;
}

export async function GET() {
  try {
    const dbProductos = await prisma.producto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        espesor: true,
        ancho: true,
        largo: true,
        precioVenta: true,
        unidadesVendidas: true,
        lonas: true,
        material: { select: { id: true, nombre: true } },
        fabricante: { select: { id: true, nombre: true } },
        subfamilia: {
          select: {
            id: true,
            nombre: true,
            familia: { select: { id: true, nombre: true } }
          }
        },
      },
      orderBy: { nombre: 'asc' },
    });

    // Calcular sugerencia de match para cada candidato
    const candidatosConMatch = candidatos.map(c => {
      let bestScore = 0;
      let bestMatch = null;

      dbProductos.forEach(db => {
        const espOk = dimClose(c.espesor, db.espesor);
        const ancOk = dimClose(c.ancho, db.ancho);
        const larOk = dimClose(c.largo, db.largo);

        const dimsCSV = [c.espesor, c.ancho, c.largo].filter(x => x != null).length;
        const matches = [espOk, ancOk, larOk].filter(x => x === true).length;
        const noMatch = [espOk, ancOk, larOk].filter(x => x === false).length;

        const matCSV = (c.material || '').toUpperCase();
        const matDB  = (db.material?.nombre || '').toUpperCase();
        const matOk  = matCSV && matDB && (
          (matCSV.includes('GOMA') && matDB.includes('GOMA')) ||
          (matCSV.includes('FIELTRO') && matDB.includes('FIELTRO')) ||
          (matCSV.includes('PVC') && matDB.includes('PVC')) ||
          matCSV === matDB
        );

        const sim = simNombre(c.nombre, db.nombre);
        let score = 0;

        if (dimsCSV >= 2 && matches === dimsCSV && noMatch === 0 && matOk) {
          score = 100 + sim * 10;
        } else if (matches >= 2 && noMatch === 0 && matOk) {
          score = 60 + sim * 20;
        } else if (sim >= 0.60 && matOk) {
          score = sim * 50;
        } else if (sim >= 0.65) {
          score = sim * 25;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = db;
        }
      });

      return {
        ...c,
        sugerencia: bestScore >= 30 ? {
          id: bestMatch.id,
          nombre: bestMatch.nombre,
          precioVenta: bestMatch.precioVenta,
          espesor: bestMatch.espesor,
          ancho: bestMatch.ancho,
          largo: bestMatch.largo,
          material: bestMatch.material?.nombre,
          score: Math.round(bestScore),
        } : null,
      };
    });

    return NextResponse.json({
      candidatos: candidatosConMatch,
      productos: dbProductos,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
