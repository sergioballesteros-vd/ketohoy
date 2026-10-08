# KetoHoy — Audit Implementation Progress

## Summary

* Completed: **38/46 findings**, including KH-028 (latest closure; details are in the finding sections below).
* Remaining: **8/46 not completed**; consult each finding's status. States of other findings were not changed in this task.

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
* KH-037 y KH-044 quedan completadas en la tanda del 2026-10-06, registrada al final de este documento.

## KH-040 / KH-041 — ciclo de sheets y continuidad de filas — 2026-10-06

Status: Completed (2/2)

* Alcance exclusivo KH-040 y KH-041. No cambio de diseño/jerarquía, contrato de datos, dependencia, esquema o API; no escrituras a DB original ni deploy. Experimento Product/UI `design-experiments/shopping-list/iteration-2` y cambios preexistentes del usuario se conservaron. Se revisó la guía local de Next antes de editar; Discovery de código por codebase-memory graph. Skills frontend-testing-debugging y react-best-practices aplicadas.
* KH-040: `Sheet` coordina salida con el evento real `sheet-out` y `overlay-out`, evita doble cierre y llama al callback de desmontaje cuando ambas animaciones acaban. Escape, X, backdrop y acciones exitosas siguen la misma salida; reduced motion cierra de inmediato. El submit/persistencia no espera a la transición; fallos de guardar/cambiar/regenerar dejan el diálogo disponible para corregir/reintentar. Handoff de sheets en edición de despensa espera la salida anterior. Restauración de foco sigue ligada al unmount real.
* KH-041: entrada de fila opacity + translateY 4px/140ms; salida visible antes de eliminar en compras y despensa. Deshacer/insertar/reubicar filas da feedback sin bloquear request. FLIP usa transform para filas visibles, con lecturas geométricas agrupadas, sin animar height; reduce elimina los desplazamientos. Sin alteración de agrupación, orden de compra o semántica de undo. Experimento visual aparte no fue modificado.

### Verificación y límites

* Unit/integration: **314/314, 40 archivos** (`npm test -- --maxWorkers=4`). TypeScript (`npx tsc --noEmit`) pasa; build (`DATABASE_URL=file:/tmp/kh040-041-build.db npm run build`) pasa. ESLint focalizado pasa. `npm run lint` global conserva únicamente los **3 errores preexistentes** `no-require-imports` de `audit-assets/api-probes.cjs:2–4`. `git diff --check` pasa.
* E2E enfocado: **14/14** en `e2e/motion.spec.ts` y `e2e/pantry-shopping.spec.ts`; incluye cerrar por overlay/Escape/X/éxito/error/reduce, compra/descompra, borrar/undo, 40 filas a 320/390/768/1280, animación FLIP y reduced motion. La prueba de 40 filas aislada también pasa (2/2 contando auth setup). Playwright usa Chrome instalado con `/tmp/kh027.playwright.config.ts` porque falta el binario Chromium headless descargado; DBs de prueba están bajo `/tmp`.
* Intento de suite E2E completa: ejecución paralela previa **91/106 pasan, 14 fallan, 1 skipped**, con fallos de contención SQLite entre tests que comparten la DB temporal; reintento serial también mostró fallos existentes de fixtures dependientes de hora y pruebas de interacción dependientes del timing/paralelismo, y se interrumpió tras confirmar más fallos fuera de KH-040/KH-041. No se presenta la suite completa como verde. E2E enfocado de ambos findings sí pasó después.
* Capturas visuales temporales en `/tmp/kh040-sheet-exit-390.png`, `/tmp/kh041-row-remove-390.png` y `/tmp/kh041-row-undo-390.png`. Viewports Chromium, no Safari, dispositivo físico, teclado virtual ni lector de pantalla real. No se midió CLS de interacción como métrica de campo.
* Advertencias ambientales observadas durante E2E: email de verificación sin `RESEND_API_KEY`, API de Mercadona 403 y una imagen externa 404; fuera de este alcance. KH-037 y KH-044 se completaron en la tanda siguiente, registrada debajo.

## KH-037 / KH-044 — navegación, movimiento y semántica de día — 2026-10-06

Status: Completed (2/2)

* Alcance KH-037 y KH-044. Conservados los cambios previos del usuario. Sin rediseño, nueva dependencia, esquema, API, deploy ni escritura a la base original. La corrección adicional de `Sheet` evita que el cierre tardío de un sheet anterior cierre el diálogo superior; era una regresión KH-040 reproducible al ejecutar el E2E de plan y se mantuvo el contrato de cierre existente.
* KH-037: la navegación usa `auto` cuando `prefers-reduced-motion` está activo y conserva `smooth` en movimiento normal; destino y offset sticky son los mismos.
* KH-044: el día seleccionado y la sección visible controlan el estado activo; `aria-current="date"` y la indicación “hoy” identifican solo la fecha actual. Un `IntersectionObserver` mantiene la selección visible en el layout apilado hasta 1023 px; desktop sigue mostrando la semana completa.
* Regresión en `e2e/plan.spec.ts`: ambos modos de movimiento, destino, botones nativos con Enter/Space, distinción entre Hoy y día activo, retorno al día actual, seguimiento del scroll y anchos 320/390/768/1280. El foco de la acción fallida al regenerar permanece dentro del diálogo.

### Verificación y límites

* Unit/integration: **314/314, 40 archivos** (`npm test -- --maxWorkers=4`). TypeScript y `npm run build` pasan. ESLint focalizado en los tres archivos modificados pasa. `npm run lint` global conserva únicamente tres errores preexistentes `@typescript-eslint/no-require-imports` en `audit-assets/api-probes.cjs:2–4`. `git diff --check` pasa.
* E2E enfocado: **32/32** con `--workers=1` para `plan`, `motion`, `weekly-shopping` y `mutation-adversarial`; incluye cobertura de KH-040/041 relevante. La suite completa se ejecutó con la configuración normal de cinco workers: **101 pasan, 5 fallan y 1 queda skipped (107 total)**.
* Fallos exactos de la suite completa: `e2e/home-freshness.spec.ts:32` no encuentra un candidato con `imageUrl`; es **B (fixture/datos)**: la copia de prueba tiene 71 recetas y ninguna con imagen, por lo que el selector del test no puede satisfacer su precondición. `e2e/pantry-readd.spec.ts` falla en 390/768/1280 esperando “Ya está en tu despensa” y recibe el toast anterior de quitar/deshacer; es **D (timing)**: el toast de undo vence antes de Space y no se envía POST; 320 px con reduce pasa y el fallo también se reproduce serialmente. `e2e/ui.spec.ts:26` falla en la suite de cinco workers al comprobar el stepper de explorar, pero pasa al ejecutar serialmente; es **D (paralelismo/timing)**. No se observó P1008/contención SQLite en este resultado final.
* No se tocó la causa ni se ampliaron ventanas temporales para ocultar esos fallos. La comprobación es Chromium emulado; no certifica Safari/iOS físico, teclado virtual ni lectores de pantalla reales. No se cambió el cálculo existente de fecha local.
* Próximas tareas sugeridas: **KH-038** (nombres accesibles y live region de favoritos), **KH-045** (documentación y estado real del stack/pruebas), **KH-046** (revisión legal y flujo de consentimiento antes de cualquier publicación).

## E2E Baseline Recovery — 2026-10-06

### Initial state

* Baseline informada al iniciar: **101 passed / 5 failed / 1 skipped** con 5 workers. KH-037/KH-044 estaban completos; se conservó la corrección de KH-040 para que el cierre tardío de un sheet no cierre el diálogo superior.
* El checkout tenía cambios de otras tareas sin commit. Se conservaron. La recuperación no modifica código visual ni lógica de producto; solo cambia fixtures/esperas E2E y esta documentación.

### Root causes y fixes

| Test | Clasificación inicial | Causa real | Fix |
|---|---|---|---|
| `home-freshness.spec.ts` | B — fixture/datos | El contrato es frescura/personalización: Home muestra una receta de pescado válida para el slot y responde a pantry/preferencias de dos usuarios. La imagen no se usa en ninguna assertion de ese flujo; exigir `imageUrl` hacía imposible elegir candidato porque el seed E2E tiene 0 imágenes. | Se quitó solo el filtro incidental `imageUrl`; siguen exigidos slot, tiempo y pescado. La prueba pasó en ambas suites completas. No se añadieron URLs ni datos productivos. |
| `pantry-readd.spec.ts` | D — timing | La prueba lanzaba Space mientras `PantryItemSheet` aún terminaba su cierre normal. Su focus trap retenía el foco y la ventana real de undo vencía durante la espera; con reduce el cierre inmediato explicaba que 320 pasara. Se observó el toast de quitar sin POST de undo y, al verificar el foco, el botón seguía inactivo hasta cerrar el diálogo. | El test espera el estado observable `dialog count = 0`, usa `context.request` para el re-add concurrente sin navegar otra página y ejecuta Space en el botón Deshacer visible/enfocado. Verifica el POST, payload de snapshot (5 kg), resultado efectivo (7 kg), una sola fila, recarga y edición. Ocho combinaciones viewport/motion pasan dos veces. La ventana de producto sigue en 6 s. |
| `ui.spec.ts` Explore | D — paralelismo/timing | El stepper usaba la cuenta compartida de `playwright/.auth/user.json`; en la suite concurrente el estado de lista podía ser escrito por otros tests. El archivo también fijaba `X-Forwarded-For` en `127.0.0.2`; las repeticiones paralelas mostraron 429 al compartir esa clave de rate limit. | La prueba Explore limpia cookies y registra su usuario propio. Cada test del archivo usa una clave `X-Forwarded-For` derivada de `testId`; el retry también registra un usuario aislado. El archivo completo pasa en 5 workers y en dos repeticiones. |

El test `home: the hero recipe has a photo` conserva su skip condicional preexistente: su contrato sí requiere una imagen y el seed fresco no tiene ninguna. No se añadió ni se amplió ningún skip.

### Determinism and final baseline

* `pantry-readd.spec.ts`: **16/16 casos** (4 viewports × movimiento normal/reducido) en `--repeat-each=2`, más setup. El POST de undo se observa antes de afirmar la cantidad actual; no hay sleeps ni screenshots dentro de la ventana.
* `ui.spec.ts`: con `--repeat-each=2` y 5 workers, **11 passed / 2 skipped** en total, incluido el setup que corre una vez; los dos skips son el mismo test preexistente del hero repetido.
* La suite completa usa configuración normal, 5 workers, sin retries locales, y una DB desechable nueva por corrida. Dos ejecuciones finales: **110 passed / 0 failed / 1 skipped** de 111, en **41.5 s** y **34.3 s**. Un intento anterior durante la ampliación de los casos de motion tuvo un timeout en la navegación de retorno de KH-027 a 1280; se añadió una espera/assertion observable de GET plan 200 y del botón visible. El E2E KH-027 aislado pasó 6/6 y las dos ejecuciones completas posteriores pasaron. No se observó un 5xx ni un error de producto reproducible.
* La suite de Zones enfocada pasó **2/2** con 5 workers. Revisa datos conocidos/desconocidos, disclosure/precio, foco visible, teclado, compra/devolución, scroll, estabilidad, 320/390/768/1280 y reduced motion. KH-020, incluidos respuesta tardía/idempotencia/re-add concurrente, y KH-027 pasan también en las dos suites globales.

### Checks and test integrity

* Unit/integration: **314/314, 40 archivos** (`npm test -- --maxWorkers=4`). TypeScript: pasa. Build: `npm run build -- --webpack`, pasa. ESLint dirigido a los archivos afectados: pasa. Lint global solo conserva los tres errores históricos `@typescript-eslint/no-require-imports` en `audit-assets/api-probes.cjs:2–4`. `git diff --check`: pasa.
* Sin retries añadidos, skips añadidos, assertions eliminadas, timeout global aumentado, reducción de workers ni cambio a los 6 s de undo.
* Las corridas usaron `DATABASE_URL=file:/tmp/ketohoy-e2e-final-{4,5}.db`; Playwright conserva su protección que rechaza `dev.db`. El test unitario de seguridad del seed confirma que `dev.db` y la DB temporal no objetivo conservan su hash. Sin deploy.
* Gate de `design-experiments/shopping-list/FINAL.md`: Zones, focus, need/package unknown, compra/devolución, scroll, responsive, keyboard, reduced motion, KH-020, KH-027 y E2E global pasan. Se actualizó el estado a **SHOPPING LIST v1 FROZEN — VISUAL PATTERN APPROVED — v1** por recuperación de baseline, sin cambio visual en esta tanda.

### Limits

* El único skip es el test de foto del hero, que exige imagen y no la recibe del seed limpio; no depende de red y no se cambió su assertion/skip.
* La suite del build y E2E se ejecutó en Chromium local; no certifica Safari, dispositivo físico ni lector de pantalla real. Los logs E2E muestran el aviso ambiental esperado `RESEND_API_KEY is missing` durante registro de usuarios de prueba.

## KH-023 / KH-024 — resiliencia de catálogo e importación — 2026-10-06

Status: Completed (2/2)

* KH-023: la API de búsqueda expone `source`, `fetchedAt`, `completeness` y `freshness`. Solo un catálogo con todas sus hojas exitosas actualiza la caché completa (TTL 12 h); una carga parcial no la reemplaza. Se devuelve el último catálogo bueno como stale cuando la carga falla y se marca explícitamente el catálogo demo si no hay copia previa. La carga tiene un presupuesto total de 30 s y cada request de Mercadona, 8 s. Explore muestra estado discreto, aclara que demo no representa precio/disponibilidad actual y permite reintentar conservando consulta/categoría.
* KH-024: detalle de producto ya no espera `loadCatalog`; consulta detalle con timeout de 8 s y puede recurrir al snapshot conocido. OFF tiene timeout de 10 s y errores/abort se propagan como fallo controlado en lugar de “sin datos”. Alta existente reutiliza nutrición OFF válida y mantiene sus valores si el proveedor falla. Token exchange Google tiene timeout de 6 s y callback con error controlado. No hay timestamp nutricional en el esquema actual, por lo que no se afirma frescura persistida ni se añadió migración.
* No se añadieron dependencias, tablas, migraciones ni deploy. Pruebas usan fetch mocks y Playwright route mocks; Explore en smoke también queda interceptado y no requiere Mercadona, OFF ni Google reales. KH-023 viewport/keyboard/reduced-motion: Chromium E2E en 320/390/768/1280; estado fresh comprobado sin aviso. Límite: sin Safari/dispositivo físico/teclado virtual/lector de pantalla real.

