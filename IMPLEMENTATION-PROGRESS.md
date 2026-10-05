# KetoHoy — Audit Implementation Progress

## Summary

* Completed: KH-001, KH-002, KH-003, KH-004, KH-005, KH-006, KH-007, KH-008, KH-009, KH-010, KH-012, KH-013, KH-014, KH-015, KH-016, KH-017, KH-025, KH-027
* In progress: —
* Blocked: —
* Already resolved: —
* Remaining: 0 de esta tanda (KH-027); otros 28 findings sin implementar

## Safety and baseline — 2026-10-03

Cambios previos conservados: 22 archivos tracked modificados y adjuntos/documentos/rutas legales untracked al inicio. Sin commits, deploy, seed ni migraciones sobre dev.db original. E2E usa backup SQLite consistente en carpeta temporal, DATABASE_URL explícito, HTTP local con COOKIE_SECURE=false y correo externo deshabilitado.

Baseline tras KH-010: npm test 19 archivos / 156 tests pasan; npm run build pasa; npm run test:e2e 28/28 pasan (setup + 26 existentes + nueva regresión). npm run lint falla por 3 no-require-imports previos en audit-assets/api-probes.cjs. No se ocultan ni se modifica ese archivo.

## KH-010 — Recuperar E2E

Status: Completed

### Changes

* Helper de registro con ambos consentimientos; cuatro preparaciones API actualizadas.
* UI prueba bloqueo sin checkbox y con uno solo antes de completar alta.
* Regresión HTTP de alta sin flags: 400 y sin sesión.
* Playwright exige DATABASE_URL y rechaza dev.db original fuera de CI antes del setup; no reutiliza servidor desconocido. Fuerza entorno HTTP local y sin correo externo. Ambas guardas probadas con --list (rechazo antes de cualquier escritura). CI usa su fixture dev.db efímera.

### Files

* e2e/registration.ts, auth.setup.ts, auth.spec.ts, pantry-shopping.spec.ts, plan.spec.ts, ui.spec.ts; playwright.config.ts (guardas de aislamiento).

### Tests

* Suite completa real Chromium: 28/28; unit/integration 156/156; build correcto.

### Verification

* Flujos dependientes ejecutados sobre copia temporal. Validación de registro intacta.
* Suite existente incluye 320/390, teclado y reduced motion; no cambia UI productiva.

### Notes

* Logs baseline: /tmp/kh-baseline-{unit,lint,build,e2e}.log. Lint global tiene el fallo previo descrito arriba.

## KH-012 — Seed y aislamiento SQLite

Status: Completed

### Changes

* Resolución de SQLite compartida por runtime y seed. Seed exige DATABASE_URL válida y muestra destino antes de escribir; runtime conserva su default existente.
* Cada receta, borrado y recreación de ingredientes dentro de una transacción real; reset sigue siendo opt-in.

### Files

* src/lib/sqliteUrl.ts, src/lib/db.ts, prisma/seed.ts, prisma/seed.test.ts.

### Tests

* 3 regresiones pasan: URL ausente/no SQLite, ejecución sobre dos bases desechables con hashes del original/segunda intactos y fallo INSERT mediante trigger con rollback de receta/ingredientes.
* ESLint de archivos afectados y TypeScript pasan.

### Verification

* Seed real ejecutado por subprocess solo con destino temporal explícito. 67 recetas. Sin cambios en dev.db original.

### Notes

* Fallo de trigger deliberado produce error Prisma y exit no cero: es el caso negativo probado, no una prueba omitida.

## KH-001 — Sesión real al crear productos

Status: Completed

### Changes

* requireUserId antes de parsear o consultar/escribir productos.
* Revisión de mutaciones vecinas: pantry, shopping, Mercadona add, recetas y generate ya validan sesión; sin ampliación de alcance.

### Files

* src/app/api/products/route.ts, e2e/product-security.spec.ts.

### Tests

* HTTP real atravesando proxy: cookie ausente, inventada, inválida, sesión expirada (BD temporal) => 401, cero productos con nombre de prueba. Sesión válida => 201, una escritura.
* Setup + probe E2E 2/2; build y lint de archivos afectados pasan.

### Verification

* No auth mock en la regresión HTTP. La cookie inválida habría obtenido 201 antes del fix.

### Notes

* Listado/búsqueda de productos estaban detrás del proxy pero sin sesión real. Su política privada/compartida se concreta en KH-013, ya que esas lecturas incluyen manuales.

## KH-002 — Compra y reversión atómicas

Status: Completed

### Changes

* Ambos endpoints hacen lectura, compare-and-set, transferencia y delta dentro de una transacción. mark-bought revierte el lote completo ante fallo.
* Helpers reciben TransactionClient; respuesta check contiene la fila final con productId y delta persistidos.

### Files

* src/lib/pantryTransfer.ts, check/route.ts, mark-bought/route.ts, buyFlow.api.test.ts.

### Tests

* buyFlow 21/21: ocho regresiones de fallos SQLite reales, incluidos checked, creación/actualización de stock, delta, borrado/reversión y segundo elemento del lote. Retry y llamadas simultáneas, stock sin cantidad y legacy siguen cubiertos.
* Las ocho regresiones FALLAN con los tres archivos originales (8 failed, 13 skipped por filtro deliberado) y pasan con fix; /tmp/kh-002-before-fix.log.
* TypeScript, ESLint de archivos afectados y build pasan; E2E despensa/compras/motion completo pasa.

### Verification

* Fallo revierte filas exactas y timestamps, stock y producto manual creado. Ningún mock de BD/transacción.
* No cambio en UI/motion; E2E confirma compra/descompra, foco y reduced motion existentes.

### Notes

* Toggle sigue siendo toggle; dos llamadas consecutivas pueden comprar y revertir. No se introduce contrato de estado deseado fuera del finding.

## KH-013 — Productos manuales privados

Status: Completed

### Changes

* Product.ownerId nullable con FK/index; manuales nuevos se crean/deduplican por cuenta, también durante compra libre.
* Listado/búsqueda exigen sesión real y filtran catálogo compartido + manuales propios. Lista/despensa rechazan productId ajeno con 404.
* POST products solo permite manuales: source/mercadonaId no pueden usarse para publicar o recuperar datos ajenos. Importación compartida sigue en su endpoint existente.
* Migración conserva originales legacy sin propietario y ocultos; crea copias privadas solo a partir de referencias existentes en listas/despensas por cuenta y redirige esas referencias manteniendo cantidades, delta y metadatos. Sin asignación al primer usuario; originales retenidos permiten recuperar el mapeo.

### Files

* schema.prisma, migrations/20261003120000_manual_product_ownership/migration.sql; productAccess.ts; products/list+search; pantry/route.ts; shopping-list/route.ts; pantryTransfer.ts; mercadona/add/route.ts.
* e2e/product-security.spec.ts; prisma/manualOwnership.test.ts; testDb.ts y seed.test.ts (aplicar migraciones reales solo a copias temporales).

### Tests

* Dos sesiones HTTP reales: manual A no aparece para B ni puede añadirse por ID; mismos nombres producen IDs/owners distintos; compra libre usa solo producto propio; Mercadona compartido utilizable por ambas. Cookie inválida cubierta por probe KH-001.
* Migración real desde cero y desde copia legacy: originales, ingredientes, cantidades y delta conservados; dos cuentas obtienen copias independientes; referencias sin cuenta conservadas. Foreign key check limpio; segundo migrate deploy no duplica.
* 26 tests específicos pasan; E2E setup+seguridad 3/3; build, TypeScript y ESLint afectados pasan.

### Verification

* La BD original permanece sin ownerId ni cambios. Fixtures snapshot readonly + migraciones pendientes en copia; nunca resolve/baseline de la migración nueva sin DDL.
* Legacy sin referencias privadas sigue oculto y sin propietario. Ninguna decisión irreversible ni producción necesaria para esta solución conservadora.

### Notes

* No se modifica consentimiento, claimLegacyData ni la política de datos legacy de otras entidades.

## KH-006 — Nueva necesidad separada del histórico comprado

Status: Completed

### Changes

* Filtros checked:false en merges de shopping-list y Mercadona. La ruta de receta ya lo hacía: se verifica sin reimplementar.
* Historial, cantidad comprada y pantryDelta permanecen intactos al volver a añadir.

### Files

* src/app/api/shopping-list/route.ts, src/app/api/mercadona/add/route.ts; shopping-list/__tests__/reAdd.api.test.ts; e2e/pantry-shopping.spec.ts.

### Tests

