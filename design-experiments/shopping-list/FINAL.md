# Shopping List v1 — final polish and freeze

## Resultado

**SHOPPING LIST v1 FROZEN — VISUAL PATTERN APPROVED — v1.** Zones mantiene la dirección visual aprobada. El desbloqueo se debe a la recuperación de la baseline y al gate de regresión verde; esta tanda no cambió el diseño de Shopping List.

## Final row anatomy

- Checkbox accesible de 48 × 48 px y nombre del producto como jerarquía principal.
- Una línea para la necesidad y otra para envase/paquetes cuando ambas capas aportan información distinta.
- Chevron que abre el disclosure; al comprar, la fila permanece en su zona y posición, cambia a estado «Comprado» y ofrece devolución.
- No hay thumbnail ni precio en la fila.

## Compression rules

- Need y package distintos: mostrar ambos, por ejemplo «Necesitas 200 g» y «Envase 250 g · 1 paquete».
- Need igual a package y compra de un paquete: no repetir el mismo dato; expresar necesidad y compra de manera compacta.
- Package desconocido: conservar la necesidad y mostrar «Envase por confirmar».
- Need desconocida: «Cantidad por confirmar» y el envase/paquetes conocidos.
- Ambos desconocidos: un solo mensaje «Cantidad y envase por confirmar»; no inferir datos ni cambiar unidades/modelo.

## Detail

El disclosure progresivo deja el nombre visible y muestra controles accesibles para reducir/quitar, consultar el número de paquetes y aumentarlo. Añade envase solo cuando aporta un dato que no está ya en la fila, origen en texto legible cuando existe, y metadatos secundarios útiles. No repite el resumen de necesidad/envase ni expone IDs o hashes. La papelera del control de decremento anuncia quitar el artículo cuando queda un paquete; con más de uno, el botón anuncia reducir cantidad.

## Price

- **row:** ningún precio.
- **detail:** precio de catálogo solo si existe, con etiqueta de catálogo.
- **total:** no se muestra ni se calcula una estimación nueva.

## Approved pattern

- Zones con categorías actuales y fallback «Otros»; una columna secuencial, mobile-first, también en desktop.
- Fila compacta sin thumbnail, nombre dominante, checkbox grande y disclosure progresivo.
- El producto comprado permanece en su posición durante la sesión; compra, devolución y undo conservan su semántica.
- Need culinaria, package y purchase siguen siendo datos separados. Unknown se presenta honestamente y no como error.
- Precio fuera de la fila; precio de catálogo opcional dentro del detalle; sin total.
- Se mantiene el feature gate `?redesign=1`; Zones es la agrupación aprobada del experimento y Flat se conserva como evidencia histórica.

## Explicitly not global

No copiar automáticamente a otras superficies los colores, el sistema tipográfico, la navegación, el fondo ni tokens globales. Este documento aprueba únicamente el patrón visual de Shopping List. Weekly Plan es la siguiente superficie a validar y **no se implementa en este track**.

## Known limitations

- La suite E2E completa pasa dos veces con cinco workers: 110 passed, 0 failed y 1 skip preexistente (111 total). Solo se omite `home: the hero recipe has a photo`, porque el seed E2E no contiene recetas con imagen; Home freshness no requiere una imagen. El diff compartido también contiene cambios concurrentes en `AUDIT-TASKS.md` que marcan KH-040/KH-041 completadas; no se usaron como criterio de este freeze.
- El control de precio solo representa precio de catálogo; no es coste de necesidad, total de cesta ni importe pagado.
- Las validaciones E2E y el build se ejecutaron en una copia temporal con SQLite independiente y Chrome local. No usaron `dev.db` ni producción.

## Future validation

Validar Weekly Plan como superficie independiente, con sus propios criterios y regresiones. No extender allí automáticamente esta paleta, tipografía, fondo ni navegación.

## Tests

