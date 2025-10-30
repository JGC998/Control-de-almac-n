
import fs from 'fs/promises';
import path from 'path';

// Unica fuente de verdad para la ruta de los datos.
const DATA_DIRECTORY = path.join(process.cwd(), 'src', 'data');

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
  const filePath = getSafeFilePath(filename);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
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
  await fs.writeFile(filePath, stringContent, 'utf-8');
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