### Verificación y límites

* Unit/integration: **324/324, 41 archivos** (`npm test -- --maxWorkers=4`), incluidos dos lookups concurrentes que comparten una petición de detalle. TypeScript y `npm run build` pasan. ESLint focalizado en los archivos de la tarea y `git diff --check` pasan. `npm run lint` global mantiene solo tres errores previos `@typescript-eslint/no-require-imports` en `audit-assets/api-probes.cjs:2–4`, archivo intacto.
* E2E focalizado KH-023: **2/2** con ruta local interceptada. E2E completa más reciente: **112 passed / 1 failed / 1 skipped** (114, cinco workers, sin retries, DB temporal nueva). El único fallo fue `e2e/plan.spec.ts:62`, donde en suite completa el botón de hoy aparece `aria-pressed=false` antes de las interacciones; ejecutado aisladamente pasa (2/2 contando setup). Clasificación D: timing/paralelismo en un flujo semanal ajeno a KH-023/024. No se modificó ese flujo ni se enmascaró el resultado. El skip condicional del test del hero con imagen ya existía. Una ejecución anterior completa alcanzó 113/0/1; la última es la reportada aquí.
* La ruta de humo de Explore usa mocks locales. El log de la última suite no muestra fallos de proveedor Mercadona; el registro de prueba sí advierte que falta `RESEND_API_KEY`, sin llamadas de email. No se midió latencia externa ni se declara SLA; los presupuestos se verificaron con servicios simulados. Precio/disponibilidad demo aparecen identificados.

## Weekly Plan E2E Stabilization — 2026-10-06

Status: Completed

* Síntoma: en repeticiones paralelas, el botón de hoy (`Martes`) recibía `aria-pressed=false`. Antes del fix, la ejecución aislada pasó 7/7; dos repeticiones de `plan.spec.ts` con 5 workers fallaron 3/5 veces cada una en la assertion inicial. Una suite global previa pasó 113/113 y omitió 1 test, así que no reprodujo el fallo por sí sola.
* Causa: el efecto de entrada promete llevar el móvil a hoy, pero esperaba que `stickyHeight` coincidiera con la altura medida. Esa medida solo se activa en `redesign=1`, por lo que el plan normal no llegaba a hacer el scroll inicial. `activeDay` seguía `null`; el observer activaba la primera sección visible (a menudo Lunes), y `aria-pressed` reflejaba correctamente ese día activo mientras `aria-current="date"` seguía marcando Martes.
* Fix: la espera de altura sticky se aplica solo al experimento redesign. El diseño normal ejecuta su scroll inicial al día de hoy en móvil; el observer conserva su función después. No se alteraron `Weekline`, cards, imágenes, CTA, layout ni el flujo `?redesign=1`; `aria-pressed` sigue representando el día activo y hoy mantiene su indicador separado.
* Evidencia posterior al build actualizado: `plan.spec.ts` aislado 7/7; suite repetida cinco veces 31/31 con 5 workers; KH-037 normal/reduced motion y navegación por teclado pasan dentro de esas repeticiones; KH-044 mantiene today separado de active y pasa. La suite global en base desechable nueva: **113 passed / 0 failed / 1 skipped**, 5 workers, 35.2 s, 0 retries locales. El skip previo del test de foto del hero permanece.
* En ejecuciones diagnósticas anteriores aparecieron fallos ajenos a Weekly Plan: dos fixtures con filas persistidas al reutilizar la DB desechable y una comprobación de foco KH-027 a 320 px. Los casos pasaron aislados en DB nueva, y la suite global final en DB nueva terminó sin fallos.
* Unidad/integración: 324/324. TypeScript y build pasan. ESLint dirigido pasa. Lint global mantiene los tres errores históricos en `audit-assets/api-probes.cjs:2–4`; archivo intacto. `git diff --check` pasa.
* Node y Chromium resuelven la zona horaria `Europe/Madrid`; Chromium informa locale `en-US` y la etiqueta del plan usa explícitamente `es-ES`. No se observó divergencia de fecha entre servidor y navegador.
* Las E2E usaron únicamente bases SQLite desechables en `/tmp`; no se usó ni migró la base original. No se hizo deploy. No se añadieron retries, skips, timeouts globales, sleeps ni cambios de workers. Estados KH no modificados.
* Próximo paso: KH-045 + KH-043; no implementados en esta tanda.

## KH-045 + KH-043 — README y metadata social de landing — 2026-10-06

Status: Completed (2/2)

* KH-045: README actualizado desde package/config actuales: Next 16, React 19, TypeScript, Tailwind 4, Prisma 7/SQLite y Vitest/Playwright. Quick start crea un archivo SQLite temporal antes de migrar, genera Prisma, aplica migraciones y ejecuta seed usando el mismo `DATABASE_URL`. Documenta variables verificadas, OAuth/correo opcionales, `APP_URL`/cookies, preparación E2E aislada y el riesgo destructivo de `SEED_RESET=true`. Quitadas afirmaciones obsoletas de Framer Motion y comandos operativos de producción. No se fijaron cifras volátiles de tests.
* KH-043: home pública ahora define Open Graph y Twitter específicos (title/description, URL absoluta mediante `metadataBase`, site name, locale, tipo/card e icono PNG existente de KetoHoy de 512×512 con alt). Landing repite el CTA real “Crear cuenta gratis” tras FAQ, con la misma ruta `/login?modo=registro` y clase de foco existente. Sin redesign ni cambios de auth.

### Verificación y límites

* README: `prisma generate`, `prisma migrate deploy`, `prisma db seed` y `npm run dev` se verificaron en una base vacía bajo `/tmp`; servidor dev respondió HTTP 200. E2E ejecuta su propia migración/seed con DB temporal. No se ejecutó `npm ci` porque dependencias ya estaban instaladas.
* KH-043 enfocado: **1 test E2E pasó** (2/2 contando auth setup). Comprueba title/description, canonical, Open Graph, Twitter, alt/dimensiones/ruta/PNG, CTA, widths 320/390/768/1280, tab/foco visible y activación Enter.
* Unit/integration: **324/324** (`npm test -- --maxWorkers=4`). E2E completa: **114 passed / 0 failed / 1 skipped**, 5 workers. El único skip sigue siendo el test preexistente que requiere una foto de hero.
* TypeScript (`npx tsc --noEmit`), build (`DATABASE_URL` temporal `npm run build`), lint focalizado y `git diff --check`: pasan. Lint global falla solo por los tres errores históricos `no-require-imports` en `audit-assets/api-probes.cjs:2–4`; archivo intacto.
* Integrity: no retries, skips, timeouts globales ni reducción de workers añadidos. La suite usó una DB SQLite desechable; el `dev.db` original no se leyó ni modificó. No producción ni deploy. No se añadieron secretos.
* Límites: responsive y foco validados en Chromium, no en Safari/dispositivo/lector de pantalla reales. El preview se comprobó desde los metadatos y el PNG local, no contra plataformas sociales. Configura `APP_URL` al origen público en producción para que canonical/social URLs no usen el fallback localhost.
* Product/UI: esta tanda no modificó Shopping List, Weekline ni el experimento Weekly Plan; se conservaron los cambios previos presentes en el checkout.

### Próxima tanda recomendada

Revisar **KH-022** (sin dependencia), **KH-030** (depende de KH-013) y **KH-046** (espera KH-035 y KH-030).

## KH-021 + KH-032 + KH-033 + KH-034 — errores de datos, validación e integridad — 2026-10-06

Estado: KH-032, KH-033 y KH-034 completados; KH-021 implementado y probado localmente, pendiente de cierre operativo. El estado queda en **32/46 completados; 14 no completados, incluido KH-021 parcial**.

* KH-021 causa: una excepción al enviar el correo salía de `POST /api/auth/forgot` y se transformaba en 500 para una cuenta existente, frente al 200 de una cuenta ausente. Ahora una solicitud válida devuelve `{ success: true }` en éxito, fallo del proveedor y cuenta ausente. Email/body inválidos siguen dando 400 y el límite sigue dando 429. La UI conserva su `role="status"` genérico: “Si ese email tiene cuenta…”.
* El error interno se registra como operación más categoría segura (`TimeoutError`, `AbortError` o `ProviderOrTokenError`); no se registra email, mensaje del SDK, token ni credenciales. No se añadió retry: no hay retry controlado requerido por el SDK ni se justificó alargar la petición. El token sigue siendo hash, de un solo uso y con TTL de una hora; si la entrega falla puede quedar un hash inutilizable para el usuario hasta caducar o hasta una nueva solicitud, que revoca el anterior.
* KH-021 sigue parcial: la suite simula provider success/failure/timeout sin envío real y el entorno E2E tiene Resend desactivado. No se verificó entrega real en staging ni se añadió alerta automática; el checklist operativo queda pendiente, sin ampliar KH-031.
* KH-032 causa: `getStats` ocultaba cualquier error de DB como `EMPTY_STATS`; `getRecipe` ocultaba errores como `null`, usado por el caller para `notFound()`. Home ahora propaga errores al boundary ya existente y conserva `force-dynamic`; receta devuelve 404 solo ante `null` real, y fallos de consulta/image pipeline llegan al error path. El layout también propaga fallos de su lookup. React `cache` solo deduplica dentro del render/request, sin cache persistente de fallo.
* El boundary usa la prop `retry()` de Next 16.3.4, copy genérico, botón nativo “Reintentar” y foco visible. Los tests simulan fallo y recuperación en Home y receta, empty/load en Home, receta existente/ausente/fallo, y validan el vínculo accesible del retry. E2E valida Home freshness de KH-014, receta 200/404 y recovery UI de forgot password.
* KH-033 valida `POST /api/products` y `POST /api/shopping-list` con los schemas Zod existentes: enum de categoría compartido, límites de longitud/cantidad/nutrición/tags, números finitos, URLs HTTPS de hosts permitidos (o fallback `null`) y referencias accesibles de cuenta antes de escribir. Una referencia inválida/ajena da 404 controlado; JSON inválido 400. Las rutas mantienen su contrato de error estable.
* KH-034 añade índices únicos para preferencias por usuario, plan por usuario/semana, slot por plan/día/tipo y pantry por usuario/producto/unidad. La unidad forma parte de la identidad porque el flujo existente conserva stock de dimensiones incompatibles como filas separadas; no se pierde esa cantidad. SQLite permite múltiples claves con `userId` o `unit` NULL; se conserva ese comportamiento legacy/ambiguo y está probado. Preferencias usa upsert; lecturas de preferencias/plan usan las claves únicas; las altas pantry mantienen su semántica de presencia y compra/reversión preserva cantidades.
* La migración `20261006120000_data_uniqueness` solo elimina índices no únicos y crea índices únicos; no recrea tablas ni modifica filas. En una copia read-only de `dev.db` no había duplicados para las claves elegidas. Tests verifican índices y SQL, FK/integrity, filas NULL legacy, redeploy idempotente y fallo seguro ante duplicados sin borrar filas.

### Verificación y límites

* KH-033 focalizados: **48/48** Vitest; KH-034: **29/29** focalizados en migración, constraints y buy flow. Suite Vitest final: **353/353, 45 archivos**; se imprimió el error FK histórico del fixture de seed, pero la suite pasó.
* E2E completa final: **116 passed / 0 failed / 1 skipped**, 5 workers, 0 retries locales; el único skip sigue siendo el test previo de foto del hero. La primera corrida tuvo un P1008/SocketTimeout de SQLite en `product-security.spec.ts` bajo carga; aislado pasa 3/3 y la suite completa posterior en una DB nueva pasó. No se cambiaron workers, timeouts, assertions ni retries.
* TypeScript (`npx tsc --noEmit`), build (`DATABASE_URL` temporal), lint focalizado y `git diff --check` pasan.
* Vitest usa una copia temporal desde `dev.db` en modo lectura; E2E usa SQLite temporal en `/tmp`. No se modificó la DB original, no se usó producción ni se enviaron correos reales.
* Sin cambios a Shopping List ni Weekly Plan/`?redesign=1`; la única interfaz tocada es el contrato del retry ya existente para usar el nombre de prop actual de Next.

### Próxima tanda recomendada

**KH-022** (sin dependencia), **KH-030** (depende de KH-013) y **KH-046** (espera KH-035 y KH-030).

## Checkpoint KH-011 — releases aislados (2026-10-06)

Estado del checkpoint: implementación local probada; la verificación operacional en staging queda pendiente. No equivale a deploy ni a evidencia del VPS. KH-035 continúa pendiente y debe reemplazar el baseline dinámico antes de usar el workflow.

* `.github/workflows/deploy.yml` serializa despliegues de producción y pasa configuración a un script remoto sin interpolar secrets en el cuerpo de shell. `scripts/deploy-release.sh` instala y construye bajo `releases/<sha>-<run>-<attempt>/`; `.next`, dependencias y archivos de release fallidos quedan aislados. El SQLite existente `DEPLOY_PATH/dev.db`, `.env.local` compartido y `backups/` quedan fuera de cada release. No se copia ni reemplaza el SQLite durante el cambio.
* El build se verifica antes del backup/migración y antes de cambiar `current`. El candidato se sirve temporalmente en loopback para leer DB por `/api/health` (`SELECT 1`) y comprobar `/login`. Solo entonces el symlink cambia con `rename`, PM2 carga `current`, y se comprueba app local + TLS/headers del proxy. Se mantienen `current`, `previous` y cinco releases recientes; backups pre-migración conservan la retención existente de diez.
* Rollback de código documentado en `docs/deployment-proxy.md` y disponible mediante `shared/rollback-release.sh`. La prueba local fallida/post-health restaura el puntero; el rollback manual local se ensayó en estructura temporal. Ninguna prueba tocó VPS, PM2 real o DB original.
* Se quitó `prisma db seed` del deploy repetido: la seed sobrescribe productos/recetas sembrados y recrea sus ingredientes. El bootstrap se documenta como comando explícito con `DATABASE_URL` persistente; CI y KH-012 conservan su uso de DB aislada.
* Simulación local: fallos de sync, `npm ci`, build, `migrate deploy`, pre-health, PM2 y post-health dejan `current` en el release anterior y mantienen el fixture SQLite. Deploy simulado conserva el release anterior y el SQLite; rollback simulado vuelve al release anterior. Health route focalizada: 1/1 consulta de DB y respuesta mínima.
* Checkpoint intermedio deliberado: el script todavía conserva aquí el baseline histórico dinámico y peligroso. No desplegar este checkpoint. KH-035, fase siguiente inmediata, lo sustituye por baseline explícito + schema match y valida la migration KH-034 con DBs desechables.

