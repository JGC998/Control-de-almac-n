# ROADMAP — Control de Almacén

> Última actualización: 2026-06-01  
> Generado desde `ideas.txt`

---

## 🎯 Visión general

El proyecto está desplegado y operativo en producción. La prioridad inmediata es cerrar la exposición de datos de negocio sensibles que están siendo subidos públicamente a GitHub a través de los scripts de siembra de la carpeta `prisma/`. A medio plazo, el proyecto puede seguir incorporando nuevas funcionalidades operativas conforme se vayan anotando en `ideas.txt`.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Depende de |
|----|-------|------|-------------|------------|
| T-01 | Excluir de git los seed files con datos de negocio sensibles | Seguridad / Infra | Pequeña | — |

---

## 🗺️ Fases propuestas

### Fase 1 — Seguridad y privacidad de datos
> Eliminar la exposición de datos de negocio en el repositorio público. Estimación: 1-2 horas.

- [ ] **T-01** — Dejar de trackear en git los archivos de seed que contienen precios y costes reales  
  _Los siguientes archivos están actualmente en GitHub y contienen datos de negocio privados:_
  - `prisma/seed.js` — tarifas Pallex 2026 (precios de transporte negociados)
  - `prisma/seed-logistica.js` — costes internos de paletizado y logística
  - `prisma/seed-tarifas-logistica.js` — tarifas Pallex 2026 (duplicado)
  - `prisma/seed-tacos.js` — precios de tacos por tipo y altura
  - `prisma/seed-production.js` — script de migración de datos de producción

  _Los siguientes archivos son seguros y pueden quedarse en git:_
  - `prisma/seed-dev.js` — genera datos aleatorios (sin datos reales)
  - `prisma/seed-mock.js` — datos de demostración ficticios
  - `prisma/migrate-colors.js` — script sin datos hardcodeados

  **Pasos concretos:**
  ```bash
  # 1. Añadir al .gitignore
  echo "prisma/seed.js" >> .gitignore
  echo "prisma/seed-logistica.js" >> .gitignore
  echo "prisma/seed-tarifas-logistica.js" >> .gitignore
  echo "prisma/seed-tacos.js" >> .gitignore
  echo "prisma/seed-production.js" >> .gitignore

  # 2. Dejar de trackearlos (sin borrarlos localmente)
  git rm --cached prisma/seed.js prisma/seed-logistica.js prisma/seed-tarifas-logistica.js prisma/seed-tacos.js prisma/seed-production.js

  # 3. Commit y push
  git commit -m "security: untrack sensitive seed files with business pricing data"
  git push
  ```

  > ⚠️ Esto retira los archivos del historial FUTURO, pero no borra el historial pasado. Si los datos son críticos, considera rotar contraseñas/tarifas o usar `git filter-repo` para limpiar el historial completo.

---

## ⚡ Quick wins

- [ ] **T-01** — Excluir seed files sensibles de git (~30 min)

---

## 🚧 Dependencias y bloqueos

Ninguna. La tarea T-01 es completamente independiente y puede ejecutarse ahora mismo.

---

## 💡 Ideas descartadas o pospuestas

Ninguna idea descartada en esta ronda.

---

## ✅ Completado

- Despliegue en producción completado (Prisma DB push, índices sincronizados)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
