# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Development (Turbopack)
npm run dev

# Build for production
npm run build

# Linting
npm run lint

# Prisma — regenerate client after schema changes
npm run generate
# or: npx prisma generate

# Prisma — apply schema to dev DB (SQLite)
$env:DATABASE_URL = "file:./prisma/dev.db"
npx prisma db push --schema=prisma/schema.dev.prisma

# Seed mock data
npm run seed:mock
# or: node prisma/seed-mock.js
```

There are no automated tests in this project.

---

## Environment

```
DATABASE_URL="file:./prisma/dev.db"   # SQLite for local dev; MySQL in production
AUTH_PIN="1234"                        # Optional — leave commented out to disable auth
RESEND_API_KEY=                        # Optional — email sending via Resend
```

**Critical**: The dev Prisma schema is `prisma/schema.dev.prisma` (SQLite). The production schema is `prisma/schema.prisma` (MySQL). Always use `--schema=prisma/schema.dev.prisma` for local `db push` commands, and always set `$env:DATABASE_URL` first in PowerShell.

---

## Architecture

### Stack
- **Next.js 16** App Router — React Server Components for pages, Client Components where interactivity is needed
- **Prisma 6** ORM — SQLite (`prisma/dev.db`) for dev, MySQL for production
- **DaisyUI 5 + Tailwind CSS 4** — theme: `corporate` (default). DaisyUI 5 requires **static class names** — never construct class strings dynamically with template literals
- **SWR** — all client-side data fetching via `useSWR` + `/src/lib/fetcher.js`
- **jsPDF** — PDF generation for all documents

### Data flow: Presupuesto → Pedido → Albarán → Factura

The core document chain is:
1. `Presupuesto` (quote) — can be converted to `Pedido` via `POST /api/pedidos/from-presupuesto`
2. `Pedido` (order) — generates a `Albaran` via `POST /api/pedidos/[id]/albaran`
3. `Albaran` (delivery note) — generates a `Factura` via `POST /api/albaranes/[id]/factura`
4. `Factura` (invoice) — emitted (BORRADOR → EMITIDA) which triggers VeriFactu hash calculation

### VeriFactu (fiscal compliance — mandatory before 01/01/2027)
When a factura transitions `BORRADOR → EMITIDA`, `src/app/api/facturas/[id]/route.js` (PUT) calculates a SHA-256 hash chain:
- `calcularHuella()` in `src/lib/verifactu.js` hashes key invoice fields + the previous invoice's hash
- Fields stored: `huella`, `huellaAnterior`, `fechaHoraGenRegistro`, `estadoEnvioAeat`
- XML export to AEAT: `GET /api/facturas/exportar-aeat` — processes up to 1000 invoices per batch
- Emitter config (NIF, fiscal name, address) must be set in `ConfiguracionEmisor` (id=1) before emitting

Facturas in state `EMITIDA` or `PAGADA` are **immutable** — only rectificativas (R1–R5) can correct them.

### Authentication (optional PIN)
`middleware.js` at project root checks cookie `crm-auth` against `process.env.AUTH_PIN`. If `AUTH_PIN` is unset, the entire app is public. The middleware matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `/login`, and `/api/auth/*`.

### Document numbering
`src/lib/sequence.js` — `getNextNumber(type)` returns formatted numbers like `PED-001-2026`. The counter resets automatically each calendar year. Types: `pedido`, `presupuesto`, `albaran`, `factura`, `rectificativa`.

### Pricing engine
`ReglaMargen` rules apply a `multiplicador` (cost × multiplier) plus a `gastoFijo` (fixed cost prorated across items). The pricing calculator at `POST /api/pricing/calculate` applies these rules to produce sale prices from cost prices.

### Key patterns

**Error logging** — never use `console.error(error)` directly. Use:
```js
import { logApiError } from '@/lib/logger';
// ...
} catch (error) {
  logApiError(error, 'optional context');
```
`logApiError` logs only `{name, message, code, meta}` — no stack traces or query internals.

**Audit logging** — fire-and-forget for non-critical audit trails:
```js
db.auditLog.create({ data: { action, entity, entityId, details } }).catch(() => {});
```

**Rate limiting** — in-memory, module-level Map in `src/lib/rateLimiter.js`. Resets on server restart. Used on `/api/informes` (20 req/min).

**Zod validation** — all POST/PUT bodies are validated via schemas in `src/lib/validations.js` before DB writes.

**CRUD page pattern** — most list pages use the `PaginaGestion` compound component (`src/componentes/patrones/`) which takes `columnas`, `campos`, and `recursoApi` props to build a full CRUD UI.

### `src/lib/` key files
| File | Purpose |
|------|---------|
| `db.js` | Prisma singleton (prevents hot-reload connection leaks) |
| `sequence.js` | Auto-incrementing document numbers with annual reset |
| `validations.js` | All Zod schemas |
| `pdfGenerator.js` | PDF for all document types (logo cached in memory) |
| `verifactu.js` | VeriFactu hash chain + XML generation |
| `logger.js` | `logApiError` — safe structured error logging |
| `rateLimiter.js` | Sliding-window rate limiter (60s window) |
| `audit.js` | `logCreate/logUpdate/logDelete` helpers |
| `email.js` | Resend-based email with PDF attachments |
| `manejadores-api.js` | `handlePrismaError` for common DB error responses |

---

## Database notes

- **Dev**: `prisma/schema.dev.prisma` + `prisma/dev.db` (SQLite). Run `prisma db push` — no migrations needed.
- **Prod**: `prisma/schema.prisma` + MySQL. Uses `prisma migrate deploy`.
- The two schemas are kept in sync manually; `schema.dev.prisma` may have features ahead of `schema.prisma`.
- `Config` table stores app-wide key-value settings (`iva_rate`, `empresa_*`, etc.) — read via `db.config.findUnique({ where: { key: '...' } })`.