## Resultado KH-011 + KH-035 — 2026-10-06

Estado: implementación completa en código; verificación operacional en staging/VPS pendiente. No se ejecutó deploy real, SSH, PM2 del host ni migración contra la base persistente.

* KH-035 elimina el `resolve --applied` dinámico. El cutoff fijo son `20260629183529_init`, `20260630183957_add_recipe_image_url` y `20260705173000_unique_mercadona_id`, demostrados como historia anterior al primer `migrate deploy` en el commit `b9d35ed761111bb15d67365a824fa71d63757ee7` (2026-09-10). Migraciones posteriores, incluidos términos y KH-034, se aplican normalmente.
* SQLite temporal valida DB nueva, snapshot legacy admitido, prefijo tracked, migración pendiente, esquema/historial KH-034 inconsistente, esquema desconocido, historial vacío e inventario de migraciones inesperado. El helper aborta sin baselinear ante discrepancias. No se pudo completar una comparación separada con `prisma db push` del schema del commit histórico: el schema engine devolvió un error vacío en ese entorno; la comprobación de compatibilidad del VPS sigue pendiente.
* Simulación de release: fallos de preparación/instalación/build/migración/health/PM2 conservan el release activo y el SQLite; éxito conserva el anterior; rollback conmuta código en fixtures. Rollback no revierte migraciones.
* `DATABASE_URL=file:/tmp/ketohoy-kh-011-build.db npm run build` y `npx tsc --noEmit` pasan. Lint focalizado, shell syntax, simulaciones de release y `git diff --check` pasan. KH-035 + health focalizados pasan 7/7; KH-012 seed + KH-034 uniqueness focalizados pasan 6/6. Vitest completo termina 356/360: cuatro migraciones SQLite exceden el timeout preexistente de 5s (dos en `prisma/dataUniqueness.test.ts`, una en `prisma/manualOwnership.test.ts` y una en `prisma/nutritionConvention.test.ts`). E2E completo da 113 pass y 2 fallos: strict locator en `catalog-provenance.spec.ts` y timeout JSON en `catalog.spec.ts` bajo carga.
* `dev.db` conserva SHA-256 `2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad`. Las pruebas nuevas usan `/tmp`; no se accedió a producción ni al VPS.
* Integridad del test: retries añadidos 0; skips añadidos 0; timeouts globales añadidos 0 (límite local de 15s solo en el test que ejecuta varias migraciones reales); workers reducidos 0; sleeps arbitrarios añadidos 0. Playwright reportó un test skip preexistente.
* KH-021 sigue parcial y sin cambios. Los experimentos de Shopping List y Weekly Plan siguen intactos.

La próxima acción operacional requiere acceso autorizado a staging con una copia descartable de la SQLite legacy para verificar el schema real, ejecutar deploy/fallo/rollback y observar tráfico y headers. KH-011 y KH-035 no se marcan `Completed` hasta esa comprobación.

## Baseline Recovery post KH-011/KH-035 — 2026-10-06

**Resultado: BASELINE RECOVERED.** Las suites unitarias pasaron dos veces y las tres últimas suites E2E completas pasaron consecutivamente con DB nueva y cinco workers. Se conserva el registro de una interrupción global aislada de Playwright; se clasifica como **E — timing/flaky bajo suite completa**, ya que no se reprodujo en tres corridas completas posteriores ni en nueve repeticiones del test asociado.

### Estado inicial y clasificación

* Estado inicial aportado: Vitest **356/360**; cuatro timeouts SQLite con límite existente de 5 s; E2E **113 passed / 2 failed / 1 skipped / 1 not run**. El resumen histórico no guardó los nombres individuales de los cuatro timeouts ni trazas HTTP. La asignación de los dos timeouts de `dataUniqueness` a sus dos casos de mayor trabajo se infiere de la estructura y medidas actuales, no de un reporter histórico.
* Los casos implicados son migraciones reales: `dataUniqueness.test.ts` migra una DB limpia y hace despliegues repetidos sobre copias temporales de `dev.db`; `manualOwnership.test.ts` migra DB limpia y copia legacy; `nutritionConvention.test.ts` migra una copia legacy dos veces. Cada archivo usa su propia carpeta temporal y cada SQLite de prueba es distinto. `dev.db` se abre solo en lectura para serializar la fixture. No se detectó un archivo SQLite mutable compartido ni espera de lock.
* Clasificación de los timeouts: **D — overhead de migration/setup**, con sensibilidad temporal bajo carga. No hubo evidencia de regresión de producto (A), setup externo accidental, ni contención SQLite entre los tests (C). El costo dominante es iniciar `prisma migrate deploy` y recorrer la historia de migraciones en cada test. Los tiempos iniciales exactos no se conservaron y el exceso sobre 5 s no se reprodujo.
* `dataUniqueness`: casos atribuidos por costo/estructura: “preserves valid rows, NULL legacy rows, table definitions, and redeploys cleanly” y “fails deterministically on duplicate preferences without deleting fixture rows”. Los tres tests del archivo pasaron. DB distinta por test, sin Prisma client compartido, OFF/Mercadona ni cambio a las assertions de unicidad. Medido aislado: **0,4–1,2 s/test**; juntos: **2,7 s total**. Timeout: **sin cambio**.
* `manualOwnership`: el caso más costoso es “keeps legacy values and references without assigning or deleting manual products”; copia `dev.db` en modo lectura, aplica y repite migraciones en una DB temporal. No hay DB A/B compartida ni lock observado; KH-013 sigue protegido. Medido aislado: **0,36–0,71 s/test**. Timeout: **sin cambio**.
* `nutritionConvention`: “real migration preserves historical macros, degrades evidence, and is idempotent” copia `dev.db` solo lectura, ejecuta migraciones reales dos veces y no llama a proveedores externos. Medido aislado: **0,71–0,82 s**. KH-025 no regresiona. Timeout: **sin cambio**.
* Suite Vitest completa: **360/360, 47 archivos** en ambas corridas; **8,27 s** y **9,19 s**. Los cuatro candidatos pasan también al ejecutarlos aislados y juntos. El test KH-035 con límite local de 15 s permanece igual.

### E2E y causas

* `catalog-provenance.spec.ts`: el locator era `getByRole('button', { name: 'Salmón' })`, con coincidencia parcial. El fixture contiene tanto el chip “Salmón” como el botón del producto “Salmón de demostración”; son elementos legítimos y el aviso KH-023 no está duplicado. Se exige nombre accesible exacto para seleccionar el chip. No se usó `.first()`/`.nth()`. El spec pasó **2/2** repeticiones posteriores al cambio; fresh/stale/partial/demo, provenance visible y retry siguen cubiertos.
* `catalog.spec.ts`: el JSON era el cuerpo de una response Playwright de `GET /api/mercadona/category/<key>`; el primer test esperaba esa URL y luego llamaba `response.json()`, pero no interceptaba la carga inicial ni las llamadas de catálogo. La ruta de API llama `searchMercadonaProductsResult` → `loadCatalog` → `fetchJson` contra Mercadona y puede agotar el presupuesto KH-024. Antes del fix, ese test tardó **13,6 s** en una repetición y acabó leyendo la respuesta real; no se conservó la response original (status/headers/body/fin). Ahora el test intercepta localmente `/api/mercadona/**`, responde JSON terminado, y correlaciona por pathname y método GET. Bajó a **0,8 s** y pasó **2/2** corridas focalizadas. No se cambió timeout, abort ni código de producto; el resto de tests sigue cubriendo latest-request-wins, clear-search y abort.
* No se identificó una ruta Mercadona/OFF real necesaria en los dos specs focalizados: la carga de catálogo está interceptada en el navegador. Las pruebas E2E completas no envían correos reales (`RESEND_API_KEY` vacío).
* El test histórico “not run” no tenía identificador en el resumen inicial. En la segunda corrida completa de esta recuperación, Playwright informó un error global no asociado a un test y un test no completado: `e2e/plan.spec.ts`, variante **1280px** de “plan: insufficient candidates preserve plan and recover with keyboard”. `--last-failed` lo volvió a ejecutar aisladamente y pasó; tres repeticiones por viewport pasan **9/9**, más auth setup. El reporte de la interrupción no conservó su excepción. Se clasifica **E — timing/flaky**, sin evidencia de lock SQLite ni regresión de producto; no volvió a ocurrir en las tres suites completas posteriores.
* E2E completo con 5 workers y DB desechable: corrida 1 **116 passed / 0 failed / 1 skipped / 0 not run** (31,2 s); corrida 2 **115 passed / 1 error global de Playwright / 1 skip / 1 not run** (34,2 s); corrida 3 **116 passed / 0 failed / 1 skipped / 0 not run** (31,3 s); corrida 4 **116 passed / 0 failed / 1 skipped / 0 not run** (30,2 s); corrida 5 **116 passed / 0 failed / 1 skipped / 0 not run** (32,9 s). Las tres últimas pasaron consecutivamente; el único skip es el test histórico de foto del hero.

### Regression matrix y checks

* KH-007 clasificación: `productClassification.test.ts` y tests de cards/catalog; KH-009 respuestas invertidas/latest wins: `catalog.spec.ts`; KH-013 ownership: `manualOwnership.test.ts` y suite API; KH-018 clear search: `catalog.spec.ts` y `search-recovery.spec.ts`; KH-023 frescura/provenance/cache: `mercadona-resilience.test.ts` y `catalog-provenance.spec.ts`; KH-024 límites/abort externos: `mercadona-resilience.test.ts` y E2E de catálogo; KH-025 convención nutricional: `nutritionConvention.test.ts`; KH-033 validación: suites de productos y shopping list; KH-034 unicidad: `dataUniqueness.test.ts`, migration y suite API. Las suites completas pasan con estos casos incluidos.
* KH-011 deploy simulation: `bash scripts/deploy-release.test.sh` pasa. KH-035 baseline matrix, KH-034 migration, health y KH-012 seed safety: **13/13** tests focalizados pasan en SQLite temporal.
* TypeScript, build con `DATABASE_URL` temporal, lint de los dos specs tocados y `git diff --check` pasan. Lint global conserva tres errores históricos de `audit-assets/api-probes.cjs:2–4`; también aparece la advertencia ya presente en el archivo no rastreado `.prisma-kh034-81544-1791296650055.config.ts`.
* Integridad: no se añadieron retries, skips, `.only`, sleeps ni assertions eliminadas; ningún timeout subió; workers permanecen en 5 para E2E. El locator se hizo exacto por su contrato semántico.
* No se cambió schema, migration history, scripts/workflow de deploy ni se añadió migration. KH-011, KH-035, KH-021 y el contador **32/46** conservan su estado. No se usó staging, producción, SSH, PM2 real ni deploy.

### Próximo paso

KH-036 queda como siguiente finding recomendado. No se implementa en esta tarea. Si reaparece la interrupción global de Playwright, guardar el reporte completo; no se reducen los cinco workers.

## Baseline Recovery — diagnóstico de interrupción global, seguimiento — 2026-10-06

**Resultado: BASELINE RECOVERED.** Se ejecutaron cinco suites E2E completas adicionales con cinco workers, cero retries y una SQLite temporal distinta por corrida. Las cinco pasaron; la interrupción global histórica no se reprodujo. Sumadas a las tres suites limpias posteriores ya registradas, hay ocho corridas completas limpias posteriores al evento. La corrida histórica que falló continúa sin diagnóstico porque su reporte original se perdió.

| Run | Passed | Failed | Skipped | Not run | Workers | Exit code | Duración wrapper |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 116 | 0 | 1 | 0 | 5 | 0 | 37 s |
| 2 | 116 | 0 | 1 | 0 | 5 | 0 | 39 s |
| 3 | 116 | 0 | 1 | 0 | 5 | 0 | 42 s |
| 4 | 116 | 0 | 1 | 0 | 5 | 0 | 47 s |
| 5 | 116 | 0 | 1 | 0 | 5 | 0 | 46 s |

* Captura por corrida bajo `/tmp/ketohoy-e2e-diagnostic-20261006/run-01` … `run-05`: stdout, stderr, exit code, fechas/duración, comando, versiones Node/npm/Playwright, `test-results` (incluido `.last-run.json`), screenshots, reporte HTML y snapshots ligeros de recursos. No se generaron traces porque no hubo fallos. `playwright.config.ts` mantiene su `webServer`; Playwright lo inició para cada ejecución. El monitor auxiliar registró PID/estado en run-01, pero no produjo archivo de lifecycle en runs 2–5; las corridas terminaron normalmente y el servidor respondió durante los tests. No hubo señales capturadas.
* Comando: `npx playwright test --workers=5 --retries=0 --trace=retain-on-failure --output <run>/test-results --add-reporter=json --add-reporter=html`; el reporter normal `list` se mantuvo. Los cinco directorios HTML incluyen `index.html`. El resumen legible completo permanece en `stdout.log`; el reporter JSON no dejó un archivo JSON dedicado.
* Cada corrida usó `/tmp/ketohoy-e2e-diagnostic-20261006/run-0N.sqlite`, creada por el `webServer` configurado (migración + seed) y eliminada solo tras capturar una corrida exitosa. Ninguna DB temporal se reutilizó. `dev.db` conservó SHA-256 `2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad` antes y después.
* Recursos: espacio de `/tmp`, memoria, load average y procesos relevantes antes/después de cada corrida quedaron en `resources-before.txt` / `resources-after.txt`. No hubo presión/disco agotado observable. Los logs muestran el aviso esperado de `RESEND_API_KEY` ausente en el servidor E2E; no se capturó ningún valor secreto.
* El único skip sigue siendo el test histórico de foto del hero. Sin retries, skips, timeout global aumentado, reducción de workers, sleeps ni assertions eliminadas.
* Checks finales: Vitest **360/360, 47 archivos**, sin timeouts; deploy simulation pasa; seed safety + KH-034 uniqueness + KH-035 baseline matrix + health **13/13**; TypeScript, build con `DATABASE_URL` temporal y lint focalizado pasan. Lint global conserva exactamente tres errores históricos `no-require-imports` en `audit-assets/api-probes.cjs:2–4` y la advertencia preexistente de `.prisma-kh034-81544-1791296650055.config.ts`. `git diff --check` pasa.
* KH-009, KH-018, KH-023 y KH-024 quedaron incluidos en las cinco E2E globales limpias. No se modificó código, tests, configuración ni infraestructura por una causa hipotética; solo se añadió tooling temporal bajo `/tmp` y esta documentación.
* No se usaron producción, staging, SSH, deploy real, migraciones de producción ni secretos. KH-011 sigue `Implemented — Operational verification pending`; KH-035 sigue `Implemented — Production schema verification pending`; KH-021 sigue `PARTIAL / BLOCKED`; auditoría en **32/46 completed**.

