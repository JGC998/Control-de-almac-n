import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

// Formato español: 34.080,64
const fmtN = (v, dec = 2) => {
  const n = typeof v === 'number' ? v : parseFloat(v) || 0;
  return isFinite(n)
    ? n.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : (0).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

// Fallbacks para cuando ConfiguracionEmisor / Config no estén configurados
const COMPANY_ADDRESS_FALLBACK = '';
const COMPANY_PHONE_FALLBACK   = '';

// Caché de info de emisor con TTL de 5 minutos
let _emisorCache = null;
let _emisorCacheAt = 0;
const EMISOR_TTL_MS = 5 * 60 * 1000;
export function clearEmisorCache() { _emisorCache = null; _emisorCacheAt = 0; }

async function getEmisorInfo() {
    if (_emisorCache && (Date.now() - _emisorCacheAt) < EMISOR_TTL_MS) return _emisorCache;
    try {
        const [emisor, phoneConfig] = await Promise.all([
            db.configuracionEmisor.findUnique({ where: { id: 1 } }),
            db.config.findUnique({ where: { key: 'empresa_telefono' } }),
        ]);
        _emisorCache = {
            address: emisor?.direccion || COMPANY_ADDRESS_FALLBACK,
            phone:   phoneConfig?.value || COMPANY_PHONE_FALLBACK,
        };
        _emisorCacheAt = Date.now();
        return _emisorCache;
    } catch {
        return { address: COMPANY_ADDRESS_FALLBACK, phone: COMPANY_PHONE_FALLBACK };
    }
}

// Caché de logo en memoria: se lee una sola vez por proceso
let _logoBase64 = null;
async function getLogoBase64() {
    if (_logoBase64) return _logoBase64;
    try {
        const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
        const buffer = await fs.readFile(logoPath);
        _logoBase64 = buffer.toString('base64');
        return _logoBase64;
    } catch {
        return null;
    }
}

export async function generateBudgetPDF(quote, ivaRate = 0.21) {
    try {
        const doc = new jsPDF();
        const client = quote.cliente;
        const { address, phone } = await getEmisorInfo();

        // --- Añadir Logo (cacheado en memoria) ---
        const logoBase64 = await getLogoBase64();
        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
        }

        // --- Header ---
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("PRESUPUESTO", 14, 22);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(address, 200, 38, { align: 'right' });
        doc.text(`Teléfono: ${phone}`, 200, 44, { align: 'right' });

        // --- Info Presupuesto ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Número:`, 14, 36);
        doc.setFont("helvetica", "normal");
        doc.text(`${quote.numero}`, 38, 36);

        doc.setFont("helvetica", "bold");
        doc.text(`Fecha:`, 14, 42);
        doc.setFont("helvetica", "normal");
        const formattedDate = new Date(quote.fechaCreacion).toLocaleDateString('es-ES');
        doc.text(formattedDate, 38, 42);

        // --- Info Cliente ---
        const cBoxX = 14, cBoxY = 55, cBoxW = 90, cLineH = 6;
        const cTextX = 20, cMaxW = cBoxW - 12;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const cNombreLines = client ? doc.splitTextToSize(client.nombre || 'Sin cliente', cMaxW) : ['Sin cliente'];
        const cDirLines = client && client.direccion ? doc.splitTextToSize(client.direccion, cMaxW) : [];
        const cEmailLines = client && client.email ? doc.splitTextToSize(client.email, cMaxW) : [];
        const cAllLines = [...cNombreLines, ...cDirLines, ...cEmailLines];
        const cBoxH = Math.max(28, 10 + cAllLines.length * cLineH + 4);
        doc.rect(cBoxX, cBoxY, cBoxW, cBoxH);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", cTextX, cBoxY + 6);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        let cLineY = cBoxY + 13;
        cAllLines.forEach(line => { doc.text(line, cTextX, cLineY); cLineY += cLineH; });
        const tableStartY = cBoxY + cBoxH + 7;

        // --- Tabla de Items ---
        // NOTA: Se asume que los items ya vienen con los cálculos de venta (unitPriceVenta, etc)
        // o se procesan antes de llamar a esta función.
        // Para simplificar, recalcularemos aquí si es necesario o asumiremos que se pasa el quote "enriquecido".
        // PERO, para ser consistentes con la API anterior, vamos a REPLICAR el cálculo si no viene.

        // Mejor estrategia: La API debe pasar los items YA CALCULADOS o procesados.
        // Pero si queremos ser robustos, podemos comprobar.
        // Por ahora, asumimos que 'quote.items' tiene las propiedades necesarias o las calculamos al vuelo.

        // REPLICA DE LÓGICA DE CÁLCULO (Simplificada/Adaptada)
        // Necesitamos las margin rules si no vienen en el objeto quote.
        // Para un PDF generator puro, lo ideal es recibir los datos ya listos.
        // Vamos a asumir que 'quote.items' tiene 'unitPriceVenta' y 'totalVentaItem'.
        // SI NO, usamos 'unitPrice' como fallback (aunque sea costo, si no hay más info).

        const tableColumn = ["Descripción", "Cantidad", "P. Unit. (Venta)", "Total (Venta)"];
        const tableRows = [];

        (quote.items || []).forEach(item => {
            let descripcion = item.descripcion;
            const tacosMatch = item.descripcion?.match(/\+ Tacos (RECTO|INCLINADO) (\d+)mm/);
            if (tacosMatch) {
                descripcion += `\n(Incluye tacos ${tacosMatch[1]} ${tacosMatch[2]}mm)`;
            }

            // Usamos unitPriceVenta si existe (inyectado por la API), sino unitPrice
            const precio = item.unitPriceVenta ?? item.unitPrice ?? 0;
            const total = item.totalVentaItem ?? (precio * item.quantity);

            tableRows.push([
                descripcion,
                item.quantity,
                `${fmtN(precio)} €`,
                `${fmtN(total)} €`
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tableStartY,
            theme: 'grid'
        });

        const finalY = doc.lastAutoTable.finalY;

        // --- Totales ---
        doc.setFontSize(10);
        doc.text(`Subtotal:`, 145, finalY + 10);
        doc.text(`${fmtN(quote.subtotal || 0)} €`, 198, finalY + 10, { align: 'right' });

        doc.text(`IVA (${fmtN(ivaRate * 100, 0)}%):`, 145, finalY + 16);
        doc.text(`${fmtN(quote.tax || 0)} €`, 198, finalY + 16, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL:`, 145, finalY + 24);
        doc.text(`${fmtN(quote.total || 0)} €`, 198, finalY + 24, { align: 'right' });

        // --- Footer / Notas ---
        let notesY = finalY + 35;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Nota Importante:", 14, notesY);
        doc.setFont("helvetica", "normal");
        doc.text("Este presupuesto tiene una validez de quince (15) días desde la fecha presupuestada.", 14, notesY + 4);

        if (quote.notes) {
            notesY += 10;
            doc.setFont("helvetica", "bold");
            doc.text("Notas:", 14, notesY);
            doc.setFont("helvetica", "normal");
            doc.text(quote.notes, 14, notesY + 4, { maxWidth: 180 });
        }

        // --- Desglose Bandas PVC (segunda página, si hay) ---
        const bandasPVC = (quote.items || [])
            .map(item => {
                if (!item.detallesTecnicos) return null;
                try {
                    return { quantity: item.quantity, dt: JSON.parse(item.detallesTecnicos) };
                } catch { return null; }
            })
            .filter(Boolean);

        if (bandasPVC.length > 0) {
            doc.addPage();

            if (logoBase64) {
                doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
            }

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("DESGLOSE DE BANDAS PVC", 14, 22);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Presupuesto Nº: ${quote.numero}`, 14, 30);
            doc.text(new Date(quote.fechaCreacion).toLocaleDateString('es-ES'), 14, 36);
            if (client) doc.text(`Cliente: ${client.nombre}`, 14, 42);

            let y = 52;

            bandasPVC.forEach((item, idx) => {
                const { dt } = item;
                const dim = dt.dimensiones || {};
                const confLabel = dt.tipoConfeccion === 'VULCANIZADA' ? 'Sin Fin (Vulcanizado)' : dt.tipoConfeccion === 'GRAPA' ? 'Con Grapa' : 'Abierta (sin vulcanizado)';
                const headerTitle = `Banda ${idx + 1} — PVC${dim.espesor ? ' ' + dim.espesor + 'mm' : ''}${dt.color ? ' ' + dt.color : ''}`;

                doc.setFillColor(45, 45, 45);
                doc.rect(14, y, 182, 9, 'F');
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(255, 255, 255);
                doc.text(`${headerTitle}   ×${item.quantity} ud.`, 17, y + 6);
                doc.setTextColor(0, 0, 0);
                y += 13;

                const precioMaterial = dt.precioMaterial ?? 0;
                const costeVulcanizado = dt.costeVulcanizado ?? 0;
                const costeTacos = dt.costeTacos ?? 0;
                const precioUnitario = precioMaterial + costeVulcanizado + costeTacos;
                const precioTotal = precioUnitario * item.quantity;

                const bandaRows = [
                    ['Ancho', dim.ancho ? formatMm(dim.ancho) : '—'],
                    ['Largo', dim.largo ? formatMm(dim.largo) : '—'],
                    ['Espesor', dim.espesor ? `${dim.espesor} mm` : '—'],
                    ['Tipo de vulcanizado', confLabel],
                    ['Unidades', `${item.quantity} ud.`],
                    ['Material', `${fmtN(precioMaterial)} €`],
                ];

                if (costeVulcanizado > 0) {
                    const vulcLabel = dt.tipoConfeccion === 'GRAPA' ? 'Confección (Grapa)' : 'Vulcanizado';
                    bandaRows.push([vulcLabel, `${fmtN(costeVulcanizado)} €`]);
                }
                if (costeTacos > 0) {
                    bandaRows.push(['Tacos', `${fmtN(costeTacos)} €`]);
                }
                bandaRows.push(['Precio Unitario', `${fmtN(precioUnitario)} €`]);
                bandaRows.push([`Total (×${item.quantity} ud.)`, `${fmtN(precioTotal)} €`]);

                autoTable(doc, {
                    startY: y,
                    head: [['Concepto', 'Valor']],
                    body: bandaRows,
                    theme: 'grid',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
                    columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                });
                y = doc.lastAutoTable.finalY + 14;

                if (idx < bandasPVC.length - 1) {
                    doc.setDrawColor(180, 180, 180);
                    doc.line(14, y - 7, 196, y - 7);
                }
            });
        }

        // Retorna Buffer (ArrayBuffer)
        return doc.output('arraybuffer');

    } catch (error) {
        logApiError(error, "Error generating PDF");
        throw error;
    }
}

function formatMm(value) {
    return Math.round(parseFloat(value) || 0).toLocaleString('de-DE') + ' mm';
}

// Formatea la columna "Detalles" de un item (metrajes, bandas PVC, ref. fabricante)
function formatDetallesTecnicos(item) {
    if (!item.detallesTecnicos) return item.producto?.referenciaFabricante || '';
    try {
        const dt = JSON.parse(item.detallesTecnicos);
        if (dt.tipo === 'metraje') {
            const fmtMm = n => Number(n).toLocaleString('es-ES', { maximumFractionDigits: 0 });
            return `${fmtMm(dt.ancho)}mm × ${fmtMm(dt.largo)}mm`;
        }
        if (dt.dimensiones) {
            const dim = dt.dimensiones;
            const confLabel = dt.tipoConfeccion === 'VULCANIZADA' ? 'Sin Fin' : dt.tipoConfeccion === 'GRAPA' ? 'Grapa' : 'Abierta';
            let lines = `${dim.ancho} × ${dim.largo} mm · ${confLabel}`;
            if (dt.color) lines += ` · ${dt.color}`;
            if (dt.tacos) lines += `\nTacos ${dt.tacos.tipo} ${dt.tacos.altura}mm (paso: ${dt.tacos.paso}mm)`;
            return lines;
        }
    } catch { /* not JSON */ }
    return item.detallesTecnicos;
}

export async function generateOrderPDF(order, config = {}) {
    try {
        const doc = new jsPDF();
        const client = order.cliente;
        const { address, phone } = await getEmisorInfo();

        // --- Añadir Logo (cacheado en memoria) ---
        const logoBase64 = await getLogoBase64();
        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
        }

        // --- Header ---
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("NOTA DE TRABAJO", 14, 22);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(address, 200, 38, { align: 'right' });
        doc.text(`Teléfono: ${phone}`, 200, 44, { align: 'right' });

        // --- Info Pedido ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Número:`, 14, 36);
        doc.setFont("helvetica", "normal");
        doc.text(`${order.numero}`, 38, 36);

        doc.setFont("helvetica", "bold");
        doc.text(`Fecha:`, 14, 42);
        doc.setFont("helvetica", "normal");
        const formattedDate = new Date(order.fechaCreacion).toLocaleDateString('es-ES');
        doc.text(formattedDate, 38, 42);

        // --- Info Cliente (recuadro dinámico) ---
        const boxX = 14, boxY = 55, boxW = 90, lineH = 6;
        const textX = 20, maxW = boxW - 12;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const nombreLines = client ? doc.splitTextToSize(client.nombre || 'Sin cliente', maxW) : ['Sin cliente'];
        const dirLines    = client && client.direccion ? doc.splitTextToSize(client.direccion, maxW) : [];
        const emailLines  = client && client.email    ? doc.splitTextToSize(client.email, maxW)    : [];
        const allClientLines = [...nombreLines, ...dirLines, ...emailLines];
        const boxH = Math.max(28, 10 + allClientLines.length * lineH + 4);

        doc.rect(boxX, boxY, boxW, boxH);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", textX, boxY + 6);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        let clientLineY = boxY + 13;
        allClientLines.forEach(line => {
            doc.text(line, textX, clientLineY);
            clientLineY += lineH;
        });

        // --- Tabla de Items ---
        const tableStartY = boxY + boxH + 7;
        const tableColumn = ["Descripción", "Detalles", "Cantidad", "Peso Unit. (kg)", "Peso Total (kg)"];
        const tableRows = [];
        let pesoTotalGlobal = 0;

        (order.items || []).forEach(item => {
            const cantidad = item.quantity || 0;
            const pesoUnitario = item.pesoUnitario || 0;
            const pesoSubtotal = cantidad * pesoUnitario;
            pesoTotalGlobal += pesoSubtotal;

            let descripcionFila = item.descripcion;
            let detalles = 'Item manual';

            // Metraje de material crudo
            if (item.detallesTecnicos) {
                try {
                    const dt = JSON.parse(item.detallesTecnicos);
                    if (dt.tipo === 'metraje') {
                        const partes = [dt.material];
                        if (dt.acabado) partes.push(dt.acabado);
                        if (dt.espesor) partes.push(`${dt.espesor}mm`);
                        descripcionFila = partes.join(' ');
                        const fmtMm = n => Number(n).toLocaleString('es-ES', { maximumFractionDigits: 0 });
                        detalles = `${fmtMm(dt.ancho)}mm × ${fmtMm(dt.largo)}mm`;
                    }
                } catch { /* detallesTecnicos inválido, ignorar */ }
            }

            if (detalles === 'Item manual' && item.producto) {
                detalles = item.producto.nombre || 'Sin nombre';
            }

            const tacosMatch = item.descripcion?.match(/\+ Tacos (RECTO|INCLINADO) (\d+)mm/);
            if (tacosMatch) {
                detalles += `\nTacos: ${tacosMatch[1]} ${tacosMatch[2]}mm`;
            }

            tableRows.push([
                descripcionFila,
                detalles,
                cantidad,
                pesoUnitario.toLocaleString('es-ES', { minimumFractionDigits: 2 }),
                pesoSubtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tableStartY,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 50 },
                2: { cellWidth: 'auto', halign: 'center' },
                3: { cellWidth: 'auto', halign: 'right' },
                4: { cellWidth: 'auto', halign: 'right' }
            }
        });

        let finalY = doc.lastAutoTable.finalY + 15;

        // --- Totales Peso ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const pesoTotalFormateado = pesoTotalGlobal.toLocaleString('es-ES', { minimumFractionDigits: 2 });
        doc.text(`Peso Total Global:`, 125, finalY);
        doc.text(`${pesoTotalFormateado} kg`, 198, finalY, { align: 'right' });

        // --- Notas ---
        if (order.notas) {
            const notesY = finalY + 15;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Notas del Pedido:", 14, notesY);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            const textLines = doc.splitTextToSize(order.notas, 180);
            const textHeight = textLines.length * (doc.getLineHeight() / doc.internal.scaleFactor);

            doc.setDrawColor(200, 200, 200);
            doc.roundedRect(14, notesY + 3, 182, textHeight + 8, 3, 3, 'D');
            doc.text(order.notas, 18, notesY + 10, { maxWidth: 178 });
        }

        // --- Ficha Técnica PVC (segunda página, si hay bandas PVC) ---
        const bandasPVC = (order.items || [])
            .map(item => {
                if (!item.detallesTecnicos) return null;
                try {
                    const dt = JSON.parse(item.detallesTecnicos);
                    if (dt.tipo === 'metraje') return null; // los metrajes ya están en la tabla principal
                    return { descripcion: item.descripcion, quantity: item.quantity, dt };
                } catch { return null; }
            })
            .filter(Boolean);

        if (bandasPVC.length > 0) {
            const longitudBarra = config.longitud_barra_tacos ?? 2; // metros
            doc.addPage();

            if (logoBase64) {
                doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
            }

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("DETALLES TÉCNICOS PVC", 14, 22);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Pedido Nº: ${order.numero}`, 14, 30);
            doc.text(new Date(order.fechaCreacion).toLocaleDateString('es-ES'), 14, 36);
            if (order.cliente) doc.text(`Cliente: ${order.cliente.nombre}`, 14, 42);

            let y = 52;

            bandasPVC.forEach((item, idx) => {
                const { dt } = item;
                const dim = dt.dimensiones || {};
                const tacos = dt.tacos || null;
                const grapa = dt.grapa || null;
                const confLabel = dt.tipoConfeccion === 'VULCANIZADA' ? 'Sin Fin (Vulcanizado)' : dt.tipoConfeccion === 'GRAPA' ? 'Con Grapa' : 'Abierta (sin vulcanizado)';
                const headerTitle = `Banda ${idx + 1} — PVC${dim.espesor ? ' ' + dim.espesor + 'mm' : ''}${dt.color ? ' ' + dt.color : ''}`;

                // Cabecera de banda
                doc.setFillColor(45, 45, 45);
                doc.rect(14, y, 182, 9, 'F');
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(255, 255, 255);
                doc.text(`${headerTitle}   ×${item.quantity} ud.`, 17, y + 6);
                doc.setTextColor(0, 0, 0);
                y += 13;

                // Tabla de datos de banda
                const bandaRows = [
                    ['Unidades', `${item.quantity} ud.`],
                    ['Material', 'PVC'],
                    ['Espesor', dim.espesor ? `${dim.espesor} mm` : '—'],
                    ['Color', dt.color || '—'],
                    ['Ancho', dim.ancho ? formatMm(dim.ancho) : '—'],
                    ['Largo', dim.largo ? formatMm(dim.largo) : '—'],
                    ['Tipo de vulcanizado', confLabel],
                ];

                if (grapa) {
                    bandaRows.push(['Grapa', `${grapa.nombre}${grapa.fabricante ? ` (${grapa.fabricante})` : ''}`]);
                }

                autoTable(doc, {
                    startY: y,
                    head: [['Parámetro', 'Valor']],
                    body: bandaRows,
                    theme: 'grid',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
                    columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                });
                y = doc.lastAutoTable.finalY + 6;

                // Tabla de tacos (si existen)
                if (tacos) {
                    const numBarras = Math.ceil(tacos.metrosLineales / longitudBarra);
                    autoTable(doc, {
                        startY: y,
                        head: [['Configuración de Tacos', '']],
                        body: [
                            ['Tipo de taco', tacos.tipo],
                            ['Altura del taco', formatMm(tacos.altura)],
                            ['Paso entre tacos', formatMm(tacos.paso)],
                            ['Longitud del taco', formatMm(tacos.longitudTaco)],
                            ['Cantidad de tacos', `${tacos.cantidadTacos} uds`],
                            ['Metros lineales totales', `${fmtN(tacos.metrosLineales)} m`],
                            ['Barras necesarias', `${numBarras} barra${numBarras !== 1 ? 's' : ''} de ${longitudBarra} m`],
                        ],
                        theme: 'grid',
                        styles: { fontSize: 9 },
                        headStyles: { fillColor: [40, 100, 160], textColor: 255, fontStyle: 'bold', colSpan: 2 },
                        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                    });
                    y = doc.lastAutoTable.finalY + 6;
                }

                y += 8;
                if (idx < bandasPVC.length - 1) {
                    doc.setDrawColor(180, 180, 180);
                    doc.line(14, y - 4, 196, y - 4);
                }
            });
        }

        return doc.output('arraybuffer');

    } catch (error) {
        logApiError(error, "Error generating Order PDF");
        throw error;
    }
}

// PDF simplificado para dejar en el taller: cliente, artículos, peso y precio.
// Sin márgenes, sin referencias internas, sin notas internas.
export async function generateTallerPDF(order, { valorado = false, pedidoUrl = null, margenRule = null, ivaRate = 0.21 } = {}) {
    try {
        const doc    = new jsPDF();
        const client = order.cliente;
        const ML = 14;   // margin left
        const MR = 196;  // margin right (text align right)
        const PW = 210;  // page width

        const logoBase64 = await getLogoBase64();

        // ── Cabecera blanca ───────────────────────────────────────────
        const BAND_H = 22;

        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 10, 5, 35, 12);
        }

        const titleX = logoBase64 ? 52 : ML;
        doc.setTextColor(26, 26, 26);
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("NOTA DE TALLER", titleX, 14);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(order.numero, MR, 11, { align: 'right' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
            new Date(order.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
            MR, 18, { align: 'right' },
        );
        // Línea separadora bajo la cabecera
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.4);
        doc.line(ML, BAND_H, PW - ML, BAND_H);
        doc.setTextColor(0, 0, 0);

        // ── Bloque cliente ────────────────────────────────────────────
        let y = BAND_H + 8;

        const clienteNombre = client?.nombre    || 'Sin cliente';
        const clienteNif    = client?.nif       || '';
        const clienteDir    = client?.direccion || '';
        const clienteTel    = client?.telefono  || '';
        const clienteEmail  = client?.email     || '';

        const clienteDetails = [
            clienteNif  ? `NIF: ${clienteNif}` : null,
            clienteDir  || null,
            [clienteTel, clienteEmail].filter(Boolean).join(' · ') || null,
        ].filter(Boolean);

        // Dibujar etiqueta + nombre
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(140, 140, 140);
        doc.text("CLIENTE", ML + 3, y + 4);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(26, 26, 26);
        doc.text(clienteNombre, ML + 3, y + 10);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        let detailY = y + 16;
        for (const line of clienteDetails) {
            doc.text(line, ML + 3, detailY);
            detailY += 5;
        }

        // Línea vertical accent izquierda
        doc.setDrawColor(31, 45, 58);
        doc.setLineWidth(0.9);
        doc.line(ML, y, ML, detailY - 1);
        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200);

        doc.setTextColor(0, 0, 0);
        y = detailY + 6;

        // ── Tabla ─────────────────────────────────────────────────────
        const tableRows = [];
        let pesoTotal   = 0;
        let importeTotal = 0;

        // Pre-cálculo del margen para la versión valorada
        const multiplicador = margenRule?.multiplicador ?? 1;
        const gastoFijoTotal = margenRule?.gastoFijo ?? 0;
        const totalUnidades = (order.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
        const gastoFijoUnitario = totalUnidades > 0 ? gastoFijoTotal / totalUnidades : 0;

        // Columna Descripción: nombre + material + dimensiones del producto
        const getDescripcion = (item) => {
            const lines = [item.descripcion || item.producto?.nombre || ''];
            const prod = item.producto;
            if (prod) {
                const meta = [];
                if (prod.material?.nombre) meta.push(prod.material.nombre);
                const dims = [
                    prod.espesor != null ? `${prod.espesor}mm` : null,
                    prod.ancho   != null ? `${prod.ancho}mm`   : null,
                    prod.largo   != null ? `${prod.largo}mm`   : null,
                ].filter(Boolean);
                if (dims.length) meta.push(dims.join(' × '));
                if (prod.color) meta.push(prod.color);
                if (meta.length) lines.push(meta.join(' · '));
            }
            return lines.join('\n');
        };

        // Columna Detalles: usa el helper de módulo
        const getDetalles = (item) => formatDetallesTecnicos(item);

        for (const item of order.items || []) {
            const qty           = item.quantity || 0;
            const costoUnitario = item.unitPrice || 0;
            // Fallback al peso del producto si el item no tiene peso guardado
            const peso       = item.pesoUnitario || item.producto?.pesoUnitario || 0;
            const pesoLinea  = qty * peso;
            pesoTotal += pesoLinea;

            // Precio de venta: aplicar margen si es valorado y hay regla definida
            const precioVenta = (valorado && margenRule)
                ? costoUnitario * multiplicador + gastoFijoUnitario
                : costoUnitario;
            const importeLin = qty * precioVenta;
            importeTotal += importeLin;

            const descripcion = getDescripcion(item);
            const detalles    = getDetalles(item);

            if (valorado) {
                tableRows.push([
                    descripcion,
                    detalles,
                    qty.toString(),
                    `${fmtN(precioVenta)} €`,
                    `${fmtN(importeLin)} €`,
                    fmtN(peso),
                    fmtN(pesoLinea),
                ]);
            } else {
                tableRows.push([
                    descripcion,
                    detalles,
                    qty.toString(),
                    fmtN(peso),
                    fmtN(pesoLinea),
                ]);
            }
        }

        const head = valorado
            ? [["Descripción", "Detalles", "Cant.", "Precio/ud", "Total línea", "Peso unit. (kg)", "Peso total (kg)"]]
            : [["Descripción", "Detalles", "Cant.", "Peso unit. (kg)", "Peso total (kg)"]];

        // Ancho útil: 210 - 14 (ML) - 14 (MR) = 182 mm
        const colStyles = valorado ? {
            // 50+34+18+20+20+20+20 = 182
            0: { cellWidth: 50 },
            1: { cellWidth: 34, fontSize: 8 },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'right',  cellWidth: 20 },
            4: { halign: 'right',  cellWidth: 20 },
            5: { halign: 'right',  cellWidth: 20 },
            6: { halign: 'right',  cellWidth: 20 },
        } : {
            // 62+46+18+28+28 = 182
            0: { cellWidth: 62 },
            1: { cellWidth: 46, fontSize: 8 },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'right',  cellWidth: 28 },
            4: { halign: 'right',  cellWidth: 28 },
        };

        autoTable(doc, {
            head,
            body: tableRows,
            startY: y,
            margin: { left: ML, right: PW - MR },
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [31, 45, 58], textColor: 255, fontStyle: 'bold' },
            columnStyles: colStyles,
        });

        let finalY = doc.lastAutoTable.finalY + 7;

        // ── Peso total ────────────────────────────────────────────────
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(90, 90, 90);
        doc.text("Peso total:", 128, finalY);
        doc.setTextColor(26, 26, 26);
        doc.text(`${fmtN(pesoTotal)} kg`, MR, finalY, { align: 'right' });
        finalY += 8;

        // ── Desglose económico (solo si valorado) ─────────────────────
        if (valorado) {
            const tax = importeTotal * ivaRate;
            const totalConIva = importeTotal + tax;
            const margenLabel = margenRule && margenRule.multiplicador > 1
                ? ` (×${margenRule.multiplicador})`
                : '';

            // Subtotal
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(90, 90, 90);
            doc.text(`Subtotal${margenLabel}:`, 128, finalY);
            doc.setTextColor(26, 26, 26);
            doc.text(`${fmtN(importeTotal)} €`, MR, finalY, { align: 'right' });
            finalY += 6;

            // IVA
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(90, 90, 90);
            doc.text(`Impuestos (${fmtN(ivaRate * 100, 0)}%):`, 128, finalY);
            doc.setTextColor(26, 26, 26);
            doc.text(`${fmtN(tax)} €`, MR, finalY, { align: 'right' });
            finalY += 7;

            // TOTAL con IVA
            doc.setFillColor(31, 45, 58);
            doc.rect(112, finalY - 7, 86, 12, 'F');
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text("TOTAL:", 116, finalY);
            doc.text(`${fmtN(totalConIva)} €`, MR, finalY, { align: 'right' });
            doc.setTextColor(0, 0, 0);
            finalY += 14;
        }

        // ── Notas del pedido ──────────────────────────────────────────
        if (order.notas) {
            finalY += 2;
            const notasLines = doc.splitTextToSize(order.notas, 172);
            const notasH = 9 + notasLines.length * 5;

            doc.setFillColor(242, 241, 238);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.rect(ML, finalY, 182, notasH, 'FD');

            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(130, 130, 130);
            doc.text("NOTAS", ML + 3, finalY + 5);

            doc.setFontSize(8.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(26, 26, 26);
            doc.text(notasLines, ML + 3, finalY + 10);
            finalY += notasH + 8;
        }

        // ── QR ───────────────────────────────────────────────────────
        if (pedidoUrl) {
            try {
                const qrDataUrl = await QRCode.toDataURL(pedidoUrl, {
                    width: 100, margin: 1,
                    color: { dark: '#1f2d3a', light: '#ffffff' },
                });
                const QR_SIZE = 26;
                doc.addImage(qrDataUrl, 'PNG', ML, finalY, QR_SIZE, QR_SIZE);

                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(26, 26, 26);
                doc.text("ACCESO AL PEDIDO", ML + QR_SIZE + 5, finalY + 8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 100, 100);
                doc.text(`Escanea para abrir ${order.numero} en el sistema`, ML + QR_SIZE + 5, finalY + 14);
            } catch (qrErr) {
                logApiError(qrErr, 'QR en taller PDF');
            }
        }

        // ── Ficha Técnica PVC (segunda página) ───────────────────────
        const bandasPVC = (order.items || [])
            .map(item => {
                if (!item.detallesTecnicos) return null;
                try {
                    const dt = JSON.parse(item.detallesTecnicos);
                    if (!dt.dimensiones) return null;
                    return { descripcion: item.descripcion, quantity: item.quantity, dt };
                } catch { return null; }
            })
            .filter(Boolean);

        if (bandasPVC.length > 0) {
            let longitudBarra = 2;
            try {
                const cfg = await db.config.findUnique({ where: { key: 'longitud_barra_tacos' } });
                if (cfg) longitudBarra = parseFloat(cfg.value) || 2;
            } catch { /* usa el default */ }

            doc.addPage();

            if (logoBase64) {
                doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
            }

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text("DETALLES TÉCNICOS PVC", ML, 22);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Pedido Nº: ${order.numero}`, ML, 30);
            doc.text(new Date(order.fechaCreacion).toLocaleDateString('es-ES'), ML, 36);
            if (order.cliente) doc.text(`Cliente: ${order.cliente.nombre}`, ML, 42);

            let yp = 52;

            bandasPVC.forEach((item, idx) => {
                const { dt } = item;
                const dim = dt.dimensiones || {};
                const tacos = dt.tacos || null;
                const grapa = dt.grapa || null;
                const confLabel = dt.tipoConfeccion === 'VULCANIZADA' ? 'Sin Fin (Vulcanizado)' : dt.tipoConfeccion === 'GRAPA' ? 'Con Grapa' : 'Abierta (sin vulcanizado)';
                const headerTitle = `Banda ${idx + 1}  ×${item.quantity} ud.`;

                doc.setFillColor(31, 45, 58);
                doc.rect(ML, yp, 182, 9, 'F');
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(255, 255, 255);
                doc.text(headerTitle, ML + 3, yp + 6);
                doc.setTextColor(0, 0, 0);
                yp += 13;

                const bandaRows = [
                    ['Descripción', item.descripcion || '—'],
                    ['Material', 'PVC'],
                    ['Espesor', dim.espesor ? `${dim.espesor} mm` : '—'],
                    ['Color', dt.color || '—'],
                    ['Ancho', dim.ancho ? formatMm(dim.ancho) : '—'],
                    ['Largo', dim.largo ? formatMm(dim.largo) : '—'],
                    ['Tipo confección', confLabel],
                ];
                if (grapa) {
                    bandaRows.push(['Grapa', `${grapa.nombre}${grapa.tipo === 'UNA' ? ' (Uña)' : ''}`]);
                }

                autoTable(doc, {
                    startY: yp,
                    head: [['Parámetro', 'Valor']],
                    body: bandaRows,
                    theme: 'grid',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
                    columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                    margin: { left: ML, right: PW - MR },
                });
                yp = doc.lastAutoTable.finalY + 6;

                if (tacos) {
                    const numBarras = Math.ceil(tacos.metrosLineales / longitudBarra);
                    autoTable(doc, {
                        startY: yp,
                        head: [['Configuración de Tacos', '']],
                        body: [
                            ['Tipo de taco', tacos.tipo],
                            ['Altura del taco', formatMm(tacos.altura)],
                            ['Paso entre tacos', formatMm(tacos.paso)],
                            ['Longitud del taco', formatMm(tacos.longitudTaco)],
                            ['Cantidad de tacos', `${tacos.cantidadTacos} uds`],
                            ['Metros lineales totales', `${fmtN(tacos.metrosLineales)} m`],
                            ['Barras necesarias', `${numBarras} barra${numBarras !== 1 ? 's' : ''} de ${longitudBarra} m`],
                        ],
                        theme: 'grid',
                        styles: { fontSize: 9 },
                        headStyles: { fillColor: [40, 100, 160], textColor: 255, fontStyle: 'bold' },
                        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                        margin: { left: ML, right: PW - MR },
                    });
                    yp = doc.lastAutoTable.finalY + 6;
                }

                yp += 8;
                if (idx < bandasPVC.length - 1) {
                    doc.setDrawColor(180, 180, 180);
                    doc.line(ML, yp - 4, MR, yp - 4);
                }
            });
        }

        return Buffer.from(doc.output('arraybuffer'));

    } catch (error) {
        logApiError(error, "Error generating Taller PDF");
        throw error;
    }
}

