# KetoHoy

KetoHoy es una aplicación web para planificar comidas keto según las preferencias y la despensa, explorar recetas y preparar una lista de compra con productos de Mercadona.

## Stack

- Next.js 16 (App Router), React 19 y TypeScript.
- SQLite con Prisma 7 y `better-sqlite3`.
- Tailwind CSS 4.
- Vitest para tests unitarios/de integración y Playwright para E2E.

## Requisitos

- Node.js 20.9 o posterior y npm.
- No hace falta instalar SQLite por separado: la aplicación usa `better-sqlite3`.

## Desarrollo local

Usa una base de datos desechable para no modificar por accidente un `dev.db` que ya contenga datos. Desde la raíz del repo:

```bash
npm ci
cp .env.example .env
```

En `.env`, configura `DATABASE_URL` con una ruta absoluta nueva, por ejemplo `file:/tmp/ketohoy-dev.db`. Prisma y Next.js cargan `.env`. No apuntes a la base de otra instalación.

Usa el mismo valor de `DATABASE_URL` en la terminal y en `.env`. Crea primero el archivo SQLite vacío (Prisma necesita que exista), prepara el esquema y los datos iniciales en esa misma base, y arranca:

```bash
export DATABASE_URL="file:/tmp/ketohoy-dev.db"
node -e "require('node:fs').closeSync(require('node:fs').openSync(process.env.DATABASE_URL.slice(5), 'a'))"
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

La seed requiere `DATABASE_URL`; inserta datos iniciales sin borrar los existentes. `SEED_RESET=true` borra datos antes de sembrar: no lo uses con una base que quieras conservar. Las migraciones aplican los cambios de esquema pendientes en la base indicada por `DATABASE_URL`.

## Variables de entorno

`.env.example` es la lista de referencia. No guardes secretos en el repo.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Ruta de archivo SQLite (`file:./dev.db` si no se cambia el ejemplo). Debe apuntar a la base local elegida. La seed falla si falta. |
| `RESEND_API_KEY` | Opcional en desarrollo; necesario para enviar correos reales de verificación y recuperación con Resend. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Opcionales; configura ambas junto con el URI de callback autorizado para habilitar Google OAuth. |

`APP_URL` permite establecer el origen público usado por URL/callbacks (por defecto `http://localhost:3000`); configúralo con el origen público al desplegar. `COOKIE_SECURE=true` debe reservarse para HTTPS; déjalo desactivado en desarrollo HTTP local. Las imágenes de recetas solo se muestran desde la lista revisada de `src/lib/recipeImages.ts`; navegar no busca fotos. `npm run images:backfill` es dry-run y solo persiste esa lista explícita si se ejecuta con `--apply`.

## Tests y comprobaciones

```bash
npm test -- --maxWorkers=4
npx tsc --noEmit
npm run lint
npm run build
```

Playwright arranca su propio servidor en `127.0.0.1:3100`, ejecuta migraciones y seed, y necesita una base SQLite desechable. Asigna una ruta temporal nueva en cada corrida:

```bash
DATABASE_URL="file:/tmp/ketohoy-e2e.db" npm run test:e2e
```

La configuración E2E rechaza `dev.db` fuera de CI. No reutilices una base que tenga datos que quieras conservar: las pruebas escriben en ella. El servidor E2E usa `APP_URL=http://127.0.0.1:3100`, `COOKIE_SECURE=false` y desactiva el auto-fetch de imágenes.

## Datos locales

Desarrollo, E2E y producción deben usar bases separadas. Antes de ejecutar una migración o una seed, comprueba qué archivo resuelve `DATABASE_URL`. No ejecutes `SEED_RESET=true` en una base persistente. No copies una DB de producción al entorno local sin autorización y una copia protegida.

El backup periódico y el procedimiento de restore están documentados en [docs/BACKUP-RESTORE.md](docs/BACKUP-RESTORE.md). El timer requiere instalación explícita en el host; un backup local no protege frente a la pérdida del host. Exportar/borrar cuenta y reconciliar borrados al restaurar está descrito en [docs/ACCOUNT-DATA-LIFECYCLE.md](docs/ACCOUNT-DATA-LIFECYCLE.md).

## Estructura

- `src/app/`: páginas y rutas API de Next.js.
- `src/components/`: interfaz compartida y landing.
- `src/lib/`: lógica de aplicación, autenticación y acceso a datos.
- `prisma/`: schema, migraciones y seed.
- `e2e/`: pruebas Playwright.