**Interrupción histórica:** no reproducida; causa raíz desconocida. No se inventa una causa. Clasificación: `Historical unexplained runner interruption — not reproduced`. La baseline queda suficientemente estable para continuar con KH-036. KH-036 no se implementó.

## KH-036 — backup periódico y restore verificable — 2026-10-06

Estado: **Implemented — Host/off-host verification pending**. El contador continúa en **32/46 completed**. No se inspeccionó ni modificó VPS/staging; no se instaló el timer ni se configuró almacenamiento off-host.

### Inventario y diseño

* Producción documentada: `DEPLOY_PATH/dev.db` (por defecto `/home/ubuntu/ketohoy/dev.db`), con `DATABASE_URL=file:<ruta absoluta>` en `shared/.env.local`; el proceso vive en `current` y la DB persiste fuera de releases. `scripts/provision.sh` instala `sqlite3`, Python 3 y usa `APP_USER=ubuntu` por defecto. No se encontró cron/timer versionado antes de este cambio; la programación existente del host no se asumió.
* El deploy mantiene `.backup` pre-migración en `backups/pre-migration-*`, antes de `prisma migrate deploy`, con diez copias. KH-036 conserva esa capa y versiona otra capa cada seis horas. Backup periódico con Python 3 `sqlite3.Connection.backup()` online (incluye WAL), temporal en la carpeta destino, checks antes de publicación atómica, permisos `0700/0600`, lock `flock` no bloqueante y retención de catorce días posterior al éxito.
* RPO diseñado: **6 h**; RTO objetivo: **4 h**, operación manual que incluye integrity/FK, lecturas, activación y health. El RPO no se midió durante días; el RTO de host no se midió. Ambos son objetivos, no SLA.
* El servicio/timer systemd de ejemplo apunta a `/home/ubuntu/ketohoy/shared/backup-db.py` y se publica en `shared` en el próximo deploy. La instalación real debe hacerse según `docs/BACKUP-RESTORE.md`; no se ejecutó `systemctl`. El destino local comparte host/disco. No existe configuración de off-host/cifrado/credenciales en repo y no se inventó proveedor; ese criterio y restore desde off-host quedan pendientes.

### Restore drill y fallos

* `bash scripts/backup-db.test.sh`: migraciones reales en una SQLite temporal con espacios en rutas; fixtures de User, UserPreferences, Product manual, PantryItem (43.5 g), Recipe, WeeklyPlan, WeeklyMeal y ShoppingListItem. La prueba mantiene una conexión writer abierta en WAL, realiza backup online y luego cambia el writer a 44.5 g; el restore recupera el snapshot 43.5 g. Después cambia la cantidad y elimina la compra, restaura a otro path y comprueba sentinels, FK, integrity, queries básicas y migration history.
* Con build compilado, `RUN_APP_HEALTH=1 bash scripts/backup-db.test.sh` también pasó `/api/health` y `/login` contra la DB restaurada.
* Matriz focalizada: source missing, URL no SQLite, directorio inválido, backup corrupto, fallo de backup sin borrar copia anterior, restore faltante/corrupto, destino ya existente/DB activa, ruta con espacios, retención posterior a publicación y `flock` ocupado. Simulación `bash scripts/deploy-release.test.sh` pasa y comprueba que el script periódico se copia a `shared`; el pre-migration `.backup` sigue funcionando.
* El restore no acepta `latest`, exige backup y destino explícitos, no sobrescribe destino existente, rechaza la DB indicada por `DATABASE_URL`, conserva `_prisma_migrations` y no corre migrations.

### Regresión y límites

* Unit/integration: **360/360, 47 archivos**. Vitest muestra en stderr el fallo FK histórico de la seed fixture ya observado en la baseline; la suite termina correctamente.
* E2E: **116 passed / 0 failed / 1 skip histórico / 0 not run**, 5 workers, 0 retries añadidos, una DB nueva. El único skip sigue siendo el test histórico de foto hero.
* TypeScript y build con `DATABASE_URL` bajo `/tmp`: PASS. Restore app health/login: PASS. `git diff --check`: PASS. Lint global conserva exactamente los tres errores históricos `no-require-imports` en `audit-assets/api-probes.cjs:2–4` y la advertencia conocida del config Prisma no rastreado; no se alteraron.
* Integrity de pruebas: retries 0, skips añadidos 0, timeout global aumentado 0, workers reducidos 0, sleeps arbitrarios de producto 0, assertions eliminadas 0.
* Seguridad: solo DBs temporales para pruebas; no producción, staging, SSH, deploy ni servicio/cron real; no se descargó/subió backup ni se tocó secret. `.gitignore` evita `/backups/` local.
* KH-011 sigue **Implemented — Operational verification pending**; KH-035 sigue **Implemented — Production schema verification pending**; KH-021 sigue **PARTIAL / BLOCKED**. No se cambió producto/UI ni se implementó KH-030.

Próximo finding recomendado tras la configuración/validación operacional de KH-036: **KH-030**. Esta recomendación no implementa KH-030.

## KH-030 — exportación, borrado de cuenta y retención — 2026-10-07

Estado: **Implemented — Legal/operational review pending**. El contador permanece en **32/46**: no se marca Completed porque sigue pendiente la revisión legal/operativa y la suite E2E completa actual tiene una falla fuera del alcance KH-030. KH-011, KH-021 y KH-035/KH-036 conservan exactamente sus estados previos. KH-046 no se implementó.

### Inventario y contrato

* Inventario completo en `docs/ACCOUNT-DATA-LIFECYCLE.md`: User/consentimiento, sesiones, reset/verificación, preferencias, pantry, compras/compras ya realizadas, planes/meals y productos manuales privados. No hay modelo server-side de favoritos; Explore guarda IDs en `localStorage`, incluidos en el export del dispositivo actual y borrados por logout/delete desde Preferences. No hay tabla separada de shopping history, favourites DB ni user-created recipes. El catálogo Mercadona/seed/shared no se exporta completo ni se borra.
* `POST /api/account/export` requiere sesión y deriva la cuenta del servidor. Descarga JSON `exportVersion: 1` con `generatedAt`; arrays ordenados. Incluye metadata de cuenta/consentimiento, preferencias, pantry/lista con resumen legible de producto, source/purchase metadata, planes con meals/resumen de receta, productos manuales propios y favoritos locales filtrados a productos compartidos o del usuario. Excluye hashes, Google subject, sesiones, tokens, secrets e IDs de producto/meal/plan no necesarios. Respuesta privada `no-store` y nombre fijo sin PII.
* `POST /api/account/delete` requiere sesión vigente, email escrito y contraseña actual si existe. Google-only no necesita inventar password: confirma el email y la acción deliberada; no se dispone de OAuth reauth al no persistirse credentials/tokens. CSRF conserva `SameSite=Lax`; no se añadió rate limit.

### Delete, ledger y restore

* Antes de la transacción se añade/fsync una línea JSONL con solo `userId` y `deletedAt` en `ACCOUNT_DELETION_LEDGER`, absoluta y fuera de SQLite/`BACKUP_DIR`, con directorio `0700` y archivo `0600`. Si el ledger falta/no se puede escribir, responde 503 antes de tocar la DB. El deploy script provisiona `/shared/privacy/account-deletions.jsonl` y la variable de entorno sin borrar entradas previas.
* Una transacción elimina User y cascadas reales (`Session`, `AuthToken`, preferencias, pantry, lista, WeeklyPlan/WeeklyMeal), y después los Product manuales propiedad de la cuenta. Mantiene Recipes/RecipeIngredients compartidos; para referencias a productos privados conserva nombre/cantidad de ingrediente y nulifica `productId`. Si una FK ajena impide borrar un producto, rollback completo. Shared catalog y otros usuarios permanecen. Éxito invalida cookie y el cliente borra favorites localStorage antes de navegar a `/login`; logout de Preferences también limpia esa cache.
* Un restore exige el ledger. `backup-db.py restore` aplica en el archivo temporal las tombstones antes de checks/publicación; ledger ausente/malformado o FK inválida aborta y no crea destino. La prueba `backup → delete record → restore old backup → replay` confirma A borrado, B/shared intactos, cascadas/tokens eliminados y RecipeIngredient legible. Ejecución idempotente. Backups pre-migración conservan diez por cantidad y pueden exceder 14 días; el último backup periódico puede persistir si no hay una copia nueva exitosa. Por tanto no se promete máximo global ni borrado instantáneo.
* Sesiones y AuthTokens expirados se purgan transaccionalmente al emitir una sesión nueva. Si no se inicia otra sesión, pueden permanecer más tiempo; no hay job ni duración máxima configurados.

### Pruebas y regresión

* API export/delete/auth, dos cuentas, datos vacíos/completos, secretos, favoritos local-only, passwords, Google-only, retry, rollback real mediante trigger y caducidad de sesión/token: **10/10 tests, 2 archivos**.
* Restore/backup con SQLite temporal y ledger (incluye usuario A/B, catálogo compartido, product reference, DB ausente/corrupta, ledger ausente/malformado): `bash scripts/backup-db.test.sh` pasa. Simulación de deploy/config/permisos: `bash scripts/deploy-release.test.sh` pasa.
* E2E KH-030 focalizado: **1 test + setup, 2/2 pass**; descarga exportada, favorito actual, teclado Enter para disclosure destructiva y borrado/limpieza local a 320/390/1280 px; sin overflow.
* Suite E2E completa con cinco workers y cero retries, dos corridas: **116 pass / 1 fail / 1 skip / 0 not run** cada una. Única falla: `e2e/plan.spec.ts` navegación del día Domingo, línea 115; también falla aisladamente. No se cambió ese test ni Weekly Plan por el límite de scope. El skip es el mismo preexistente del hero. La corrida añadió un test KH-030; no se añadieron retries/skips ni se redujeron workers.
* Unit/integration completo: **367/367, 48 archivos** (incluye el warning histórico de seed de FK no fatal). TypeScript PASS; build PASS con DB temporal; lint afectado PASS; lint global conserva los 3 errores históricos en `audit-assets/api-probes.cjs:2–4` y la advertencia conocida del config Prisma no rastreado. `git diff --check`, sintaxis shell PASS.
* No se cambió `prisma/schema.prisma` ni migrations. Las pruebas nuevas de KH-030 crean/migran SQLite vacía temporal, sin fixture `dev.db`. Las suites heredadas que llaman `setupTestDb` siguen usando su helper existente, que serializa el fixture original en modo read-only a una DB temporal.
* No hubo staging, producción, SSH, deploy, emails reales, OAuth externo ni datos reales. `RESEND_API_KEY` no está configurada en E2E y los registros sintéticos usan `.invalid`/emails `example.com`.

### Documentación y límites

Actualizados `AUDIT-TASKS.md`, `README.md`, `.env.example`, `docs/BACKUP-RESTORE.md` y este archivo; nuevo `docs/ACCOUNT-DATA-LIFECYCLE.md`. No se tocó `src/app/legal/page.tsx`, consentimiento, términos, landing, estilos globales, Shopping List ni Weekly Plan.

Pendiente revisión legal de retención/copy/procesadores y expiración del ledger. Pendiente configurar y probar copia off-host segura del ledger junto con KH-036. El restore en un host perdido no puede completar si no se recupera la copia independiente del ledger; en ese caso el servicio no debe activarse.

Siguiente paso: resolver la verificación de KH-035 antes de comenzar KH-046. Si KH-035 sigue pendiente, KH-022 no tiene dependencia directa y es el siguiente finding técnico independiente sugerido.

## KH-022 — Dependencias y advisories

Estado: **Implemented — Residual dependency risk pending**. El contador permanece en **32/46**. Solo se actualizaron dependencias y lockfile; no se modificó UI, aplicación, Prisma, esquema ni migrations.

### Inventario

Node esperado en CI: 20 (workflow, sin patch fijado); npm no está fijado por `packageManager`. Instalación local usada para esta verificación: Node 22.22.3 / npm 10.9.8. Lockfile npm v3.

Direct runtime: Next 16.3.4, React/React DOM 19.2.4, Prisma/Client/SQLite adapter 7.8.0, better-sqlite3 12.11.1, zod 4.6.1, lucide-react 1.22.0. Auth.js/NextAuth no está instalado; la autenticación es propia. Direct dev/tooling: Vitest y coverage-v8 4.1.9, Playwright 1.63.0, eslint 9.39.4, eslint-config-next 16.2.9, TypeScript 5.9.3, Tailwind 4.3.2.

Antes: `npm audit` 24 (1 critical / 15 high / 8 moderate / 0 low); `--omit=dev` 13 (1 / 7 / 5 / 0). Después: 12 (0 / 9 / 3 / 0); `--omit=dev` 7 (0 / 4 / 3 / 0). Before/after son advisories contados por npm; los grupos de paquetes no son rutas de exploit distintas.

### Cambios y análisis

