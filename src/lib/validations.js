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

// Tipos válidos de artículo en una importación de contenedor
const TIPOS_ARTICULO = ['BOBINA', 'TACO', 'GRAPA', 'MAQUINA', 'ESTRELLA', 'OTRO'];

const articuloContenedorSchema = z.object({
  id: z.number(),
  tipo: z.enum(['BOBINA', 'TACO', 'GRAPA', 'MAQUINA', 'ESTRELLA', 'OTRO']).default('BOBINA'),
  referencia: z.string().max(100).optional().nullable(),
  espesor: z.union([z.string(), z.number()]).optional().nullable(),
  ancho: z.union([z.string(), z.number()]).optional().nullable(),
  longitud: z.union([z.string(), z.number()]).optional().nullable(),
  numRollos: z.union([z.string(), z.number()]).optional().nullable(),
  precio: z.union([z.string(), z.number()]).optional().nullable(),
  unidadPrecio: z.string().optional().nullable(),
});

export const importacionContenedorSchema = z.object({
  // Numéricos — z.coerce.number() convierte strings a número, elimina parseFloat manual en las rutas
  tasaCambio: z.coerce.number().positive('Tipo de cambio inválido').max(100),
  totalBobinasUSD: z.coerce.number().min(0),
  totalBobinasEUR: z.coerce.number().min(0),
  totalMetros: z.coerce.number().min(0),
  suplidos: z.coerce.number().min(0),
  exentos: z.coerce.number().min(0),
  sujetos: z.coerce.number().min(0),
  ivaAduana: z.coerce.number().min(0).default(0),
  pesoTotalKg: z.coerce.number().min(0).default(0),
  volumenM3: z.coerce.number().min(0).default(0),
  gastosRepercutibles: z.coerce.number().min(0),
  costeProducto: z.coerce.number().min(0),
  totalDesembolso: z.coerce.number().min(0),
  // Artículos (JSON stringificado)
  bobinas: z.string()
    .min(2, 'Artículos requeridos')
    .refine(
      (s) => {
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr) && arr.length > 0;
        } catch { return false; }
      },
      { message: 'Formato de artículos inválido (debe ser JSON array)' }
    ),
  descripcion: z.string().max(200).optional().nullable(),
  // Trazabilidad del pedido (SEC-01 / SEC-02)
  proveedorId: z.string().uuid('ID de proveedor inválido').optional().nullable(),
  numFactura: z.string().max(200).optional().nullable(),
  numContenedor: z.string().max(100).optional().nullable(),
  estado: z.enum(['PEDIDO', 'TRANSITO', 'ADUANA', 'RECIBIDO', 'BORRADOR']).default('RECIBIDO'),
  fechaPedido: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional().nullable(),
  fechaLlegada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional().nullable(),
  // Tracking de contenedor
  blNumber:       z.string().max(200).optional().nullable(),
  trackingActivo: z.boolean().optional().default(false),
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
    notas: z.string().optional().nullable(),
    ultimoRecordatorio: z.string().datetime().optional().nullable(),
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
    color: z.string().optional().nullable(),
    lonas: z.number().int().positive().optional().nullable(),
});

export const reglaMargenSchema = z.object({
    base: z.string().min(1).optional().nullable(),
    multiplicador: z.coerce.number().positive('Multiplicador debe ser positivo'),
    gastoFijo: z.coerce.number().nonnegative().optional().nullable(),
    descripcion: z.string().min(1, 'Descripción requerida'),
    tierCliente: z.string().optional().nullable(),
});

// ============================================
// VALIDACIONES PARA GRAPAS
// ============================================

export const modeloGrapaSchema = z.object({
  tipo: z.enum(['NORMAL', 'UNA'], { errorMap: () => ({ message: 'tipo debe ser NORMAL o UNA' }) }),
  nombre: z.string().min(1, 'Nombre requerido').max(50),
  espesorDesde: z.coerce.number().positive('Espesor desde debe ser positivo'),
  espesorHasta: z.coerce.number().positive().optional().nullable(),
  anchosDisponibles: z.array(z.number().positive()).optional().nullable(),
  precioPor100mm: z.coerce.number().nonnegative('El precio no puede ser negativo').default(0),
});

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
// VALIDACIONES PARA FABRICANTES Y PROVEEDORES
// ============================================

export const fabricanteSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(200),
});

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  email: z.string().max(200).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  direccion: z.string().max(500).optional().nullable(),
});

// ============================================
// VALIDACIONES PARA TARIFAS DE ROLLO
// ============================================

export const tarifaRolloSchema = z.object({
  material: z.string().min(1, 'Material requerido').max(100),
  espesor: z.coerce.number().positive('Espesor debe ser positivo'),
  ancho: z.coerce.number().positive().optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  metrajeMinimo: z.coerce.number().positive().optional().default(10),
  precioBase: z.coerce.number().nonnegative('Precio no puede ser negativo'),
  peso: z.coerce.number().nonnegative('Peso no puede ser negativo'),
});

export const tarifaRolloUpdateSchema = z.object({
  metrajeMinimo: z.coerce.number().positive().optional(),
  precioBase: z.coerce.number().nonnegative().optional(),
  peso: z.coerce.number().nonnegative().optional(),
  ancho: z.coerce.number().positive().optional().nullable(),
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
