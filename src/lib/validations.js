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
// VALIDACIONES PARA CRM — TARIFAS Y CONTENEDOR
// ============================================

export const tarifaClienteCreateSchema = z.object({
  clienteId: z.string().min(1, 'clienteId requerido'),
  descripcion: z.string().min(1, 'Descripción requerida').max(200),
  productoId: z.string().optional().nullable(),
  precioEspecial: z.number().positive('El precio debe ser positivo').max(100_000),
  notas: z.string().max(500).optional().nullable(),
});

export const tarifaClienteUpdateSchema = z.object({
  id: z.string().min(1, 'id requerido'),
  descripcion: z.string().min(1).max(200).optional(),
  productoId: z.string().optional().nullable(),
  precioEspecial: z.number().positive().max(100_000).optional(),
  notas: z.string().max(500).optional().nullable(),
  activa: z.boolean().optional(),
});

export const importacionContenedorSchema = z.object({
  tasaCambio: z.number().positive('Tipo de cambio inválido').max(100),
  totalBobinasUSD: z.number().min(0),
  totalBobinasEUR: z.number().min(0),
  totalMetros: z.number().min(0),
  suplidos: z.number().min(0),
  exentos: z.number().min(0),
  sujetos: z.number().min(0),
  gastosRepercutibles: z.number().min(0),
  costeProducto: z.number().min(0),
  totalDesembolso: z.number().min(0),
  bobinas: z.string().min(2, 'Bobinas requeridas'),
  descripcion: z.string().max(200).optional().nullable(),
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
    clienteId: z.string().min(1, 'ID de cliente inválido').optional().nullable(),
    estado: z.enum(['Borrador', 'Pendiente', 'Enviado', 'Completado', 'Cancelado']).optional(),
    items: z.array(pedidoItemSchema).min(1, 'Debe haber al menos un item'),
    subtotal: z.number().nonnegative('Subtotal no puede ser negativo'),
    tax: z.number().nonnegative('Tax no puede ser negativo'),
    total: z.number().nonnegative('Total no puede ser negativo'),
    marginId: z.string().uuid().optional().nullable(),
    notas: z.string().optional().nullable(),
    sinFacturacion: z.boolean().optional(),
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
    clienteId: z.string().min(1, 'ID de cliente inválido').optional().nullable(),
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
    nif: z.string().optional().nullable(),
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
// VALIDACIONES PARA GRAPAS
// ============================================

export const grapaSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    fabricante: z.string().optional().nullable(),
    descripcion: z.string().optional().nullable(),
    precioMetro: z.coerce.number().nonnegative('Precio por metro no puede ser negativo'),
});

export const grapaUpdateSchema = z.object({
    updates: z.array(z.object({
        id: z.union([z.string().min(1), z.number().int().positive()]),
        precioMetro: z.coerce.number().nonnegative('Precio por metro no puede ser negativo'),
    })).min(1, 'Debe haber al menos un update'),
});

// ============================================
// VALIDACIONES PARA TACOS
// ============================================

export const tacoSchema = z.object({
    tipo: z.enum(['RECTO', 'INCLINADO'], { errorMap: () => ({ message: 'tipo debe ser RECTO o INCLINADO' }) }),
    altura: z.coerce.number().int().positive('Altura debe ser positiva'),
    precioMetro: z.coerce.number().nonnegative('Precio por metro no puede ser negativo'),
});

export const tacoBatchUpdateSchema = z.object({
    updates: z.array(z.object({
        id: z.union([z.string().min(1), z.number().int().positive()]),
        precioMetro: z.coerce.number().nonnegative('Precio por metro no puede ser negativo'),
    })).min(1, 'Debe haber al menos un update'),
});

// ============================================
// VALIDACIONES PARA ARTÍCULOS SIMPLES
// ============================================

export const articuloSimpleSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  categoria: z.enum(['CORDON', 'BORDE_ONDULADO', 'OTRO'], {
    errorMap: () => ({ message: 'Categoría inválida' }),
  }).default('OTRO'),
  unidad: z.enum(['M', 'UDS', 'KG', 'ML'], {
    errorMap: () => ({ message: 'Unidad inválida' }),
  }).default('UDS'),
  precioUnitario: z.coerce.number().nonnegative('Precio no puede ser negativo').default(0),
  costoUnitario: z.coerce.number().nonnegative().optional().nullable(),
  fabricante: z.string().max(200).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  activo: z.boolean().optional().default(true),
});

export const articuloSimplePatchSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  categoria: z.enum(['CORDON', 'BORDE_ONDULADO', 'OTRO']).optional(),
  unidad: z.enum(['M', 'UDS', 'KG', 'ML']).optional(),
  precioUnitario: z.coerce.number().nonnegative().optional(),
  costoUnitario: z.coerce.number().nonnegative().optional().nullable(),
  fabricante: z.string().max(200).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  activo: z.boolean().optional(),
});

// ============================================
// VALIDACIONES PARA DESCUENTOS
// ============================================

const descuentoTierSchema = z.object({
    cantidadMinima: z.coerce.number().int().nonnegative().optional(),
    descuento: z.coerce.number().nonnegative('Descuento no puede ser negativo'),
});

export const descuentoSchema = z.object({
    descripcion: z.string().min(1, 'Descripción requerida'),
    tipo: z.string().min(1, 'Tipo requerido'),
    descuento: z.coerce.number().nonnegative().optional().nullable(),
    fechaInicio: z.string().optional().nullable(),
    fechaFin: z.string().optional().nullable(),
    tiers: z.array(descuentoTierSchema).optional(),
});

// ============================================
// VALIDACIONES PARA PEDIDOS A PROVEEDORES
// ============================================

const bobinaProveedorSchema = z.object({
    referenciaId: z.string().optional().nullable(),
    cantidad: z.coerce.number().int().positive('Cantidad debe ser positiva').optional(),
    ancho: z.coerce.number().positive().optional().nullable(),
    largo: z.coerce.number().positive().optional().nullable(),
    espesor: z.coerce.number().positive().optional().nullable(),
    precioMetro: z.coerce.number().nonnegative('Precio por metro no puede ser negativo'),
});

export const pedidoProveedorSchema = z.object({
    proveedorId: z.string().min(1, 'Proveedor requerido'),
    material: z.string().min(1, 'Material requerido'),
    bobinas: z.array(bobinaProveedorSchema).min(1, 'Debe haber al menos una bobina'),
    tipo: z.string().optional().nullable(),
    gastosTotales: z.coerce.number().nonnegative().optional().nullable(),
    tasaCambio: z.coerce.number().positive().optional().nullable(),
    notas: z.string().optional().nullable(),
    numeroFactura: z.string().optional().nullable(),
    numeroContenedor: z.string().optional().nullable(),
    naviera: z.string().optional().nullable(),
    fechaLlegadaEstimada: z.string().optional().nullable(),
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