| Package/advisory | Before | After | Reachability | Action |
|---|---|---|---|---|
| Next / GHSA-vcvr-r3jv-pc5j, ImageResponse RCE | 16.3.4; critical | 16.3.8; fixed | Runtime package; vulnerable Node `next/og` `ImageResponse` feature, no usage found in app code/routes/config | Actualizado en rama compatible 16.3; React 19.2.4 satisface peer range y Node CI 20 satisface `>=20.9` |
| Vitest / GHSA-82fw-gwwq-j7x9, mock redirect path traversal | 4.1.9; moderate | 4.1.11; fixed | Dev/test tooling only; no production runtime path | `vitest` y `@vitest/coverage-v8` actualizados juntos para mantener peer exacto |
| sharp | 0.35.4; high | 0.35.5; fixed | Next image optimizer runtime dependency; app uses images but patched dependency now installed | Patch transitivo compatible |
| fast-uri / hono / source-map-js | 3.1.3 / 4.12.27 / 1.2.1; high/moderate | 3.1.8 / 4.13.13 / 1.2.2; fixed | Prisma CLI/config transitive paths, not app import paths | Actualizados dentro de rangos de padres; no override |
| js-yaml / browserslist / baseline-browser-mapping / brace-expansion | 4.3.0 / 4.28.4 / 2.10.40 / 1.1.15; high/moderate | 4.3.2 / 4.29.3 / 2.11.27 / 1.1.21 (+ nested 5.0.12); fixed | Build/lint/transitive tooling only | Parches compatibles desde padres ya declarados |
| eslint-config-next → @next/eslint-plugin-next / fast-glob / micromatch / braces | 16.2.9 / 16.2.9 / 3.3.1 / 4.0.8 / 3.0.3; high | Sin fix compatible disponible en el parent actual | Dev lint tooling only; patrones glob, no app request path | Se conservó config 16.2.9; subirla a 16.3.8 no redujo advisory y añadió warnings nuevos. npm sugiere 14.2.35 (downgrade mayor), rechazado. `braces` latest publicado continúa en 3.0.3 |
| Prisma / @prisma/config / deepmerge-ts / @prisma/dev / @hono/node-server / mysql2 / valibot | 7.8.0 / 7.8.0 / 7.1.5 / 0.24.3 / 1.19.11 / 3.15.3 / 1.2.0; 4 high + 3 moderate package advisories | Sin cambio; advisories permanecen | Prisma CLI/config y proveedores DB no usados por el runtime SQLite. `deepmerge-ts` solo al cargar config; `@prisma/dev`/Hono/Valibot son herramientas CLI; `mysql2` es camino MySQL, KetoHoy usa better-sqlite3 | npm propone Prisma 6.19.3, downgrade mayor incompatible con alcance/comportamiento Prisma 7. Sin actualización compatible del padre; residual documentado, sin `overrides` |

Next fixed en 16.3.6; se eligió 16.3.8 (actual estable consultada en la rama). Vitest fix 4.1.11. Playwright permanece 1.63.0; Prisma/React permanecen en 7.8.0/19.2.4. No se ejecutó `npm audit fix --force`. El `npm install --package-lock-only` inicial encontró un error interno de Arborist con el rango caret; se acotaron los rangos a la rama menor segura y se generó el lockfile. `npm ci` normal, sin opciones especiales, completó en copia temporal limpia.

### Verificación

* `npm ci`: PASS en copia temporal del checkout; no se borró `node_modules` del workspace original. `npm ls` informa seis paquetes opcionales de WASM como extraneous en macOS; están marcados `optional` en el lock para dependencias de plataforma wasm32 y no son dependencias directas de KetoHoy.
* `npx tsc --noEmit`: PASS. `npm run build` con SQLite temporal: PASS en Next 16.3.8.
* Lint global mantiene 3 errores históricos `no-require-imports` en `audit-assets/api-probes.cjs:2–4` y la advertencia del config Prisma no rastreado; sin warnings nuevos tras conservar `eslint-config-next` 16.2.9.
* Unit/integration, corrida completa con worker count normal: **365 passed / 2 failed (timeouts de 5 s en `prisma/dataUniqueness.test.ts` y `prisma/manualOwnership.test.ts`)**. Los tests de migración pasan aislados con sus timeouts existentes: KH-034 3/3, baseline KH-035 6/6, KH-030 migration 2/2 y KH-025/KH-005/KH-027 1/1 cada uno. Otra corrida diagnóstica con 10 workers tuvo 364 pass / 3 timeouts; no se redujeron workers ni se aumentó timeout.
* E2E completo, DB temporal, 5 workers, 0 retries: **114 passed / 3 failed / 1 skipped / 0 not run**. Fallos: `e2e/account-lifecycle.spec.ts` no navega a `/login` tras borrar cuenta, `e2e/motion.spec.ts` no observa la animación de salida Escape y `e2e/plan.spec.ts` mantiene Viernes `aria-pressed=false`; `plan.spec.ts` aislado repite ese último fallo (6 pass / 1 fail). El skip es el hero condicionado por fixture. Ningún fallo se atribuyó sin evidencia a los paquetes; no se tocó código de esos findings.
* `bash scripts/backup-db.test.sh`: PASS con DB/backup/restore temporales. TypeScript/build prueban SSR; no hubo cambios en cookies, redirects, auth, autorización, headers, providers ni image remote patterns.
* `git diff --check`: PASS. `dev.db` original leído solo para clonar el fixture a la copia temporal; mtime original permanece 2 de octubre. No staging/producción/SSH/deploy/email real/OAuth ni secretos.

Debido a los timeouts unitarios y fallos E2E, KH-022 queda pendiente de regresión completa; los advisories high/moderate restantes no tienen arreglo compatible razonable dentro de este finding. No cerrar ni incrementar contador.

## POST-KH-022 — Regresión y atribución — 2026-10-07

Estado: **Implemented — Residual dependency risk pending**; contador **32/46**. Se conservan KH-011, KH-021, KH-030, KH-035 y KH-036 sin cambios. Matriz controlada con `npm ci` en cuatro copias temporales: Next 16.3.8/Vitest 4.1.11, Next 16.3.8/Vitest 4.1.9, Next 16.3.4/Vitest 4.1.11 y Next 16.3.4/Vitest 4.1.9. Prisma 7.8.0, Playwright 1.63.0, React 19.2.4 y sharp 0.35.5 constantes.

### Atribución y recuperación

* Migraciones (`dataUniqueness`, `manualOwnership`): pasan aisladas en las cuatro matrices y cinco repeticiones actuales 5/5. Los timeouts originales de 5 s no se reprodujeron de forma estable: suite completa había pasado 367/367 una vez; posteriores corridas concurrentes volvieron a exceder límites de 5 s. No hay asociación consistente con Next/Vitest ni se alteraron sus límites.
* KH-030 borrado/navegación: al omitir `ACCOUNT_DELETION_LEDGER` (necesario en el entorno efímero) la API rechaza el borrado con 503 antes de mutar la DB y la UI permanece en Preferences. Configurando ledger desechable, lifecycle pasa en las cuatro matrices y tres repeticiones. No es regresión de dependencia ni cambia el contrato de KH-030.
* KH-040 Sheet: las cuatro matrices pasan. Repetición del spec encontró muestreo intermitente de estilos transitorios al cerrarse el panel. `e2e/motion.spec.ts` ahora observa `animationend` de overlay/panel, espera desmontaje y foco restaurado. Prueba focal repetida: cierre X 6/6 y spec motion 16/16; Escape, overlay, acción, fallos y reduced-motion cubiertos. Sin cambio a la duración ni al componente Sheet.
* KH-022 Weekly Plan: fallo de navegación del último día reproducido en Next 16.3.4 y 16.3.8. Al llegar al final del documento, el observer no emitía nueva entrada porque el elemento seguía completamente intersectando; `atBottom` solo se evaluaba dentro del callback IO. `src/app/weekly-plan/page.tsx` ahora verifica el límite al desplazarse y selecciona el último día visible. Repetición focal tras cambio 6/6; el día activo pasa a Domingo al final y hoy sigue marcado independientemente con `aria-current`.

### Verificación final

* `npm ci` limpio PASS en copia temporal. Dependencias finales: Next 16.3.8, Vitest/coverage-v8 4.1.11, Prisma 7.8.0, Playwright 1.63.0, React 19.2.4, sharp 0.35.5.
* `npx tsc --noEmit` PASS; build Next 16.3.8 PASS. ESLint focal de archivos cambiados PASS. Lint global conserva 3 errores históricos `no-require-imports` en `audit-assets/api-probes.cjs:2–4` y warning de export default anónimo de config Prisma temporal sin seguimiento.
* Auditoría en instalación final: `npm audit` 12 (0 critical/9 high/3 moderate); `--omit=dev` 7 (0/4/3). Sin critical; residuales de tooling eslint-config-next y Prisma CLI/config están descritos en la sección KH-022. No se forzó downgrade ni se cambió Prisma.
* E2E completo: primera corrida 116 passed/1 failed/1 skipped/0 not run; fallo único en KH-027 semanal: POST generate 500 por FK. Segunda corrida solapó con suite unit/build, por lo que tuvo 112 pass/5 fail/1 skip e incluye fallos de espera/estado; no se atribuyen como evidencia limpia. Repetición limpia adicional: 115 passed/1 failed/1 skipped/1 not run; fallo en KH-020 `mutation-adversarial.spec.ts` al esperar la eliminación inmediata de la fila después de liberar la respuesta; workers 5, retries 0. Un test no corrió tras fallar el worker. Skip preexistente del hero; sin sleeps añadidos ni assertions retiradas.
* Unit completo inicial después de fixes pasó 367/367 (48 archivos). Corridas posteriores concurrentes tuvieron 2 y 7 timeouts de 5 s en migraciones/configuración temporal; no se elevaron timeout ni se redujeron workers. No declarar baseline completa hasta cerrar corridas completas limpias.
* `git diff --check` PASS. Se probaron solo DBs/ledgers desechables bajo `/tmp`; `dev.db` original no se modificó. Sin producción, staging, SSH, deploy, emails reales, OAuth externo ni lectura/exposición de secretos.

KH-022 no se cierra: aunque se corrigieron dos causas atribuidas y el set de dependencias no mostró causalidad, el E2E completo limpio y la estabilidad de la suite unitaria necesitan confirmación final; los advisories compatibles pendientes siguen documentados.

### Continuación diagnóstica — KH-027/KH-020/migraciones — 2026-10-07

* KH-027: el test exacto de 390 px pasó con DB temporal nueva; diez repeticiones del mismo caso, un worker/0 retries, pasaron 10/10. No se reprodujo el 500 y, por ello, no hay una constraint concreta del incidente original que afirmar. La ruta de generation reportada por el log anterior fue `WeeklyMeal.createMany` dentro de la transacción; `WeeklyMeal` referencia `WeeklyPlan.id` vía `planId` y `Recipe.id` vía `recipeId`, pero el log no identificó cuál. La config Playwright resuelve un único `DATABASE_URL` absoluto para migrate/seed/server y la misma variable para el test; `reuseExistingServer: false` y el server se cierra con el proceso de prueba.
* KH-020: test exacto `HTTP matrix, double actions, navigation shopping-list 1280` pasó 10/10 con DB nueva, un worker/0 retries. La ruta retenida completa `route.fetch()` antes de publicar la señal `release`; luego libera una respuesta HTTP real y el estado termina quitando la fila del DOM. No se ha demostrado una race ni una falla de producto.
* Suite unit secuencial adicional (sin build/E2E concurrente de esta tarea): resultados sucesivos 366/367 (timeout dataUniqueness), 367/367, 367/367, 366/367 (mismo test), 356/367 (timeouts migración/setup), 364/367 (13 timeouts migración/setup/catálogo). Cada caso fallido se aisló inmediatamente; los específicos aislados pasaron salvo `dataUniqueness` preservación, que en una medición duró 6.18 s y excedió su límite actual de 5 s; otra pasada aislada del mismo caso duró 1.18 s y pasó. Otros casos: manual ownership 2/2, nutrition 1/1, pantry API 5/5; legacy baseline de 15 s pasó en 6.16 s, baseline fresh pasó 1.34 s. No se cambiaron timeouts ni workers.
* Evidencia ambiental informativa al fallar: CPU/load de host alto (load averages 30.83/29.27/23.26); procesos ajenos al repo (`WindowServer`, Chrome, `cloudd`, GUI) activos. No se detuvieron. `dev.db` original 792 KB, mtime 2 oct; fixture se abre read-only y se serializa a temporales. No hallé lock ni proceso de Prisma/Next/Vitest/Playwright de esta tarea después de cada ejecución.
* Baseline aún sin recuperar: hay dos verdes completos consecutivos como máximo en esta secuencia, luego reaparecieron timeouts. No se ha iniciado full E2E en esta continuación para respetar el gate de tres full unit verdes consecutivos. No cambiar auditoría: KH-022 sigue pending y los estados restantes conservan 32/46.

### Continuación diagnóstica — timeouts unitarios, segunda revisión — 2026-10-07

* Dos suites completas actuales adicionales (`Next 16.3.8 / Vitest 4.1.11`, 48 archivos, 367 tests) terminaron con 361 passed / 6 failed por timeout: `dataUniqueness` (5 s, dos tests), `legacyBaseline` (15 s para baseline transicional y 5 s para fresh), `manualOwnership` (5 s) y `nutritionConvention` (5 s). Otra suite completa posterior terminó 365 passed / 2 failed: `dataUniqueness` y `legacyBaseline` (15 s). El intento de secuencia de tres suites se detuvo en el primer fallo según la instrucción; por tanto, no se obtuvo ninguna corrida verde de esa secuencia.
* Inmediatamente después, los cuatro archivos migratorios fallidos pasaron uno por uno: dataUniqueness 3/3 (5,43 s archivo), legacyBaseline 6/6 (8,53 s), manualOwnership 2/2 (4,04 s), nutritionConvention 1/1 (2,03 s). Una repetición enfocada anterior de `dataUniqueness` pasó 3/3 y otra pareja repetida falló una vez en su segundo ciclo en el caso de 5 s.
* Comparación A/B sobre los mismos cuatro archivos y host: Vitest 4.1.11 pasó 12/12 en 9,15 s; Vitest 4.1.9 pasó 12/12 en 8,35 s. Es una sola ejecución por versión y no atribuye causalidad. Ambos superan los timeouts en aislamiento; las fallas aparecen durante suites completas con alta contención del host.
* Durante ejecuciones fallidas se midieron load averages 32,59/30,08/27,85 y luego 22,29/30,04/28,47. `WindowServer` y procesos de Chrome estaban consumiendo CPU; no eran procesos de pruebas del repo y no se detuvieron. Esto apoya sensibilidad al scheduling bajo carga, sin demostrar que esa sea la causa única. Los conteos/duraciones por sí solos no prueban una regresión de Vitest; no hay evidencia de cambio Next ni Prisma y no se altera dependencia o timeout.
* Sin fix adicional: no hay causa de producto reproducida y la matriz enfocada pasa con ambos Vitest. No se cambió ningún test ni worker. No se ejecutó E2E completo porque sigue fallando el gate unitario. Solo temporales bajo `/tmp`; `dev.db` continúa en 811008 bytes con mtime 2026-10-02 11:35:42. KH-022 y los demás estados quedan iguales; **32/46**.

### Recuperación final de regresiones — 2026-10-07

