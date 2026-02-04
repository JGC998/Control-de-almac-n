# 🔄 Guía de Migración MySQL → PostgreSQL

## Resumen
Esta guía te permite migrar los datos de producción (MySQL) a la nueva base de datos PostgreSQL.

---

## Paso 1: En el servidor (Linux Mint) 🖥️

### 1.1. Copiar el script de exportación
Copia el archivo `scripts/export_mysql.sh` a tu servidor.

### 1.2. Editar configuración
Abre el archivo y edita estas líneas con tus credenciales MySQL:
```bash
DB_HOST="localhost"
DB_USER="root"
DB_PASS="tu_password_mysql"
DB_NAME="nombre_de_tu_base_datos"
```

### 1.3. Ejecutar exportación
```bash
chmod +x export_mysql.sh
./export_mysql.sh
```

Esto creará una carpeta `export_data/` con archivos JSON de todas las tablas.

---

## Paso 2: Copiar datos a tu máquina local 📦

Copia la carpeta `export_data/` desde el servidor a:
```
Control-de-almac-n/scripts/export_data/
```

Puedes usar SCP, USB, o cualquier método:
```bash
# Ejemplo con SCP desde el servidor
scp -r export_data/ tu_usuario@tu_ip_local:~/Control-de-almac-n/scripts/
```

---

## Paso 3: Importar a PostgreSQL 🚀

En tu máquina local, ejecuta:
```bash
cd Control-de-almac-n
node scripts/import_to_postgres.js
```

---

## Verificación ✅

Después de importar, verifica que los datos estén correctos:
```bash
npm run dev
# Navega a http://localhost:3000/gestion/clientes
# Deberías ver tus clientes reales
```

---

## Tablas que se migran

| Tabla | Descripción |
|-------|-------------|
| Fabricante | Fabricantes de productos |
| Material | Tipos de material |
| Cliente | Clientes con datos completos |
| Proveedor | Proveedores |
| Producto | Catálogo de productos |
| TarifaMaterial | Precios por material/espesor |
| ReglaMargen | Reglas de margen de beneficio |
| ReferenciaBobina | Referencias de bobinas |
| Stock | Inventario actual |
| MovimientoStock | Historial de movimientos |
| Presupuesto | Presupuestos y sus items |
| Pedido | Pedidos y sus items |
| PedidoProveedor | Pedidos a proveedores |
| BobinaPedido | Bobinas en pedidos |
| Nota | Notas del tablón |
| Config | Configuración (IVA, etc.) |
| Sequence | Secuencias de numeración |

---

## Solución de problemas 🔧

### Error: "No se encontró la carpeta de datos exportados"
→ Asegúrate de copiar `export_data/` dentro de `scripts/`

### Error de conexión a PostgreSQL
→ Verifica que tu `.env` tenga la `DATABASE_URL` correcta:
```
DATABASE_URL="postgresql://usuario:password@localhost:5432/tu_base_datos"
```

### Error de foreign key
→ El script maneja el orden de dependencias, pero si hay problemas:
```bash
npx prisma db push --force-reset
node scripts/import_to_postgres.js
```
