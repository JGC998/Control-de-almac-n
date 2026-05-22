import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { construirURLQR, formatFechaQR } from '@/lib/verifactu';

// Fallbacks para cuando ConfiguracionEmisor / Config no estén configurados
const COMPANY_ADDRESS_FALLBACK = 'C. La Jarra, 41, 14540 La Rambla, Córdoba';
const COMPANY_PHONE_FALLBACK   = '957 68 28 19';

async function getEmisorInfo() {
    try {
        const { db } = await import('@/lib/db');
        const [emisor, phoneConfig] = await Promise.all([
            db.configuracionEmisor.findUnique({ where: { id: 1 } }),
            db.config.findUnique({ where: { key: 'empresa_telefono' } }),
        ]);
        return {
            address: emisor?.direccion || COMPANY_ADDRESS_FALLBACK,
            phone:   phoneConfig?.value || COMPANY_PHONE_FALLBACK,
        };
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
        doc.rect(14, 55, 90, 28);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 20, 61);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        if (client) {
            doc.text(client.nombre, 20, 67);
            doc.text(client.direccion || 'Dirección no especificada', 20, 73);
            doc.text(client.email || 'Email no especificado', 20, 79);
        }

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
            const tacosMatch = item.descripcion.match(/\+ Tacos (RECTO|INCLINADO) (\d+)mm/);
            if (tacosMatch) {
                descripcion += `\n(Incluye tacos ${tacosMatch[1]} ${tacosMatch[2]}mm)`;
            }

            // Usamos unitPriceVenta si existe (inyectado por la API), sino unitPrice
            const precio = item.unitPriceVenta ?? item.unitPrice ?? 0;
            const total = item.totalVentaItem ?? (precio * item.quantity);

            tableRows.push([
                descripcion,
                item.quantity,
                `${precio.toFixed(2)} €`,
                `${total.toFixed(2)} €`
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 90,
            theme: 'grid'
        });

        const finalY = doc.lastAutoTable.finalY;

        // --- Totales ---
        doc.setFontSize(10);
        doc.text(`Subtotal:`, 145, finalY + 10);
        doc.text(`${(quote.subtotal || 0).toFixed(2)} €`, 198, finalY + 10, { align: 'right' });

        doc.text(`IVA (${(ivaRate * 100).toFixed(0)}%):`, 145, finalY + 16);
        doc.text(`${(quote.tax || 0).toFixed(2)} €`, 198, finalY + 16, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL:`, 145, finalY + 24);
        doc.text(`${(quote.total || 0).toFixed(2)} €`, 198, finalY + 24, { align: 'right' });

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
                    ['Material', `${precioMaterial.toFixed(2)} €`],
                ];

                if (costeVulcanizado > 0) {
                    const vulcLabel = dt.tipoConfeccion === 'GRAPA' ? 'Confección (Grapa)' : 'Vulcanizado';
                    bandaRows.push([vulcLabel, `${costeVulcanizado.toFixed(2)} €`]);
                }
                if (costeTacos > 0) {
                    bandaRows.push(['Tacos', `${costeTacos.toFixed(2)} €`]);
                }
                bandaRows.push(['Precio Unitario', `${precioUnitario.toFixed(2)} €`]);
                bandaRows.push([`Total (×${item.quantity} ud.)`, `${precioTotal.toFixed(2)} €`]);

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
        console.error("Error generating PDF:", error);
        throw error;
    }
}

function formatMm(value) {
    return Math.round(parseFloat(value) || 0).toLocaleString('de-DE') + ' mm';
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

            let detalles = 'Item manual';
            if (item.producto) {
                detalles = item.producto.nombre || 'Sin nombre';
                if (item.producto.descripcion) {
                    detalles += ` - ${item.producto.descripcion}`;
                }
            }

            const tacosMatch = item.descripcion.match(/\+ Tacos (RECTO|INCLINADO) (\d+)mm/);
            if (tacosMatch) {
                detalles += `\nTacos: ${tacosMatch[1]} ${tacosMatch[2]}mm`;
            }

            tableRows.push([
                item.descripcion,
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
                    return { descripcion: item.descripcion, quantity: item.quantity, dt: JSON.parse(item.detallesTecnicos) };
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
                            ['Metros lineales totales', `${tacos.metrosLineales.toFixed(2)} m`],
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
        console.error("Error generating Order PDF:", error);
        throw error;
    }
}

export async function generateFacturaPDF(factura) {
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
            `${item.unitPrice.toFixed(2)} €`,
            `${(item.quantity * item.unitPrice).toFixed(2)} €`,
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
        doc.text(`${(factura.subtotal || 0).toFixed(2)} €`, ivaBoxX + 72, ivaBoxY + 8, { align: 'right' });

        doc.text('IVA (21%):', ivaBoxX + 4, ivaBoxY + 15);
        doc.text(`${(factura.tax || 0).toFixed(2)} €`, ivaBoxX + 72, ivaBoxY + 15, { align: 'right' });

        doc.setDrawColor(100, 100, 100);
        doc.line(ivaBoxX + 4, ivaBoxY + 19, ivaBoxX + 72, ivaBoxY + 19);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text('TOTAL:', ivaBoxX + 4, ivaBoxY + 26);
        doc.text(`${(factura.total || 0).toFixed(2)} €`, ivaBoxX + 72, ivaBoxY + 26, { align: 'right' });

        // --- Notas ---
        if (factura.notas) {
            const notesY = ivaBoxY + 40;
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text('Notas:', 14, notesY);
            doc.setFont("helvetica", "normal");
            doc.text(factura.notas, 14, notesY + 5, { maxWidth: 100 });
        }

        // --- QR VeriFactu ---
        const qrAreaY = Math.max(ivaBoxY + 42, 240);
        let firmaOffset = 0;

        if (factura.huella && factura.fechaHoraGenRegistro) {
          // Obtener entorno del emisor (si no se puede, usar pruebas)
          let entorno = 'pruebas';
          let nifEmisor = '';
          try {
            const { db } = await import('@/lib/db');
            const emisor = await db.configuracionEmisor.findUnique({ where: { id: 1 } });
            entorno = emisor?.entorno || 'pruebas';
            nifEmisor = emisor?.nif || '';
          } catch { /* sin config, continuar sin QR */ }

          if (nifEmisor) {
            const urlQR = construirURLQR({
              nif:      nifEmisor,
              numserie: factura.numero,
              fecha:    formatFechaQR(new Date(factura.fechaHoraGenRegistro)),
              importe:  factura.total,
              entorno,
            });

            try {
              const qrDataUrl = await QRCode.toDataURL(urlQR, { errorCorrectionLevel: 'M', width: 120, margin: 1 });
              // QR esquina inferior izquierda (~30x30mm)
              doc.addImage(qrDataUrl, 'PNG', 14, qrAreaY, 28, 28);
              doc.setFontSize(6.5);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(80, 80, 80);
              doc.text('Factura verificable en la AEAT', 44, qrAreaY + 5);
              doc.setTextColor(100, 100, 100);
              doc.text(`Huella: ${factura.huella.substring(0, 32)}…`, 44, qrAreaY + 11);
              doc.setTextColor(0, 0, 0);
              firmaOffset = 32;
            } catch { /* si falla el QR, no bloquear el PDF */ }
          }
        }

        // --- Firma ---
        const firmaY = qrAreaY + firmaOffset;
        doc.setFontSize(9);
        doc.line(14, firmaY, 80, firmaY);
        doc.line(120, firmaY, 196, firmaY);
        doc.text('Conforme — firma del cliente', 14, firmaY + 4);
        doc.text('Sello y firma empresa', 120, firmaY + 4);

        return doc.output('arraybuffer');
    } catch (error) {
        console.error('Error generating Factura PDF:', error);
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
                ? [item.descripcion, item.quantity, `${(item.unitPrice).toFixed(2)} €`, `${(item.quantity * item.unitPrice).toFixed(2)} €`]
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
            doc.text(`${(albaran.subtotal || 0).toFixed(2)} €`, 198, finalY + 10, { align: 'right' });
            doc.text(`IVA (21%):`, 145, finalY + 16);
            doc.text(`${(albaran.tax || 0).toFixed(2)} €`, 198, finalY + 16, { align: 'right' });
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL:`, 145, finalY + 24);
            doc.text(`${(albaran.total || 0).toFixed(2)} €`, 198, finalY + 24, { align: 'right' });
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
        console.error("Error generating Albaran PDF:", error);
        throw error;
    }
}
