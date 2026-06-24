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