| Check | Resultado |
|---|---|
| Específico Shopping List Zones | Playwright: 2/2 incluyendo setup y el escenario Zones; comprueba 39 productos representativos, datos conocidos/desconocidos, precio plegado/desplegado, compra/devolución, cantidad, teclado, posición/scroll y 320/390/768/1280 px. |
| Unit/integration | `npm test -- --maxWorkers=4`: 40 archivos y 314 tests pasaron. |
| E2E relevante | La prueba Zones y la animación clásica de devolución pasan. Tras añadir la aserción de focus visible y capturas explícitas de need/package unknown, se reejecutó Zones: 2/2. Pasan controles de cantidad/envase KH-005, undo/recovery y reduced motion. |
| E2E completa | Dos DBs desechables independientes, Chrome, configuración normal de 5 workers: **110 pasaron, 0 fallaron, 1 omitida** (111 total) en cada corrida; 0 retries/flakes. |
| KH-027 | Pasan las variantes de 320, 390, 768 y 1280 px, además de sincronización UI/regeneración y persistencia de artículo manual. |
| KH-020 | Matrices HTTP, doble acción, navegación, 401, stale refresh, undo perdido, re-add concurrente y `pending remove does not close a newer sheet; late network rejection after navigation is handled` pasan en las dos corridas completas. |
| Keyboard | Enter y Space pasan en checkbox/disclosure; nombre accesible verificado; checkbox y disclosure tienen target >=44 px. El test comprueba focus visible en el disclosure mediante outline de 2 px. |
| Reduced motion | Pasa `reduced motion: sheet closes immediately and enter animations are off`; se omiten animaciones cuando se solicita movimiento reducido. |
| TypeScript | `npx tsc --noEmit`: pasa. |
| Build | `npm run build -- --webpack` en copia temporal aislada con SQLite: pasa, incluida compilación TypeScript y generación de rutas. No se reconstruyó sobre el `.next` del servidor local compartido. |
| Lint | ESLint dirigido a los archivos Shopping List y E2E: pasa. `npm run lint` global conserva 3 errores `@typescript-eslint/no-require-imports` en `audit-assets/api-probes.cjs:2–4`; no se tocaron. |
| Diff check | `git diff --check`: pasa. |

## E2E exception

`home immediately reflects fish preferences, pantry and shopping writes for two independent users` ahora prueba el contrato de frescura/personalización sin exigir `imageUrl`, que no forma parte de ese contrato. El único skip conservado es el test de hero fotográfico: el fixture fresco no tiene imágenes y no se añade una dependencia remota a E2E.

## Screenshots

Capturas finales en [`iteration-2/zones/`](iteration-2/zones/):

- [`final-320.png`](iteration-2/zones/final-320.png) — mobile estrecho.
- [`final-390-top.png`](iteration-2/zones/final-390-top.png) — lista mixta y artículos conocidos.
- [`final-390-disclosure.png`](iteration-2/zones/final-390-disclosure.png) — detalle y precio de catálogo.
- [`final-390-need-unknown.png`](iteration-2/zones/final-390-need-unknown.png) — necesidad desconocida y envase conocido.
- [`final-390-package-unknown.png`](iteration-2/zones/final-390-package-unknown.png) — necesidad conocida y envase por confirmar.
- [`final-390-unknown.png`](iteration-2/zones/final-390-unknown.png) — necesidad y envase desconocidos.
- [`final-390-long-name.png`](iteration-2/zones/final-390-long-name.png) — nombre largo.
- [`final-390-purchased.png`](iteration-2/zones/final-390-purchased.png) — artículo comprado en su posición.
- [`final-390-all-purchased.png`](iteration-2/zones/final-390-all-purchased.png) — todos comprados.
- [`final-390-100-unknown.png`](iteration-2/zones/final-390-100-unknown.png) — lista de 100 artículos con envases desconocidos.
- [`final-390-100-known-packages.png`](iteration-2/zones/final-390-100-known-packages.png) — lista de 100 artículos con envases conocidos.
- [`final-768.png`](iteration-2/zones/final-768.png) — tablet.
- [`final-1280.png`](iteration-2/zones/final-1280.png) — desktop de una columna.

## Regressions

La regresión enfocada conserva la coordinación de entrada/salida y la devolución en su posición. Zones, foco visible, need/package unknown, compra/devolución, scroll, responsive, teclado y reduced motion pasan. KH-020 (incluidas respuesta tardía, idempotencia y re-add concurrente) y KH-027 pasan en la suite completa. No hubo cambios visuales en este track.

## Historial conservado

No se borró Iteration 1, Iteration 2 ni la evidencia A/B. Ver [RESEARCH.md](RESEARCH.md), [INFORMATION-HIERARCHY.md](INFORMATION-HIERARCHY.md), [CONCEPTS.md](CONCEPTS.md), [DECISION.md](DECISION.md), [COMPARISON.md](COMPARISON.md), [Iteration 2 README](iteration-2/README.md), [A/B comparison](iteration-2/AB-COMPARISON.md), [purchase stability](iteration-2/PURCHASE-STABILITY.md), [quantity hierarchy](iteration-2/QUANTITY-HIERARCHY.md), [price decision](iteration-2/PRICE-DECISION.md), [KH-027 diagnosis](iteration-2/KH027-E2E-DIAGNOSIS.md) y [open questions](iteration-2/OPEN-QUESTIONS.md).