* Cuatro entradas: manual libre, manual con productId, Mercadona y receta. DB/transacciones reales; solo catálogo externo y sesión fixture stubbed en integración. 31/31 tests del módulo pasan.
* Antes del fix: 3 fallos exactos al reusar la fila comprada, receta pasa; /tmp/kh-006-before-fix.log. Después: 4/4 pasan, verificando añadir/comprar/re-añadir/histórico/stock/reversión/limpiar comprados.
* E2E 8/8 para despensa/compras; tres nuevas variantes de flujo a 320, 390 y 1280. Enter/Space para compra y reversión, foco real comprobado, reduce a 320; pendientes persisten tras limpiar y recargar. Sin overflow.

### Verification

* La segunda compra suma su propia cantidad y su reversión deja únicamente el stock anterior; limpiar el histórico no elimina la nueva necesidad.
* Recetas: se simula stock consumido para activar faltantes, respetando el contrato de presencia existente (KH-005/KH-015 quedan fuera).

### Notes

* El primer intento de las nuevas pruebas UI falló por buscar texto '1' donde la UI muestra '×1'. Selector corregido; no se tocó la app para adaptar el test. Sin fallo ocultado ni timeout ampliado.

## Final checkpoint and second diff review — 2026-10-03

* Completed: 6/6; Blocked: none; Already resolved: no finding completo. Rama receta de KH-006 ya resuelta, cubierta sin cambio.
* npm test: **22 archivos, 173/173 tests pasan**.
* npm run lint: **falla con los mismos tres errores previos** no-require-imports en audit-assets/api-probes.cjs:2–4. Archivo intacto.
* ESLint de todos los archivos afectados, nuevos tests y configuración: **pasa**.
* npx tsc --noEmit: **pasa**.
* npm run build: **pasa**, sobre DATABASE_URL temporal.
* npm run test:e2e: **33/33 pasan**, sin skipped. Incluye todos los 26 tests dependientes originales.
* git diff --check: **pasa**.
* Segunda revisión: ownership en lecturas/IDs; identidad de producto manual por cuenta; sesión antes de I/O; todas las escrituras de compra y batch bajo TransactionClient; respuestas finales; originales legacy conservados; DDL nuevo ejecutado realmente. Sin nuevos any/casts en runtime, librerías, refactors ajenos ni cambios de producto fuera de alcance.
* dev.db original conserva tamaño 811008 bytes y mtime 2026-10-02 11:35:42; no tiene ownerId. Seed tests comparan hash original y segunda base intactos. Migraciones/seed solo en copias o bases vacías temporales.
* Cambios previos del usuario conservados; en schema se añadieron exclusivamente ownership y relación, manteniendo sus tres campos de consentimiento. No commits ni despliegues.
* Límites: Chromium local; sin Safari/dispositivo físico/lector AT, ni proveedor de correo/OAuth. 768 no requerido porque no se cambia layout. Avisos de correo deliberado sin API key son esperables; flujos app y smoke sin nuevos pageerrors pasan.
* Migración preparada y probada, **no aplicada a la BD original ni producción**. Antes de servir este código sobre otra BD será necesario aplicar las migraciones por el procedimiento seguro de entrega autorizado.
* Logs globales: /tmp/kh-final-{unit,lint,targeted-lint,types,build,e2e}.log; evidencia importante resumida aquí para no depender de logs temporales.
* Siguiente tanda recomendada (sin implementar): KH-003, KH-004, KH-017, KH-014, respetando AUDIT-TASKS.md.

## KH-003 — Sustitución explícita y preferencias — 2026-10-03

Status: Completed

* Ambas ramas usan scoreRecipe con el mismo contexto y minAvailability=0 deliberado; sin duplicar listas ni reglas.
* Cinco regresiones de pescado, cerdo, lácteos, tiempo y keto: antes 5/5 fallan (200); después pasan (422 con acción hacia preferencias). Slot exacto intacto; alternativa compatible persiste con despensa vacía.
* Suite plan + regresiones: 12/12; TypeScript y lint afectados pasan. Bases temporales; auth fixture, BD real. UI/motion N/A.
* Logs: /tmp/kh-003-{before,after,types,lint}.log.

## KH-004 — Completitud del plan semanal — 2026-10-03

Status: Completed

* Contrato complete (200, 28 slots), incomplete y no_candidates (422, missingMealTypes/availableSlots/expectedSlots). Restricciones intactas; la rotación existente permite repetir candidatos compatibles.
* Se evalúan los cuatro pools antes de toda escritura. Ni siete snacks ni cero candidatos sustituyen el plan; sin plan anterior no se crea uno parcial. Fallo INSERT real revierte borrado/creación en transacción.
* Before: dos regresiones fallan (200 con siete snacks); after: 17 tests plan pasan con snapshots exactos de BD y preferencias. TypeScript y lint afectados pasan.
* E2E plan: 6/6 (incluido setup); 320/390/1280, mensaje concreto, sin éxito falso ni overflow, CTA enfocado y activado con Enter. Selector inicial ambiguo con announcer Next corregido al alert de main; app no modificada para adaptar test.
* Recuperación sin movimiento nuevo; reduced motion N/A. Sin Safari/dispositivo físico/AT.
* Logs: /tmp/kh-004-{before,after,types,lint,e2e}.log. Build en copia temporal pasa.

## KH-017 — Preferencias fiables — 2026-10-03

Status: Completed

* Snapshot de la respuesta persistida; dirty compara solo los cinco campos editables. saved derivado de coincidencia y saving=false. Sin temporizador ni flag saved independiente; edición B durante PATCH A queda pendiente.
* Before: regresión de carrera real falla con “Preferencias guardadas” mientras servidor tiene B=false y UI B=true. Test usa barrera artificial en PATCH; comprobación inmediata, sin esperar que desaparezca el feedback anterior. After pasa; fallo 500 conserva edición y retry persiste.
* Advertencia solo dirty: captura de enlaces internos, beforeunload, navegación traverse mediante Navigation API cuando es cancelable; fallback popstate. Una confirmación al aceptar back. Sin autosave ni nueva librería.
* Investigación local: guía Next Link y comportamiento router; solo popstate no protegía el back de Chromium en esta versión. Referencia de API: https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent.
* E2E 6/6 con setup: 320/390/1280, Space/Enter, salida cancelada conserva valores, back cancelado/aceptado, volver a valores persistidos y guardar no avisa. Reduce a 320. TypeScript y lint afectados pasan; build pasa.
* Selector inicial de preferencias corregido a su nombre real “Preferencias y cuenta”; sin modificar app para ajustarse al test. Chromium local, sin Safari/dispositivo físico/AT; fallback de navegador antiguo no certificado.
* Logs: /tmp/kh-017-{before,after,types,lint,build}.log.

## KH-014 — Inicio fresco y defaults — 2026-10-03

Status: Completed

* Medición sobre copia SQLite: 30 ejecuciones de las cuatro lecturas y cuatro pasadas de scoring, 67 recetas; p50 2.63 ms, p95 8.64 ms, máximo 16.61 ms. Eliminado unstable_cache; sin invalidaciones/tags nuevos.
* Home usa DEFAULT_PREFERENCES (20 min), validación de ketoMode igual a plan/sugerencias. API de creación usa la constante; fallbacks de exclusiones y evaluador la reutilizan también. Schema existente ya coincide: sin migración.
* Before: dos E2E fallan en retorno inmediato por pescado tras avoidFish y contador Sin pendientes tras añadir compra. After: 4/4 E2E con setup pasan, sin sleep de 60 s; también compra actualiza despensa y pendientes. Dos sesiones muestran datos/preferencias separados.
* Integración BD real con dos usuarios sin preferencias: receta de 25 min totalmente disponible no aparece en home, sugerencias ni plan; receta de 20 min sí. Contadores privados y creación de preferencias usan defaults iguales. 18 tests específicos pasan; TypeScript, lint afectados y build pasan.
* Sin cambio de layout/movimiento; Chromium desktop para nuevas regresiones, suites móviles/teclado existentes en checkpoint final. Sin Safari/dispositivo físico/AT.
* Logs: /tmp/kh-014-{cost,before,after-unit,after-e2e,types,lint,build}.log.

## Checkpoint de la segunda tanda y revisión final — 2026-10-03