// PDF que agrupa múltiples pedidos en un único documento continuo (ahorra papel)
export async function generateBatchTallerPDF(orders) {
    try {
        const doc      = new jsPDF();
        const ML       = 14;
        const MR       = 196;
        const PW       = 210;
        const PAGE_H   = 297;
        const BOT_MAR  = 14; // reserva inferior por si autoTable quiere más margen

        const logoBase64 = await getLogoBase64();

        // ── Cabecera única del documento ─────────────────────────────
        const HEADER_H = 23;
        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 10, 5, 35, 12);
        }
        const titleX = logoBase64 ? 52 : ML;
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(26, 26, 26);
        doc.text("NOTAS DE TALLER", titleX, 14);

        const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(fechaHoy, MR, 11, { align: 'right' });
        doc.text(`${orders.length} pedido${orders.length !== 1 ? 's' : ''}`, MR, 17, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.4);
        doc.line(ML, HEADER_H, PW - ML, HEADER_H);

        let y = HEADER_H + 5;

        // ── Un bloque por pedido ──────────────────────────────────────
        for (let idx = 0; idx < orders.length; idx++) {
            const order  = orders[idx];
            const client = order.cliente;

            // Si quedan menos de 50 mm, nueva página
            if (y > PAGE_H - BOT_MAR - 50) {
                doc.addPage();
                y = 12;
            }

            // Número + fecha del pedido (esquina derecha, pequeño)
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(31, 45, 58);
            doc.text(order.numero, MR, y + 5, { align: 'right' });
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(140, 140, 140);
            const fechaPedido = order.fechaCreacion
                ? new Date(order.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                : '';
            doc.text(fechaPedido, MR, y + 10, { align: 'right' });
            doc.setTextColor(0, 0, 0);

            // Bloque cliente
            const clienteNombre  = client?.nombre   || 'Sin cliente';
            const clienteTel     = client?.telefono || '';
            const clienteEmail   = client?.email    || '';
            const contactLine    = [clienteTel, clienteEmail].filter(Boolean).join(' · ');

            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(140, 140, 140);
            doc.text("CLIENTE", ML + 3, y + 5);

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(26, 26, 26);
            doc.text(clienteNombre, ML + 3, y + 11);

            let detailY = y + 16;
            if (contactLine) {
                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(contactLine, ML + 3, detailY);
                detailY += 4;
            }

            // Línea vertical de acento
            doc.setDrawColor(31, 45, 58);
            doc.setLineWidth(0.9);
            doc.line(ML, y, ML, detailY);
            doc.setLineWidth(0.3);
            doc.setDrawColor(200, 200, 200);
            doc.setTextColor(0, 0, 0);

            y = detailY + 4;

            // Tabla de ítems
            const tableRows = [];
            let pesoTotal   = 0;

            for (const item of order.items || []) {
                const qty       = Number(item.quantity) || 0;
                const peso      = Number(item.pesoUnitario) || Number(item.producto?.pesoUnitario) || 0;
                const pesoLinea = qty * peso;
                pesoTotal      += pesoLinea;

                const descripcion = item.descripcion || item.producto?.nombre || '';
                const detalles    = formatDetallesTecnicos(item);
                tableRows.push([descripcion, detalles, qty.toString(), fmtN(peso), fmtN(pesoLinea)]);
            }

            autoTable(doc, {
                startY: y,
                head: [["Descripción", "Detalles", "Cant.", "Peso unit. (kg)", "Peso total (kg)"]],
                body: tableRows.length > 0 ? tableRows : [["Sin líneas", "", "", "", ""]],
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [31, 45, 58], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 62 },
                    1: { cellWidth: 46, fontSize: 7 },
                    2: { halign: 'center', cellWidth: 14 },
                    3: { halign: 'right',  cellWidth: 28 },
                    4: { halign: 'right',  cellWidth: 28 },
                },
                margin: { left: ML, right: PW - MR },
            });

            y = doc.lastAutoTable.finalY + 3;

            // Peso total
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(90, 90, 90);
            doc.text("Peso total:", 130, y + 4);
            doc.setTextColor(26, 26, 26);
            doc.text(`${fmtN(pesoTotal)} kg`, MR, y + 4, { align: 'right' });
            y += 10;

            // Notas
            if (order.notas) {
                const notasLines = doc.splitTextToSize(order.notas, 170);
                const notasH     = 9 + notasLines.length * 4;

                if (y + notasH > PAGE_H - BOT_MAR) {
                    doc.addPage();
                    y = 12;
                }

                doc.setFillColor(242, 241, 238);
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.rect(ML, y, 182, notasH, 'FD');
                doc.setFontSize(6);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(130, 130, 130);
                doc.text("NOTAS", ML + 2, y + 4);
                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(26, 26, 26);
                doc.text(notasLines, ML + 2, y + 9);
                y += notasH + 5;
            }

            // Separador (excepto tras el último pedido)
            if (idx < orders.length - 1) {
                if (y + 5 > PAGE_H - BOT_MAR) {
                    doc.addPage();
                    y = 12;
                } else {
                    doc.setDrawColor(160, 160, 160);
                    doc.setLineWidth(0.5);
                    doc.line(ML, y, MR, y);
                    y += 7;
                }
            }
        }

        // ── Fichas técnicas PVC al final (una sección por orden) ─────
        const ordenesPVC = orders
            .map(order => ({
                order,
                bandas: (order.items || []).map(item => {
                    if (!item.detallesTecnicos) return null;
                    try {
                        const dt = JSON.parse(item.detallesTecnicos);
                        if (!dt.dimensiones) return null;
                        return { descripcion: item.descripcion, quantity: item.quantity, dt };
                    } catch { return null; }
                }).filter(Boolean),
            }))
            .filter(o => o.bandas.length > 0);

        if (ordenesPVC.length > 0) {
            let longitudBarra = 2;
            try {
                const cfg = await db.config.findUnique({ where: { key: 'longitud_barra_tacos' } });
                if (cfg) longitudBarra = parseFloat(cfg.value) || 2;
            } catch { /* default */ }

            doc.addPage();
            if (logoBase64) {
                doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
            }
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text("DETALLES TÉCNICOS PVC", ML, 22);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(fechaHoy, ML, 29);
            doc.setTextColor(0, 0, 0);

            let yp = 36;

            for (const { order, bandas } of ordenesPVC) {
                // Subheader de pedido
                doc.setFillColor(60, 60, 60);
                doc.rect(ML, yp, 182, 8, 'F');
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(255, 255, 255);
                doc.text(`${order.numero}  —  ${order.cliente?.nombre || ''}`, ML + 3, yp + 5.5);
                doc.setTextColor(0, 0, 0);
                yp += 12;

                bandas.forEach((item, bandaIdx) => {
                    if (yp > PAGE_H - BOT_MAR - 50) {
                        doc.addPage();
                        yp = 14;
                    }

                    const { dt } = item;
                    const dim   = dt.dimensiones || {};
                    const tacos = dt.tacos || null;
                    const grapa = dt.grapa || null;
                    const confLabel = dt.tipoConfeccion === 'VULCANIZADA' ? 'Sin Fin (Vulcanizado)' : dt.tipoConfeccion === 'GRAPA' ? 'Con Grapa' : 'Abierta';

                    doc.setFillColor(31, 45, 58);
                    doc.rect(ML, yp, 182, 8, 'F');
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(255, 255, 255);
                    doc.text(`Banda ${bandaIdx + 1}  ×${item.quantity} ud.`, ML + 3, yp + 5.5);
                    doc.setTextColor(0, 0, 0);
                    yp += 11;

                    const bandaRows = [
                        ['Descripción', item.descripcion || '—'],
                        ['Material', 'PVC'],
                        ['Espesor', dim.espesor ? `${dim.espesor} mm` : '—'],
                        ['Color', dt.color || '—'],
                        ['Ancho', dim.ancho ? formatMm(dim.ancho) : '—'],
                        ['Largo', dim.largo ? formatMm(dim.largo) : '—'],
                        ['Tipo confección', confLabel],
                    ];
                    if (grapa) bandaRows.push(['Grapa', `${grapa.nombre}${grapa.tipo === 'UNA' ? ' (Uña)' : ''}`]);

                    autoTable(doc, {
                        startY: yp,
                        head: [['Parámetro', 'Valor']],
                        body: bandaRows,
                        theme: 'grid',
                        styles: { fontSize: 9 },
                        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
                        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                        margin: { left: ML, right: PW - MR },
                    });
                    yp = doc.lastAutoTable.finalY + 5;

                    if (tacos) {
                        const numBarras = Math.ceil(tacos.metrosLineales / longitudBarra);
                        autoTable(doc, {
                            startY: yp,
                            head: [['Configuración de Tacos', '']],
                            body: [
                                ['Tipo de taco', tacos.tipo],
                                ['Altura del taco', formatMm(tacos.altura)],
                                ['Paso entre tacos', formatMm(tacos.paso)],
                                ['Longitud del taco', formatMm(tacos.longitudTaco)],
                                ['Cantidad de tacos', `${tacos.cantidadTacos} uds`],
                                ['Metros lineales totales', `${fmtN(tacos.metrosLineales)} m`],
                                ['Barras necesarias', `${numBarras} barra${numBarras !== 1 ? 's' : ''} de ${longitudBarra} m`],
                            ],
                            theme: 'grid',
                            styles: { fontSize: 9 },
                            headStyles: { fillColor: [40, 100, 160], textColor: 255, fontStyle: 'bold' },
                            columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                            margin: { left: ML, right: PW - MR },
                        });
                        yp = doc.lastAutoTable.finalY + 5;
                    }
                    yp += 6;
                });
            }
        }

        return Buffer.from(doc.output('arraybuffer'));

    } catch (error) {
        logApiError(error, "Error generating batch taller PDF");
        throw error;
    }
}

