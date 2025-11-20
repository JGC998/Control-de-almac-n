const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapeo de Modelos a Archivos JSON
const DATA_MAP = [
  { model: 'cliente', file: 'clientes.json' },
  { model: 'proveedor', file: 'proveedores.json' },
  { model: 'material', file: 'materiales.json' },
  { model: 'fabricante', file: 'fabricantes.json' },
  { model: 'producto', file: 'productos.json' }, // Cuidado si tienes muchos
  { model: 'tarifaMaterial', file: 'tarifas.json' },
  { model: 'referenciaBobina', file: 'referenciasBobina.json' },
  { model: 'reglaMargen', file: 'margenes.json' }
];

async function exportData() {
  console.log('📥 Iniciando exportación de DB a JSON...');

  for (const entry of DATA_MAP) {
    try {
      // Obtenemos los datos de la BD
      const data = await prisma[entry.model].findMany();
      
      // Ruta del archivo
      const filePath = path.join(process.cwd(), 'src', 'data', entry.file);
      
      // Escribimos el JSON formateado
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`✅ Exportado ${entry.model} -> ${entry.file} (${data.length} registros)`);
    } catch (error) {
      console.error(`❌ Error exportando ${entry.model}:`, error.message);
    }
  }
  
  console.log('🏁 Exportación completada.');
}

exportData()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });