# Evidencia de auditoría KetoHoy

Fecha: 2026-10-02. Artefactos de diagnóstico; no son código de producto ni prueba de una corrección. El informe completo está en [AUDIT.md](../AUDIT.md) y las tareas en [AUDIT-TASKS.md](../AUDIT-TASKS.md).

## Condiciones

Producción pública se visitó solo en lectura. Alta, preferencias, escrituras, cookies inválidas y fallos inducidos se probaron contra `http://127.0.0.1:3100` y una **copia desechable** de SQLite creada con backup consistente. No se ejecutó seed en la BD original; no se enviaron correos reales. Servidor en modo `next start`, build actual del checkout, HTTP local y cookie Secure false únicamente en ese entorno. RESEND_API_KEY ausente y autofetch de imágenes false. Credenciales no se incluyen aquí.

La copia temporal de datos y el servidor de auditoría se retiran al terminar; estos resultados describen una ejecución concreta. No se conservan dumps de usuarios originales. Las capturas privadas solo muestran contenido de las cuentas locales de prueba.

## Resultados

| Archivo | Evidencia |
|---|---|
| `api-probes.json` | Cookie inválida vs handlers, catálogo manual compartido, pérdida de cantidades/repetición, merge comprado, defaults/restricciones/swap, atomicidad con fallo inyectado, FK inválida. Incrementos concurrentes y preferencias no reprodujeron pérdida/duplicados |
| `api-probes.cjs` | Probe local runnable con guard de ruta de BD. Requiere preparar servidor/BD aislados; escribe exclusivamente datos de prueba en esa copia y trigger temporal eliminado en finally. No ejecutar sobre servidor productivo |
| `browser-probes.json` | 56 combinaciones de siete rutas × ocho anchos; dimensiones/nav, errores, 400 de Fruta y happy path despensa/undo/compra/favoritos |
| `interaction-probes.json` | Pescado lento→Carne rápida muestra respuesta vieja, spinner tras borrar, trap y foco. Interceptación local con fixtures, no respuesta real del proveedor |
| `second-pass-probes.json` | Foco BODY tras ESC, forgot500 existente/200 inexistente sin proveedor, Origin externo aceptado en cliente API con cookie forzada. Este último no demuestra CSRF de navegador, por SameSite |
| `performance-seo-probes.json` | Visita warm a landing390: TTFB183ms/LCP256ms/CLS0, scripts encoded y fuentes; receta title/canonical/OG/Recipe JSON-LD; 404 real. No CWV de campo/INP |
| `dependency-audit.json` | Salida npm audit:17 avisos,1 critical/8 high/8 moderate. Alcance de advisory se analiza en informe; no equivale a explotación |
| `findings.json` | 46 findings estructurados, mismos IDs/prioridades/tareas del informe. Facilita selección sin copiar contenido de usuarios |

## Capturas seleccionadas

- `production-landing-320.png`, `production-landing-1440.png`: lectura pública, imágenes lazy cargadas/decodificadas antes de captura. Fotos discordantes y ausencia de CTA/footer de cierre en versión servida.
- `production-register-390.png`: alta pública servida frente a consentimiento ya presente localmente; no se envió registro.
- `production-recipe-1440.png`: receta SSR pública y foto para cotejo con ingredientes/pasos.
- `local-catalog-390.png`: rebozado etiquetado Muy keto por estimación de categoría.
- `local-catalog-fruit-error-320.png`: chip Fruta →400/error.
- `local-catalog-stale-response-390.png`: filtro Carne seleccionado y fixture de Pescado por respuesta invertida. Los nombres AUDIT son deliberados y **no productos del proveedor**.
- `local-plan-390.png`, `local-plan-1440.png`: densidad/orientación del menú, barra Hoy y acciones por plato.
- `local-shopping-320.png`: ergonomía/nombres/stepper en ancho mínimo.

Capturas no son medición de contraste completa, de lector AT, CLS ni de funcionamiento de Safari. Chromium desktop con viewport estrecho no emula teclado físico/virtual ni notch.

## Reproducir de forma segura

1. Instalar dependencias y leer instrucciones del proyecto. Crear directorio temporal cuyo nombre incluya `ketohoy-audit-`; copiar la BD con `better-sqlite3.backup` o `sqlite3 .backup`, nunca `db seed` con el seed actual apuntando a la original.
2. Hacer build y arrancar SOLO el servidor de prueba en loopback3100 con `DATABASE_URL=file:/ruta/ketohoy-audit-.../audit.db`, APP_URL local, COOKIE_SECURE=false, RECIPE_IMAGE_AUTOFETCH=false y sin proveedor de correo real.
3. Confirmar que **el servidor y AUDIT_DB apuntan a la misma copia**. El guard del probe valida su ruta de BD, pero no puede comprobar remotamente qué BD usa el servidor. No sustituir base/puerto por producción.
4. `AUDIT_DB=/ruta/ketohoy-audit-.../audit.db node audit-assets/api-probes.cjs`. Crea cuentas/pedidos locales y sobrescribe el JSON de resultados. El password literal del script es un fixture local, no una credencial de usuario/producción.
5. Para los casos browser: demorar categoría fish1000ms/meat50ms con fixtures y seleccionar ambos; búsqueda650ms→borrar; abrir Añadir con botón enfocado→ESC→comprobar activeElement. Reduced motion del plan: muestrear scroll al pulsar último día. No interceptar producción.
6. Retirar trigger si una interrupción externa evitó finally, parar servidor propio y borrar copia temporal. No borrar la BD original ni procesos del usuario.

Comandos de verificación ejecutados: `npm test` (156pass), `npm run lint` (pass), `npm run build` (pass), `npm run test:e2e` (setup400,1fail/26notrun), `npm audit --json` (avisos, salida distinta de0 esperada). No se implementó ningún fix para convertir checks en pass.
