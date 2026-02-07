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
    productoId: z.number().int().optional().nullable(),
    pesoUnitario: z.number().nonnegative().optional()
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
    productoId: z.number().int().optional().nullable()
});

export const presupuestoSchema = z.object({
    clienteId: z.string().uuid('ID de cliente inválido').optional().nullable(),
    estado: z.enum(['Borrador', 'Enviado', 'Aprobado', 'Rechazado']).optional(),
    items: z.array(presupuestoItemSchema).min(1, 'Debe haber al menos un item'),
    subtotal: z.number().nonnegative('Subtotal no puede ser negativo'),
    tax: z.number().nonnegative('Tax no puede ser negativo'),
    total: z.number().nonnegative('Total no puede ser negativo'),
    marginId: z.string().uuid().optional().nullable(),
    notas: z.string().optional().nullable(),
    validoHasta: z.string().datetime().optional().nullable()
});

// ============================================
// VALIDACIONES PARA PRODUCTOS
// ============================================

export const productoSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    descripcion: z.string().optional().nullable(),
    precio: z.number().positive('Precio debe ser positivo'),
    stock: z.number().int().nonnegative('Stock no puede ser negativo'),
    categoria: z.string().optional().nullable()
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
    color: z.string().min(1, 'Color requerido'),
    precioKg: z.number().positive('Precio por kg debe ser positivo')
});

export const reglaMargenSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    multiplicador: z.number().positive('Multiplicador debe ser positivo'),
    activo: z.boolean().optional()
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