export async function generateFacturaPDF(factura, ivaRate = 0.21) {
    try {
        const doc = new jsPDF();
        const client = factura.cliente;
        const { address, phone } = await getEmisorInfo();

        const logoBase64 = await getLogoBase64();
        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
        }

        // --- Cabecera ---
        const esRectificativa = factura.tipoFactura?.startsWith('R');
        doc.setFontSize(esRectificativa ? 16 : 22);
        doc.setFont("helvetica", "bold");
        doc.text(esRectificativa ? 'FACTURA RECTIFICATIVA' : 'FACTURA', 14, 22);

        if (esRectificativa) {
          const TIPO_LABEL = { R1: 'R1 — Error fundado en derecho', R2: 'R2 — Concurso de acreedores', R3: 'R3 — Deudas incobrables', R4: 'R4 — Corrección de errores', R5: 'R5 — Simplificada' };
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150, 80, 0);
          doc.text(TIPO_LABEL[factura.tipoFactura] || factura.tipoFactura, 14, 27);
          doc.setTextColor(0, 0, 0);
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(address, 200, 38, { align: 'right' });
        doc.text(`Teléfono: ${phone}`, 200, 44, { align: 'right' });

        // --- Datos factura ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text('Número:', 14, 34);
        doc.setFont("helvetica", "normal");
        doc.text(factura.numero, 38, 34);

        doc.setFont("helvetica", "bold");
        doc.text('Fecha:', 14, 40);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(factura.fechaCreacion).toLocaleDateString('es-ES'), 38, 40);

        if (factura.fechaVencimiento) {
            doc.setFont("helvetica", "bold");
            doc.text('Vencimiento:', 14, 46);
            doc.setFont("helvetica", "normal");
            doc.text(new Date(factura.fechaVencimiento).toLocaleDateString('es-ES'), 46, 46);
        }

        let refY = factura.fechaVencimiento ? 52 : 46;
        if (esRectificativa && factura.facturaOriginal) {
            doc.setFont("helvetica", "bold");
            doc.text('Rectifica:', 14, refY);
            doc.setFont("helvetica", "normal");
            doc.text(factura.facturaOriginal.numero, 40, refY);
            refY += 6;
        }

        if (factura.albaran) {
            doc.setFont("helvetica", "bold");
            doc.text('Albarán:', 14, refY);
            doc.setFont("helvetica", "normal");
            doc.text(factura.albaran.numero, 38, refY);
        } else if (factura.pedido) {
            doc.setFont("helvetica", "bold");
            doc.text('Pedido:', 14, refY);
            doc.setFont("helvetica", "normal");
            doc.text(factura.pedido.numero, 38, refY);
        }

        // --- Recuadro cliente ---
        const clientBoxY = refY + 6;
        doc.rect(14, clientBoxY, 90, 28);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text('Cliente:', 20, clientBoxY + 7);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        if (client) {
            doc.text(client.nombre || '', 20, clientBoxY + 13);
            const dir = doc.splitTextToSize(client.direccion || '', 80);
            doc.text(dir, 20, clientBoxY + 19);
        }

        // --- Tabla de ítems ---
        const tableRows = (factura.items || []).map(item => [
            item.descripcion,
            item.quantity,
            `${fmtN(item.unitPrice)} €`,
            `${fmtN(item.quantity * item.unitPrice)} €`,
        ]);

        autoTable(doc, {
            head: [["Descripción", "Cant.", "P. Unit.", "Total"]],
            body: tableRows,
            startY: clientBoxY + 32,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 32, halign: 'right' },
                3: { cellWidth: 32, halign: 'right' },
            },
        });

        const finalY = doc.lastAutoTable.finalY;

        // --- Desglose IVA (recuadro) ---
        const ivaBoxX = 120;
        const ivaBoxY = finalY + 8;
        doc.setDrawColor(180, 180, 180);
        doc.roundedRect(ivaBoxX, ivaBoxY, 76, 32, 2, 2);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text('Base imponible:', ivaBoxX + 4, ivaBoxY + 8);
        doc.text(`${fmtN(factura.subtotal || 0)} €`, ivaBoxX + 72, ivaBoxY + 8, { align: 'right' });

        doc.text(`IVA (${Math.round(ivaRate * 100)}%):`, ivaBoxX + 4, ivaBoxY + 15);
        doc.text(`${fmtN(factura.tax || 0)} €`, ivaBoxX + 72, ivaBoxY + 15, { align: 'right' });

        doc.setDrawColor(100, 100, 100);
        doc.line(ivaBoxX + 4, ivaBoxY + 19, ivaBoxX + 72, ivaBoxY + 19);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text('TOTAL:', ivaBoxX + 4, ivaBoxY + 26);
        doc.text(`${fmtN(factura.total || 0)} €`, ivaBoxX + 72, ivaBoxY + 26, { align: 'right' });

        // --- Notas ---
        if (factura.notas) {
            const notesY = ivaBoxY + 40;
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text('Notas:', 14, notesY);
            doc.setFont("helvetica", "normal");
            doc.text(factura.notas, 14, notesY + 5, { maxWidth: 100 });
        }

        // --- Firma ---
        const qrAreaY = Math.max(ivaBoxY + 42, 240);
        const firmaY = qrAreaY;
        doc.setFontSize(9);
        doc.line(14, firmaY, 80, firmaY);
        doc.line(120, firmaY, 196, firmaY);
        doc.text('Conforme — firma del cliente', 14, firmaY + 4);
        doc.text('Sello y firma empresa', 120, firmaY + 4);

        return doc.output('arraybuffer');
    } catch (error) {
        logApiError(error, 'Error generating Factura PDF');
        throw error;
    }
}

