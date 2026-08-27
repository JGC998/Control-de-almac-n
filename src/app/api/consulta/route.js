import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── Parser de intención ────────────────────────────────────────────────────────

function parsear(q) {
  const s = q.toLowerCase().trim();

  // Stock bajo mínimo
  if (/bajo.{0,10}m[ií]nimo|alertas?\s*stock|stock.{0,10}bajo|cr[ií]tico/.test(s)) {
    return { tipo: 'stock_minimo' };
  }
  // Stock + búsqueda de material
  if (/stock|hay|tenemos|quedan|cu[aá]nto|metros/.test(s)) {
    const termino = s
      .replace(/\b(stock|hay|tenemos|quedan|cu[aá]ntos?|metros?|de|disponible)\b/g, '')
      .replace(/\s+/g, ' ').trim();
    return { tipo: 'stock', termino };
  }

  // Pedidos hoy
  if (/pedidos?.{0,8}hoy/.test(s)) return { tipo: 'pedidos_hoy' };
  // Pedidos por estado
  if (/pedidos?.{0,10}(pendiente|facturado|cancelado)/.test(s)) {
    const m = s.match(/pendiente|facturado|cancelado/);
    return { tipo: 'pedidos_estado', estado: m[0].charAt(0).toUpperCase() + m[0].slice(1) };
  }
  // Pedido número concreto
  const numPed = s.match(/pedido\s+(\w+)/);
  if (numPed) return { tipo: 'pedido_numero', numero: numPed[1] };
  // Pedidos recientes (sin más)
  if (/pedidos?$/.test(s)) return { tipo: 'pedidos_recientes' };

  // Cliente
  const mCli = s.match(/cliente\s+(.+)|buscar\s+(.+)/);
  if (mCli) return { tipo: 'cliente', nombre: (mCli[1] || mCli[2]).trim() };

  // Precio banda: 400x3800, 1000×3700 grapa/SF/AB
  const mBanda = s.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (mBanda) {
    const conf = /grapa|gr\b/.test(s) ? 'GR'
               : /sin.?fin|sf\b/.test(s) ? 'SF'
               : /abierta|ab\b/.test(s) ? 'AB'
               : null;
    return { tipo: 'precio_banda', ancho: parseFloat(mBanda[1]), largo: parseFloat(mBanda[2]), conf };
  }

  // Ayuda
  if (/ayuda|help|qu[eé].{0,10}(puedo|puedes|sab[eé]s)/.test(s)) return { tipo: 'ayuda' };

  return { tipo: 'desconocido' };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { query } = await request.json();
    if (!query?.trim()) {
      return NextResponse.json({ texto: 'Escribe algo para consultar.', tipo: 'ayuda', datos: null });
    }

    const intent = parsear(query.trim());

    // ── Stock de un material ─────────────────────────────────────────────────
    if (intent.tipo === 'stock') {
      const where = intent.termino
        ? { material: { contains: intent.termino } }
        : {};
      const stocks = await db.stock.findMany({
        where,
        orderBy: { material: 'asc' },
        take: 12,
      });
      if (stocks.length === 0) {
        return NextResponse.json({
          texto: intent.termino
            ? `No encontré stock de "${intent.termino}".`
            : 'No hay registros de stock.',
          tipo: 'stock', datos: [],
        });
      }
      return NextResponse.json({
        texto: `${stocks.length} material${stocks.length !== 1 ? 'es' : ''} en stock`,
        tipo: 'stock',
        datos: stocks.map(s => ({
          id: s.id,
          material: s.material,
          espesor: s.espesor,
          metros: s.metrosDisponibles,
          minimo: s.stockMinimo,
          alerta: s.metrosDisponibles <= s.stockMinimo,
        })),
      });
    }

    // ── Stock bajo mínimo ────────────────────────────────────────────────────
    if (intent.tipo === 'stock_minimo') {
      const todos = await db.stock.findMany({ orderBy: { metrosDisponibles: 'asc' } });
      const bajos = todos.filter(s => s.metrosDisponibles <= s.stockMinimo);
      return NextResponse.json({
        texto: bajos.length === 0
          ? 'Todo el stock está sobre el mínimo. ✅'
          : `${bajos.length} material${bajos.length !== 1 ? 'es' : ''} bajo mínimo`,
        tipo: 'stock',
        datos: bajos.map(s => ({
          id: s.id,
          material: s.material,
          espesor: s.espesor,
          metros: s.metrosDisponibles,
          minimo: s.stockMinimo,
          alerta: true,
        })),
      });
    }

    // ── Pedidos de hoy ───────────────────────────────────────────────────────
    if (intent.tipo === 'pedidos_hoy') {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
      const pedidos = await db.pedido.findMany({
        where: { fechaCreacion: { gte: hoy, lt: manana } },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
      });
      return NextResponse.json({
        texto: pedidos.length === 0
          ? 'No hay pedidos creados hoy.'
          : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} hoy`,
        tipo: 'pedidos',
        datos: pedidos.map(p => ({
          id: p.id, numero: p.numero,
          cliente: p.cliente?.nombre, estado: p.estado, total: p.total,
        })),
      });
    }

    // ── Pedidos por estado ───────────────────────────────────────────────────
    if (intent.tipo === 'pedidos_estado') {
      const pedidos = await db.pedido.findMany({
        where: { estado: intent.estado },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
        take: 10,
      });
      return NextResponse.json({
        texto: pedidos.length === 0
          ? `No hay pedidos ${intent.estado.toLowerCase()}s.`
          : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} ${intent.estado.toLowerCase()}${pedidos.length !== 1 ? 's' : ''}`,
        tipo: 'pedidos',
        datos: pedidos.map(p => ({
          id: p.id, numero: p.numero,
          cliente: p.cliente?.nombre, estado: p.estado, total: p.total,
        })),
      });
    }

    // ── Pedido por número ────────────────────────────────────────────────────
    if (intent.tipo === 'pedido_numero') {
      const pedido = await db.pedido.findFirst({
        where: { numero: { contains: intent.numero } },
        include: {
          cliente: { select: { nombre: true } },
          items: { select: { cantidad: true, descripcion: true }, take: 5 },
        },
      });
      if (!pedido) {
        return NextResponse.json({ texto: `No encontré el pedido "${intent.numero}".`, tipo: 'error', datos: null });
      }
      return NextResponse.json({
        texto: `Pedido ${pedido.numero}`,
        tipo: 'pedido_detalle',
        datos: {
          id: pedido.id, numero: pedido.numero,
          cliente: pedido.cliente?.nombre, estado: pedido.estado,
          total: pedido.total, items: pedido.items.length,
          fecha: pedido.fechaCreacion,
        },
      });
    }

    // ── Pedidos recientes ────────────────────────────────────────────────────
    if (intent.tipo === 'pedidos_recientes') {
      const pedidos = await db.pedido.findMany({
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
        take: 5,
      });
      return NextResponse.json({
        texto: 'Últimos 5 pedidos',
        tipo: 'pedidos',
        datos: pedidos.map(p => ({
          id: p.id, numero: p.numero,
          cliente: p.cliente?.nombre, estado: p.estado, total: p.total,
        })),
      });
    }

    // ── Cliente ──────────────────────────────────────────────────────────────
    if (intent.tipo === 'cliente') {
      const cliente = await db.cliente.findFirst({
        where: { nombre: { contains: intent.nombre } },
        include: {
          pedidos: {
            orderBy: { fechaCreacion: 'desc' },
            take: 3,
            select: { id: true, numero: true, estado: true, total: true, fechaCreacion: true },
          },
        },
      });
      if (!cliente) {
        return NextResponse.json({ texto: `No encontré cliente "${intent.nombre}".`, tipo: 'error', datos: null });
      }
      return NextResponse.json({
        texto: cliente.nombre,
        tipo: 'cliente',
        datos: {
          id: cliente.id, nombre: cliente.nombre,
          email: cliente.email, telefono: cliente.telefono,
          pedidosRecientes: cliente.pedidos,
        },
      });
    }

    // ── Precio de banda ──────────────────────────────────────────────────────
    if (intent.tipo === 'precio_banda') {
      const where = {
        ancho: intent.ancho,
        largo: intent.largo,
        referenciaFabricante: 'BANDA_PVC',
        activo: true,
        ...(intent.conf ? { nombre: { contains: intent.conf } } : {}),
      };
      const banda = await db.producto.findFirst({ where });
      if (!banda) {
        return NextResponse.json({
          texto: `No hay banda ${intent.ancho}×${intent.largo}${intent.conf ? ` ${intent.conf}` : ''} en catálogo.`,
          tipo: 'precio', datos: null,
        });
      }
      return NextResponse.json({
        texto: banda.nombre,
        tipo: 'precio',
        datos: {
          id: banda.id, nombre: banda.nombre,
          precio: banda.precioUnitario, peso: banda.pesoUnitario,
          ancho: intent.ancho, largo: intent.largo,
        },
      });
    }

    // ── Ayuda ────────────────────────────────────────────────────────────────
    if (intent.tipo === 'ayuda') {
      return NextResponse.json({
        texto: 'Puedo responder sobre:',
        tipo: 'ayuda',
        datos: [
          'stock pvc 6mm',
          'stock bajo mínimo',
          'pedidos hoy',
          'pedidos pendientes',
          'pedido 227',
          'cliente castillero',
          '400x3800 grapa',
        ],
      });
    }

    // ── Desconocido ──────────────────────────────────────────────────────────
    return NextResponse.json({
      texto: 'No entendí esa consulta. Prueba: "pedidos hoy", "stock pvc 6mm", "cliente castillero", "400x3800 grapa"',
      tipo: 'ayuda', datos: null,
    });

  } catch (error) {
    console.error('[/api/consulta]', error);
    return NextResponse.json({ texto: 'Error al consultar. Inténtalo de nuevo.', tipo: 'error', datos: null });
  }
}