* Segunda tanda: **4/4 Completed**, KH-003 → KH-004 → KH-017 → KH-014; Blocked: ninguno. No se implementan otras tareas ni se reabren las seis anteriores.
* npm test: **25 archivos, 182/182 tests pasan**.
* npx tsc --noEmit: **pasa**.
* npm run build: **pasa**, con DATABASE_URL de copia temporal migrada.
* npm run test:e2e: **44/44 pasan**, sin skipped. Añadida comprobación de pageerrors en plan/preferencias/inicio: ninguno. Suites existentes verifican layout a 320/390; nuevas recuperaciones a 320/390/1280, teclado y reduce a 320 en preferencias.
* ESLint de todos los archivos afectados: **pasa**. Lint global: exactamente los **tres errores preexistentes** no-require-imports en audit-assets/api-probes.cjs:2–4; archivo intacto.
* git diff --check: **pasa**.
* Primer checkpoint E2E: 42/44, dos altas preexistentes recibieron 429 por nuevas altas compartiendo IP. Nuevos tests de inicio usan IP fixture por test/cuenta, siguiendo el patrón existente. Rate limit y tests previos de seguridad no modificados; después suite completa 44/44, incluida repetición con captura de pageerrors.
* Segunda revisión KH-004: respuesta completa leída dentro de la transacción; solicitudes simultáneas ahora prueban también 28 comidas en cada respuesta, además de una sola fila de plan final. Incompleto/vacío/fallo INSERT nunca borran el plan anterior.
* Segunda revisión KH-017: snapshot solo cambia al cargar o recibir datos persistidos; salir de sesión no inventa un snapshot guardado. Confirmación de descarte no provoca un segundo warning de unload.
* Reglas alimentarias siguen en scoreRecipe/ketoRules, sin listas duplicadas ni garantías de alergia. Sin nuevos any explícitos, librerías, schema/migraciones, refactors ajenos, commits ni despliegues en esta tanda.
* Original dev.db: tamaño **811008 bytes**, mtime_ns **1790933742344198904**, igual al baseline anterior; SHA-256 actual **2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad**. Tests con escrituras/migraciones solo en bases/copias temporales y cuentas fixture. Cambios previos del usuario conservados (incluido consentimiento de home).
* Límites: Chromium local; sin Safari/dispositivo físico/lector de pantalla. Fallback de navegación en navegadores antiguos no certificado. No verificación de proveedores externos ni producción.
* Logs finales: /tmp/kh-tanda-final-{unit,types,build,e2e,lint,targeted-lint,e2e-lint,diff-check}.log.
* Próxima tanda recomendada, **sin implementar**: KH-008, KH-009, KH-007 — categorías, respuestas del catálogo y clasificación keto coherentes.

## KH-008 — Contrato de categorías y retry — 2026-10-03

Status: Completed

* Categorías generales de despensa intactas; MERCADONA_CATEGORY_QUERIES define las ocho realmente soportadas. Lista UI derivada y guard de API comparten contrato.
* Regresión sobre SSR de ExploreClient y handler real con catálogo externo stubbed: código anterior falla para Fruta con 400; fix recibe 200 + vacío válido en todos los chips. E2E pulsa los ocho chips contra API real local y todos devuelven 200 + array.
* Error temporal 503 forzado en categoría y búsqueda: retry conserva URL exacta, categoría Carne, subcategoría Pollo y query de búsqueda. No reset a Todo.
* Tras KH-008: test específico, TypeScript y lint afectados pasan; build local temporal pasa. E2E categoría + retry pasan antes de implementar KH-009.

## KH-009 — Última consulta vigente — 2026-10-03

Status: Completed

* AbortController y generación locales al loader existente; solo la generación vigente cambia products/error/loading. Edición invalida inmediatamente, antes del debounce; cleanup aborta e invalida al desmontar.
* Submit cancela debounce y deduplica URL equivalente, incluso si ya respondió. Retry fuerza una nueva petición de la URL conservada. Borrar por botón o input vuelve a Todo e invalida resultados anteriores.
* Before real en Chromium: Pescado 1000 ms sobrescribe Carne 50 ms; Enter + debounce hace dos requests. After: Carne persiste, loading=false, sin error de aborto; Enter hace uno; borrar impide repoblar; salir con petición pendiente no genera pageerrors.
* Fallo obsoleto 503 con nueva consulta aún pendiente no elimina loading ni muestra error/estado vacío. Integración de catálogo completa: 5/5 con setup en este checkpoint. TypeScript/lint/build pasan.

## KH-007 — Clasificación y procedencia coherentes — 2026-10-03

Status: Completed

* classifyProduct centraliza reglas existentes y devuelve score/label/source/evidence: nutrition/openfoodfacts, category_estimate/category_name, unknown/none. Nutrición conocida prevalece sobre heurísticas de nombre. Sin datos, rebozado/empanado/crispy no recibe puntuación fuerte por categoría; otros sin identificar muestran Sin datos nutricionales.
* Normalización por tokens y plurales simples: repollo no coincide con pollo; bebida de almendras se categoriza como bebida. Listas actuales reutilizadas, sin ontología nueva.
* Search resuelve el mismo snapshot de detalle/EAN/nutrición que detail/import; cache de promesas por mercadonaId con el TTL existente del catálogo evita divergencia y duplicar resolución. Import reutiliza resultado, persiste score y nutritionSource y devuelve clasificación estructurada. En reimportación también actualiza categoría/nombre coherentes. Datos legacy se actualizan solo al reimportar: sin migración/backfill masivo.
* OFF tiene timeout de 10 s; fallo deja estimación explícita. Resolver detalle añade llamadas externas en frío, amortizadas por snapshot. Sin nuevo fetching/store global cliente, nuevas dependencias o schema.
* UI del catálogo/alta/detalle distingue estimación de nutrición y desconocido. Badge compartido y despensa usan nutritionSource existente para conservar la advertencia después de importar. No se cambia scoring de recetas ni se implementa KH-025: la convención de carbohidratos/fibra existente sigue pendiente de validar.
* Before: tres regresiones fallan con normalizador anterior (rebozado 5/5; repollo meat; arroz 5 frente a regla de importación 0). After reglas/API pasan: mismo ID en búsqueda, detalle, importación y filas SQLite para cuatro fixtures. Solo fetch externo y sesión fixture stubbed; handlers y escritura BD reales.
* 320/390/1280: texto visible sin truncar, cards/detalle sin overflow; Enter/Space, Tab/Shift+Tab del diálogo, Escape y retorno de foco, reduce a 320. Sin pageerrors. Capturas visualmente inspeccionadas en audit-assets/catalog-tanda3/. No 1440/dispositivo físico/Safari/AT.

## Checkpoint final de la tercera tanda — 2026-10-03

* **3/3 Completed**: KH-008 → KH-009 → KH-007. Blocked: ninguno. No se implementa la siguiente tanda ni se reabren tareas previas.
* npm test: **28 archivos, 191/191 tests pasan**.
* npx tsc --noEmit: **pasa**. npm run build: **pasa**, con copia temporal migrada.
* npm run test:e2e: **52/52 pasan**, sin skipped; ocho nuevos tests de catálogo + 44 anteriores. Chromium local; layout 320/390/1280, teclado/foco y reduced motion descritos arriba.
* Lint afectados: **pasa**. Lint global: exactamente **tres errores preexistentes** no-require-imports en audit-assets/api-probes.cjs:2–4; archivo intacto.
* git diff --check: **pasa**. Sin nuevos any explícitos, dependencias, commits ni despliegue. Guards de ownership y checked:false anteriores en Mercadona add conservados.
* Primer checkpoint simultáneo: unit tuvo un timeout de 5 s en migración legacy y ESLint coincidió con borrado de test-results al iniciar Playwright. Repetidos sin contención pasan (191 tests; solo los tres errores previos de lint), sin cambiar tests/timeouts para ocultarlo.
* Un primer build rechazó un campo inexistente TestInfo.testIndex del test nuevo; corregido a parallelIndex. Un intento de preparar la copia con import ESM falló antes de crearla; preparación CJS/tsx posterior correcta. Build fallido inicial con URL vacía terminó en typecheck; original intacto.
* BD original: SHA-256 **2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad**, igual al checkpoint previo. Integraciones y E2E solo copias temporales. Sin producción, seed ni migración sobre original.
* Before/after conservado: audit-assets/catalog-tanda3/kh-{008,009,007}-before.log y capturas catalog/detail-{320,390,1280}.png. Logs finales: /tmp/kh-tanda3-{unit,types,build,e2e,lint,targeted-lint}.log.
* Riesgos relevantes: dependencia/latencia externa al resolver productos en frío; snapshots y evidencias pueden quedar hasta 12 h en caché por proceso; datos legacy importados no recalculados hasta reimportación. KH-025 permanece pendiente y limita la interpretación de carbohidratos netos. No verificación nutricional del envase ni proveedores/dispositivos reales.
* Próxima tanda recomendada, sin implementar: KH-025 (convención nutricional), KH-005 y KH-015 (cantidades y disponibilidad suficiente).

## KH-025 — Contrato carbohidratos/fibra — 2026-10-03

Status: Completed

