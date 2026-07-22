/**
 * Construye una descripción compacta del producto a partir de sus atributos:
 * material + acabado + espesor + lonas
 * Ej: "GOMA NEGRA 4mm", "PVC CK 3mm", "FIELTRO 6mm", "GOMA 8mm 2L"
 */
export function formatarProducto(p) {
  const partes = [];
  const mat = p.material?.nombre ?? p.materialNombre ?? null;
  if (mat) partes.push(mat);
  if (p.acabado) partes.push(p.acabado);
  if (p.espesor != null) partes.push(`${p.espesor}mm`);
  if (p.lonas) partes.push(`${p.lonas}L`);
  return partes.length > 0 ? partes.join(' ') : (p.nombre ?? '—');
}

/**
 * Etiqueta corta para mostrar en columna de tabla.
 * Si no hay suficiente info de material/espesor, cae al nombre del producto.
 */
export function etiquetaProducto(p) {
  const desc = formatarProducto(p);
  return desc !== (p.nombre ?? '—') ? desc : p.nombre;
}

/**
 * Genera el código interno del producto a partir de sus atributos:
 * FAM(3) - SUB(4) - FABiniciales|ACBabrev - ESPmm - ANCHO×LARGO
 *
 * Formato: GOm-CIER-MB-8mm-500×1200
 * Segmentos opcionales se omiten si el campo es null/undefined.
 * Si no hay fabricante pero hay acabado, se usa el acabado (3 chars) en su lugar.
 *
 * Requiere que el producto tenga cargadas las relaciones:
 *   subfamilia.familia.nombre, fabricante.nombre
 */
export function generarCodigo(producto) {
  const segs = [];

  const famNombre = producto.subfamilia?.familia?.nombre;
  if (famNombre) segs.push(famNombre.slice(0, 3).toUpperCase());

  const subNombre = producto.subfamilia?.nombre;
  if (subNombre) segs.push(subNombre.slice(0, 4).toUpperCase());

  const fabNombre = producto.fabricante?.nombre;
  if (fabNombre) {
    const iniciales = fabNombre.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('');
    segs.push(iniciales);
  } else if (producto.acabado) {
    segs.push(producto.acabado.slice(0, 3).toUpperCase());
  }

  if (producto.espesor != null) {
    segs.push(`${+producto.espesor.toFixed(1)}mm`);
  }

  if (producto.ancho != null && producto.largo != null) {
    segs.push(`${Math.round(producto.ancho)}×${Math.round(producto.largo)}`);
  }

  return segs.join('-');
}
