# Arranque rápido — CRM Taller

## Requisitos previos

- Node.js 22 (`nvm install 22 && nvm use 22`)
- Git

## Pasos

```bash
# 1. Clonar / actualizar el repo
git clone <url-del-repo>
cd "Control de almacen nuevo"
# — o si ya lo tienes —
git fetch origin && git checkout refactorizacion && git pull

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno local
cp .env.example .env.local
# Edita .env.local y asegúrate de que DATABASE_URL apunta a la DB de pruebas:
# DATABASE_URL="file:./prisma/dev.db"

# 4. Generar el cliente Prisma
DATABASE_URL="file:./prisma/dev.db" \
  ~/.nvm/versions/node/v22.19.0/bin/node node_modules/.bin/prisma generate \
  --schema=prisma/schema.dev.prisma

# 5. Arrancar el servidor de desarrollo
npm run dev
```

La app estará en **http://localhost:3000**

---

## Notas importantes

- La base de datos de pruebas (`prisma/prisma/dev.db`) ya está incluida en el repo.  
  Contiene clientes, pedidos, albaranes, facturas y datos de configuración de prueba.

- Si necesitas aplicar cambios de esquema nuevos:
  ```bash
  DATABASE_URL="file:./prisma/dev.db" \
    node node_modules/.bin/prisma db push \
    --schema=prisma/schema.dev.prisma
  ```

- Si la app lanza errores de Prisma tras un `git pull` con cambios de esquema,  
  borra la caché de Next.js y reinicia:
  ```bash
  rm -rf .next
  npm run dev
  ```

- El archivo `.env.local` **no** está en el repo (contiene secretos). Créalo manualmente.

---

## Estructura de la DB de pruebas

| Entidad       | Descripción                          |
|---------------|--------------------------------------|
| Clientes      | Varios clientes con distintos tiers  |
| Productos     | Catálogo de bandas y materiales      |
| Pedidos       | Pedidos en distintos estados         |
| Albaranes     | Albaranes generados desde pedidos    |
| Facturas      | Facturas BORRADOR, EMITIDA y PAGADA  |
| Márgenes      | Reglas de margen por tipo y tier     |
| Tarifas       | Tarifas de material, rollo y transporte |