* Investigación antes de runtime edits: grafo search_graph/search_code/trace_path; todas las entradas/salidas nutricionales inventariadas en audit-assets/kh-025/CONTRACT.md. Mercadona aporta EAN/metadatos, no macros consumidos; OFF es la única API nutricional. Manual recibe netos explícitos; seed son referencias sin etiqueta/origen demostrable; demo sin macros; recetas sin campos de macros y ketoLevel editorial independiente. No reglas de cantidad/disponibilidad modificadas.
* Fuente primaria: schema oficial del objeto OFF nutriments: carbohydrates disponibles (excluye fibra), carbohydrates-total incluye fibra; _100g es g/100 g o 100 ml para líquidos, vendido. Se usa exactamente carbohydrates_100g, no serving/value/prepared ni total. Convención demostrada por contrato del campo recibido, no por país/EAN. Marco UE 1169/2011 registrado como contexto, no como inferencia de origen.
* Captura real endpoint v0 EAN 8480000348654, Almendra al natural Hacendado: 5.9 carbs, 12.2 fiber, 5.9 sugars; payload extractado sin cambiar nutriments, URL de foto y fecha de consulta conservadas. Antes la regresión de API falló: expected 5.9, received 0; resta universal daba 0/score 5. Después mismos handlers/fixture dan 5.9/score 4 en búsqueda/detalle/import/persistencia. No afirmamos inspección física/visual de la etiqueta: el visor web no abrió la foto; evidencia suficiente es contrato primario + payload representativo permitido por el alcance.
* Adaptador OFF centraliza validación y devuelve availableCarbsPer100g inequívoco; resolver deja de restar fibra. Sin tocar thresholds 5/10/20/35/50, categoría ni reglas KH-007. Fibra mayor que disponibles es válida y se conserva. Ausente/inválido → null, sin inventar fibra 0 ni netos; campo total-only no utilizado permanece desconocido. No se añade conversión productiva de total, porque KetoHoy no consume una fuente así.
* Schema añade nutritionConvention (available_excluding_fiber / unknown). Nuevos OFF y manuales explícitos marcan disponibles; manuales negativos rechazados, confianza sigue estimada (category/default), no dato medido. Seeds permanecen referencias manuales con convención unknown. Comentarios del adaptador/schema/seed explican compatibilidad de nombres existentes.
* Migración 20261003190000_nutrition_convention probada realmente solo en copias: default unknown, score de antiguos OFF 0. Mantiene todos los macros, fuente OFF, fechas/referencias/IDs para recuperación; no recalcula cifras ni fabrica precisión. Helper de confianza reutiliza unknown de KH-007 para UI; no nueva taxonomía de confianza ni clasificador paralelo. Reimportación explícita puede reemplazar legacy desde snapshot verificado y recuperar evidencia/score; probada en integración. Prueba ownership adaptada solo a la nueva columna/score esperado; implementación KH-013 intacta.
* UI: copy dispone de carbohidratos disponibles sin fibra y basis 100 g/ml; legacy unknown no muestra carbos netos históricos, sí explicación honesta y macros independientes conservados. Capturas /tmp/kh025-{legacy,verified}-{320,1280}.png inspeccionadas a 320, texto legible sin overflow. Chromium localhost:3100 en BD temporal. Skill frontend-testing-debugging aplicada; Browser plugin no disponible, Playwright del proyecto.

### Verificación

* Nutrición/scoring/API/migración específicos: **41/41**, 5 archivos. Casos 5 disponibles+3 fibra→5, fibra 0 y mayor que carbs; 0 carbs; decimales; null/undefined/ausente/negativo/string/boolean/object/no finito; datos OFF no disponibles; raw/serving/prepared ignorados. Todos los thresholds exactos y ±0.01 con disponibles normalizados.
* KH-007: rebozado, repollo, bebida de almendras conservados; nuevo EAN real y desconocido total-only coinciden en búsqueda/detalle/import/SQLite; recuperación por reimport y contrato manual explícito verificados. HTTP externo/auth fixture stubbed; handlers/BD/migración reales.
* Unit/integration completo: **30 archivos, 221/221 tests pasan**. Primera ejecución falló únicamente en el nuevo test de migración por comparar el número de filas sin considerar copias legítimas de ownership anterior; corregida comprobación por ID original, sin modificar app para ajustar test. Ownership conserva su prueba propia de referencias y copias.
* E2E relevante: **18/18** (setup + catalog + nutrition + pantry-shopping); sin skipped. 320/390/1280, teclado/foco y reduce a 320, copy nuevo y legacy. Nuevos tests de nutrición sin pageerrors. OFF fixtures de UI stubbed; API integration demuestra números reales desde captura. Chromium únicamente, sin Safari/dispositivo físico/AT.
* TypeScript **pasa**; build **pasa** con DATABASE_URL temporal migrada; lint afectados **pasa**. Lint global: exactamente los **tres errores preexistentes** no-require-imports en audit-assets/api-probes.cjs:2–4, archivo intacto. git diff --check **pasa**.
* Avisos E2E externos: Mercadona 403 activa demo existente; imagen Unsplash 404 y correo sin RESEND_API_KEY. No se ocultaron ni arreglaron fuera de alcance; fixtures nuevos sin errores de runtime. Semántica probada offline con captura, no certificación de disponibilidad actual del catálogo externo.
* BD original SHA256 **2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad**, igual al baseline. Schema/migración **sí**; BD original **no tocada**, producción **no tocada**. Migración necesaria al entregar código en otra BD; no se ejecuta aquí contra originales. Sin nuevos proveedores/dependencias, commits ni despliegues.
* Revisión de cierre: entradas conocidas con semántica explícita, unknown sigue unknown; una normalización OFF; scoring consume disponibles validados; legacy conservado sin reinterpretación; KH-007 consistente; regresión detecta la doble resta original. No KH-005/KH-015 ni otros findings implementados.
* Riesgos reales: errores de contenido del proveedor OFF (contrato semántico no certifica cada etiqueta); referencias seed sin origen verificable; legacy pierde clasificación fiable hasta reimportación explícita. Caché de snapshot 12 h existente, sin cambios. Foto del EAN no inspeccionada; no certificación de envase físico.
* Logs: /tmp/kh025-{before,specific,unit,e2e,types,build,targeted-lint,lint}.log. Matriz/fixture persistidos en audit-assets/kh-025/.
* Próximo paso: **KH-005 ya puede abordarse con este contrato nutricional claro**, respetando que macros legacy/seed desconocidos no sirven para inventar precisión. No implementado; KH-015 permanece separado.


## KH-005 — cantidades, origen y paquetes — 2026-10-04

Status: Completed

* Solo KH-005. Se conserva el historial y diagnóstico original de AUDIT.md/AUDIT-TASKS.md; no se reabren findings completados ni se implementan KH-015/016/027. Checkout previo del usuario preservado, sin commits/despliegue/dependencias nuevas.
* Mapa antes de runtime/schema: grafo search_graph/search_code/trace_path/snippets y guía local Next route.md. audit-assets/kh-005/DOMAIN-MAP.md documenta receta→ingrediente→slot→lista→producto→compra→stock, puntos de pérdida, inventario readonly de unidades y ausencia real de raciones/paquetes consumidos en Mercadona. Contrato final en audit-assets/kh-005/CONTRACT.md.
* Required quantity/unit nullable y texto original literal; sourceType/sourceKey estable por cuenta y tuple receta/ingrediente o plan/slot/receta/ingrediente. Una fila por origen; dos recetas/slots legítimos no colapsan por nombre/producto. Retry devuelve snapshot existente incluso comprado. Suma compatible disponible vía helper manteniendo las filas fuente; sin agrupación visual destructiva. Nueva preparación usa otro slot o alta manual; borrar/limpiar una intención elimina su clave. No sincronización continua de snapshots tras editar receta/seed o reemplazar plan.
* Recipe/WeeklyMeal no tienen servings: cantidad de receta publicada, base/planned/factor desconocidos y sin escalado ficticio. Parser pequeño solo expresiones completas demostrables, fracciones/decimales y unidades inventariadas; número sin unidad/texto libre conserva original sin normalización numérica. g↔kg, ml↔L; no conteo↔masa/cucharada↔ml/envase↔g implícitos. Representación no redondea cantidades pequeñas a cero.
* Product packageQuantity/unit conocido solo por declaración explícita manual, con validación conjunta; distintos contenidos comerciales del mismo nombre/categoría no se deduplican entre sí. Mercadona actual no entrega tamaño al adaptador consumido; nombre/precio/demo/macros no se usan para inferirlo. Import mantiene nutrición KH-025 intacta. Asociación mediante PATCH quantity verifica producto accesible y conserva necesidad/origen; no UI de asociación/confirmación compleja.
* purchaseQuantity es contador elegido; quantity antiguo permanece opaco legacy/espejo de contador nuevo. POST manual/import incrementan exclusivamente compras manuales pendientes sin necesidad/texto. Catálogo subtotal usa purchaseQuantity, nunca required o fallback legacy; steppers del catálogo no seleccionan filas de receta. UI lista distingue necesidad, original, contenido del envase y paquetes; precio solo por compra explícita. Alta manual muestra default 1 paquete como selección de compra, no contenido físico. Undo legacy preserva texto antiguo y purchaseQuantity:null, sin inventar paquete. Selector de stock conserva unidad normalizada/externa recibida.
* Compra: 300 g necesarios + paquete 500 g + 1 comprado → stock 500 g. Contenido desconocido + contador conocido → N paquetes; contador también desconocido → stock null/null, delta 0 como registro sin incremento numérico. Stock previo desconocido/incompatible no se trata como cero: queda intacto y la compra crea fila propia. pantryItemId/pantryDeltaUnit registran destino exacto. Unbuy convierte delta solo a dimensión compatible; cambio incompatible → 409 y rollback, nunca resta otra fila. Legacy sin fila/unidad demostrable deja stock intacto al descomprar. No cambios al POST pantry ni definición de Disponible.

