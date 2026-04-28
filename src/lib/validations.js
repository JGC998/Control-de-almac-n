import { z } from 'zod';

// ============================================
// VALIDACIONES PARA LOGÍSTICA
// ============================================

export const calculoLogisticaSchema = z.object({
    provincia: z.string().min(1, 'Provincia requerida'),
    peso: z.number().positive('Peso debe ser positivo'),
    altura: z.number().positive('Altura debe ser positiva'),
    tipoPale: z.enum(['EUROPEO', 'MEDIO'], {
        errorMap: () => ({ message: 'Tipo de palé inválido' })
    })
});

export const tarifaTransporteSchema = z.object({
    provincia: z.string().min(1),
    codigoPostal: z.string().min(1),
    parcel: z.number().nonnegative().optional().nullable(),
    miniQuarter: z.number().nonnegative().optional().nullable(),
    quarter: z.number().nonnegative().optional().nullable(),
    miniLight: z.number().nonnegative().optional().nullable(),
    half: z.number().nonnegative().optional().nullable(),
    light: z.number().nonnegative().optional().nullable(),
    megaLight: z.number().nonnegative().optional().nullable(),
    full: z.number().nonnegative().optional().nullable(),
    megaFull: z.number().nonnegative().optional().nullable()
});

export const configPaletizadoSchema = z.object({
    tipo: z.enum(['EUROPEO', 'MEDIO']),
    costePale: z.number().nonnegative('Coste de palé debe ser positivo'),
    costeFilm: z.number().nonnegative('Coste de film debe ser positivo'),
    costeFleje: z.number().nonnegative('Coste de fleje debe ser positivo'),
    costePrecinto: z.number().nonnegative('Coste de precinto debe ser positivo')
});

// ============================================
// VALIDACIONES PARA PEDIDOS
// ============================================

const pedidoItemSchema = z.object({
    descripcion: z.string().min(1, 'Descripción requerida'),
    quantity: z.number().int().positive('Cantidad debe ser positiva'),
    unitPrice: z.number().nonnegative('Precio unitario no puede ser negativo'),
    productoId: z.string().uuid().optional().nullable(),
    pesoUnitario: z.number().nonnegative().optional(),
    detallesTecnicos: z.string().optional().nullable(),
});

export const pedidoSchema = z.object({
    clienteId: z.string().uuid('ID de cliente inválido').optional().nullable(),
    estado: z.enum(['Borrador', 'Pendiente', 'Enviado', 'Completado', 'Cancelado']).optional(),
    items: z.array(pedidoItemSchema).min(1, 'Debe haber al menos un item'),
    subtotal: z.number().nonnegative('Subtotal no puede ser negativo'),
    tax: z.number().nonnegative('Tax no puede ser negativo'),
    total: z.number().nonnegative('Total no puede ser negativo'),
    marginId: z.string().uuid().optional().nullable(),
    notas: z.string().optional().nullable()
});

// ============================================
// VALIDACIONES PARA PRESUPUESTOS
// ============================================

const presupuestoItemSchema = z.object({
    descripcion: z.string().min(1, 'Descripción requerida'),
    quantity: z.number().int().positive('Cantidad debe ser positiva'),
    unitPrice: z.number().nonnegative('Precio unitario no puede ser negativo'),
    productoId: z.string().uuid().optional().nullable(),
    pesoUnitario: z.number().nonnegative().optional(),
    detallesTecnicos: z.string().optional().nullable(),
});

export const presupuestoSchema = z.object({
    clienteId: z.string().uuid('ID de cliente inválido').optional().nullable(),
    estado: z.enum(['Borrador', 'Enviado', 'Aprobado', 'Rechazado', 'Aceptado']).optional(),
    items: z.array(presupuestoItemSchema).min(1, 'Debe haber al menos un item'),
    subtotal: z.number().nonnegative('Subtotal no puede ser negativo'),
    tax: z.number().nonnegative('Tax no puede ser negativo'),
    total: z.number().nonnegative('Total no puede ser negativo'),
    marginId: z.string().uuid().optional().nullable(),
    notas: z.string().optional().nullable()
});

// ============================================
// VALIDACIONES PARA PRODUCTOS
// ============================================

export const productoSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    referenciaFabricante: z.string().optional().nullable(),
    espesor: z.number().positive().optional().nullable(),
    largo: z.number().positive().optional().nullable(),
    ancho: z.number().positive().optional().nullable(),
    precioUnitario: z.number().nonnegative('Precio unitario no puede ser negativo'),
    pesoUnitario: z.number().nonnegative().optional(),
    costoUnitario: z.number().nonnegative().optional().nullable(),
    tieneTroquel: z.boolean().optional(),
    color: z.string().optional().nullable(),
    fabricanteId: z.string().uuid().optional().nullable(),
    materialId: z.string().uuid().optional().nullable(),
    precioVentaFab: z.number().nonnegative().optional().nullable(),
    precioVentaInt: z.number().nonnegative().optional().nullable(),
    precioVentaFin: z.number().nonnegative().optional().nullable()
});

// ============================================
// VALIDACIONES PARA CLIENTES
// ============================================

export const clienteSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    email: z.string().email('Email inválido').optional().nullable(),
    telefono: z.string().optional().nullable(),
    direccion: z.string().optional().nullable(),
    tier: z.enum(['FABRICANTE', 'INTERMEDIARIO', 'FINAL']).optional(),
    categoria: z.string().optional().nullable()
});

// ============================================
// VALIDACIONES PARA TARIFAS
// ============================================

export const tarifaMaterialSchema = z.object({
    material: z.string().min(1, 'Material requerido'),
    espesor: z.number().positive('Espesor debe ser positivo'),
    precio: z.number().nonnegative('Precio no puede ser negativo'),
    peso: z.number().nonnegative('Peso no puede ser negativo'),
    color: z.string().optional().nullable()
});

export const reglaMargenSchema = z.object({
    base: z.string().min(1, 'Base requerida'),
    multiplicador: z.number().positive('Multiplicador debe ser positivo'),
    gastoFijo: z.number().nonnegative().optional().nullable(),
    descripcion: z.string().min(1, 'Descripción requerida'),
    tierCliente: z.string().optional().nullable()
});

// ============================================
// HELPER FUNCTION
// ============================================

/**
 * Valida datos contra un schema de Zod y retorna resultado formateado
 * @param {z.ZodSchema} schema - Schema de Zod
 * @param {any} data - Datos a validar
 * @returns {{ success: boolean, data?: any, errors?: any }}
 */
export function validateData(schema, data) {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return {
        success: false,
        errors: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }))
    };
}