export async function generateAlbaranPDF(albaran) {
    try {
        const doc = new jsPDF();
        const client = albaran.cliente;
        const { address, phone } = await getEmisorInfo();

        const logoBase64 = await getLogoBase64();
        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
        }

        // --- Cabecera ---
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("ALBARÁN DE ENTREGA", 14, 22);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(address, 200, 38, { align: 'right' });
        doc.text(`Teléfono: ${phone}`, 200, 44, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Número:`, 14, 36);
        doc.setFont("helvetica", "normal");
        doc.text(albaran.numero, 38, 36);

        doc.setFont("helvetica", "bold");
        doc.text(`Fecha:`, 14, 42);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(albaran.fechaCreacion).toLocaleDateString('es-ES'), 38, 42);

        // Badge "SIN VALORAR" en cabecera si aplica
        if (albaran.valorado === false) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(180, 90, 0);
            doc.text('SIN VALORAR', 14, 49);
            doc.setTextColor(0, 0, 0);
        }

        // --- Recuadro cliente ---
        const clientY = albaran.valorado === false ? 57 : 54;
        doc.rect(14, clientY, 90, 28);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 20, clientY + 6);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        if (client) {
            doc.text(client.nombre || '', 20, clientY + 12);
            const dir = doc.splitTextToSize(client.direccion || 'Dirección no especificada', 80);
            doc.text(dir, 20, clientY + 18);
        }

        // --- Tabla de ítems ---
        const valorado = albaran.valorado !== false;
        const tableRows = (albaran.items || []).map(item =>
            valorado
                ? [item.descripcion, item.quantity, `${fmtN(item.unitPrice)} €`, `${fmtN(item.quantity * item.unitPrice)} €`]
                : [item.descripcion, item.quantity]
        );

        autoTable(doc, {
            head: [valorado ? ["Descripción", "Cantidad", "P. Unit.", "Total"] : ["Descripción", "Cantidad"]],
            body: tableRows,
            startY: clientY + 33,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
            columnStyles: valorado
                ? { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' } }
                : { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35, halign: 'center' } },
        });

        const finalY = doc.lastAutoTable.finalY;

        // --- Totales (solo albarán valorado) ---
        if (valorado) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Subtotal:`, 145, finalY + 10);
            doc.text(`${fmtN(albaran.subtotal || 0)} €`, 198, finalY + 10, { align: 'right' });
            doc.text(`IVA (21%):`, 145, finalY + 16);
            doc.text(`${fmtN(albaran.tax || 0)} €`, 198, finalY + 16, { align: 'right' });
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL:`, 145, finalY + 24);
            doc.text(`${fmtN(albaran.total || 0)} €`, 198, finalY + 24, { align: 'right' });
        }

        // --- Notas ---
        const totalesOffset = valorado ? 35 : 15;
        if (albaran.notas) {
            const notesY = finalY + totalesOffset;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Notas:", 14, notesY);
            doc.setFont("helvetica", "normal");
            doc.text(albaran.notas, 14, notesY + 6, { maxWidth: 180 });
        }

        // --- Firma ---
        const firmaY = Math.max(finalY + totalesOffset + 20, 230);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.line(14, firmaY, 80, firmaY);
        doc.line(120, firmaY, 196, firmaY);
        doc.text("Firma del receptor", 14, firmaY + 5);
        doc.text("Sello y firma empresa", 120, firmaY + 5);

        return doc.output('arraybuffer');
    } catch (error) {
        logApiError(error, "Error generating Albaran PDF");
        throw error;
    }
}

export async function generarCartaPortePDF(datos) {
    try {
        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 14;

        const logoBase64 = await getLogoBase64();
        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', pageW - 65, 10, 50, 15);
        }

        // Título y cabecera
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('CARTA DE PORTE', margin, 22);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        const fecha = datos.fecha
            ? new Date(datos.fecha + 'T00:00:00').toLocaleDateString('es-ES')
            : new Date().toLocaleDateString('es-ES');
        doc.text(`Fecha: ${fecha}`, margin, 30);
        if (datos.referencia) doc.text(`Referencia: ${datos.referencia}`, margin + 50, 30);
        if (datos.agencia) doc.text(`Agencia: ${datos.agencia}`, margin + 110, 30);
        doc.setTextColor(0);

        // Boxes Expedidor / Destinatario
        const boxTop = 38;
        const boxH = 44;
        const colW = (pageW - margin * 2 - 6) / 2;

        const renderBox = (label, info, x) => {
            doc.setDrawColor(160);
            doc.setFillColor(245, 245, 245);
            doc.rect(x, boxTop - 5, colW, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(40);
            doc.text(label, x + 2, boxTop - 0.5);
            doc.setTextColor(0);
            doc.setDrawColor(160);
            doc.rect(x, boxTop, colW, boxH);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            let y = boxTop + 7;
            if (info.nombre)   { doc.setFont('helvetica', 'bold'); doc.text(info.nombre, x + 3, y); doc.setFont('helvetica', 'normal'); y += 6; }
            if (info.direccion) { doc.text(info.direccion, x + 3, y); y += 6; }
            if (info.cp || info.ciudad) { doc.text(`${info.cp || ''} ${info.ciudad || ''}`.trim(), x + 3, y); y += 6; }
            if (info.telefono) { doc.text(`Tel: ${info.telefono}`, x + 3, y); y += 6; }
            if (info.nif)      { doc.text(`NIF: ${info.nif}`, x + 3, y); }
        };

        renderBox('EXPEDIDOR (REMITENTE)', datos.expedidor || {}, margin);
        renderBox('DESTINATARIO (CONSIGNATARIO)', datos.destinatario || {}, margin + colW + 6);

        let curY = boxTop + boxH + 14;

        // Tabla mercancía
        const rows = (datos.mercancias || []).map(r => [
            r.descripcion || '',
            r.numPales != null ? String(r.numPales) : '',
            r.numBultos != null ? String(r.numBultos) : '',
            r.pesoBruto != null ? `${r.pesoBruto} kg` : '',
            r.valorDeclarado != null ? `${r.valorDeclarado} €` : '',
        ]);

        autoTable(doc, {
            head: [['Descripción de la mercancía', 'Nº Palés', 'Nº Bultos', 'Peso bruto', 'Valor declarado']],
            body: rows.length ? rows : [['', '', '', '', '']],
            startY: curY,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], fontSize: 8, textColor: 255 },
            bodyStyles: { fontSize: 9, minCellHeight: 8 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 22, halign: 'center' },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 32, halign: 'right' },
            },
            margin: { left: margin, right: margin },
        });
        curY = doc.lastAutoTable.finalY + 10;

        // Observaciones
        if (datos.observaciones) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, curY - 1, pageW - margin * 2, 6, 'F');
            doc.text('OBSERVACIONES', margin + 2, curY + 3.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(datos.observaciones, pageW - margin * 2 - 4);
            doc.text(lines, margin + 2, curY + 11);
            curY += 12 + lines.length * 5;
        }

        // Área de firmas
        const firmaY = Math.max(curY + 12, 238);
        const sigW = (pageW - margin * 2 - 12) / 3;
        doc.setDrawColor(140);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        ['FIRMA EXPEDIDOR', 'FIRMA TRANSPORTISTA', 'FIRMA DESTINATARIO'].forEach((label, i) => {
            const x = margin + i * (sigW + 6);
            doc.rect(x, firmaY, sigW, 22);
            doc.text(label, x + sigW / 2, firmaY + 27, { align: 'center' });
        });

        // Nota pie
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text('Documento generado por CRM Taller', pageW / 2, 290, { align: 'center' });
        doc.setTextColor(0);

        // Inventario de palés (T-35) — página adicional
        if (datos.pales && datos.pales.length > 0) {
            doc.addPage();

            if (logoBase64) {
                doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', pageW - 65, 10, 50, 15);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('INVENTARIO DE PALÉS', margin, 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Referencia: ${datos.referencia || '—'}   Fecha: ${fecha}`, margin, 30);
            doc.setTextColor(0);

            let paleY = 38;

            for (const pale of datos.pales) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                const paleTitle = `Palé ${pale.numero}${pale.descripcion ? `  —  ${pale.descripcion}` : ''}`;
                doc.text(paleTitle, margin, paleY);
                paleY += 3;

                const items = pale.items || [];
                const pesoTotal = items.reduce((s, it) => s + (parseFloat(it.peso) || 0), 0);
                const metrosTotal = items.reduce((s, it) => s + (parseFloat(it.metros) || 0), 0);
                const rollosTotal = items.reduce((s, it) => s + (parseFloat(it.numRollos) || 0), 0);

                autoTable(doc, {
                    head: [['Referencia', 'Descripción', 'Nº Rollos', 'Metros', 'Peso est. (kg)']],
                    body: items.map(it => [
                        it.referencia || '',
                        it.descripcion || '',
                        it.numRollos != null ? String(it.numRollos) : '',
                        it.metros != null ? String(it.metros) : '',
                        it.peso != null ? String(it.peso) : '',
                    ]),
                    foot: [['', 'TOTALES', String(rollosTotal), fmtN(metrosTotal, 1), `${fmtN(pesoTotal, 1)} kg`]],
                    startY: paleY,
                    theme: 'striped',
                    headStyles: { fillColor: [70, 70, 70], fontSize: 8, textColor: 255 },
                    bodyStyles: { fontSize: 9 },
                    footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold', fontSize: 9 },
                    columnStyles: {
                        0: { cellWidth: 35 },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 22, halign: 'center' },
                        3: { cellWidth: 22, halign: 'right' },
                        4: { cellWidth: 30, halign: 'right' },
                    },
                    margin: { left: margin, right: margin },
                });

                paleY = doc.lastAutoTable.finalY + 12;

                if (paleY > 260 && datos.pales.indexOf(pale) < datos.pales.length - 1) {
                    doc.addPage();
                    paleY = 20;
                }
            }
        }

        return doc.output('arraybuffer');
    } catch (error) {
        logApiError(error, 'Error generating Carta de Porte PDF');
        throw error;
    }
}