### Checkpoints y verificación final

* Before real: nuevo test llama endpoint receta sobre 200 g; antes falla mostrando quantity:"1". /tmp/kh005-before.log, copia durable audit-assets/kh-005/before.log. Después requiredQuantity=200, requiredUnit=g, texto exacto y source identity pasan. Sin regresión artificial de helper aislado.
* Modelo: migración 20261003200000_quantity_contract aditiva, probada con migrate deploy real solo sobre SQLite desechable. Comparación completa de columnas previas de shopping/products y filas stock, checked/ownership/deltas intactos, nullable unknown; foreign_key_check vacío, re-deploy idempotente, rollback lógico de nuevas columnas/índice antes de nuevas escrituras preserva datos exactos. No migración/seed en original ni producción.
* Generación/compra: checkpoint inicial 57/57 tests específicos (incluye suites KH-002/KH-006). Tras revisión adversarial se añaden unknown text, conteo físico/nutrición, variantes de envase, separación receta/alta manual y undo legacy. **31 tests nuevos KH-005** (27 API + 3 invariantes/helpers + 1 migración), todos dentro de suite final. Retry simultáneo, g+kg, incompatibles, dos recetas/slots, comprado+nuevo slot, paquete conocido/desconocido, stock desconocido, delta exacto tras cambio compatible y rechazo incompatible, dos cuentas, batch con fallo en segundo delta y creación de producto revertida.
* Unit/integration completo final: **33 archivos, 252/252 pasan**. KH-002/KH-006 preservan triggers reales de fallo checked/stock/delta/unbuy/batch y estado exacto antes/después, ahora con unidad explícita en fixtures de suma. Legacy unbuy dejó de asumir dimensión desde quantity; test protege stock intacto. Re-add receta representa segunda ocasión mediante slot distinto y selecciona paquetes explícitamente; retry mismo slot no suma. Test de migración KH-013 adaptado solo a columnas nuevas desconocidas; invariantes anteriores conservados. KH-025 fixtures/normalización/nutrición/migración pasan; Producto completo idéntico tras compra (macros por 100 g/ml, unknown intacto).
* **E2E relevante: 40/40 pasan, sin skipped** (setup + quantities + pantry-shopping + nutrition + plan + product-security + catalog + ui), Chromium localhost 127.0.0.1:3100, DATABASE_URL desechable migrada. Nueve E2E nuevos: cuatro receta/necesidad/compra/stock/legacy+undo/reload, conteo físico editable y cuatro catálogo sin fallback de compra. Flujos API/SQLite reales para receta/compra; catálogo-only UI usa boundary fixtures, integración demuestra separación con handlers reales.
* 320/390/768/1280: screenshots lista y diálogos alta/despensa/catálogo inspeccionados, sin overflow, necesidad/envase/compra legibles. Enter/Space compra/descompra, Tab/Shift+Tab, Escape; retorno de foco de despensa/detalle de catálogo verificado. Reduce a 320. Semántica textual/nombres accesibles; no certificación lector de pantalla real/Safari/dispositivo físico. Capturas /tmp/kh005-{shopping,pantry-dialog,add-dialog,catalog-dialog}-{320,390,768,1280}.png.
* Límite previo real de teclado: sheet de alta pierde retorno al trigger por autofocus anterior al efecto que captura previous. No cambió esa lógica ni Sheet.tsx; corresponde a KH-019 y queda sin arreglar por scope. Prueba nueva detectó el fallo; se documenta y se verifican Tab entre campos + cierre, sin afirmar retorno correcto. Detalles de catálogo/despensa sí retornan foco.
* Primer unit completo: un fallo en expected row KH-013 por nuevas columnas nullable; ajustada proyección/expected sin alterar ownership. Primer E2E: selector ambiguo Añadir y fixture global de receta 5 min alteraba candidatos KH-004; selector scoped y receta fixture 30 min. Segunda pasada identifica foco previo KH-019. Otro rerun en la misma copia detectó IDs fixture reutilizados y label select exacto incluía texto de options; fixtures por ejecución y selector existente corregidos. No se modificó scoring/plan/foco para forzar los tests. Fixture de catálogo muestra ketoScore real explícito, sin undefined en capturas finales.
* TypeScript (`npx tsc --noEmit`) **pasa**; build **pasa** con copia temporal migrada; lint afectados **pasa**; lint global únicamente los **tres errores preexistentes** no-require-imports en audit-assets/api-probes.cjs:2–4, archivo intacto; git diff --check **pasa**. Logs /tmp/kh005-{before,model,specific,purchase,unit,e2e,types,build,targeted-lint,lint}.log.
* BD original SHA256 **2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad**, igual a baseline; producción no tocada. Snapshot readonly y migraciones/test writes únicamente desechables. Avisos externos E2E previos: correo sin RESEND_API_KEY, Mercadona 403/demo e imágenes externas; sin pageerrors en los flujos nuevos.

### Riesgos y siguientes findings

* Raciones publicadas y contenido Mercadona sin evidencia: cantidades quedan desconocidas donde proceda; no cálculo ficticio. Migración sigue pendiente en cualquier BD de entrega; no ejecutada en originales por instrucción.
* Necesidades son snapshots por origen, permanecen tras cambios del plan/receta hasta eliminación explícita; limpiar historial elimina su clave. Legacy sin dimensión/destino de transferencia no puede deshacer stock automáticamente de forma segura. Cambio de unidad a dimensión incompatible devuelve 409; recuperación compleja fuera de scope.
* KH-019 previo de foco de alta permanece; no certificación AT real. Datos de proveedor/nutrición conservan límites KH-025.
* KH-015: conversión/suma compatible y cantidades culinarias/stock inequívocas disponibles; suficiente cantidad NO implementada.
* KH-016: unidades/destino/delta de compras inequívocos; POST/re-add pantry NO redefinido.
* KH-027: orígenes estables de slot, necesidades separadas y contador/envase/transferencia disponibles; comprar menú NO implementado.
* Próxima tanda recomendada: KH-015 y KH-016 para suficiencia y altas; KH-027 después. KH-019 conserva su diagnóstico independiente.


## KH-015 / KH-016 — disponibilidad real y alta de presencia — 2026-10-04

Status: Completed (2/2)

* Scope exclusivo: primero KH-015 con checkpoint unit/scoring/API/TypeScript/lint y E2E relevante; después KH-016. No KH-027 ni reapertura de otros findings. Cambios previos del checkout conservados; sin commits, despliegues, dependencias ni migraciones nuevas. AUDIT.md conserva su diagnóstico histórico.
* Discovery con grafo search_graph/search_code (callers scoring, detalle, home, sugerencias, generate/swap, GET plan y faltantes), lectura de contexto posterior y guía local Next route.md. Skill frontend-testing-debugging aplicada; Browser plugin no disponible, Playwright del proyecto. Contratos de KH-005 y KH-025 reutilizados, sin otro parser/conversor ni semántica de stock.
* KH-015: matching elimina substring y comparación direccional amplia. ID encontrado prioritario; fallback iguala tokens completos normalizados, plurales comunes y equivalencia explícita pollo/pechuga de pollo ejercitada por scoring previo. Sal/salmón y leche/leche de almendras no coinciden. Resultado estructurado sufficient/insufficient/unknown/missing, required/available y reason; presence separada. convertQuantity/sumCompatible originales, suma por mismo productId+usuario sin mezclar productos por nombre ni legacy userId=null. Expiración DateTime transcurrida excluye stock; sin fecha no penaliza. Quantity/unit desconocidos e incompatibles nunca sufficient.
* Todos los consumidores usan ingredientAvailability/recipeAvailability: home, meals/cards, recipe detail y acción, plan/swap/generación/ranking y shopping missing. Copy compacto por estado; “Cantidad suficiente” solo ready, contador inicio “recetas con ingredientes en tu despensa”. Scoring conserva ratio de presencia, filtros y pool parcial/fallback del plan; no lo convierte en solo recetas completas. missingIngredients incluye insuficientes/unknown, total se toma del contrato. Faltantes mantiene cantidad completa original y source identity KH-005; no crea delta de necesidad ni altera contadores de compra/envases/deltas.
* KH-016: helper pequeño addPantryPresence con TransactionClient compartido por POST pantry y alta Mercadona. Respuesta efectiva con product y outcome created/201 o existing/200; existing no modifica fila. No constraint nuevo que impida stock legítimo en varias filas. PATCH conserva edición explícita y ownership. UI de alta repetida explica cantidad conservada y enlaza a edición existente; undo concurrente usa resultado y ofrece Editar, conserva 7 kg nuevos en vez de restaurar falsamente los 5 kg borrados. Ud elegida con cantidad conocida se conserva en alta/edición manual; no se borra como null. Delta/transferencias KH-005 intactos.

