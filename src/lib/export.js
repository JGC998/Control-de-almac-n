import ExcelJS from 'exceljs';

/**
 * Exporta pedidos a Excel
 */
export async function exportarPedidosExcel(pedidos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pedidos');

    worksheet.columns = [
        { header: 'Número', key: 'numero', width: 15 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Total (€)', key: 'total', width: 15 },
        { header: 'Notas', key: 'notas', width: 40 },
        // Detalles del primer item (para resumen simple) o items si se desea expandir
    ];

    // Estilo para encabezado
    worksheet.getRow(1).font = { bold: true };

    pedidos.forEach(pedido => {
        worksheet.addRow({
            numero: pedido.numero,
            fecha: new Date(pedido.fechaCreacion).toLocaleDateString(),
            cliente: pedido.cliente?.nombre || 'N/A',
            estado: pedido.estado,
            total: pedido.total || 0,
            notas: pedido.notas || ''
        });
    });

    return await workbook.xlsx.writeBuffer();
}

/**
 * Exporta presupuestos a Excel
 */
export async function exportarPresupuestosExcel(presupuestos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Presupuestos');

    worksheet.columns = [
        { header: 'Número', key: 'numero', width: 15 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Total (€)', key: 'total', width: 15 },
        { header: 'Notas', key: 'notas', width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true };

    presupuestos.forEach(p => {
        worksheet.addRow({
            numero: p.numero,
            fecha: new Date(p.fechaCreacion).toLocaleDateString(),
            cliente: p.cliente?.nombre || 'N/A',
            estado: p.estado,
            total: p.total || 0,
            notas: p.notas || ''
        });
    });

    return await workbook.xlsx.writeBuffer();
}

/**
 * Genera un CSV simple a partir de un array de objetos
 */
export function generarCSV(data, campos) {
    if (!data || !data.length) return '';

    const header = campos.map(c => c.label).join(';');
    const rows = data.map(row => {
        return campos.map(c => {
            const val = c.value(row);
            // Escapar comillas y manejar nulos
            const str = String(val === null || val === undefined ? '' : val);
            return `"${str.replace(/"/g, '""')}"`;
        }).join(';');
    });

    return [header, ...rows].join('\n');
}

export const CSV_DEFINITIONS = {
    tarifaLogistica: [
        { label: 'ID', value: r => r.id },
        { label: 'Provincia', value: r => r.provincia },
        { label: 'Peso Max (kg)', value: r => r.pesoMax },
        { label: 'Precio (€)', value: r => r.precio },
        { label: 'Tipo', value: r => r.tipo }
    ],
    producto: [
        { label: 'ID', value: r => r.id },
        { label: 'Nombre', value: r => r.nombre },
        { label: 'Descripción', value: r => r.descripcion },
        { label: 'Precio', value: r => r.precio },
        { label: 'Stock', value: r => r.stock },
        { label: 'Categoría', value: r => r.categoria }
    ],
    cliente: [
        { label: 'ID', value: r => r.id },
        { label: 'Nombre', value: r => r.nombre },
        { label: 'Email', value: r => r.email },
        { label: 'Teléfono', value: r => r.telefono },
        { label: 'Dirección', value: r => r.direccion }
    ]
};