* La secuencia exigida de unit/integration terminó con **3 suites completas consecutivas verdes**, cada una con 48 archivos y 367/367 tests. TypeScript (`npx tsc --noEmit`) también pasó.
* La suite E2E completa se ejecutó con DB temporal nueva en cada corrida, cinco workers y cero retries. Hubo fallos intermitentes fuera de test (fixture/browser sin cuerpo de test) y en aserciones de disponibilidad/pantry/quantities; availability y pantry pasaron al repetir aislados y en conjunto. Se corrigió únicamente la sincronización de `e2e/quantities.spec.ts`: esperar el POST de añadir a la lista y comprobar 200 antes de consultar la lista. No se alteraron workers, retries, timeouts, sleeps ni aserciones funcionales.
* Tras la corrección se completaron **dos corridas completas consecutivas**, cada una con **117 passed / 1 skip preexistente / 0 failed / 0 not run**, con cinco workers y cero retries. Una pasada adicional instrumentada durante diagnóstico también terminó verde. El skip de hero depende del fixture; `RESEND_API_KEY` vacía evitó correo real.
* La evidencia disponible no demuestra que los fallos aislados de preferencias/pantry ni el fallo de fixture/browser sean regresiones del producto o estén causados por Next/Vitest. La nueva espera sí corrige la carrera de sincronización visible en la prueba de quantities.
* E2E afectado lint: `npx eslint e2e/quantities.spec.ts` PASS. `git diff --check` PASS en el checkout del usuario. Se mantienen el build PASS y audit/residuals descritos arriba; lint global conserva tres errores históricos de `audit-assets/api-probes.cjs` y advertencia Prisma.
* `dev.db` se dejó intacta; las suites usaron DB/ledger temporales. Sin cambios de staging, producción, SSH, deploy, correo real o secretos. KH-022 permanece **Implemented — Residual dependency risk pending** por los advisories de Prisma CLI/config y eslint-config-next sin actualización compatible dentro del alcance; contador **32/46**. Estados ajenos a KH-022 no se cambiaron.

## KH-029 — búsqueda local en Despensa — 2026-10-07

Estado: **Implemented — Full E2E regression verification pending**. El contador permanece en **32/46** hasta obtener una full E2E sin tests no ejecutados.

* `/inventory` busca en cliente por nombre visible sobre `items`; `filteredItems` es derivado y se usa antes de agrupar. Normalización Unicode NFD quita diacríticos, trim y minúsculas; matching substring. No se comparte con disponibilidad/stock de KH-015.
* Input etiquetado “Buscar en tu despensa”, clear accesible que devuelve el foco al input y count `filtrados de total`. Query vacío, incluido whitespace, muestra todos. El estado sin coincidencias tiene copy y acción de limpiar; despensa realmente vacía conserva su empty state. Loading/error permanecen independientes.
* La prueba unitaria `pantrySearch.test.ts` pasó 2/2; suite unitaria completa: **369/369**. E2E focalizado de KH-029: **2/2** (setup + búsqueda), fixture de 150 filas en SQLite temporal; incluye nombres/tildes, query y clear sin requests, edición de cantidad dentro del filtro, delete/undo, teclado, reduced motion y overflow a 320/390/768/1280/1440.
* Full E2E previa: **117 passed / 1 skip preexistente / 1 did not run / 0 failed**, cinco workers, cero retries. Playwright reportó un error fuera de test: `route.fetch: Test ended` en `e2e/mercadona-fixture.ts:66` tras cerrar una request GET `/api/pantry`; por ello la corrida no satisface el gate completo. No se modificó ese fixture compartido ni Weekly Plan, y no se repitió la full suite a ciegas. La versión actualizada de 150 filas sí pasó focalizada.
* `npx tsc --noEmit`, build con DB temporal, ESLint de archivos afectados y `git diff --check` pasaron. Cambios de KH-029: `src/app/inventory/page.tsx`, `src/lib/pantrySearch.ts`, `src/lib/__tests__/pantrySearch.test.ts`, `e2e/pantry-search.spec.ts`, `AUDIT-TASKS.md` y este archivo. Cero cambios de backend, dependencias, schema o migrations.
* No se modificaron retries, skips, timeouts, workers, sleeps ni assertions existentes. `dev.db` intacta; sin staging, producción, SSH, deploy, emails reales ni acceso a secretos. KH-011, KH-021, KH-022, KH-030, KH-035 y KH-036 conservan sus estados.

## Migration Test Stability Recovery — 2026-10-07

Resultado: **BASELINE RECOVERED**. El diagnóstico encontró que la fragilidad venía de combinar arranques repetidos de Prisma CLI, varias migraciones por test y tests que migraban más veces de lo que necesitaban sus assertions, todo bajo concurrencia normal de Vitest. Se mantuvieron los límites de timeout y los workers.

### Exact timeout tests y diagnóstico

Durante las corridas completas de diagnóstico se observaron expiraciones con el timeout preexistente de 5 s en:

| Archivo | Test | Síntoma observado | Reproducido durante la recuperación |
|---|---|---|---|
| `prisma/nutritionConvention.test.ts` | `real migration preserves historical macros and degrades evidence` | 5 s | Sí, en la corrida completa previa a la optimización |
| `prisma/dataUniqueness.test.ts` | `preserves valid rows, NULL legacy rows, and table definitions` | 5 s | Sí, en corridas completas previas |
| `prisma/dataUniqueness.test.ts` | `fails deterministically on duplicate preferences without deleting fixture rows` | 5 s | Sí, antes de mover el deploy fallido compartido a setup de suite |
| `prisma/manualOwnership.test.ts` | `keeps legacy values and references without assigning or deleting manual products` | 5 s | Sí, en corridas completas previas |
| `prisma/legacyBaseline.test.ts` | `baselines exact migration-transition behavior` | 15 s, presupuesto preexistente | Sí, en una corrida completa; el límite no se modificó |
| `prisma/legacyBaseline.test.ts` | pruebas de clasificación/deploy fresh y tracked | 5 s | Sí, de forma intermitente en corridas completas previas |

La captura completa disponible para cada expiración fue el resultado de Vitest (archivo, nombre, duración y error de timeout). No había instrumentación de worker ni de ruta SQLite en el test runner, así que worker/DB por cada evento histórico no se puede reconstruir retrospectivamente. El código confirma que cada CLI recibe un archivo temporal propio vía `DATABASE_URL` explícito y que los procesos se ejecutan sin wrapper shell y se esperan sincrónicamente. No hubo `database is locked`, WAL compartido, rutas fijas, colisión de directorios ni proceso Prisma residual observado. Los logs existentes no conservaban un PID/worker por timeout; no se inventa esa atribución.

### Root cause

* **Migration overhead:** los tests de ownership, uniqueness, nutrition convention y baseline hacían `migrate deploy` real; algunas verificaciones reconstruían el mismo estado y repetían el chain completo aunque la aserción solo requería una migración concreta. El fixture de uniqueness duplicado también lanzaba un deploy que se esperaba que fallase desde el cuerpo del test.
* **Child processes:** invocación directa con `process.execPath node_modules/prisma/build/index.js migrate deploy`; no `npx`, npm ni shell. Cada llamada aún paga arranque de Node/Prisma y carga del engine. Se observaron llamadas Prisma individuales de hasta ~3.4 s bajo carga, suficiente para consumir el presupuesto de 5 s junto con setup/assertions. `execFileSync` no deja el child ejecutándose tras retornar; no se observaron procesos colgados.
* **DATABASE_URL:** setup heredado asignaba `process.env.DATABASE_URL`. Sus limpiezas ahora restauran el valor anterior cuando el valor sigue siendo el de ese fixture; el subprocess recibe siempre el path único en su `env` explícito. Las pruebas enfocadas y suites completas verdes confirman aislamiento funcional.
* **SQLite:** no se encontró evidencia de lock, WAL compartido ni colisión. Las bases de test usan carpetas temporales únicas; E2E usó DB y ledger diferentes en cada corrida. `dev.db` solo se abrió en lectura para el template global y no se modificó.
* **Fixture/setup:** una plantilla temporal ya migrada se prepara una vez por ejecución de Vitest y las pruebas de negocio copian ese estado. Las pruebas legacy de corrección ahora construyen fixture SQL mínimo explícito y mantienen checksums/historial pretarget. Los tests que verifican DB vacía/fresh siguen aplicando la historia completa real.

### Fixes

* `src/lib/__tests__/testDb.globalSetup.ts`, `vitest.config.ts`, `src/lib/__tests__/testDb.ts`: crear una copia/template migrada temporal una vez por suite global; clonar DB por test y restaurar `DATABASE_URL` en cleanup. Seguro porque cada test mantiene su propia DB mutable, y el template deriva de `dev.db` de solo lectura. No cambia el comportamiento productivo ni el historial de migraciones.
* `prisma/testMigrationFixture.ts`, `prisma/dataUniqueness.test.ts`, `prisma/manualOwnership.test.ts`, `prisma/nutritionConvention.test.ts`, `prisma/legacyBaseline.test.ts`: fixtures SQLite mínimos previos a migración y configuración temporal de directorios/configs para ejecutar las migraciones reales relevantes. Se agruparon migraciones necesarias por escenario y se evita repetir deploys idénticos en el cuerpo de varias aserciones. Los tests de fresh/full history siguen usando la historia completa; migration correctness sigue ejecutando Prisma real. No se mockearon migraciones y no se cambió schema ni SQL de migrations.
* `src/app/shopping-list/page.tsx`: E2E reprodujo una fila que no salía porque `leave()` esperaba indefinidamente un `transitionend` que no llegaba. Ahora observa el siguiente frame y las animaciones nativas existentes; una animación cancelada se trata como terminada. La prueba afectada y el archivo entero pasan con cinco workers y cero retries.

### Focused repetitions

Los tres archivos migratorios con expiraciones actuales más frecuentes se ejecutaron 20 veces cada uno; 0 fallos. Cada repetición de archivo cubre todos sus tests, incluidos los casos fresh/full-history.

| Archivo / test relevante | Repeticiones | Fallos | Rango observado del test relevante |
|---|---:|---:|---:|
| `dataUniqueness` — preserve rows | 20 | 0 | 0.75–4.30 s; mediana 1.28 s en la repetición final |
| `dataUniqueness` — duplicate failure | 20 | 0 | deploy esperado-fallido real preparado una vez en setup de archivo; assertions verifican error UNIQUE y filas intactas |
| `manualOwnership` — legacy preservation | 20 | 0 | assertions de test 3–6 ms después del deploy real de la cadena preparado en setup; repetición previa al cambio: 0.51–2.20 s |
| `nutritionConvention` — historical macros | 20 | 0 | 0.65–2.05 s; mediana 1.02 s en la repetición final |
| `legacyBaseline` — transición exacta (límite existente 15 s) | 20 | 0 | pasa sin cambiar el timeout |
| `legacyBaseline` — deploy pending/KH-034, prefijo tracked y DDL KH-034 | 20 por caso | 0 | pasan con timeout existente |

También se repitieron `dataUniqueness`, `manualOwnership` y `nutritionConvention` completos x20 tras los cambios finales: 20/20 verdes por archivo.

### Migration group

Se ejecutaron juntos `dataUniqueness`, `legacyBaseline`, `manualOwnership`, `nutritionConvention`, `quantityContract` y `weeklyShopping`: **3 corridas**, **22/22 tests cada una**, **0 fallos**. Duraciones: **8.14 s, 10.41 s y 12.69 s**; máximo **12.69 s**.

### Full unit stability

Cinco corridas secuenciales consecutivas, sin rerun después de fallo: todas **49 archivos, 377/377**, cero fallos y cero timeouts.

| Run | Passed | Failed | Timeouts | Duración |
|---|---:|---:|---:|---:|
| 1 | 377 | 0 | 0 | 19.31 s |
| 2 | 377 | 0 | 0 | 19.61 s |
| 3 | 377 | 0 | 0 | 17.82 s |
| 4 | 377 | 0 | 0 | 17.13 s |
| 5 | 377 | 0 | 0 | 13.86 s |

### Full E2E y KH-029

KH-029 focalizado pasó **2/2** (setup + búsqueda) con workers=5/retries=0 y DB/ledger temporales nuevos. `weekly-shopping.spec.ts` pasó 6/6 con la corrección de animación. Después del gate unitario se hicieron dos E2E completas consecutivas:

| Run | Passed | Failed | Skip histórico | Not run | Global errors | Workers | Retries | Duración |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| 1 | 118 | 0 | 1 | 0 | Ninguno | 5 | 0 | 31.7 s |
| 2 | 118 | 0 | 1 | 0 | Ninguno | 5 | 0 | 41.0 s |

Cada corrida usó una DB SQLite y ledger distintos en `/tmp`. `route.fetch: Test ended` no reapareció. El skip único es el histórico; no se añadió ningún skip. La advertencia de `RESEND_API_KEY` ausente es esperada en el entorno E2E y no se envió correo real. KH-029 pasa su gate global y queda **Completed**; contador **33/46**.

### Static, integridad y seguridad

* `npx tsc --noEmit`: PASS. Build con DB temporal: PASS. ESLint de los archivos afectados: PASS. `git diff --check`: PASS.
* `npm run lint` global: mantiene solo los tres errores conocidos de `audit-assets/api-probes.cjs:2–4` y warning conocido de `.prisma-kh034-81544-1791296650055.config.ts`; no se tocaron.
* Integridad: retries añadidos **0**; skips añadidos **0**; timeout global/test aumentado **NO**; workers reducidos **NO**; serialización global **NO**; sleeps **0**; assertions retiradas **0**; migrations mockeadas **NO**. El límite preexistente de 15 s de la transición de baseline permanece igual.
* Seguridad: el fixture de solo lectura [`dev.db`](/Users/sergioballesteros/ketohoy/dev.db) permanece **811008 bytes / 2026-10-02 11:35:42**; DBs y ledgers desechables en `/tmp`. No se usaron producción, staging, SSH ni deploy; schema y migration SQL sin cambios.
* Estados conservados: KH-011 `Implemented — Operational verification pending`; KH-021 `PARTIAL / BLOCKED`; KH-022 `Implemented — Residual dependency risk pending`; KH-030 `Implemented — Legal/operational review pending`; KH-035 `Implemented — Production schema verification pending`; KH-036 `Implemented — Host/off-host verification pending`.

Próximo finding recomendado: **KH-038**. No se implementa en esta recuperación.

## KH-038 — accesibilidad de favoritos — 2026-10-08

Estado: **Completed**. Contador actualizado de **33/46 a 34/46**.

