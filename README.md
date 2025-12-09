# 🏭 Gestión de Taller y Control de Almacén

Aplicación web para la gestión de un taller especializado en la fabricación de piezas y el control de su almacén de materias primas.

## 🚀 Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Framework | Next.js 16, React 19 |
| Base de datos | MySQL + Prisma ORM |
| Estilo | Tailwind CSS 4, DaisyUI 5 |
| Estado | SWR para fetching, React hooks |
| PDF | jsPDF, jspdf-autotable |
| Gráficas | Recharts |

## 📦 Instalación

```bash
# Clonar repositorio
git clone https://github.com/JGC998/Control-de-almac-n.git
cd Control-de-almac-n

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL de MySQL

# Generar cliente Prisma
npm run generate

# Aplicar migraciones
npm run db:migrate

# Iniciar en desarrollo
npm run dev
```

## 📜 Scripts Disponibles

### Desarrollo
| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo (Turbopack) |
| `npm run build` | Compila para producción |
| `npm run start` | Inicia servidor de producción |

### Base de Datos
| Script | Descripción |
|--------|-------------|
| `npm run generate` | Regenera cliente Prisma |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:push` | Sincroniza schema sin migración |
| `npm run db:studio` | Abre Prisma Studio (GUI) |
| `npm run db:seed` | Ejecuta seed de datos |

### Utilidades
| Script | Descripción |
|--------|-------------|
| `npm run backup` | Crea backup de la BD |

## 🖥️ Despliegue en Servidor

### Primera vez
```bash
git clone https://github.com/JGC998/Control-de-almac-n.git
cd Control-de-almac-n
npm install
cp .env.example .env
# Configurar DATABASE_URL
npm run generate
npm run db:migrate
npm run build
npm start
```

### Actualización
```bash
git pull origin main
npm install
npm run generate
npm run db:migrate
npm run build
# Reiniciar servicio (pm2 restart o systemctl restart)
```

## 📋 Módulos Principales

1. **🏠 Dashboard** - Estadísticas, movimientos recientes, tablón de notas
2. **💰 Tarifas** - Precios por material y espesor
3. **🧮 Calculadora** - Cálculo de costes y pesos de piezas
4. **📦 Pedidos Cliente** - Gestión de pedidos y presupuestos
5. **🚚 Pedidos Proveedor** - Seguimiento de pedidos nacionales/importación
6. **📊 Almacén** - Control de stock y movimientos
7. **👥 Clientes** - Gestión de clientes y tiers
8. **📁 Productos** - Catálogo de productos

## 📁 Estructura del Proyecto

```
├── prisma/
│   ├── schema.prisma     # Schema de BD
│   └── migrations/       # Migraciones
├── scripts/
│   └── backup.js         # Script de backup
├── src/
│   ├── app/              # Rutas Next.js (App Router)
│   ├── components/       # Componentes React
│   └── lib/              # Utilidades (db.js, etc)
└── public/
    └── data/             # JSONs estáticos
```

## 🔧 Variables de Entorno

```env
DATABASE_URL="mysql://user:password@localhost:3306/taller"
```

## 📄 Licencia

Proyecto privado.