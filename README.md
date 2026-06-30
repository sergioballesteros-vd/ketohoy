<p align="center">
  <img src="public/logo.jpg" width="150" style="border-radius: 20px" alt="KetoHoy Logo">
</p>

<h1 align="center">KetoHoy (Mercadona)</h1>

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

<p align="center">
  <img src="public/screenshot.jpg" width="600" style="border-radius: 20px; box-shadow: 0px 4px 20px rgba(0,0,0,0.5)" alt="KetoHoy App Mockup">
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
Asegúrate de configurar las variables de entorno en `.env` antes de inicializar la aplicación.

```bash
# 1. Instalar dependencias
npm install

# 2. Inicializar la base de datos
npx prisma db push
npm run prisma:seed

# 3. Arrancar servidor de desarrollo
npm run dev
```