* Alcance limitado a `/explore`: botones de favorito en cards y en `ExploreProductSheet`. Cada nombre expone la acción y el producto (`Marcar [producto] como favorito` / `Quitar [producto] de favoritos`), `aria-pressed` conserva el estado, y el SVG decorativo lleva `aria-hidden="true"`. El icono mantiene su señal visual outline/filled; el target existente es 40×40 px y conserva `focusRing`.
* Se quitó `aria-live` de la sección que envuelve la rejilla. El contador de resultados es `aria-live="polite"` y atómico; el anuncio breve de cantidad y el error del carrito permanecen locales a sus controles/estados. Favoritos se actualiza sin request: no hay pending ni rollback de red que pueda dejar `aria-pressed` falso.
* El E2E focalizado semántico pasó 2/2 (setup + prueba): cinco productos de nombre parecido, nombres únicos, estados no favorito/favorito, Tab, Enter, Space para activar y desactivar, `aria-hidden`, sheet y rejilla fuera del live region. Las pruebas de target/foco/overflow pasaron 6/6 (setup + cinco anchos: 320, 390, 768, 1280 y 1440 px); el test de persistencia de favoritos tras reload también pasó.
* Unit completo: **377/377**, 0 fallos, 0 timeouts. Full E2E final: **124 passed / 1 skip histórico / 0 failed / 0 not run**, cinco workers, cero retries y ningún error global de Playwright; DB y deletion ledger temporales nuevos. La suite incluye persistencia de favoritos tras reload. En corridas previas hubo fallos intermitentes ajenos a KH-038: `apiResponse.json: Response has been disposed` en `e2e/mercadona-fixture.ts:66` pasó aislado 2/2, y la prueba de navegación de KH-037 pasó en la corrida completa final.
* `npx tsc --noEmit`: PASS. Build con DB temporal: PASS. ESLint afectado (`ExploreClient`, `ExploreProductSheet`, `catalog.spec`, `smoke.spec`): PASS. `git diff --check`: PASS. `npm run lint` global mantiene 3 errores previos en `audit-assets/api-probes.cjs:2–4` y un warning en `.prisma-kh034-81544-1791296650055.config.ts`; no relacionados ni corregidos.
* El modelo de accesibilidad del navegador verificó roles, nombres y pressed state; no se probó VoiceOver/NVDA real. Reduced motion es N/A para este control porque no tiene animación. No se tocaron API/backend, schema, migraciones ni dependencias. `dev.db` intacta; sin producción, staging, SSH ni deploy.
* Integridad: retries añadidos 0; skips añadidos 0; timeout aumentado 0; workers reducidos 0; sleeps añadidos 0; assertions existentes retiradas 0. Los checks focalizados añadidos son aserciones nuevas de KH-038.

Próximo finding independiente recomendado: **KH-042**. No implementado.

## KH-039 — Fotos de recetas no representan de forma fiable el plato — 2026-10-08

Estado: **Completed** tras recuperar la baseline y superar la revalidación final (2026-10-08). Contador: **35/46**. Las imágenes revisadas se persistieron únicamente en SQLite temporal; `dev.db` y producción siguen intactas.