### Checkpoints, regresiones y verificación final

* Before KH-015 real contra helper anterior: cuatro fallos (sal/salmón, leche/almendras ambas direcciones, atún/plural); mismos casos pasan después. Evidencia durable audit-assets/kh-015-before.log. No se afirma una cuenta productiva afectada: entradas sintéticas que ejecutan la implementación anterior real.
* KH-015 específicos: **22 tests nuevos** (8 matching + 14 disponibilidad), más **13 scoring existentes adaptados al contrato**, todos pasan. Casos 500 g/1 kg sufficient, 1 kg/500 g insufficient, 500 ml/1 L sufficient, 2ud/1ud insufficient, 300g/2ud unknown, stock null/no unidad/no necesidad conocida, cero no suficiente, caducado incluso hoy con timestamp pasado, fecha ausente/futura, ID preferido, 300g+300g sumados solo mismo producto/usuario, desconocido adicional, sal/salmón y opcionales. Presencia parcial conserva score pero sin claim de cocinar ahora. Checkpoint KH-015 inicial: **78/78** en 8 archivos con scoring/quantidades/plan y TypeScript/lint/build. E2E nuevo cuatro viewports pasa; ocho E2E previos de plan/home más setup pasaron en la primera tanda.
* KH-016 específicos: **4 API/integration nuevos**, SQLite/handlers reales: created 3 kg; repetido 5 kg existing conserva 3 kg; PATCH a 5 kg y unidad g validada; dos altas simultáneas una sola fila; A borra/B reañade/undo A conserva cantidad y registro delta de compra; producto privado ajeno rechazado aun con referencia pantry manipulada, PATCH ajeno 404. Checkpoint de pantry/compra/re-add/products: **34/34**. E2E relevante pantry-readd/pantry-shopping/product-security: **14/14** con setup; cuatro nuevos usan pestaña B real y conservan 7 kg tras undo.
* Final `npm test`: **36 archivos, 278/278** unit/integration. Incluye KH-005 cantidades/migración/transferencia/legacy/nutrición; KH-002/KH-006 triggers y rollback de compra/unbuy/batch; KH-013 ownership/migración. Ningún test eliminado o skipped. Nueva cobertura neta **26** unit/integration y **8** E2E.
* Final `DATABASE_URL=file:/tmp/kh015-e2e.db npm run test:e2e`: **71/71 pasan**, suite completa en paralelo, sin skipped, Chromium `http://127.0.0.1:3100`, SQLite temporal migrada. Flujos de KH-005, KH-002/KH-006, KH-013 y previos pasan. Nuevos tests comprueban los cuatro estados en detalle, cards/meals y plan; copy real en home; filtro por suficiencia; shopping añade solo no suficientes con necesidad larga 123456789.5 g conservada; repeat/editar/undo/reload. Sin pageerrors nuevos en los flujos nuevos; smoke console de pantallas pasa. Fixtures SQL solo en copia desechable y productos/auth/APIs reales.
* Final TypeScript (`npx tsc --noEmit`) **pasa**; `npm run build` **pasa**; lint afectados **pasa**; lint global únicamente los **tres errores previos** no-require-imports en audit-assets/api-probes.cjs:2–4, archivo intacto; `git diff --check` **pasa**. Sin nuevas migraciones de schema ni cambios de nutrición KH-025.
* UX **320/390/768/1280**: nuevas ocho pruebas, document.scrollWidth≤innerWidth, cantidades largas, estados unknown/insufficient y feedback “Ya está…”/Editar; screenshots inspeccionados, sin overflow de documento. Enter y Space para añadir, filtro, editar/guardar, borrar/undo; controles etiquetados/foco visible (capturas) y Escape. Reduce emulado a 320. Capturas /tmp/kh015-{detail,meals,plan,home}-{320,390,768,1280}.png y /tmp/kh016-{existing,undo}-{320,390,768,1280}.png. No framework overlay/blank pages, identidad de rutas y contenido esperado comprobados; interacciones persisten por API/BD y reload. KH-019 (retorno de foco de alta) sigue pendiente; no se toca Sheet ni autofocus/captura de trigger. Sin Safari, dispositivo físico ni lector AT real.
* Ajustes de pruebas: primer fixture de plan almacenaba timestamp SQL numérico no equivalente al DateTime de Prisma; reemplazado por plan creado vía API. Primera suite E2E completa: 69 pasan/2 fallan por fixtures que intercalaban SQL externo y altas HTTP con transacciones de lectura/escritura SQLite (P1008 al crear stock). Fixture de disponibilidad prepara stock/ingredientes de forma síncrona en una sola transacción y verifica respuestas de setup; final paralelo 71/71. Build intermedio detectó array de productos del fixture sin tipo; corregido tipo explícito. No se altera app ni se reduce paralelismo para ocultar fallos.
* BD original SHA256 **2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad**, igual a baseline; producción no tocada. Logs /tmp/kh015-{before,checkpoint,e2e,e2e-retry}.log, /tmp/kh016-{specific,e2e}.log y /tmp/kh015016-{unit-final,types-final,build-final,targeted-lint-final,lint-final,e2e-final,diff-check}.log. Avisos externos previos correo sin RESEND_API_KEY, Mercadona/demo y fotos externas no se arreglan fuera de alcance.

### Límites y próximo paso

* Matching por nombres es conservador, puede pedir revisar productos con marca/modificadores no equivalentes explícitos. IDs verificables son preferidos. Cantidades/envases/raciones desconocidos siguen unknown; no inferencia desde nombre comercial. No consumo/reserva entre recetas o días; suficiencia corresponde a necesidad publicada por ingrediente en la lectura actual. No productId obligatorio repetido dentro de recetas actuales (consulta readonly); no nueva semántica de reserva semanal.
* SQLite transacciones del monolito mantienen atomicidad; escritores externos independientes pueden producir conflicto y error sin éxito falso. No se añade motor de retries/distribución ni se rediseña concurrencia global fuera de KH-016. Undo/alta informa error si API rechaza la operación.
* KH-019 sigue pendiente. Validación de navegador solo Chromium; correo/proveedor/catálogo externo no certificados por estos fixtures.
* **KH-027 ya puede implementarse sobre cantidades/orígenes/stock y disponibilidad inequívocos**, preservando unknown, snapshots por slot e idempotencia. Queda sin implementar; deberá definir agregación y uso/reserva compartida de stock semanal, sin asumir suficiencia conjunta por evaluar cada receta por separado.

## KH-027 — preparar compra del menú semanal completo — 2026-10-05

Status: Completed