/**
 * Genera una etiqueta PDF (100x70mm) con QR para un producto.
 * El QR apunta a la ficha del producto en la app.
 * @param {object} producto - Datos del producto (id, nombre, referenciaFabricante, material, color, espesor, ancho, largo, precioUnitario, pesoUnitario, costoUnitario, fabricante)
 * @param {string} baseUrl - URL base de la app (ej: "http://localhost:3000")
 * @param {object} opciones - { mostrarCosto: boolean }
 */
export async function generateEtiquetaPDF(producto, baseUrl, opciones = {}) {
    try {
        const { mostrarCosto = false } = opciones;
        const doc = new jsPDF({ format: [100, 70], unit: 'mm' });

        // Logo (pequeño, esquina superior derecha)
        const logoBase64 = await getLogoBase64();
        if (logoBase64) {
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 67, 3, 30, 9);
        }

        // QR code (izquierda, 28x28mm)
        const urlProducto = `${baseUrl}/gestion/productos/${producto.id}`;
        const qrDataUrl = await QRCode.toDataURL(urlProducto, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        doc.addImage(qrDataUrl, 'PNG', 4, 16, 28, 28);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text('Escanear', 18, 47, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Separador vertical
        doc.setDrawColor(220, 220, 220);
        doc.line(36, 14, 36, 66);

        // Columna de info (derecha del separador)
        const x = 39;
        let y = 15;

        // Nombre del producto
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const nombreLines = doc.splitTextToSize(producto.nombre, 57);
        doc.text(nombreLines.slice(0, 2), x, y);
        y += nombreLines.slice(0, 2).length * 4.5 + 1;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');

        // Referencia fabricante
        if (producto.referenciaFabricante) {
            doc.setTextColor(80, 80, 80);
            doc.text(`Ref: ${producto.referenciaFabricante}`, x, y);
            doc.setTextColor(0, 0, 0);
            y += 4;
        }

        // Material + Color
        const matParts = [producto.material?.nombre, producto.color].filter(Boolean);
        if (matParts.length > 0) {
            doc.text(matParts.join(' · '), x, y);
            y += 4;
        }

        // Dimensiones
        const dims = [
            producto.espesor && `${producto.espesor} mm`,
            producto.ancho   && `${producto.ancho} mm`,
            producto.largo   && `${producto.largo} m`,
        ].filter(Boolean);
        if (dims.length > 0) {
            doc.text(dims.join(' × '), x, y);
            y += 4;
        }

        // Fabricante
        if (producto.fabricante?.nombre) {
            doc.setTextColor(100, 100, 100);
            doc.text(producto.fabricante.nombre, x, y);
            doc.setTextColor(0, 0, 0);
            y += 4;
        }

        // Separador antes de precios
        doc.setDrawColor(220, 220, 220);
        doc.line(39, y, 97, y);
        y += 3;

        // Precios
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`${fmtN(parseFloat(producto.precioUnitario) || 0)} €/u`, x, y);

        if (mostrarCosto && producto.costoUnitario != null) {
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Coste: ${fmtN(parseFloat(producto.costoUnitario) || 0)} €`, x + 32, y);
            doc.setTextColor(0, 0, 0);
        }
        y += 4;

        // Peso
        if (producto.pesoUnitario) {
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`${fmtN(parseFloat(producto.pesoUnitario) || 0)} kg`, x, y);
            doc.setTextColor(0, 0, 0);
        }

        // Borde exterior de la etiqueta
        doc.setDrawColor(180, 180, 180);
        doc.rect(1, 1, 98, 68);

        // Línea superior con fondo gris
        doc.setFillColor(245, 245, 245);
        doc.rect(1, 1, 98, 12, 'F');
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(`ID: ${producto.id}`, 4, 9);
        doc.setTextColor(0, 0, 0);

        return doc.output('arraybuffer');
    } catch (error) {
        logApiError(error, 'Error generating etiqueta PDF');
        throw error;
    }
}