| Recipe | Surface | Previous state | Decision | Final image state | Provenance |
|---|---|---|---|---|---|
| Huevos revueltos con bacon y aguacate | Landing, Home, cards, detalle y sugerencias | Bowl de aguacate/huevo sin bacon visible | PLACEHOLDER | Sin imagen revisada; URL histórica no se sirve | Ninguna para el placeholder |
| Tortilla de queso y jamón | Landing, Home, cards, detalle y sugerencias | Tortilla genérica; queso/jamón no visibles | ILLUSTRATIVE | Imagen visible con marca discreta “Imagen ilustrativa” | [blackieshoot](https://unsplash.com/@blackieshoot?utm_source=ketohoy&utm_medium=referral), [foto Unsplash](https://unsplash.com/photos/a-close-up-of-a-piece-of-food-on-a-plate-z4CQtd07u5k?utm_source=ketohoy&utm_medium=referral) |
| Huevos fritos con bacon | Landing, Home, cards, detalle y sugerencias | Huevo frito con bacon en sartén | KEEP | Foto visible revisada | [James Kern](https://unsplash.com/@jamesrkern?utm_source=ketohoy&utm_medium=referral), [foto Unsplash](https://unsplash.com/photos/fried-egg-on-black-pan-aLDW0oQ0NtU?utm_source=ketohoy&utm_medium=referral) |
| Revuelto de espinacas y queso | Landing, Home, cards, detalle y sugerencias | Revuelto/plato con patatas, ingredientes no verificables | PLACEHOLDER | Sin imagen revisada; URL histórica no se sirve | Ninguna para el placeholder |

El mapa revisado se aplica en Landing, Home, cards, detalle, API de detalle y sugerencias. Los metadatos/JSON-LD excluyen imágenes ilustrativas y no revisadas. La navegación ya no busca fotos en Unsplash; el script de backfill queda explícito y dry-run por defecto. Si una foto falla al cargar, se conserva el contenido de receta y se muestra el fallback. Las capturas de producción existentes se conservaron como evidencia, sin modificar datos.

Unsplash indica que el uso API debe hotlinkear las URLs devueltas y que las fotos visibles deben atribuir a Unsplash y al fotógrafo, con enlace al perfil y parámetros `utm_source`/`utm_medium`; el mapa y la atribución visible aplican esos requisitos ([API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines), [API Terms](https://unsplash.com/api-terms)). Esta comprobación de requisitos del proveedor no equivale a una certificación legal integral ni confirma una eventual aprobación de la aplicación API.

Verificación en entorno aislado: unit completo **382/382**; `npx tsc --noEmit` PASS; build con SQLite temporal PASS; lint de archivos KH-039 afectados PASS; `git diff --check` PASS; E2E `recipe-images.spec.ts` **2/2** (setup + prueba). La E2E comprueba las cuatro tarjetas a 320/390/768/1280/1440, frames 4:3 y carga efectiva de las dos fotos; el detalle con foto cargada a 390/1440, frame 16:9 y atribución; el detalle con 404, fallback bajo `prefers-reduced-motion: reduce`, Tab/Shift+Tab/Enter, cero pageerrors y ausencia de búsqueda en `api.unsplash.com`. Se revisaron visualmente los crops cargados: a 320 y 1440 la tortilla ilustrativa sigue identificable y los dos ingredientes dominantes del huevo con bacon siguen visibles; el detalle los conserva a 390 y 1440. `images:backfill --apply` persistió 2/2 imágenes revisadas en `/tmp/ketohoy-kh039-focused-a11y2-20261008.db`; una consulta SQL confirmó que solo aparecen `Huevos fritos con bacon` y `Tortilla de queso y jamón`. `dev.db` permanece 811008 bytes / 2026-10-02 11:35:42; no se escribieron datos reales.

La full E2E de la primera verificación dio **123 passed / 3 failed / 0 skipped / 0 not run**. El triage y la recuperación de esa baseline quedan registrados en el apartado siguiente.

Límites: no se escribieron bases de datos de desarrollo/producción, no hubo schema/migración/dependencias nuevas, no se ejecutó backfill en base real ni se activó búsqueda automática en navegación.

### E2E Regression Triage — KH-039 Final Gate — 2026-10-08

**Resultado: BASELINE RECOVERED — KH-039 CLOSED.** No se modificó código de producto de KH-039 durante esta recuperación. No se añadieron retries, skips, timeouts, sleeps, interacciones `force` ni cambios globales de paralelismo.

| Fallo original | Evidencia y decisión |
|---|---|
| `e2e/account-lifecycle.spec.ts` — borrar la cuenta no llegó a `/login`; alerta “No se pudo completar el borrado…” | Artifact disponible: contexto de error con URL final `/preferences` y alerta; no había screenshot, trace ni red guardados. Con DB/ledger temporales aislados, el test exacto pasó 10/10 y el grupo account/auth 8/8. No se demostró causa de producto o fixture; clasificado como intermitente histórico no reproducido. Sin cambio. |
| `e2e/pantry-shopping.spec.ts` — “pantry: add manually and via search, edit quantity, remove with undo”; `Response has been disposed` al leer JSON de GET pantry en `mercadona-fixture.ts` | Artifact disponible: contexto de error, sin trace/red completos. Test exacto 10/10; archivo 9/9. La última agrupación relacionada pasó 25/25. `route.fetch` sí aparece en el handler observado, pero el lifecycle/teardown que originó el error no se reprodujo ni se probó como causa. Sin cambio de fixture. |
| `e2e/plan.spec.ts` — expectativa `aria-pressed=true` en el día Saturday tras llegar al fondo | El observer selecciona el último día visible en el límite inferior; Saturday y Sunday quedaban visibles y Sunday era el último. Esto respeta la semántica existente de día activo/visible y la regla histórica de Sunday al fondo. Ajuste solo del test: seleccionar Monday (Tuesday si hoy es Monday), afirmar selección al activar y esperar `scrollend` para verificar scroll. Test exacto 10/10 y grupo Weekly Plan 14/14. |

En una ejecución amplia anterior apareció una única discrepancia separada en `pantry-shopping.spec.ts:239` (stock 3 en lugar de 2 al reañadir y deshacer); esa prueba aislada pasó 10/10, el archivo completo pasó 9/9, y los grupos amplios posteriores pasaron 33/33 y 25/25. La causa de ese evento único tampoco se pudo demostrar; no se modificó el contrato de despensa.

| Verificación final | Resultado |
|---|---|
| Cuenta exacta / cuenta-auth | 10/10; grupo 8/8 |
| Pantry exacta / archivo / relacionados | 10/10; 9/9; última agrupación 25/25 |
| Weekly Plan exacto / relacionados | 10/10; 14/14 |
| Full E2E Run 1 | 126 passed, 0 failed, 0 skipped, 0 not run; 5 workers, 0 retries; DB y ledger temporales nuevos |
| Full E2E Run 2 | 126 passed, 0 failed, 0 skipped, 0 not run; 5 workers, 0 retries; DB y ledger temporales nuevos |
| KH-039 focalizado | `e2e/recipe-images.spec.ts` 2/2: cargas, Landing 4:3, detalle 16:9, 404/fallback, atribución, teclado, reduced motion, crops y 0 llamadas de búsqueda a Unsplash |
| Unit / TypeScript / build / lint afectado / diff check | 382/382; PASS; PASS con DB temporal; PASS; PASS |
| Lint global | Mantiene los 3 errores previos de `audit-assets/api-probes.cjs:2–4` y el warning conocido del config Prisma temporal; no relacionados ni corregidos |

Cambios de esta recuperación: `e2e/plan.spec.ts` y `e2e/weekly-plan-experiment.spec.ts` sincronizan scroll con `scrollend` y evitan inferir un día activo ambiguo en el extremo inferior; no se cambió producto. Se actualizó el estado/documentación de KH-039 en `AUDIT-TASKS.md` tras superar todos los gates. El ledger y las DB de ambas full E2E fueron distintos; `dev.db` sigue en 811008 bytes / 2026-10-02 11:35:42. Sin producción, staging, SSH, deploy, seed real, backfill real, cambios de schema/migración/dependencias ni secretos publicados.

Incertidumbre restante: no se recuperaron traces/red completos para los errores originales de account y pantry, y sus causas históricas no quedaron demostradas. Ambas áreas, todos los grupos requeridos y dos full E2E consecutivas están verdes; la anomalía aislada de stock tampoco reapareció en las repeticiones/grupos posteriores.

## KH-042 — returnTo seguro y modo login/registro en URL — 2026-10-08

Estado: **Completed (2026-10-08), tras recuperar dos corridas full E2E consecutivas.** Contador: **36/46**.

* Contrato `normalizeInternalReturnTo` central: conserva rutas internas relativas con query/hash; fallback `/`; rechaza URL absolutas, `//`, barras repetidas, backslash, controles/whitespace, `%` malformado, codificación de separadores hasta triple decode, y destinos `/login`, `/accept-terms` y `/api/auth/*` para evitar loops. No se aceptan URLs absolutas al mismo host.
* La receta pública conserva `/recipes/:id` en el enlace de auth. Login y registro vuelven a ese pathname; login que requiere aceptación y la página de términos conservan y validan el mismo destino. Registro ya recoge términos en el formulario actual, sin wizard ni cambio de consentimiento.
* Google inicia con el mismo `state` y PKCE S256; el destino normalizado viaja en el cookie HttpOnly junto a `state`/verifier. El callback compara `state`, usa el verifier como antes, revalida `returnTo` y lo conserva en callback de error o en el paso de términos. No se contactó Google real.
* `modo=registro` deriva el estado visible de `useSearchParams`. Switches usan `router.push`, conservan el retorno y dan history útil; `modo` inválido canoniza a login. Auth success sigue usando navegación completa para que Server Components lean la nueva sesión. Errores conservan URL/contexto.
* Safety de mutación: CTA anónimo enlaza a auth; tras alta/login se muestra otra vez el botón “Añadir lo que falta…”. No hay `action` en `returnTo`; en la E2E el POST a `add-to-shopping-list` fue 0 y la lista siguió vacía hasta una intención explícita.
* Términos: retorno del servidor se valida antes de pasar a la UI y el destino vuelve a validarse al consumirlo. Versiones, contenido y aceptación legal no cambiaron. OAuth mock confirma callback a `/accept-terms?returnTo=...` para cuenta que aún no aceptó.
* Unit focalizado: 42/42 en helper, auth, Google y página de términos. Unit completo: **413/413; 0 fallos, 0 timeouts**. E2E focalizado: **4/4** (incluye setup + 3 pruebas): registro/login desde receta, lista sin mutación, login con returnTo externo termina en `/` y 0 requests externos, modo/error/history, Tab/Shift+Tab/Enter/Space, foco visible, `reduce`, anchos 320/390/768/1280/1440.

| Full E2E | Resultado |
|---|---|
| Run 1 | 126 passed, 3 failed, 0 skipped, 0 not run; 5 workers, 0 retries. Falló una navegación iniciada antes de completar logout y dos registros de `product-security.spec.ts` respondieron 429. |
| Run 2 | 128 passed, 1 failed, 0 skipped, 0 not run; 5 workers, 0 retries. El flujo KH-042 pasó; `product-security.spec.ts:55` recibió 429 al registrar su segunda cuenta por el bucket in-memory compartido de `/api/auth`. |
| Run 3 (diagnóstico previo) | 127 passed, 2 failed, 0 skipped, 0 not run; 5 workers, 0 retries. No hubo 429 en `product-security.spec.ts`; fallaron `account-lifecycle.spec.ts` y `weekly-shopping.spec.ts`. |
| Run | Resultado |
|---|---|
| Run 4 (recovery 1) | 129 passed, 0 failed, 0 skipped, 0 not run; 5 workers, 0 retries, 0 errores globales. |
| Run 5 (recovery 2, consecutiva) | 129 passed, 0 failed, 0 skipped, 0 not run; 5 workers, 0 retries, 0 errores globales. |

* Account lifecycle: `.env`/`.env.local` y el entorno no configuraban `ACCOUNT_DELETION_LEDGER`; la ruta devolvía 503 antes de borrar la cuenta. Playwright ahora da a cada DB temporal un ledger al lado. La prueba espera el POST `/api/account/delete` con HTTP 200 y luego la navegación a `/login`, así confirma que la navegación ocurre después del borrado.
* Weekly shopping: el contexto de fallo previo mostraba que el POST manual devolvió `{error: "Internal server error"}`; `manual.id` quedaba indefinido y el GET no encontraba fila. Aislado, el POST crea 201 y la respuesta de GET coincide con el objeto creado. Se añadió aserción explícita de 201; las dos full E2E completas pasan sin ese fallo. La excepción interna del 500 previo no quedó registrada, así que no se atribuye a una causa concreta.
* Callback global: un `route.fetch()` de `mercadona-fixture.ts` seguía activo al cerrar el test de despensa. `pantry-shopping.spec.ts` ahora espera a que terminen los callbacks de rutas en `afterEach`; su prueba focalizada pasó 9/9 y las dos full E2E siguientes no tuvieron errores globales.
* Recuperación focalizada: `product-security.spec.ts` pasó 3/3 ejecuciones (cada una incluye setup); KH-042 4/4; account lifecycle 2/2; KH-027 UI swap 2/2; `pantry-shopping.spec.ts` 9/9. No se modificó ninguna funcionalidad de returnTo/login/registro/OAuth en esta recuperación. Los registros de auth siguen usando XFF de fixture único por test/cliente. `clientKey` usa la última entrada XFF; producción solo confía en ella detrás de Caddy que reemplaza esa cabecera, y Next escucha en loopback (ver `docs/deployment-proxy.md`).

* Estática: `npx tsc --noEmit` PASS; build PASS con DB temporal; ESLint de archivos KH-042 PASS; `git diff --check` PASS. Para esta recuperación, `npx eslint e2e/account-lifecycle.spec.ts e2e/weekly-shopping.spec.ts e2e/pantry-shopping.spec.ts` y `git diff --check` PASS. `npm run lint` global conserva 3 errores históricos de `audit-assets/api-probes.cjs:2–4` y un warning del config Prisma temporal; no modificados.
* Sin cambios a schema/migraciones/dependencias, proxy global ni contrato API de auth. `dev.db` conserva tamaño **811008 bytes** y solo se leyó como fuente al crear copias temporales. Sin producción, staging, SSH, deploy, correo real, OAuth real ni secretos en logs; inventario de dependencia sin cambios.
* No se modifican los estados KH-011, KH-021, KH-022, KH-030, KH-035 ni KH-036. La ruta general de proxy para otras páginas privadas sigue redirigiendo a `/login` sin `returnTo`; se dejó fuera del alcance, que cubre el retorno desde receta pública.

Archivos con cambios KH-042: `src/lib/returnTo.ts`, `src/lib/__tests__/returnTo.test.ts`, `src/app/login/page.tsx`, `src/app/login/LoginForm.tsx`, `src/app/recipes/[id]/page.tsx`, `src/app/accept-terms/page.tsx`, `src/app/accept-terms/AcceptTermsForm.tsx`, `src/app/accept-terms/__tests__/page.test.tsx`, `src/lib/googleAuth.ts`, `src/app/api/auth/google/route.ts`, `src/app/api/auth/google/callback/route.ts`, `src/app/api/auth/__tests__/google.api.test.ts`, `e2e/kh042.spec.ts`, `AUDIT-TASKS.md` e `IMPLEMENTATION-PROGRESS.md`. En `page.tsx` de receta y módulos Google había cambios preexistentes de KH-039/seguridad; se conservaron.

Archivos de recuperación de baseline: `playwright.config.ts` (ledger desechable por DB), `e2e/account-lifecycle.spec.ts` (status HTTP antes de validar navegación), `e2e/weekly-shopping.spec.ts` (status de creación manual), `e2e/pantry-shopping.spec.ts` (esperar callbacks de rutas en teardown), y actualización de evidencia en `AUDIT-TASKS.md`/`IMPLEMENTATION-PROGRESS.md`.

**Siguiente paso:** continuar con el siguiente finding independiente pendiente de la auditoría; KH-042 queda cerrada.

## KH-026 — Guía contextual de primer uso — 2026-10-08

Estado: **Completed**. Contador actualizado: **36/46 → 37/46**. No se cambió el estado de KH-011, KH-021, KH-022, KH-030, KH-035 ni KH-036.

* Home combina el identificador de cuenta y señales existentes. Preferencias se leen por `userId`; si aún no hay fila, se aplican los defaults válidos existentes. No existe señal de que preferencias se hayan revisado, así que el copy dice “Revisar o mantener preferencias” y no afirma que falte configuración. Cero restricciones es válido.
* La despensa no participa en el gate; cuenta nueva con despensa vacía puede generar un plan. El primer CTA abre `/weekly-plan`; generar requiere la acción ya existente. Con un plan semanal de 28 slots completos, la guía destaca la compra. El enlace abre el plan y su botón KH-027 prepara la lista solo tras interacción explícita.
* La compra preparada se identifica por `sourceType=weekly-plan`, la tupla `sourceKey` asociada al `planId` actual y `sourceContributions` válidas según `weeklySourcesSchema`. Los rows comprados siguen sirviendo de historial. Cuando se encuentra esa fuente, la guía desaparece. `firstUseGuideStep` tiene unit tests para cuenta nueva/defaults/despensa vacía, plan completo, compra preparada y actividad recurrente/incompleta.
* La omisión se guarda solo como `ketohoy:first-use-guide-dismissed:<userId>` en localStorage. No contiene email, token, alergias ni datos de compra. Sobrevive refresh y logout/login, y separar claves por ID evita filtrarla a otra cuenta. Si el navegador bloquea localStorage, omitir dura la visita actual. Tras omitir, el foco pasa al encabezado “Hoy”.
* No se añadió endpoint, tabla, migración, dependencia ni progreso en DB. No se modificó `/login`, `LoginForm`, preferences ni el destino de `returnTo`; la guía solo aparece si la navegación llega naturalmente a `/`.

| Verificación | Resultado |
|---|---|
| Unit focalizado/full | 4 casos nuevos; **417/417** unit, 0 fallos y 0 timeouts |
| E2E KH-026 mantenido | **2/2** (setup + flujo): defaults, despensa vacía, omisión, refresh, logout/login, otra cuenta, foco/teclado, reduced motion y 320/390/768/1280/1440 sin overflow |
| E2E de progresión | Una corrida focalizada KH-026 **3/3** (setup + dos escenarios) verificó crear las 28 comidas, avanzar a compra, preparar explícitamente la compra semanal KH-027 y ocultar la guía. KH-027 también pasó dentro de las dos full E2E. El spec mantenido concentra en el caso de cuenta/omisión; derivación de estados queda en los tests unitarios.
| Full E2E 1 | **130/130**, 0 failed / 0 skipped / 0 not run / 0 errores globales; 5 workers, 0 retries; DB y ledger temporales nuevos |
| Full E2E 2 consecutiva | **130/130**, 0 failed / 0 skipped / 0 not run / 0 errores globales; 5 workers, 0 retries; DB y ledger temporales nuevos |
| TypeScript / build / lint afectado / diff | PASS; build con DB temporal; ESLint focalizado PASS; `git diff --check` PASS |
| Lint global | Mantiene 3 errores históricos en `audit-assets/api-probes.cjs:2–4` y 1 warning en `.prisma-kh034-81544-1791296650055.config.ts`; no relacionados ni corregidos |

* Hubo fallos intermitentes durante diagnósticos anteriores del full suite en KH-005, KH-027/`product-security`, KH-041 y navegación de plan. Cada test afectado pasó al ejecutarse aislado; tras reducir la carga adicional de la prueba KH-026 se obtuvieron dos full runs consecutivos limpios. No se añadieron retries, skips, timeouts, sleeps, `force`, ni se redujeron workers.
* Limitaciones: el modelo no distingue preferencias nunca revisadas de preferencias aceptadas con defaults; por eso se dejan como opción, sin check artificial. Si preparar un plan no produce filas de compra (por ejemplo, todo ya está cubierto), no hay un registro persistido que pruebe esa preparación. Si se borran todos los rows de compra de un plan todavía completo, la guía puede reaparecer. No se añadió estado histórico para cubrir esos casos. No se probó dispositivo físico, teclado virtual ni VoiceOver/NVDA.
* Sin cambios a schema/migraciones/dependencias ni datos reales. E2E/build usaron SQLite temporal nueva y ledger temporal; sin producción, staging, SSH, deploy, email/OAuth reales ni secretos publicados. `dev.db` no se modificó.

Archivos KH-026: `src/app/page.tsx` (derivación por plan/fuente KH-027), `src/components/HomePageClient.tsx` (inserción y foco), `src/components/FirstUseGuide.tsx` (sección opcional y omisión), `src/lib/firstUseGuide.ts` (regla derivada), `src/lib/__tests__/firstUseGuide.test.ts`, `e2e/first-use-guide.spec.ts`, `AUDIT-TASKS.md` e `IMPLEMENTATION-PROGRESS.md`. Los componentes Home ya contenían cambios locales de KH-039; se conservaron.

Finding independiente abordado a continuación: **KH-028 — consultar la lista tras recarga sin conexión**. Su implementación se documenta abajo; cierre pendiente.

## KH-028 — Snapshot de lista de compra offline readonly — 2026-10-08

Estado: **Completed (2026-10-08)**. Contador actualizado: **37/46 → 38/46**. No se cambiaron los estados de KH-011, KH-021, KH-022, KH-030, KH-035 ni KH-036.

* La shell estática `/offline-shopping-list.html` es genérica y no contiene respuesta privada. El service worker intercepta solo navegación GET exacta a `/shopping-list`, cachea la shell y sus dos recursos estáticos, y nunca intercepta APIs ni mutaciones. El cache está versionado y la limpieza afecta solo caches propios. `manifest.ts` no se modificó ni se implementó PWA completa.
* El snapshot readonly se guarda por ID de cuenta, versión y fecha. Solo contiene campos necesarios para presentar nombre/cantidad/estado; no incluye email, token, precio, producto, claves de origen ni otros metadatos. Solo se actualiza con identidad y lista válidas. Offline no muestra controles de mutación; retry y reconexión vuelven a leer del servidor.
* Logout, transición de login/cuenta, borrado de cuenta, sesión inválida (401/403) y rechazo de identidad en shell limpian snapshots; el logout notifica otras pestañas. Una sesión que el servidor rechaza se diferencia de un fallo de conectividad.
* E2E focalizada KH-028 pasa 3/3 (setup + dos escenarios): SW instalado desde login, primer uso offline sin datos, recarga real con snapshot, cero controles de escritura, retry, respuestas 500/503/timeout/payload inválido sin sobrescribir, reconexión con datos recientes, logout multi-tab, historial atrás, cuenta distinta, sesión invalidada en DB temporal, 320/390/768/1280/1440, Tab/Shift+Tab/Enter/Space, foco visible, reduced motion y 0 pageerrors. `product-security.spec.ts` pasó 3/3; caso KH-020 aislado 2/2; KH-027 aislados 2/2.
* Full E2E con 5 workers y 0 retries: runs 9–15 tuvieron incidencias intermitentes descritas en su historial; run16 **130/131** (P1008 timeout creando `ShoppingListItem`); run17 **131/131**; run18 **130/131** (P2003 en `WeeklyMeal.createMany`); runs19/20 **131/131** consecutivos; runs21/22 **132/132** antes de ampliar escenarios de error; run23 **131/132** (aserción de selección KH-044 que pasó aislada); runs24/25 consecutivos **132/132**, 0 failed/skipped/not-run/global errors. DB/ledger temporales diferentes por corrida. Los casos previos de KH-020/KH-027/product-security se aislaron y pasaron; no se cambió su código ni contrato.
* Unit completo: **421/421**. TypeScript PASS; build PASS con SQLite temporal; lint afectado PASS; `node --check` para ambos scripts offline PASS; `git diff --check` PASS. Lint global mantiene los tres errores históricos en `audit-assets/api-probes.cjs:2–4` y el warning del config Prisma temporal.
* Limitaciones: prueba en Chromium emulado; no se probó dispositivo físico, Safari/iOS, teclado virtual ni lector de pantalla real. Mientras no hay red no puede revalidarse una sesión HttpOnly invalidada en servidor; la identidad local representa la última sesión verificada. `localStorage` no está cifrado y el contenido queda accesible en un dispositivo desbloqueado. Sin red no hay operaciones de compra en cola ni promesa de sincronización.
* E2E/build usaron DB y ledger temporales en `/tmp`; no se ejecutó contra `dev.db`, staging o producción. Sin deploy, secretos, ni dependencias nuevas. Se cerró solo KH-028; los estados de los otros findings permanecen intactos.

Archivos KH-028: `src/lib/shoppingListSnapshot.ts`, `src/lib/__tests__/shoppingListSnapshot.test.ts`, `src/components/OfflineSupport.tsx`, `public/shopping-list-sw.js`, `public/offline-shopping-list.html`, `public/offline-shopping-list.js`, `src/app/layout.tsx`, `src/app/shopping-list/page.tsx`, `src/app/api/auth/me/route.ts`, `src/app/preferences/page.tsx`, `src/app/login/LoginForm.tsx`, `src/proxy.ts`, `next.config.ts`, `e2e/shopping-list-offline.spec.ts`, `AUDIT.md`, `AUDIT-TASKS.md` e `IMPLEMENTATION-PROGRESS.md`. También se corrigió una sincronización de test en `e2e/availability.spec.ts` que leía antes de la respuesta de la acción.

Siguiente paso independiente recomendado: **KH-032 — distinguir una caída de datos de una lista vacía o receta 404**. No implementado en este trabajo.