* Alcance exclusivo KH-027. Cambios previos preservados; sin commits/despliegue ni seed/migración en original/producción. Descubrimiento por grafo (search_graph/search_code/snippets/trace_path); guía Next local route.md/use-client.md antes de código. Mapa y contrato final ampliados en audit-assets/kh-005/CONTRACT.md, sin documento redundante ni reapertura de findings completados.
* Endpoint único POST /api/weekly-plan/shopping-list: autenticación y plan actual por cuenta, 28 slots únicos requeridos, lectura local de pantry/ingredientes y sync pending en una transacción. Plan parcial → 422/incomplete_plan, plan ajeno/reemplazado → 404. Ningún fetching Mercadona/OFF ni write pantry. Orden estable día/comida/slot/ingrediente y stock virtual; 500 g frente a 300+300 g → 100 g pendientes. Conversión KH-005, identidad/disponibilidad KH-015 y tuple fuente extraídas a helpers pequeños compartidos con endpoint individual, cuyo contrato permanece igual.
* Agregación por identidad compatible y unidad demostrable. Un campo nullable sourceContributions JSON conserva cada plan/slot/receta/ingrediente y necesidad publicada/texto exacto/cubierto/faltante/status, incluidos slots cubiertos de un grupo con faltantes. Cantidad desconocida no se elimina por presencia, no se convierte en 1 y queda individual. Sin envases automáticos/raciones inventadas ni modificaciones de KH-016.
* Fingerprint derivado de requisitos/slots originales, sin timestamp de ejecución. Keys por grupo/orígenes originales independientes de pantry. Retry/concurrente no duplica ni cambia timestamps; swap actualiza las contribuciones y regeneración limpia pendientes inequívocos de esa semana. Manuales, legacy ambiguos, fuentes recipe/meal individuales, otras semanas y checked history intactos. Asociaciones accesibles/paquetes elegidos conservados en identidad pendiente existente. Comprados se omiten sin inferir consumo histórico. Deshacer semanal prepara snapshot actual con endpoint agregado; limitación de restaurar otros faltantes omitidos explicitada en contrato.
* UI CTA/resumen en header semanal, estados reales, guard ref + disabled, busy/status con nombre, timeout 30 s y error recuperable. Enter/Space/foco visible, 320/390/768/1280 y reduce a 320. Preparación bloqueada durante swaps también elegidos optimísticamente. Reset del resumen por plan/recetas. Enlace a lista y decisión de paquetes existente; no modal/checkout nuevo.
* Migración 20261005120000_weekly_shopping_sources aditiva TEXT nullable probada con deploy real en copias temporales, integridad/FK/re-deploy/rollback lógico y comparación de todas las filas/campos previos/ownership/stock. Ajustes de expectativas de migraciones KH-013/KH-005 únicamente para nuevo campo nullable y rollback de columna; no cambia sus invariantes.

### Checkpoints, evidencia y límites

* Cálculo/API: 31 tests pasan (15 puro + 16 integration), más 1 migración KH-027. Plan 28, receta repetida, ingrediente 10 veces, stock exacto/parcial/ausente/unknown/caducado/ajeno, g/kg y ml/L, dimensiones incompatibles, originales unknown, fuentes compatibles separadas, orden estable, precisión flotante, retries/dos primeros requests concurrentes, swap, regenerate, manual/legacy/ambiguous/history, selección comercial explícita, A/B y trigger de fallo con rollback real. Test before/after real ejecuta dos endpoints individuales sobre 500g/300g+300g y obtiene 0, endpoint semanal obtiene 100g y retry idéntico; no cambia comportamiento anterior para fabricar evidencia.
* Unit/integration final: 39 archivos, 310/310 pasan, incluidos KH-005/KH-015, KH-002/KH-006, KH-013 y KH-025. Primer global detectó expectativa antigua KH-013 por nuevo null, ajustada. Una ejecución simultánea con build/browser agotó timeout 5 s de prueba existente KH-025; rerun aislado npm test pasa sin cambiar timeout ni producción. Errores FK de seed esperados en sus tests de rollback no son fallos de suite.
* E2E específicos: 5 nuevos + setup, 6/6 pasan. Cuatro viewports usan handlers/SQLite reales (solo escenario error usa response 500 de frontera), una llamada de preparación frente a cero de receta, doble click mientras response retenida, Enter/Space, retry idéntico, persistencia/reload/lista, deshacer conservando metadata, fallo recuperable y parcial sin writes. Quinta prueba UI usa swap real/regeneración y comprueba fuentes y manual intacto.
* Browser plugin no disponible; skill frontend-testing-debugging usa Playwright. Runtime Chromium headless descargado ausente; se usa Google Chrome instalado, engine Chromium, con configuración temporal /tmp/kh027.playwright.config.ts. No instalación/dependencias/config permanente nueva. URL localhost http://127.0.0.1:3100, DATABASE_URL=file:/tmp/kh027-e2e.db (snapshot readonly, migrado temporal). Fallos iniciales E2E solo por selectores ambiguos de status/alert y nombre dinámico busy; scoped/nombre accesible corrigen tests, sin relajar contrato.
* Capturas inspeccionadas /tmp/kh027-{idle,success,partial}-{320,390,768,1280}.png: CTA visible, mensajes legibles, sin overflow; rutas/contenido no vacíos/overlay/pageerrors/console relevantes verificados. Activación nativa con Enter/Space, foco visible y reduced motion comprobados; no modal ni cambio de retorno de foco KH-019. Sin Safari/dispositivo físico/lector AT real.
* Límites reales: sin consumo histórico inferido ni servings/package size no evidenciados; snapshot weekly separado de intenciones individuales previas; legacy weekly ambiguo se conserva; deshacer prepara snapshot completo actual. Migración aún no aplicada a original/producción. SQLite escritores externos pueden rechazar una transacción, sin éxito falso ni estado parcial; no motor distribuido nuevo.
* Próxima tanda recomendada, sin implementar: KH-019 (foco/teclado sheets existentes), KH-020 (errores/recuperación de undo fuera del flujo semanal).

### Verificación final KH-027

* **npm test: 310/310, 39 archivos**. **E2E completo: 76/76**, sin skipped, cinco workers y misma config temporal Chrome. Cinco nuevos más 71 previos, incluidos plan/KH-005/KH-015/pantry/compra/seguridad. Primera pasada global reveló fixture KH-015 solo lunch dependiente de hora Madrid: receta de prueba admite las cuatro franjas, con 30 min para no contaminar los tests de candidatos 5 min. Sin cambios a home/scoring/disponibilidad productiva. También hubo P1008 por upgrade de read→write contra escritores externos SQLite: KH-027 adquiere writer antes de leer mediante UPDATE id=id acotado a usuario/plan, sin cambiar valores/timestamps (assert completo). Final paralelo 76/76 tras correcciones, sin reducir workers ni añadir retries para ocultar fallos. Fallo temporal previo en otro endpoint durante esa pasada queda como límite de SQLite externo, no se redefine KH-002 ni se implementa otra tarea.
* **TypeScript/build/lint afectados/diff check pasan**; **lint global únicamente tres errores anteriores** no-require-imports api-probes.cjs:2–4 intacto. Build sobre DB temporal migrada. Logs /tmp/kh027-{checkpoint,adversarial2,unit-final,tsc-final,build-final,lint-target-final,lint-global,e2e-specific-final,e2e-full-final}.log; config /tmp/kh027.playwright.config.ts. No dependencias nuevas, no cambio permanente Playwright ni deploy.
* BD original SHA256 **2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad**, idéntico al baseline. Migración/fixtures/escrituras solo temporales; producción intacta. Avisos previos de correo sin RESEND_API_KEY/catalogo demo/fotos externas fuera de scope; nuevos flujos sin pageerrors/overlays ni console errors de app. Capturas inspeccionadas y test de width documentado; no certificación de dispositivo físico ni AT real.

## KH-018 / KH-019 / KH-020 — búsqueda, foco y recuperación — 2026-10-05

Status: Completed (3/3)

