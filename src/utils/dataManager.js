
import fs from 'fs/promises';
import path from 'path';

// Unica fuente de verdad para la ruta de los datos.
const DATA_DIRECTORY = path.join(process.cwd(), 'src', 'data');

// Caché en memoria para reducir las lecturas de disco.
const cache = new Map();

/**
 * Asegura que el directorio de datos exista.
 */
async function ensureDataDirExists() {
  try {
    await fs.access(DATA_DIRECTORY);
  } catch {
    await fs.mkdir(DATA_DIRECTORY, { recursive: true });
  }
}

/**
 * Construye la ruta completa y segura para un archivo dentro del directorio de datos.
 * @param {string} filename - El nombre del archivo.
 * @returns {string} La ruta absoluta al archivo.
 * @throws {Error} Si el nombre del archivo es inválido.
 */
function getSafeFilePath(filename) {
  if (typeof filename !== 'string' || !filename.trim()) {
    throw new Error('El nombre del archivo no puede estar vacío.');
  }
  // Previene ataques de directory traversal.
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error(`Nombre de archivo inválido: "${filename}". No puede contener separadores de ruta.`);
  }
  return path.join(DATA_DIRECTORY, filename);
}

/**
 * Lee y parsea un archivo JSON del directorio de datos.
 * @param {string} filename - El nombre del archivo (e.g., 'pedidos.json').
 * @returns {Promise<any>} El contenido del archivo como objeto JSON.
 * @throws {Error} Si el archivo no se encuentra o no es un JSON válido.
 */
export async function readData(filename) {
  // FASE I: Devolver datos desde la caché si están disponibles.
  if (cache.has(filename)) {
    return cache.get(filename);
  }

  const filePath = getSafeFilePath(filename);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    cache.set(filename, data); // Cache the original data
    return JSON.parse(JSON.stringify(data)); // Return a deep copy

  } catch (error) {
    if (error.code === 'ENOENT') {
      // Si el archivo no existe, podemos devolver un estado predeterminado como un array vacío.
      return [];
    }
    // Si el error es por parseo de JSON u otro motivo, lo lanzamos.
    console.error(`Error leyendo o parseando el archivo ${filename}:`, error);
    throw new Error(`No se pudo leer o parsear el archivo de datos: ${filename}`);
  }
}

/**
 * Escribe datos en un archivo JSON en el directorio de datos.
 * @param {string} filename - El nombre del archivo (e.g., 'pedidos.json').
 * @param {object} content - El contenido (objeto/array) a escribir en el archivo.
 * @returns {Promise<void>}
 */
export async function writeData(filename, content) {
  const filePath = getSafeFilePath(filename);
  await ensureDataDirExists();
  const stringContent = JSON.stringify(content, null, 2); // Formateado para legibilidad
  // FASE I: Invalidar la caché después de una escritura.
  cache.delete(filename);
  await fs.writeFile(filePath, stringContent, 'utf-8');
}

/**
 * Actualiza un registro específico en un archivo JSON.
 * @param {string} filename - El nombre del archivo (e.g., 'pedidos.json').
 * @param {string} id - El ID del registro a actualizar.
 * @param {object} updatedFields - Un objeto con los campos a actualizar y sus nuevos valores.
 * @param {string} idKey - La clave del campo que contiene el ID (por defecto 'id').
 * @returns {Promise<boolean>} True si se actualizó el registro, false si no se encontró.
 */
export async function updateData(filename, id, updatedFields, idKey = 'id') {
  const data = await readData(filename);
  const index = data.findIndex(item => item[idKey] === id);

  if (index === -1) {
    console.warn(`Registro con ${idKey} "${id}" no encontrado en ${filename}.`);
    return false;
  }

  data[index] = { ...data[index], ...updatedFields };
  await writeData(filename, data);
  return true;
}

/**
 * Lista todos los archivos .json en el directorio de datos.
 * @returns {Promise<string[]>} Un array con los nombres de los archivos.
 */
export async function listDataFiles() {
    await ensureDataDirExists();
    const files = await fs.readdir(DATA_DIRECTORY);
    return files.filter(file => file.endsWith('.json'));
}

/**
 * Genera el siguiente número secuencial para un tipo de documento (pedido, presupuesto) para el año actual.
 * Formato: YYYY-NNN (ej. 2023-001)
 * @param {string} filename - El nombre del archivo de datos (e.g., 'presupuestos.json').
 * @returns {Promise<string>} El siguiente número secuencial.
 */
async function getNextSequentialNumber(filename) {
  const year = new Date().getFullYear();
  // readData usará la caché si está disponible, mejorando el rendimiento.
  const items = await readData(filename);

  // FASE III: Lógica de generación de ID más robusta y centralizada.
  const maxNumber = items
    .filter(item => item.numero && item.numero.startsWith(`${year}-`))
    .reduce((max, item) => {
      const numberPart = parseInt(item.numero.split('-')[1], 10);
      return numberPart > max ? numberPart : max;
    }, 0);

  return `${year}-${String(maxNumber + 1).padStart(3, '0')}`;
}

export const getNextPresupuestoNumber = () => getNextSequentialNumber('presupuestos.json');

export const getNextPedidoNumber = () => getNextSequentialNumber('pedidos.json');
