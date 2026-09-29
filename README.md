<p align="center">
  <img src="public/brand/ketohoy-icon-192.png" width="120" style="border-radius: 20px" alt="KetoHoy Logo">
</p>

<h1 align="center">KetoHoy</h1>

<h3 align="center">Tu planificador de comidas keto y gestión de despensa inteligente.</h3>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#quick-start">Quick Start</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black.svg" alt="Next.js">
  <img src="https://img.shields.io/badge/Tailwind-v4-38BDF8.svg" alt="Tailwind">
  <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status">
</p>

---

## ⚡ Overview
**KetoHoy** es una aplicación diseñada para facilitar el seguimiento de la dieta cetogénica (Keto) utilizando productos accesibles (enfocados en Mercadona). Integra gestión de despensa en tiempo real, generador de listas de la compra dinámico y recomendaciones de comidas basadas en los ingredientes que tienes en casa.

**Core Features:**
- **Control de Despensa:** Inventariado rápido de tus productos.
- **Ideas de Comida:** Generación de recetas inteligentes sugeridas basadas en la cobertura de ingredientes de tu despensa, calculando instantáneamente qué falta.
- **UX Premium:** Interfaz con animaciones fluidas (Framer Motion) adaptada para móviles con navegación Glassmorfismo.

## 🛠️ Project Structure
La estructura del proyecto está modularizada para escalabilidad y mantenimiento rápido:

- **`src/app/`**: Router principal de Next.js (App Router).
  - `/api`: Endpoints del backend (despensa, lista de compra, recetas).
  - `/inventory`: Gestión visual de tu despensa.
  - `/meals`: Sugerencias y visualización detallada de recetas.
  - `/shopping-list`: Interfaz de carrito.
  - `/weekly-plan`: Generador de menú semanal.
- **`src/components/`**: Componentes reutilizables de UI (Navigación, Tarjetas animadas).
- **`src/lib/`**: Lógica compartida.
- **`prisma/`**: Esquema de la base de datos (SQLite / Prisma) y scripts de semillas (`seed.ts`).

## 🚀 Quick Start
Copia `.env.example` a `.env.local` y rellena las variables (ver el archivo
para el detalle de cada una) antes de inicializar la aplicación.

```bash
# 1. Instalar dependencias
npm install

# 2. Inicializar la base de datos
npx prisma migrate dev
npx prisma db seed

# 3. Arrancar servidor de desarrollo
npm run dev
```

### Catálogo Mercadona

`src/lib/mercadona.ts` lee el catálogo público de `tienda.mercadona.es` (sin
claves ni CLI): indexa en memoria las categorías relevantes para keto al primer
uso (~50 peticiones, refresco cada 12 h) y busca en local. Si Mercadona no
responde, cae a un catálogo demo de 8 productos y lo avisa en consola.

## 🗄️ Backup y restore de producción

Cada deploy (`.github/workflows/deploy.yml`) hace un backup de `dev.db` con
`sqlite3 .backup` antes de aplicar migraciones, guardando los últimos 10 en
`backups/` en el servidor. Requiere `sqlite3` instalado en el host
(`apt install sqlite3` en Ubuntu) — si falta, el deploy se aborta antes de
tocar la base de datos, no sigue sin backup.

Para restaurar un backup:

```bash
pm2 stop <PM2_APP_NAME>
cp backups/dev-<timestamp>.db dev.db
pm2 restart <PM2_APP_NAME>
```




## Imágenes de recetas (proceso manual)

Las fotos de receta se guardan en la base de datos y **no** se tocan en los deploys ni al navegar.
Para completar las que faltan hay que lanzarlo a propósito (usa el primer resultado de Unsplash, así que conviene revisarlas después):

```bash
cd <DEPLOY_PATH>                       # en el VPS: la carpeta de la app
npm run images:backfill -- --dry-run   # lista las recetas sin foto; no llama a Unsplash ni escribe en la BD
npm run images:backfill                # busca y guarda (RECIPE_IMAGE_BACKFILL_LIMIT=40 por defecto)
```

- Lee `UNSPLASH_ACCESS_KEY` del entorno, de `.env.local` o de `.env`. Si falta, el script falla con un mensaje claro y no cambia nada.
- Unsplash (plan demo) permite 50 peticiones por hora.
- Para corregir una foto: `sqlite3 dev.db "update Recipe set imageUrl=NULL where title='…'"` y volver a lanzar el script.
- `RECIPE_IMAGE_AUTOFETCH=true` reactiva la descarga automática al ver recetas (desactivada por defecto).