* Alcance exclusivo de los tres findings; KH-040/KH-041 y el resto sin implementar/reabrir. Checkout previo conservado. Discovery por grafo search_graph/snippets/trace_path y lectura del contexto exacto; guías Next locales use-client.md y route.md. Skill frontend-testing-debugging aplicada; Browser plugin ausente, Playwright existente con Google Chrome instalado y config temporal heredada /tmp/kh027.playwright.config.ts. Sin dependencias, gestores de estado, librerías motion, deploy, nuevas migraciones ni escrituras a BD original.
* KH-018: Añadir en despensa/compra tenía un loader distinto del catálogo KH-009 y conservaba searching tras cleanup. Se adapta el mismo contrato generation + AbortController + debounce/Enter, dentro del componente, sin hook ni mecanismo alternativo. Invalidación inmediata en cada cambio; consultas vacías/<2 limpian spinner/resultados/error/searched, viejas respuestas no repueblan UI y abort no muestra error ni falso “sin resultados”. Enter deduplica el debounce; on unmount aborta. Dos regresiones reales fallan antes por spinner=1, pasan después, incluyendo query N/N-1, clear pendiente, error+clear, respuesta obsoleta y reemplazo.
* KH-019: todos los overlays relevantes usan Sheet (Añadir, editar despensa, detalle catálogo, cambiar comida, diálogo de plan). Autofocus de los dos inputs de Añadir ocurría antes de captura. Sheet es ahora responsable único del foco inicial vía marcador del input, captura trigger/destinos antes de mover foco y conserva captura en replay de effects. En unmount real restaura nodo conectado/visible/focusable, evitando toast oculto/inert; si desaparece, siguiente/anterior control cercano o CTA del main. Tab/Shift+Tab filtran controles no usables, focusin impide foco en fondo y solo overlay superior gestiona Escape. Reemplazos conservan foco del overlay nuevo; se mantiene stack básico y scroll lock. No hay flujo anidado expuesto nuevo ni se certifica anidamiento arbitrario.
* Foco adicional directamente relacionado: eliminar una fila de compra enfocada también terminaba en BODY (regresión aparte). El caller guarda vecinos/CTA y restaura desde el effect de items, sin timer ni dependencia visual; no roba foco a otro control/sheet. Cerrar edición tras remove espera confirmación. Una respuesta de un sheet antiguo solo cierra su propio item, conservando un sheet posterior. Se conserva salida existente 180 ms de ESC/X/backdrop y cierre inmediato tras acciones: **KH-040 permanece pendiente**, restauración ligada al unmount, no a duración nueva. KH-041 no se cambia; salida de fila 140 ms existente se conserva.
* KH-020 inventario: DELETE captura HTTP/red desde el inicio, no cierra como éxito si falla; el error/reintento es visible dentro del sheet y mediante toast. Snapshot individual retenido por callback undo/retry hasta confirmar. Undo comprueba HTTP, captura errores, no inserta copia optimista falsa; usa fila efectiva/outcome KH-016 y conserva stock nuevo. Mutaciones duplicadas guardadas por fila, lecturas protegidas por generación y feedback suprimido tras navegación. Compra conserva optimismo; adjunta manejador de rechazo al iniciar request, antes de esperar salida, recupera solo la fila afectada si falla incluso si refresh falla, libera guard antes de ofrecer retry y elimina leaving tras fallo. Clear bought conserva historial si falla y ofrece retry; no toca pantryDelta/stock. Guard de check evita duplicados y conserva una acción inversa solicitada durante persistencia, para no perder una activación de teclado al aparecer Comprado.
* Undo shopping conserva origen receta/slot/weekly y cantidades/texto KH-005/KH-027. Se detectó otro fallo real: respuesta perdida después de POST confirmado + retry manual sumaba paquetes/duplicaba legacy. POST shopping añade opción explícita `restore: true` solo para undo: devuelve existing intacto o created dentro de la transacción, manteniendo altas ordinarias aditivas. Identity por usuario/producto/nombre/tipo/necesidad/unidad/texto; comprado nunca se reutiliza. Cuatro integration reales prueban retry idempotente, concurrentes legacy, stock nuevo 7 frente a snapshot 5/historial y ownership. Tres fallan contra endpoint previo; E2E pierde intencionadamente la respuesta tras commit y demuestra un paquete al reintentar, más re-add concurrente conserva siete. Contrato ampliado en audit-assets/kh-005/CONTRACT.md. No éxito falso, detalles privados ni overwrite con snapshot viejo.
* Toast: hide se inicia antes de ejecutar acción para que un feedback inmediato/retry nuevo no sea ocultado por el cierre del toast antiguo. Callbacks undo guardan snapshot durante request y reintentos; al confirmar se consumen y doble acción no envía duplicados. La ventana de recuperación sigue el toast existente de seis segundos; no persistencia nueva de undo al abandonar la página.

### Evidencia, checkpoints y cierre

* Before durables: audit-assets/kh-018-020/search-before.log (**2 fallos reales**, spinner tras query corta); focus-before.log (**4**, trigger→Escape→BODY); mutation-before.log (**4**, despensa cierra ante fallo / compras sin retry); undo-api-before.log (**3**, sumas/duplicado legacy); row-focus-before.log (**1**, fila eliminada→BODY). Implementaciones anteriores reales ejecutadas antes de sus fixes, no pruebas contra modelos sintéticos del código. Baseline de los seis componentes preservado temporalmente en /tmp/kh018020-baseline.
* KH-018 checkpoint: **11/11** con setup, dos nuevos + ocho de catálogo KH-009. KH-019: **4 tests de componente en navegador real**, no harness jsdom instalado; cuatro viewports ejercitan foco inicial, contención de foco externo, Tab/Shift+Tab, Enter/Space, Escape/X/backdrop, guardar con trigger vivo, trigger eliminado→Añadir y reapertura consecutiva. Pruebas previas de catálogo/detalle, motion, plan y UI también pasan. Reduce a 320. Mobile significa viewport Chromium; no dispositivo físico/teclado virtual/safe-area real ni Safari/AT real.
* KH-020: **19 nuevos E2E** (cuatro HTTP/red remove/undo/retry + ocho matrix/doubles/navigation en ambos dominios/cuatro tamaños + cuatro 401 remove/undo + refresco antiguo vs edición nueva + sheet nuevo/late rejection + respuesta undo perdida/re-add concurrente). Matrix DELETE y POST 400/403/404/409/500; 401 conserva redirect del wrapper, sin exponer datos ni escritura. Network abort, retirada por quantity PATCH y DELETE legacy, doble remove/undo, remove→undo→remove, GET retenido fuera de orden, navegación con DELETE pendiente y rechazo tardío cubiertos. Comprueba API real/reload tras éxito y errores de página ausentes. KH-016 existing stock nuevo usa además cuatro E2E existentes con pestaña B y conserva 7 kg.
* Checkpoint integration mutation/quantities/re-add: **38/38** antes del caso adicional de ownership; cuatro nuevos integration finales. Regresiones de KH-005/KH-016/KH-027, compra/check/uncheck/pantryDelta y purchased history incluidas en suites completas. No se omiten tests ni se cambian timeouts/retries para ocultar fallo.
* **E2E final: 101/101**, 25 nuevos + 76 anteriores, sin skipped, cinco workers, `DATABASE_URL=file:/tmp/kh018020-e2e.db npm run test:e2e -- --config=/tmp/kh027.playwright.config.ts`, URL http://127.0.0.1:3100. Config temporal usa channel chrome, ninguna modificación permanente de config. Primera global 95/99: selector ambiguo tras error inline, foco de botón nativo deshabilitado y un P1008 previo por escritores externos SQLite. Segunda 99/100 reveló acción inversa perdida mientras check seguía pendiente; guard conserva esa activación. Tras fixes, tercera 101/101; revisión adicional de fila eliminada falló antes y cuarta final 101/101 (51.3s). Sin cambio de backend ajeno para ocultar P1008 ni disminución de workers E2E.
* **TypeScript (`npx tsc --noEmit`), build y lint afectados pasan**, sin warnings nuevos. **Lint global únicamente tres errores preexistentes** no-require-imports en audit-assets/api-probes.cjs:2–4, intacto. Unit/integration completa: **314/314, 40 archivos**, `npm test -- --maxWorkers=4`, sin skipped y timeouts originales. Ejecuciones con concurrencia por defecto agotaron 5 s en dos pruebas de migración previas bajo carga (una mientras build; otra aun sin build); cuatro workers pasan la misma suite íntegra. Error FK emitido por seed es fixture esperado de rollback.
* UX **320/390/768/1280**: sheet, errores inline/toast, undo/retry y textos largos sin overflow de documento/panel; screenshots en /tmp/kh019-{sheet,focus}-{width}.png y /tmp/kh020-{error-{pantry,shopping-list},remove-sheet}-{width}.png. Capturas inspeccionadas; asserts de foco/teclado/roles/aria-modal, identidad/contenido real y smoke console existentes pasan. Captura de toast espera opacity=1 para evitar una imagen de la transición inicial. Reduced motion emulado a 320; snapshots y datos no esperan animación. No certificación de Safari/dispositivo físico/lector real.
* Original dev.db SHA256 **2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad**, igual al baseline. SQLite se copió readonly por backup a /tmp/kh018020-e2e.db y solo allí se aplicaron las migraciones ya existentes. Sin migraciones nuevas/producción/seed original/deploy. Logs finales /tmp/kh018020-{build-final7,types-final7,lint-target-final7,unit-final7,e2e-final7}.log, global lint /tmp/kh018020-lint-global-final7.log y diff-check /tmp/kh018020-diff-final7.log.

### Límites reales y siguiente tanda

* Persisten límites SQLite documentados frente a escritores externos independientes: una operación puede fallar, ahora con estado/feedback recuperable; no se incorpora motor distribuido de retries. No almacenamiento durable de undo más allá de su ventana/navegación; si se sale durante una mutación, la pantalla siguiente relee servidor y ninguna respuesta tardía cierra su overlay. Las restauraciones de origen weekly preparan snapshot actual y conservan límites KH-027. Avisos de correo externo sin RESEND_API_KEY/catalogo/fotos fuera de scope.
* Próxima tanda recomendada **KH-040** (unificar lifecycle visual de cierres por acciones) y **KH-041** (continuidad espacial de filas), ahora sobre foco y recuperación verificados. **No implementadas**.
