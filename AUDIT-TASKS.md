# KetoHoy — Audit Tasks

Derivado de AUDIT.md, 2 de octubre de 2026. **46 tareas diagnósticas; 21 completadas localmente.** Prioridades: P0 0 / P1 14 / P2 27 / P3 5. Mantener IDs para trazabilidad. `Depends on` indica prerequisitos reales de datos; en riesgos Needs verification el primer paso es demostrar condición y ajustar alcance antes de cambiar comportamiento.

El checkout ya contenía cambios del usuario. No revertirlos. Leer AGENTS.md y guía local Next; usar grafo para discovery. Implementar la menor corrección en la causa compartida. Reutilizar helpers/tipos/componentes actuales y tests existentes; no instalar gestores de estado/motion/colas por defecto. BD de pruebas desechable; seed nunca contra datos originales. Pruebas de seguridad solo local/staging autorizado. No desplegar, borrar cuentas ni migrar producción como parte automática de una tarea.

Desktop/Mobile/Keyboard/Reduced motion son checks de cierre futuro, no certificaciones de esta auditoría. En tareas exclusivamente de servidor se marca N/A explícito y se exige prueba de contrato/integridad en su lugar. Ejecutar tests adecuados al cambio; E2E requiere primero KH-010.

## KH-001 — Crear productos no valida la sesión real

Status: Completed

Priority: P1  
Area: Security / Backend  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `POST /api/products`

### Goal

Validar sesión en el handler antes de leer/escribir; mantener el proxy como filtro barato. Revisar las demás mutaciones con la misma regla y decidir explícitamente qué lecturas del catálogo son públicas.

### Context and evidence

El proxy comprueba únicamente la presencia de la cookie. El handler de creación no llama a requireUserId; una cookie inventada supera esa barrera y permite modificar el catálogo compartido.

Prueba HTTP únicamente local: sin cookie GET 401; session inválida GET productos 200 y POST 201. La misma cookie en /api/pantry devuelve 401. audit-assets/api-probes.json: fakeCookieCreateProduct.

### Files likely affected

- [src/app/api/products/route.ts:31](/Users/sergioballesteros/ketohoy/src/app/api/products/route.ts:31)
- [src/proxy.ts:36](/Users/sergioballesteros/ketohoy/src/proxy.ts:36)

### Implementation

- [x] Usar requireUserId existente al principio de POST
- [x] Añadir prueba HTTP que atraviese el proxy con cookie falsa; no limitarse al handler con auth mock
- [x] Documentar lecturas públicas intencionadas

### Acceptance criteria

- [x] Cookie ausente, caducada o inventada: 401 y cero escrituras
- [x] Sesión válida crea su producto; API privada de otras cuentas sigue aislada

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [x] Prueba específica — Comparar el número de productos antes/después de tres peticiones anónimas/ inválidas y una válida.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-002 — Comprar/descomprar no es una operación atómica

Status: Completed

Priority: P1  
Area: Data / Backend  
Effort: M  
Depends on: —  
Confidence: Confirmado  
Route: `/shopping-list; PATCH /api/shopping-list/:id/check; POST /api/shopping-list/mark-bought`

### Goal

Una sola transacción para cambio de estado, transferencia y delta; reutilizar helpers que acepten el cliente transaccional. Mantener compare-and-set dentro de ella y devolver la fila final.

### Context and evidence

El compare-and-set modifica checked fuera de la transacción que transfiere el producto y registra pantryDelta. Si esa segunda parte falla, lista y despensa quedan desincronizadas.

En copia desechable de SQLite se hizo fallar INSERT PantryItem con un trigger temporal. La API respondió 500, pero checked quedó true, pantryDelta null y no había fila de despensa. El trigger se retiró. No se tocó la BD original.

### Files likely affected

- [src/app/api/shopping-list/[id]/check/route.ts:20](/Users/sergioballesteros/ketohoy/src/app/api/shopping-list/[id]/check/route.ts:20)
- [src/app/api/shopping-list/mark-bought/route.ts:20](/Users/sergioballesteros/ketohoy/src/app/api/shopping-list/mark-bought/route.ts:20)
- [src/lib/pantryTransfer.ts:22](/Users/sergioballesteros/ketohoy/src/lib/pantryTransfer.ts:22)

### Implementation

- [x] Pasar TransactionClient a los helpers de transferencia sin crear otra capa de servicios
- [x] Mover el compare-and-set al mismo bloque transaccional en ambos endpoints
- [x] Cubrir fallo de inserción y reversión, además del happy path

### Acceptance criteria

- [x] Fallo en cualquier paso revierte checked, despensa y delta
- [x] Compra y reversión repetidas/concurrentes no duplican ni restan stock ajeno

### Verification

- [x] Desktop — recorrer `/shopping-list; PATCH /api/shopping-list/:id/check; POST /api/shopping-list/mark-bought` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Inyectar fallo de BD y comprobar las tres tablas; repetir check/uncheck y mark-bought desde dos solicitudes.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Implementation evidence: fallo intermedio real y rollback probados; compra/descompra con teclado a 320/390/1280, reduce a 320, suite motion para retorno de foco. Sin cambio de layout (768 no requerido) ni dispositivo físico. Ver IMPLEMENTATION-PROGRESS.md.

## KH-003 — La sustitución explícita elude las preferencias alimentarias

Status: Completed

Priority: P1  
Area: Product / Backend  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `PATCH /api/weekly-plan/:mealId`

### Goal

Usar scoreRecipe con minAvailability 0 en ambas ramas y el mismo contexto de preferencias. Rechazar recetas incompatibles con error accionable, sin modificar el slot.

### Context and evidence

La rama con recipeId verifica solamente el tipo de comida. No aplica ketoMode, avoidFish/Pork/Dairy ni duración; la rama automática sí aplica scoreRecipe.

Tras guardar strict, evitar pescado/cerdo/lácteos y máximo 5 min, un PATCH explícito puso “Atún con tomates cherry y aceite de oliva” en comida con 200. audit-assets/api-probes.json: incompatibleSwap.

### Files likely affected

- [src/app/api/weekly-plan/[mealId]/route.ts:25](/Users/sergioballesteros/ketohoy/src/app/api/weekly-plan/[mealId]/route.ts:25)
- [src/lib/recipeScoring.ts](/Users/sergioballesteros/ketohoy/src/lib/recipeScoring.ts)

### Implementation

- [x] Cargar ingredientes y contexto antes de la bifurcación
- [x] Reutilizar el evaluador existente, no duplicar listas de palabras
- [x] Añadir casos de pescado, cerdo, lácteos, tiempo y modo keto

### Acceptance criteria

- [x] No se admite receta que incumple una exclusión o tiempo guardado
- [x] Elección explícita y automática usan la misma política; una receta compatible sí se guarda

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [x] Prueba específica — Generar plan, endurecer preferencias y enviar recipeId incompatible; esperar 422/400 y slot original intacto.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Evidence: cinco incompatibilidades fallan antes (200) y pasan después (422); slot exacto conservado y receta compatible persistida sin despensa. 12 tests, TypeScript y lint afectados pasan. UI/motion N/A.

## KH-004 — Un menú de siete snacks se presenta como plan semanal generado

Status: Completed

Priority: P1  
Area: UX / Product / Backend  
Effort: M  
Depends on: KH-003  
Confidence: Confirmado  
Route: `/weekly-plan; POST /api/weekly-plan/generate`

### Goal

Definir contrato de completitud. Para el MVP, conservar el plan anterior y responder que faltan candidatos por tipo; ofrecer editar preferencias. Si se admite plan parcial, representar los 28 slots y permitir completar cada hueco. Nunca relajar restricciones silenciosamente.

### Context and evidence

La generación considera suficiente cualquier cantidad mayor que cero. Los tipos sin candidatos se omiten; la UI solo permite cambiar comidas existentes, por lo que los huecos no tienen una acción de reparación.

Con preferencias por defecto se obtuvieron 28 comidas. Con strict, tres exclusiones y 5 minutos se obtuvo 200 con siete snacks; faltan 21 slots. El problema no es que el catálogo sea finito: es la respuesta y recuperación.

### Files likely affected

- [src/app/api/weekly-plan/generate/route.ts:72](/Users/sergioballesteros/ketohoy/src/app/api/weekly-plan/generate/route.ts:72)
- [src/app/weekly-plan/page.tsx:50](/Users/sergioballesteros/ketohoy/src/app/weekly-plan/page.tsx:50)

### Implementation

- [x] Contar candidatos por tipo antes de la transacción
- [x] Implementar el contrato elegido y mensaje con tipos sin recetas
- [x] Probar 0, 7 y 28 candidatos/slots y preservación del plan anterior

### Acceptance criteria

- [x] El usuario distingue completo/parcial/ningún candidato antes de perder su plan
- [x] Los huecos tienen salida y las restricciones se conservan

### Verification

- [x] Desktop — recorrer `/weekly-plan; POST /api/weekly-plan/generate` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Repetir el caso de siete snacks desde UI y API, comprobar mensaje, botón de preferencias y persistencia.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Evidence: 17 tests de plan pasan; before 7 snacks devolvían 200, after 422. BD exacta preservada ante incompleto/vacío/fallo transaccional. Chromium 320/390/1280, CTA por Enter y sin overflow; 6 E2E pasan. Sin movimiento nuevo en recuperación; reduced motion N/A; dispositivo físico/Safari/AT no probados.

## KH-005 — La lista pierde las cantidades reales y mezcla stock con envases

Status: Completed

Priority: P1  
Area: Data / Product  
Effort: L  
Depends on: —  
Confidence: Confirmado  
Route: `/recipes/:id; /weekly-plan; /shopping-list; /inventory`

### Goal

Separar cantidad necesaria con unidad de cantidad comprada/paquetes. Empezar por conservar el texto del ingrediente y mostrarlo; no inventar conversiones. Definir raciones y deduplicación por origen receta/slot. Transferir solo unidades compatibles o pedir confirmación. Mapear a un producto Mercadona cuando existe, sin fingir que un ingrediente genérico es un envase.

### Context and evidence

Ingredientes tienen cantidades libres, compras cantidad string numérica y despensa Float + unidad. El endpoint de faltantes siempre añade “1”; repetir la acción incrementa aunque sea el mismo intento. Al comprar suma números sin conversión de unidades. No hay raciones ni vínculo duradero entre necesidad de receta y envase.

“Almejas al vapor con ajo”: ingredientes 400g y 2 cdas; lista “1” y “1”, segunda llamada “2” y “2”. pantryTransfer conserva la unidad existente y suma cantidad comprada; 5 kg + 2 unidades sería 7 kg por código, caso de unidades pendiente de ejecución. La prueba de cinco incrementos concurrentes SÍ conservó seis unidades: no se atribuye una carrera no reproducida.

### Files likely affected

- [src/app/api/recipes/[id]/add-to-shopping-list/route.ts:68](/Users/sergioballesteros/ketohoy/src/app/api/recipes/[id]/add-to-shopping-list/route.ts:68)
- [src/lib/shoppingList.ts:1](/Users/sergioballesteros/ketohoy/src/lib/shoppingList.ts:1)
- [src/lib/pantryTransfer.ts:22](/Users/sergioballesteros/ketohoy/src/lib/pantryTransfer.ts:22)
- [prisma/schema.prisma](/Users/sergioballesteros/ketohoy/prisma/schema.prisma)

### Implementation

- [x] Escribir contrato corto de necesidad, envase, ración y stock; decidir primero la versión mínima
- [x] Migrar conservando cantidades originales y marcar desconocidas, sin parsear silenciosamente todos los textos
- [x] Propagar el contrato por receta, compras, transferencia y total estimado
- [x] Añadir casos de g/kg, ml/l, cucharadas, envase desconocido y recetas repetidas

### Acceptance criteria

- [x] 400 g sigue siendo visible como 400 g; no se transforma en 1 sin explicar envases
- [x] Reintento del mismo origen es idempotente; dos comidas reales agregan necesidades
- [x] No se suman kg con paquetes y los precios identifican qué unidad cuestan

### Verification

- [x] Desktop — recorrer `/recipes/:id; /weekly-plan; /shopping-list; /inventory` a 1280 y comprobar (1440 no probado) resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Endpoint de receta con 200 g, textos/cucharadas/fracciones, envases/conteo y stock en kg; comparar lista, compra/reversión y precio; probar retry y dos slots.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Implementation evidence (2026-10-04): contrato y mapa en audit-assets/kh-005/{CONTRACT,DOMAIN-MAP}.md. Necesidad/origen/texto separados de paquetes seleccionados y contenido de envase; filas por origen, suma compatible disponible sin destruir procedencia. Sin raciones base/planificadas, no escalado ficticio. Retry receta/slot idempotente; otra receta/slot conserva otra necesidad. Compra física por paquete conocido; desconocido conserva paquetes o stock desconocido. Delta con fila/unidad exacta y transacción; ownership/nutrición intactos. Migración aditiva real + re-deploy + rollback lógico solo en copias; BD original/producción no tocadas. 31 tests nuevos KH-005 dentro de 252/252 unit/integration, 40/40 E2E; types/build/lint afectados/diff pasan. Lint global mantiene únicamente los tres errores previos api-probes.cjs. 320/390/768/1280, lista/cards/dialogs sin overflow; teclado de compra/descompra/detalle y semántica inspeccionados. Checkbox Keyboard no se certifica completo: sheet de alta no devuelve foco al trigger por autofocus/effect previo (KH-019, no modificado). Sin lector de pantalla real/dispositivo físico/Safari. No KH-015/016/027. Ver IMPLEMENTATION-PROGRESS.md.

## KH-006 — Añadir un producto comprado lo incrementa en una fila oculta

Status: Completed

Priority: P1  
Area: Backend / UX  
Effort: S  
Depends on: KH-002  
Confidence: Confirmado  
Route: `/explore; /shopping-list`

### Goal

Fusionar únicamente pendientes. Conservar historial comprado separado o limpiar explícitamente; no alterar pantryDelta al añadir una nueva necesidad.

### Context and evidence

Los merges buscan por producto/nombre sin limitar checked:false. Volver a necesitar un producto ya comprado incrementa la fila comprada en vez de crear una necesidad pendiente.

Prueba local: comprar 1 y volver a añadir 1 deja checked:true, quantity:“2”, pantryDelta:1 y despensa:1. La nueva necesidad no aparece en pendientes.

### Files likely affected

- [src/app/api/shopping-list/route.ts:34](/Users/sergioballesteros/ketohoy/src/app/api/shopping-list/route.ts:34)
- [src/app/api/mercadona/add/route.ts:137](/Users/sergioballesteros/ketohoy/src/app/api/mercadona/add/route.ts:137)

### Implementation

- [x] Aplicar checked:false en los merges de compras, Mercadona y receta
- [x] Probar el caso por los tres puntos de entrada
- [x] Comprobar que Limpiar comprados no borra la nueva necesidad

### Acceptance criteria

- [x] Volver a añadir aparece inmediatamente en pendientes
- [x] La fila comprada y su delta no cambian; compra/reversión siguiente es coherente

### Verification

- [x] Desktop — recorrer `/explore; /shopping-list` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Comprar, volver a añadir desde catálogo/manual/receta, recargar y comprobar pendientes y despensa.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Implementation evidence: filtros mínimos en lista y Mercadona; receta ya filtraba pendientes (con regresión verificada). 4 casos SQLite; 3 casos UI a 320/390/1280 con teclado y reduce a 320. Ver IMPLEMENTATION-PROGRESS.md.

## KH-007 — El catálogo llama “Muy keto” a rebozados mediante una heurística distinta

Priority: P1  
Area: Data / Product  
Effort: M  
Depends on: —  
Confidence: Confirmado  
Route: `/explore; /api/mercadona/*`

### Goal

Una misma normalización y política para buscar, ver e importar. Mostrar “Estimación por categoría”/“Sin datos” antes de contar con nutrición identificada; usar categoría de origen cuando exista y palabras completas como fallback. Mantener advertencia breve junto al badge, no escondida solo en detalle.

### Context and evidence

normalizeMercadonaProducts puntúa por categoría. La importación aplica reglas por nombre y nutrición; ambas pantallas pueden discrepar. Una estimación por pertenecer a Carne no justifica la etiqueta categórica.

Catálogo real local mostró “Pollo marinado rebozado Crispy American Style…” como Muy keto y merluza al huevo también. mapMercadonaCategory usa subcadenas: “repollo” coincide con “pollo”. Captura local-catalog-390.png; código distinto de puntuación en import.

### Files likely affected

- [src/lib/mercadona.ts:276](/Users/sergioballesteros/ketohoy/src/lib/mercadona.ts:276)
- [src/lib/ketoRules.ts](/Users/sergioballesteros/ketohoy/src/lib/ketoRules.ts)
- [src/app/api/mercadona/add/route.ts:68](/Users/sergioballesteros/ketohoy/src/app/api/mercadona/add/route.ts:68)
- [src/components/ui.tsx](/Users/sergioballesteros/ketohoy/src/components/ui.tsx)

Status: **Completed — 2026-10-03**

### Implementation

- [x] Centralizar el cálculo existente con procedencia explícita
- [x] Distinguir estimación y datos del envase en tipo/API/UI
- [x] Añadir regresiones para rebozados, repollo y bebida de almendra

### Acceptance criteria

- [x] Rebozados sin nutrición no reciben afirmación Muy keto por ser carne
- [x] Resultado, detalle e importación muestran puntuación/procedencia coherentes
- [x] Repollo no se clasifica como pollo

### Verification

- [x] Desktop — recorrer `/explore; /api/mercadona/*` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Comparar el mismo mercadonaId en búsqueda, detalle y producto importado; no hacer afirmaciones clínicas.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

### Verified evidence

Tres regresiones fallan con el normalizador anterior: rebozado 5/5, Repollo→meat y Pollo con arroz 5 frente a política de importación 0. Después pasan. Cuatro fixtures con HTTP externo stubbed y SQLite real coinciden en búsqueda/detalle/importación/persistencia: rebozado sin macros, repollo, bebida de almendras con carbs conocidos y desconocido. Snapshot canónico por mercadonaId con TTL de catálogo; score/label/source/evidence explícitos. UI probada a 320/390/1280, Enter/Space, Tab/Shift+Tab, Escape/foco y reduce a 320, sin overflow/pageerrors. Capturas inspeccionadas; sin dispositivo físico/AT. KH-025 continúa pendiente: no se cambia la convención existente de fibra.

Checkpoint: 191 unit/integration, 52 E2E; TypeScript/build/lint afectados/diff check pasan. Lint global: solo tres errores preexistentes en audit-assets/api-probes.cjs. Véase IMPLEMENTATION-PROGRESS.md y audit-assets/catalog-tanda3/. Desktop verificado a 1280, no 1440. Los checkboxes amplios de móvil/teclado/motion se mantienen abiertos cuando incluyen alcance adicional no ejecutado; los casos concretos ejecutados se detallan arriba.

## KH-008 — Tres chips visibles apuntan a categorías que la API rechaza

Priority: P1  
Area: Frontend / Backend / UX  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/explore; GET /api/mercadona/category/:key`

### Goal

Usar la misma lista de categorías soportadas en cliente y API. Ocultar explícitamente las no soportadas o implementar su búsqueda. Retry debe repetir la consulta fallida.

### Context and evidence

La UI reutiliza todas las categorías de despensa, pero la API Mercadona acepta un subconjunto. Fruta, Bebidas y Otros son controles funcionalmente rotos.

Requests locales de esas categorías respondieron 400; Fruta comprobada en navegador a 320 px muestra “No se pudo cargar el catálogo”. Reintentar borra el filtro y carga Todo. Captura local-catalog-fruit-error-320.png.

### Files likely affected

- [src/lib/categories.ts](/Users/sergioballesteros/ketohoy/src/lib/categories.ts)
- [src/app/api/mercadona/category/[name]/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/mercadona/category/[name]/route.ts)
- [src/app/explore/ExploreClient.tsx:287](/Users/sergioballesteros/ketohoy/src/app/explore/ExploreClient.tsx:287)

Status: **Completed — 2026-10-03**

### Implementation

- [x] Definir un subconjunto compartido para catálogo, conservando categorías de despensa
- [x] Alinear Zod/ruta con ese subconjunto
- [x] Guardar la última consulta para retry y cubrir todos los chips

### Acceptance criteria

- [x] Cada chip visible obtiene 200 y resultados/vacío válido
- [x] Reintentar conserva categoría y búsqueda

### Verification

- [x] Desktop — recorrer `/explore; GET /api/mercadona/category/:key` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Pulsar todos los chips y forzar un 503 en uno; verificar reintento en el mismo filtro.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

### Verified evidence

Contrato de los ocho chips probado en HTTP real (200, array de resultados) y en integración con vacío válido. SSR de la UI anterior + handler anterior falla para Fruta (400); fix pasa. Error 503 de categoría y búsqueda con retry conserva URL, categoría, subcategoría y query. UI móvil compartida comprobada a 320/390; todos los chips y 503 a viewport desktop. Sin soporte simulado para Fruta/Bebidas/Otros; siguen disponibles en despensa.

Checkpoint: 191 unit/integration, 52 E2E; TypeScript/build/lint afectados/diff check pasan. Lint global: solo tres errores preexistentes en audit-assets/api-probes.cjs. Véase IMPLEMENTATION-PROGRESS.md y audit-assets/catalog-tanda3/. Desktop verificado a 1280, no 1440. Los checkboxes amplios de móvil/teclado/motion se mantienen abiertos cuando incluyen alcance adicional no ejecutado; los casos concretos ejecutados se detallan arriba.

## KH-009 — Respuestas antiguas sobrescriben el filtro actual del catálogo

Priority: P1  
Area: Frontend / UX  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/explore`

### Goal

AbortController por consulta o contador de request en el loader existente; solo el último request puede actualizar datos, error y loading. Evitar doble fetch Enter + debounce de la misma consulta.

### Context and evidence

fetchProducts no cancela ni identifica requests. Al cambiar rápido de filtro una respuesta lenta anterior actualiza products/loading después de la nueva.

Interceptación SOLO local: Pescado tarda 1000 ms y Carne 50 ms. Carne queda aria-pressed=true pero se muestra AUDIT RESULTADO PESCADO. Captura local-catalog-stale-response-390.png y interaction-probes.json.

### Files likely affected

- [src/app/explore/ExploreClient.tsx:132](/Users/sergioballesteros/ketohoy/src/app/explore/ExploreClient.tsx:132)

Status: **Completed — 2026-10-03**

### Implementation

- [x] Identificar/cancelar el request en fetchProducts y cleanup
- [x] Coordinar submit con el debounce sin librería nueva
- [x] Añadir prueba de respuestas invertidas y borrar búsqueda durante carga

### Acceptance criteria

- [x] Último filtro/consulta gana independientemente del orden de respuesta
- [x] Abortar no muestra error y loading corresponde al request vigente

### Verification

- [x] Desktop — recorrer `/explore` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Pescado lento → Carne rápida; luego buscar/borrar y Enter antes del debounce; verificar resultados, contador y requests.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

### Verified evidence

Pescado 1000 ms → Carne 50 ms: antes termina en Pescado; después Carne conserva productos, selección y loading=false. Enter antes de 450 ms: antes dos requests, después uno. Borrar durante request, fallo 503 obsoleto durante consulta nueva y desmontaje no producen resultado/error antiguo ni pageerrors. AbortController + generación local y cleanup; apiFetch conservado. Las pruebas de catálogo/teclado/layout compartidas pasan a 320/390/1280.

Checkpoint: 191 unit/integration, 52 E2E; TypeScript/build/lint afectados/diff check pasan. Lint global: solo tres errores preexistentes en audit-assets/api-probes.cjs. Véase IMPLEMENTATION-PROGRESS.md y audit-assets/catalog-tanda3/. Desktop verificado a 1280, no 1440. Los checkboxes amplios de móvil/teclado/motion se mantienen abiertos cuando incluyen alcance adicional no ejecutado; los casos concretos ejecutados se detallan arriba.

## KH-010 — El setup E2E está desactualizado y bloquea toda la suite

Status: Completed

Priority: P1  
Area: Testing  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `npm run test:e2e; CI`

### Goal

Actualizar los registros de preparación y el formulario E2E con consentimientos explícitos; añadir caso negativo sin consentimiento. Reusar un helper pequeño de alta, sin cambiar la validación de producto para hacer pasar tests.

### Context and evidence

La API local exige aceptación de términos y mayoría de edad. Los registros de preparación E2E siguen enviando solo email/password.

Ejecución real: esperado 201, recibido 400 en setup; 1 failed y 26 did not run. Los 156 tests Vitest no ejecutan este mismo recorrido HTTP/UI. Deploy depende del éxito de CI.

### Files likely affected

- [e2e/auth.setup.ts:6](/Users/sergioballesteros/ketohoy/e2e/auth.setup.ts:6)
- [e2e/auth.spec.ts](/Users/sergioballesteros/ketohoy/e2e/auth.spec.ts)
- [e2e/pantry-shopping.spec.ts](/Users/sergioballesteros/ketohoy/e2e/pantry-shopping.spec.ts)
- [e2e/plan.spec.ts](/Users/sergioballesteros/ketohoy/e2e/plan.spec.ts)
- [.github/workflows/ci.yml](/Users/sergioballesteros/ketohoy/.github/workflows/ci.yml)

### Implementation

- [x] Localizar todas las altas de usuario en e2e y ajustar contrato
- [x] Actualizar pasos de formulario y añadir prueba negativa
- [x] Ejecutar la suite completa con BD aislada y guardar resultado

### Acceptance criteria

- [x] Setup funciona y los 26 tests dependientes se ejecutan
- [x] Registro sin flags permanece rechazado y UI comprueba ambos consentimientos

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [x] Prueba específica — npm run test:e2e desde cero, además de npm test; no aceptar un pass de setup como pass global.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-011 — El despliegue modifica el directorio que todavía sirve tráfico

Priority: P1  
Area: Architecture / Data  
Effort: M  
Depends on: —  
Confidence: Riesgo confirmado por código; impacto operativo Needs verification  
Route: `Deploy OVH`

### Goal

Preparar un directorio de release y build antes del cambio; almacenar SQLite/env fuera del release, serializar deploy y conmutar/reiniciar tras healthcheck. Conservar release anterior para rollback. Mantener arquitectura PM2/SQLite si una instancia basta.

### Context and evidence

rsync --delete copia al checkout activo y no excluye .next/node_modules. Luego instala, migra, siembra y construye mientras PM2 sigue sirviendo. El proceso se elimina antes de iniciar el nuevo; no hay rollback automático ni concurrency de deploy.

Orden verificable en workflow actual. El healthcheck final verifica /login y headers, pero no previene la ventana anterior ni demuestra acceso a BD. Riesgo por código; no se simuló una caída del VPS.

### Files likely affected

- [.github/workflows/deploy.yml:32](/Users/sergioballesteros/ketohoy/.github/workflows/deploy.yml:32)

### Implementation

- [ ] Añadir concurrency y separar release de datos persistentes
- [ ] Preparar/build/verificar antes de activar; guardar puntero anterior
- [ ] Documentar y ensayar rollback compatible con migraciones

### Acceptance criteria

- [ ] Build fallido no cambia el release servido
- [ ] Dos workflows no se solapan; rollback está probado en staging
- [ ] Healthcheck del release comprueba una lectura de BD además de HTML

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — En staging, servir tráfico durante deploy exitoso y fallido; comprobar HTML/chunks, DB y rollback.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-012 — El seed ignora DATABASE_URL y abre dev.db de la raíz

Status: Completed

Priority: P1  
Area: Data / Backend  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `prisma db seed`

### Goal

Usar la resolución de URL existente/compartida y fallar con destino explícito antes de escribir. Actualizar cada receta y sus ingredientes en una transacción; conservar reset destructivo solo por opt-in.

### Context and evidence

El script configura el adapter con dev.db fijo. Ejecutarlo esperando usar una BD temporal puede escribir en la base original. Además borra/recrea ingredientes fuera de una transacción por receta.

Inspección del constructor y del bucle de seed. Se evitó ejecutar seed en esta auditoría. El resto del runtime sí admite DATABASE_URL.

### Files likely affected

- [prisma/seed.ts:8](/Users/sergioballesteros/ketohoy/prisma/seed.ts:8)
- [prisma.config.ts](/Users/sergioballesteros/ketohoy/prisma.config.ts)
- [src/lib/db.ts](/Users/sergioballesteros/ketohoy/src/lib/db.ts)

### Implementation

- [x] Reusar la resolución de SQLite y validar URL aceptada
- [x] Encapsular escritura de cada receta en transacción
- [x] Comprobar aislamiento con archivos temporales y fallo de inserción

### Acceptance criteria

- [x] Seed con DATABASE_URL temporal no cambia dev.db original
- [x] Fallo al recrear ingredientes revierte la receta completa

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [x] Prueba específica — En dos bases desechables, apuntar a una y comparar hashes/tablas de la otra; no usar la BD del usuario.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-013 — Productos manuales de una cuenta son visibles en otras

Status: Completed

Priority: P1  
Area: Data / Security  
Effort: M  
Depends on: KH-001  
Confidence: Confirmado  
Route: `/inventory; /shopping-list; /api/products/search`

### Goal

Asignar propietario a manuales o mantenerlos como texto privado de la lista/despensa. Mercadona/seed permanecen compartidos. Migrar legacy con decisión conservadora; no adjudicar arbitrariamente todos los manuales a la primera cuenta.

### Context and evidence

Product es global incluso para source:manual. Los textos introducidos por usuarios se mezclan con catálogo común y son consultables por cualquier cuenta; comprar un nombre libre también crea un producto global.

Un producto manual de la cuenta/prueba A se recuperó por búsqueda en una cuenta B distinta. api-probes.json: globalManualProductVisible. Despensas/listas sí filtran userId; no se encontró un IDOR en esos handlers.

### Files likely affected

- [prisma/schema.prisma](/Users/sergioballesteros/ketohoy/prisma/schema.prisma)
- [src/app/api/products/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/products/route.ts)
- [src/app/api/products/search/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/products/search/route.ts)
- [src/components/AddProductSheet.tsx:120](/Users/sergioballesteros/ketohoy/src/components/AddProductSheet.tsx:120)
- [src/lib/pantryTransfer.ts:22](/Users/sergioballesteros/ketohoy/src/lib/pantryTransfer.ts:22)

### Implementation

- [x] Elegir la opción mínima de ownership para manuales y añadir relación/constraint necesaria
- [x] Filtrar todas las lecturas y validar productId al añadir a lista/despensa
- [x] Migrar datos legacy y cubrir dos cuentas más cookie inválida

### Acceptance criteria

- [x] A no puede buscar ni usar manual privado de B
- [x] Catálogo Mercadona sigue compartido; compra manual queda privada
- [x] Migración mantiene referencias sin publicar nombres antiguos por defecto

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [x] Prueba específica — Dos sesiones, crear/buscar/comprar/manual transfer por ambas; probar productId de otro usuario.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-014 — Inicio conserva preferencias y contadores viejos hasta 60 segundos

Status: Completed

Priority: P2  
Area: Frontend / Data  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/`

### Goal

Eliminar esta caché privada si la lectura local es suficientemente barata; si se necesita, invalidar por usuario en los puntos de escritura. Reusar DEFAULT_PREFERENCES.

### Context and evidence

getStats cachea por usuario/tipo de comida durante 60 s sin invalidación por mutación. Su fallback de tiempo es 30 min frente a DEFAULT_PREFERENCES 20 min en generación/sugerencias.

Código de unstable_cache revalidate:60; no invalidación en los handlers leídos. Diferencia literal de defaults. No se midió una ventana cronometrada por cada mutación.

### Files likely affected

- [src/app/page.tsx:35](/Users/sergioballesteros/ketohoy/src/app/page.tsx:35)
- [src/app/api/preferences/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/preferences/route.ts)
- [src/app/api/pantry/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/pantry/route.ts)
- [src/app/api/shopping-list/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/shopping-list/route.ts)

### Implementation

- [x] Medir coste de lectura y elegir eliminar caché o invalidación precisa
- [x] Unificar defaults con la constante existente
- [x] Añadir prueba de preferencia y compra inmediatamente seguidas de inicio

### Acceptance criteria

- [x] La primera visita posterior a guardar/comprar refleja cambios
- [x] Un usuario sin prefs recibe los mismos defaults en inicio, recetas y plan

### Verification

- [x] Desktop — recorrer `/` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Cambiar avoidFish, volver a / sin esperar un minuto y verificar receta/contador; repetir en dos usuarios.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Evidence: 30 lecturas con scoring, p50 2.63 ms / p95 8.64 ms (67 recetas); caché eliminada. Before dos E2E fallan por pescado/contador stale; after 4 E2E con setup pasan. Defaults 20 min y aislamiento de dos usuarios probados con BD real; 18 tests específicos, TypeScript/lint/build pasan. Sin cambio de layout ni movimiento; suite global verifica inicio a 320/390 sin overflow; teclado/motion sin cambios en este finding, sin dispositivo físico/Safari/AT.

## KH-015 — “Disponible” significa coincidencia de nombre, no ingredientes suficientes

Status: Completed

Priority: P2  
Area: Data / UX  
Effort: M  
Depends on: KH-005  
Confidence: Confirmado  
Route: `/; /meals; /recipes/:id; /weekly-plan`

### Goal

Priorizar ID y equivalencias explícitas; fallback por tokens completos y diferencias alimentarias relevantes. Hasta implementar cantidades, decir “ingredientes presentes” y “te faltan X”, sin prometer suficiente stock. No construir una ontología universal.

### Context and evidence

Matching acepta subcadenas en ambas direcciones; disponibilidad solo usa IDs/nombres, no cantidad/caducidad. El umbral 0.6 del conteo de recetas tampoco equivale a todos los ingredientes.

ingredientMatchesProduct puede aceptar Sal ↔ Salmón y Leche ↔ Leche de almendras por código. Se trazaron callers en scoring, detalle y faltantes. Los ejemplos son entradas sintéticas, no un usuario afectado observado.

### Files likely affected

- [src/lib/ingredientMatching.ts:5](/Users/sergioballesteros/ketohoy/src/lib/ingredientMatching.ts:5)
- [src/lib/recipeAvailability.ts](/Users/sergioballesteros/ketohoy/src/lib/recipeAvailability.ts)
- [src/lib/recipeScoring.ts](/Users/sergioballesteros/ketohoy/src/lib/recipeScoring.ts)
- [src/components/HomePageClient.tsx](/Users/sergioballesteros/ketohoy/src/components/HomePageClient.tsx)

### Implementation

- [x] Corregir el helper compartido y sus casos de equivalencia actuales
- [x] Separar métrica de presencia de disponibilidad completa
- [x] Actualizar copy y pruebas de scoring, receta y compra

### Acceptance criteria

- [x] Sal no cubre salmón; leche vegetal no cubre automáticamente lácteo
- [x] Copy distingue presencia, cantidad desconocida y preparación lista
- [x] Todos los callers usan el mismo matching corregido

### Verification

- [x] Desktop — recorrer `/; /meals; /recipes/:id; /weekly-plan` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Probar IDs diferentes, tildes/plurales, productos parecidos, stock 0 y caducado; documentar cuáles se soportan.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Implementation evidence (2026-10-04): Contrato único ingredientAvailability/recipeAvailability con sufficient, insufficient, unknown y missing; ID prioritario, tokens normalizados/equivalencia explícita, expiración DateTime y suma compatible solo por productId+usuario. Scoring conserva ranking por presencia; solo ready permite claim de suficiencia. Inicio, recetas, detalle, plan/sustitución y faltantes consumen el mismo contrato. Regresión sal/salmón falla antes y pasa después (audit-assets/kh-015-before.log). 22 tests nuevos de matching/disponibilidad más 13 de scoring; cuatro E2E nuevos a 320/390/768/1280. Suite final 36 archivos/278 unit-integration y 71/71 E2E en paralelo, sin skipped. TypeScript/build/lint afectados/diff check pasan; lint global solo tres errores previos en audit-assets/api-probes.cjs intacto. Enter/Space, labels, foco visible y edición verificados; checkbox Keyboard completo queda abierto por retorno del sheet de alta KH-019, deliberadamente pendiente. Sin Safari/dispositivo físico/AT. Contrato y evidencias en IMPLEMENTATION-PROGRESS.md y audit-assets/kh-005/CONTRACT.md. KH-027 no implementado.

## KH-016 — Reañadir a despensa ignora la cantidad solicitada

Status: Completed

Priority: P2  
Area: Backend / UX  
Effort: S  
Depends on: KH-005  
Confidence: Confirmado  
Route: `POST /api/pantry; /inventory`

### Goal

Definir alta idempotente de presencia y edición explícita de cantidad. Devolver indicador ya existente y ofrecer Editar; si se elige incrementar, solo con unidad compatible y operación atómica.

### Context and evidence

Cuando productId ya existe, POST devuelve la fila existente sin aplicar quantity/unit. El flujo transmite éxito sin explicar si incrementa, reemplaza o solo confirma presencia.

Rama existing del handler; búsqueda Mercadona muestra En casa y bloquea otra alta, pero API/undo pueden entrar por la otra rama. El happy path editar sí persistió de 3 a 5 kg.

### Files likely affected

- [src/app/api/pantry/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/pantry/route.ts)
- [src/components/AddProductSheet.tsx:120](/Users/sergioballesteros/ketohoy/src/components/AddProductSheet.tsx:120)

### Implementation

- [x] Documentar semántica de POST sin mezclarla con PATCH
- [x] Devolver estado created/existing y adaptar feedback
- [x] Probar undo cuando otra pestaña ya ha reañadido el producto

### Acceptance criteria

- [x] Repetir alta no comunica una cantidad que no se guardó
- [x] Editar conserva cantidad/unidad y el mensaje explica el resultado

### Verification

- [x] Desktop — recorrer `POST /api/pantry; /inventory` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Alta de mismo productId con 3 y luego 5; comprobar contrato y UI; usar PATCH para edición.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Implementation evidence (2026-10-04): POST transaccional devuelve outcome=created (201) o existing (200), siempre con stock efectivo y product; existing nunca reemplaza/incrementa cantidad. Helper compartido con alta Mercadona; PATCH sigue siendo edición. Feedback de alta repetida y undo concurrente conserva stock y ofrece Editar. Cuatro tests API nuevos y cuatro E2E nuevos a 320/390/768/1280; alta 3 kg/repetición 5 kg/PATCH 5 kg y undo tras reañadir 7 kg pasan. Suite final 36 archivos/278 unit-integration y 71/71 E2E en paralelo, sin skipped. TypeScript/build/lint afectados/diff check pasan; lint global solo tres errores previos en audit-assets/api-probes.cjs intacto. Enter/Space, labels, foco visible y edición verificados; checkbox Keyboard completo queda abierto por retorno del sheet de alta KH-019, deliberadamente pendiente. Sin Safari/dispositivo físico/AT. Contrato y evidencias en IMPLEMENTATION-PROGRESS.md y audit-assets/kh-005/CONTRACT.md. KH-027 no implementado.

## KH-017 — Preferencias pierden cambios y pueden confirmar una versión anterior

Status: Completed

Priority: P2  
Area: UX / Frontend  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/preferences`

### Goal

Guardar automáticamente con estado fiable o mantener botón y dirty state claro. Versión enviada vs actual; deshabilitar controles brevemente es la alternativa mínima. Advertir únicamente si hay cambios reales al salir.

### Context and evidence

Se guardan manualmente, pero no hay dirty state ni advertencia al salir. Durante await PATCH siguen editables; setSaved(true) confirma el snapshot enviado aunque los controles ya representen otro.

handleSave serializa prefs antes de await y luego marca saved sin comparar versiones. Controles no dependen de saving. Riesgo confirmado por código; carrera con servidor lento pendiente de prueba visual.

### Files likely affected

- [src/app/preferences/page.tsx:64](/Users/sergioballesteros/ketohoy/src/app/preferences/page.tsx:64)

### Implementation

- [x] Conservar snapshot guardado y derivar dirty; evitar flags que se contradicen
- [x] Bloquear edición durante save o comparar revisión antes de saved
- [x] Cubrir navegación, fallo y edición durante respuesta lenta

### Acceptance criteria

- [x] Guardado siempre corresponde a valores visibles
- [x] Salir con cambios comunica pérdida o persiste antes de salir
- [x] Error conserva cambios para reintentar

### Verification

- [x] Desktop — recorrer `/preferences` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Demorarlo 1 s, cambiar dos restricciones entre envío/respuesta y recargar; probar salida con teclado.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Evidence: snapshot persistido, dirty derivado; carrera PATCH antes falla con saved falso y después pasa. Error/retry, enlaces por teclado y back cancelar/aceptar, clean sin warning: 6 E2E con setup pasan, 320/390/1280 y reduce a 320. TypeScript/lint pasan. Chromium; sin Safari/dispositivo físico/AT.

## KH-018 — Borrar búsqueda deja un spinner activo para siempre

Status: Completed

Priority: P2  
Area: Frontend / UX  
Effort: XS  
Depends on: —  
Confidence: Confirmado  
Route: `Diálogo Añadir en /inventory y /shopping-list`

### Goal

Al cancelar/limpiar restablecer estado de búsqueda y abortar request; no añadir un hook genérico para este caso.

### Context and evidence

El cleanup marca cancelled y el finally ya no apaga searching. El efecto siguiente retorna si la consulta tiene menos de dos caracteres y tampoco lo restablece.

Prueba local con búsqueda de 650 ms: escribir pollo, esperar inicio, borrar; después de completar request sigue un .animate-spin. interaction-probes.json: stuckSpinner:1.

### Files likely affected

- [src/components/AddProductSheet.tsx:60](/Users/sergioballesteros/ketohoy/src/components/AddProductSheet.tsx:60)

### Implementation

- [x] Restablecer searching en rama corta y gestionar request cancelado
- [x] Añadir un caso de borrar durante request
- [x] Verificar ambos destinos del sheet

### Acceptance criteria

- [x] Consulta vacía/corta nunca conserva spinner ni resultados antiguos
- [x] Abortar no muestra error ni “sin resultados” de la consulta anterior

### Verification

- [x] Desktop — recorrer `Diálogo Añadir en /inventory y /shopping-list` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Buscar con delay, borrar antes de recibir, esperar más que el delay y volver a buscar.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.


Evidencia: regresión previa en ambos destinos conserva un spinner al acortar; después clear/vacía/corta invalidan generación y abortan, sin resultados/error obsoletos. Dos E2E específicos pasan; ocho pruebas KH-009 siguen pasando. Ver IMPLEMENTATION-PROGRESS.md y audit-assets/kh-018-020/search-before.log. Sin Safari, dispositivo físico ni lector de pantalla real.

## KH-019 — Cerrar el sheet devuelve el foco a BODY

Status: Completed

Priority: P2  
Area: Accessibility / Frontend  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `Diálogo Añadir`

### Goal

Capturar el elemento disparador antes de montar (en caller/ref) y devolver foco si sigue conectado. Un único responsable del foco inicial; conservar trap, ESC y scroll lock.

### Context and evidence

Sheet captura document.activeElement en useEffect después del autoFocus del input hijo. Al cerrar intenta enfocar ese nodo desmontado, no el botón que abrió el diálogo.

Tab durante 20 pasos permaneció dentro. Tras enfocar Añadir, abrir y ESC, esperar desmontaje + 300 ms: activeElement BODY. second-pass-probes.json e interaction-probes.json.

### Files likely affected

- [src/components/Sheet.tsx:46](/Users/sergioballesteros/ketohoy/src/components/Sheet.tsx:46)
- [src/components/AddProductSheet.tsx:194](/Users/sergioballesteros/ketohoy/src/components/AddProductSheet.tsx:194)

### Implementation

- [x] Eliminar conflicto autoFocus vs captura del trigger
- [x] Restaurar foco explícitamente en cleanup al nodo conectado
- [x] Añadir prueba en Añadir, editar y detalle producto

### Acceptance criteria

- [x] ESC, X y overlay devuelven foco al disparador vivo
- [x] Tab/Shift+Tab quedan dentro; eliminación enfoca alternativa válida si trigger desaparece

### Verification

- [x] Desktop — recorrer `Diálogo Añadir` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Abrir con Enter/Space, Tab/Shift+Tab, cerrar de tres formas y comprobar activeElement con motion normal/reducida.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.


Evidencia: cuatro regresiones previas terminan en BODY tras Escape; después Sheet captura antes del foco inicial, restaura trigger usable o destino vecino/CTA al desmontar. Cuatro E2E del componente real verifican Escape/X/backdrop, Tab/Shift+Tab, foco inicial/contención, guardar/quitar y 320/390/768/1280, reduce a 320. Foco de fila de compra eliminada usa vecinos/CTA. KH-040 conserva sus salidas actuales; no se rediseña animación. Ver IMPLEMENTATION-PROGRESS.md y audit-assets/kh-018-020/focus-before.log. Sin Safari, dispositivo físico ni lector de pantalla real.

## KH-020 — Eliminar/Deshacer tiene errores de red sin recuperación consistente

Status: Completed

Priority: P2  
Area: Frontend / UX  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/inventory; /shopping-list`

### Goal

Capturar cada operación desde su inicio, validar HTTP y mostrar error con retry. Mantener snapshot local hasta confirmar; no cerrar edición como éxito antes de conocer resultado. Reusar el wrapper actual.

### Context and evidence

Remove de despensa no captura rechazo de fetch; se invoca void y cierra el diálogo. Los callbacks Deshacer de ambos flujos no comprueban res.ok ni capturan errores. Compra inicia promesa antes de esperar salida 140 ms y captura tarde.

Lectura de remove/undoable y del callback onRemove. El happy path de Deshacer restauró 5 kg; eso no cubre 500/offline. Rechazo no manejado concreto en la salida de compras necesita verificación de timing.

### Files likely affected

- [src/app/inventory/page.tsx:71](/Users/sergioballesteros/ketohoy/src/app/inventory/page.tsx:71)
- [src/app/shopping-list/page.tsx:105](/Users/sergioballesteros/ketohoy/src/app/shopping-list/page.tsx:105)
- [src/app/inventory/PantryItemSheet.tsx](/Users/sergioballesteros/ketohoy/src/app/inventory/PantryItemSheet.tsx)

### Implementation

- [x] Comprobar res.ok y catch en ambos callbacks de undo
- [x] Resolver promesa de request con manejador inmediato durante salida
- [x] Añadir pruebas de DELETE y POST fallidos y fallo tras navegación

### Acceptance criteria

- [x] 500/offline al quitar o deshacer produce mensaje y conserva opción de recuperación
- [x] Ninguna promesa rechazada queda sin manejar
- [x] No se anuncia restaurado sin persistencia

### Verification

- [x] Desktop — recorrer `/inventory; /shopping-list` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Interceptar local DELETE/undo con abort y 500; comprobar filas, toast, recarga y consola.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.


Evidencia: cuatro E2E previos fallan por cierre prematuro/sin retry; tres pruebas de API previas reproducen retry aditivo/duplicado de undo. Después 19 nuevos E2E y cuatro integration cubren recuperación, HTTP 400/401/403/404/409/500, red, doble acción, retry, pérdida de respuesta tras commit, cantidades nuevas, refresco obsoleto y navegación/sheet nuevo. Undo manual explícito restore conserva fila efectiva; KH-016/KH-005/KH-027 y compra/delta/historial siguen pasando. Ver IMPLEMENTATION-PROGRESS.md y audit-assets/kh-005/CONTRACT.md. Sin Safari, dispositivo físico ni lector de pantalla real.

## KH-021 — Recuperación enumera cuentas cuando falla el correo

Priority: P2  
Area: Security / Backend  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `POST /api/auth/forgot`

### Goal

Contrato externo idéntico aun si falla el proveedor y registro interno del error. Conservar respuesta genérica; elegir retry operativo mínimo y no una cola nueva sin necesidad. Evaluar tiempos con un proveedor simulado.

### Context and evidence

La respuesta supuestamente uniforme solo lo es si el envío funciona. Para cuenta existente se espera sendPasswordResetEmail, cuyo error se convierte en 500; para inexistente se responde 200.

Sin RESEND_API_KEY en entorno local: email del usuario de prueba 500; email inexistente 200. No se enviaron correos externos. Diferencia de tiempos 12/6 ms no demuestra canal temporal general.

### Files likely affected

- [src/app/api/auth/forgot/route.ts:15](/Users/sergioballesteros/ketohoy/src/app/api/auth/forgot/route.ts:15)
- [src/lib/authMail.ts](/Users/sergioballesteros/ketohoy/src/lib/authMail.ts)
- [src/lib/mailer.ts](/Users/sergioballesteros/ketohoy/src/lib/mailer.ts)

### Implementation

- [ ] Capturar fallo de entrega dentro del flujo y mantener respuesta uniforme
- [ ] Añadir tests de proveedor caído y cuenta inexistente
- [ ] Documentar recuperación/retry y alertar por fallos de envío

### Acceptance criteria

- [ ] Existente/inexistente tienen mismo status/body con proveedor OK o caído
- [ ] Fallo se observa internamente sin exponer email/token
- [ ] La entrega real sigue verificándose en staging

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Mock de Resend devuelve 500/timeout; comparar respuesta a dos tipos de email, sin envío real.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-022 — Hay advisories que requieren actualización selectiva y análisis de alcance

Priority: P2  
Area: Security / Architecture  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `Dependencias y build`

### Goal

Actualizar parches compatibles de Next/tooling, revisar transitivas por ruta alcanzable y mantener lockfile. Leer guía local Next correspondiente, ejecutar checks y comparar advisories restantes.

### Context and evidence

npm audit devuelve 17 alertas (1 critical, 8 high, 8 moderate). El recuento no equivale a 17 vías explotables. Next 16.3.4 está en rango vulnerable de ImageResponse; Vitest y varias transitivas son principalmente tooling.

audit-assets/dependency-audit.json. Advisory oficial GHSA-vcvr-r3jv-pc5j afecta next/og Node con SVG controlado por atacante y se corrige en 16.3.6; no se encontró ImageResponse ni next/og en esta app. Vitest 4.1.9 también tiene advisory de dev server/mocker.

### Files likely affected

- [package.json](/Users/sergioballesteros/ketohoy/package.json)
- [package-lock.json](/Users/sergioballesteros/ketohoy/package-lock.json)

### Implementation

- [ ] Revisar advisory oficial y fijar versiones parche compatibles
- [ ] Actualizar lockfile selectivamente, sin force
- [ ] Repetir npm audit y registrar runtime/build/dev + alcance

### Acceptance criteria

- [ ] Cada advisory tiene versión corregida o razón de no alcanzabilidad documentada
- [ ] Build/lint/tests/E2E pasan tras cambios; sin downgrade mayor de Prisma por resolver audit

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Comparar audit antes/después y ejecutar checks completos más páginas SSR y optimización de imágenes.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-023 — Fallback demo y catálogo incompleto parecen datos reales

Priority: P2  
Area: Data / UX / Performance  
Effort: M  
Depends on: —  
Confidence: Confirmado  
Route: `/explore; /api/mercadona/search`

### Goal

Exponer source/fetchedAt/completeness y mensaje discreto; conservar última caché buena ante fallo. No cachear parcial como completo. Permitir seguir manualmente sin inventar disponibilidad.

### Context and evidence

Fallos externos devuelven productos demo con precio sin indicar modo demo al cliente. Promise.allSettled omite subcategorías fallidas y puede cachear un catálogo parcial 12 horas.

Ramas de fallback y cache inspeccionadas. No hubo caída externa durante la visita normal; se distingue este riesgo por código de resultados reales observados. Cold load local observado ~1.8 s no es un SLA.

### Files likely affected

- [src/lib/mercadona.ts:177](/Users/sergioballesteros/ketohoy/src/lib/mercadona.ts:177)
- [src/lib/mercadona.ts:228](/Users/sergioballesteros/ketohoy/src/lib/mercadona.ts:228)
- [src/app/explore/ExploreClient.tsx](/Users/sergioballesteros/ketohoy/src/app/explore/ExploreClient.tsx)

### Implementation

- [ ] Extender respuesta con procedencia y fecha sin framework de caché nuevo
- [ ] Definir criterio mínimo de catálogo completo y TTL corto de error
- [ ] Simular árbol/hojas caídos y verificar fallback visible

### Acceptance criteria

- [ ] Demo/última copia/parcial son distinguibles de datos actuales
- [ ] Un fallo parcial no invalida caché buena durante 12 h
- [ ] Retry conserva consulta y no rompe otras categorías

### Verification

- [ ] Desktop — recorrer `/explore; /api/mercadona/search` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Mock Mercadona 503 en todo y en una hoja; comparar UI, precios y posterior recuperación.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-024 — Importar un producto espera catálogo completo y servicios sin límite de espera

Priority: P2  
Area: Performance / Backend  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/api/mercadona/add; OAuth callback`

### Goal

Normalizar detalle con información disponible/caché sin esperar toda la colección. Usar AbortSignal.timeout y presupuesto explícito por servicio; preservar datos nutricionales buenos ante fallo y revalidarlos con TTL razonable.

### Context and evidence

getMercadonaProduct obtiene detalle pero después espera loadCatalog para contextualizarlo, incluso en un import individual. OFF y token exchange Google no tienen timeout explícito; OFF se repite al añadir incluso productos ya existentes.

Cadena de funciones trazada y fetch leídos. loadCatalog recorre árbol y hojas en lotes de 8; timeout de cada Mercadona request 10 s, no presupuesto total. No se midió timeout real de Google.

### Files likely affected

- [src/lib/mercadona.ts:245](/Users/sergioballesteros/ketohoy/src/lib/mercadona.ts:245)
- [src/lib/openFoodFacts.ts:10](/Users/sergioballesteros/ketohoy/src/lib/openFoodFacts.ts:10)
- [src/app/api/auth/google/callback/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/auth/google/callback/route.ts)

### Implementation

- [ ] Eliminar dependencia obligatoria de loadCatalog en detalle
- [ ] Añadir timeouts y manejar abort sin falsear datos
- [ ] Reusar nutrición existente fresca y cubrir fallos externos

### Acceptance criteria

- [ ] Añadir producto no necesita recorrer todo el catálogo en frío
- [ ] OFF/Google terminan con fallo útil dentro del presupuesto definido
- [ ] Reañadir no borra nutrición conocida si el proveedor falla

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Servicios simulados con respuesta infinita/503; medir request de un producto en frío y repetir alta.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-025 — Restar fibra siempre necesita verificar la convención nutricional de origen

Status: Completed

Priority: P2  
Area: Data / Product  
Effort: M  
Depends on: KH-007  
Confidence: Confirmado: contrato oficial OFF + captura EAN 8480000348654 + regresión antes/después  
Route: `POST /api/mercadona/add`

### Goal

Verificar el contrato del campo OFF y una muestra española representativa; interpretar según semántica demostrada, conservar procedencia y tratar legacy/unknown sin fabricar precisión. Evidencia capturada y fechada en audit-assets/kh-025/.

### Context and evidence

Se calcula max(0,carbohydrates_100g-fiber_100g) sin conservar convención/país/unidad ni distinguir si carbohidratos ya excluyen fibra.

Código confirmado. El Reglamento UE 1169/2011 distingue carbohidratos metabolizables y fibra, mientras OFF recoge etiquetas de distintos orígenes. No se rastreó un EAN concreto hasta su etiqueta: el error numérico real es Needs verification.

### Files likely affected

- [src/app/api/mercadona/add/route.ts:68](/Users/sergioballesteros/ketohoy/src/app/api/mercadona/add/route.ts:68)
- [src/lib/openFoodFacts.ts](/Users/sergioballesteros/ketohoy/src/lib/openFoodFacts.ts)

### Implementation

- [x] Reproducir con payload real y contrato primario del campo antes de implementar (foto de envase no verificada visualmente)
- [x] Añadir fixtures disponibles OFF y total-only/desconocido: total no consumido por KetoHoy, no se añade conversión productiva
- [x] Campo de convención y adaptador inequívoco; actualización verificable solo en importación explícita. Legacy conserva cifras/origen, score 0 y confianza unknown

### Acceptance criteria

- [x] OFF disponibles no resta fibra; total-only no inventa disponibles, porque no existe entrada productiva que consuma ese campo
- [x] Fuente desconocida no resta fibra sin justificación
- [x] Se documenta EAN/payload/URL de foto y schema usados; límite visual de etiqueta explícito

### Verification

- [x] Desktop — Chromium 1280: detalle con 5,9 g/score 4, legacy sin cifra neta fiable; screenshot inspeccionado.
- [x] Mobile — 320 para copy/macros y legacy, 390 en catálogo/despensa existentes; sin overflow.
- [x] Keyboard — Enter abre detalle, Escape cierra y restaura foco; regresiones de catálogo conservan trap Tab/Shift+Tab.
- [x] Reduced motion — emulado a 320 en detalle/nutrición; sin movimiento nuevo.
- [x] Prueba específica — contrato primario OFF + captura real con fibra mayor que carbs; antes 0/5, después 5,9/4. No certificación física de envase.
- [x] Evidencia de cierre — 221 tests completos, 41 específicos, 18 E2E relevantes, TypeScript/build/lint afectados/diff pasan; lint global solo tres errores previos. Migración real en copias únicamente.

Implementation evidence: [matriz y flujo](audit-assets/kh-025/CONTRACT.md), [payload capturado](audit-assets/kh-025/off-8480000348654.json); detalle completo en IMPLEMENTATION-PROGRESS.md. Schema añade nutritionConvention; migración conserva macros/origen OFF, baja score legacy a 0 sin recalcular, UI degrada a unknown hasta reimportación. BD original/producción intactas. KH-005 y KH-015 no implementados.

## KH-026 — El primer uso no guía hasta un resultado completo

Priority: P2  
Area: Product / UX  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `Tras registro → /`

### Goal

Una guía opcional de tres acciones en inicio basada en estados existentes, con saltar/volver y CTA siguiente. Pedir solo restricciones necesarias antes de generar; evitar wizard obligatorio y nuevo modelo de progreso si puede derivarse.

### Context and evidence

Registro entra directamente en inicio. No existe onboarding persistido; preferencias y despensa son pasos dispersos y la recomendación puede aparecer antes de definir restricciones.

Cuenta local nueva recorrió home, preferencias, despensa y plan. Las pantallas tienen empty states, pero no una secuencia que confirme preferencias → menú → compra ni progreso de primera sesión.

### Files likely affected

- [src/components/HomePageClient.tsx](/Users/sergioballesteros/ketohoy/src/components/HomePageClient.tsx)
- [src/app/login/LoginForm.tsx:56](/Users/sergioballesteros/ketohoy/src/app/login/LoginForm.tsx:56)
- [src/app/preferences/page.tsx](/Users/sergioballesteros/ketohoy/src/app/preferences/page.tsx)

### Implementation

- [ ] Derivar estado de prefs/despensa/plan con datos existentes
- [ ] Añadir acciones cortas con enlaces y explicar defaults
- [ ] Validar primer uso con despensa vacía y sin exclusiones

### Acceptance criteria

- [ ] Usuario nuevo ve siguiente acción y puede omitirla
- [ ] Usuario recurrente no recibe una guía repetitiva
- [ ] La guía termina al lograr plan/compra y no bloquea navegación

### Verification

- [ ] Desktop — recorrer `Tras registro → /` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Crear cuenta aislada y completar preferencias, un producto, menú y compra; repetir login y probar omisión.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-027 — No hay acción de compra para el menú semanal completo

Status: Completed

Priority: P2  
Area: Product / UX  
Effort: M  
Depends on: KH-005, KH-006  
Confidence: Confirmado  
Route: `/weekly-plan`

### Goal

Después del contrato de cantidades, CTA “Preparar compra de esta semana” con resumen y confirmación de necesidades/paquetes. Un endpoint agregado idempotente por plan y revisión, sin 28 requests cliente.

### Context and evidence

Cada plato ofrece añadir faltantes por separado. El plan de 28 comidas no tiene operación agregada de lista, pese a que la landing relaciona menú semanal y compra de lo que falta.

Inspección de UI/API y recorrido real del plan. No se encontró endpoint por plan; cada llamada de receta suma 1 por ingrediente y repetir plato vuelve a sumar.

### Files likely affected

- [src/app/weekly-plan/page.tsx](/Users/sergioballesteros/ketohoy/src/app/weekly-plan/page.tsx)
- [src/app/api/recipes/[id]/add-to-shopping-list/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/recipes/[id]/add-to-shopping-list/route.ts)

### Implementation

- [x] Reusar cálculo de faltantes común y agregar por unidad compatible
- [x] Registrar origen plan/revisión para deduplicación
- [x] Añadir CTA y resumen confirmado, con edición de paquetes en la lista existente

### Acceptance criteria

- [x] Una acción resume necesidades de los 28 slots y descuenta stock según contrato
- [x] Repetir acción no duplica; cambiar un plato actualiza solo su contribución
- [x] El usuario ve cantidades desconocidas y puede resolver envases

### Verification

- [x] Desktop — `/weekly-plan` a 1280: resultado, persistencia y feedback comprobados; no pageerrors nuevos. 1440 no probado en esta tanda.
- [x] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [x] Keyboard — CTA nativo con Enter/Space, foco visible y busy/status comprobados. Sin modal nuevo; retorno de foco de sheets existentes sigue fuera de scope (KH-019).
- [x] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [x] Prueba específica — Plan con recetas repetidas, stock parcial, sustitución de un plato y doble click; comprobar lista tras reload.
- [x] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

Implementation evidence: cierre local 2026-10-05. Endpoint agregado, stock virtual determinista, agregación compatible y metadata por slot; fingerprint estable, retry/concurrencia/swap/regeneración, manuales/legacy/history conservados y rollback real. Plan parcial bloqueado 422. 32 tests KH-027 (15 pure + 16 API + 1 migración), npm test 310/310 en 39 archivos; E2E completo 76/76 (5 nuevos) con cinco workers, Chrome instalado mediante config temporal (Chromium headless descargado ausente). 320/390/768/1280, Enter/Space/foco/status y reduce a 320 verificados; sin dispositivo físico/AT/Safari. TypeScript/build/lint afectados/diff check pasan; lint global solo tres errores previos api-probes.cjs intacto. Migración aditiva nullable solo en copias; original/producción intactas. Contrato y límites (sin consumo histórico inferido, fuentes individuales previas separadas, legacy ambiguo conservado, undo snapshot actual) en audit-assets/kh-005/CONTRACT.md e IMPLEMENTATION-PROGRESS.md.

## KH-028 — La lista no se puede consultar tras recarga sin conexión

Priority: P2  
Area: Mobile / Product  
Effort: M  
Depends on: —  
Confidence: Confirmado  
Route: `/shopping-list; manifest`

### Goal

Primero snapshot local privado de SOLO lectura con fecha y aviso “Sin conexión”. Borrarlo al logout/cambio de cuenta. No prometer sincronización offline de compras sin diseñar conflicto/delta; evitar PWA completa si no hace falta.

### Context and evidence

Hay manifest standalone e iconos, pero no service worker ni copia persistida de la lista. Tras recarga offline fetch falla y no hay datos recuperables; una pestaña ya cargada conserva estado solo en memoria.

Código de carga y búsqueda de soporte offline/SW: no implementado. Escenario por código; no se simuló radio/operador real ni instalación iOS. Manifest no prueba por sí solo experiencia offline.

### Files likely affected

- [src/app/shopping-list/page.tsx](/Users/sergioballesteros/ketohoy/src/app/shopping-list/page.tsx)
- [src/app/manifest.ts](/Users/sergioballesteros/ketohoy/src/app/manifest.ts)
- [src/app/layout.tsx](/Users/sergioballesteros/ketohoy/src/app/layout.tsx)

### Implementation

- [ ] Guardar snapshot por cuenta tras respuesta válida y limpiar al logout
- [ ] Distinguir offline, datos antiguos y retry
- [ ] Cubrir primer uso offline y cambio de sesión; evaluar SW solo si instalación es objetivo real

### Acceptance criteria

- [ ] Recargar offline muestra última lista con fecha y estado claro
- [ ] No se anuncia compra persistida sin red
- [ ] Logout/cambio de cuenta elimina acceso al snapshot previo

### Verification

- [ ] Desktop — recorrer `/shopping-list; manifest` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Cargar lista, desconectar, recargar y volver online; cerrar sesión y entrar con otro usuario sin ver datos anteriores.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-029 — La despensa grande no tiene búsqueda de lo que ya está en casa

Priority: P2  
Area: UX / Mobile  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/inventory`

### Goal

Filtro local sencillo por nombre sobre items ya cargados, recuento y limpiar; sin buscador externo/virtualización hasta medir necesidad. Mantener nombre completo en sheet.

### Context and evidence

La única búsqueda está dentro de Añadir para Mercadona. Las filas actuales se agrupan, pero no se filtran por texto; nombres largos se truncan.

Inventario renderiza groups completo; no input/filtro de items existentes. Validación con lista enorme en dispositivo real pendiente; no se demostró lentitud computacional.

### Files likely affected

- [src/app/inventory/page.tsx:25](/Users/sergioballesteros/ketohoy/src/app/inventory/page.tsx:25)

### Implementation

- [ ] Añadir search input etiquetado y normalización existente
- [ ] Filtrar antes de agrupar, mostrando recuento filtrado/total
- [ ] Probar nombres largos, coincidencias y cero resultados

### Acceptance criteria

- [ ] Buscar nombre/tildes encuentra stock sin request externo
- [ ] Vacío filtrado explica cómo limpiar y no parece despensa vacía
- [ ] Focus y scroll no se pierden al editar una fila

### Verification

- [ ] Desktop — recorrer `/inventory` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Fixture de 150 productos en BD desechable, 320/390 px y teclado; editar resultado y limpiar filtro.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-030 — Cuenta, exportación y retención necesitan un contrato operativo

Priority: P2  
Area: Data / Product  
Effort: M  
Depends on: KH-013  
Confidence: Confirmado  
Route: `/preferences; /legal`

### Goal

Definir retención y procedimiento mínimo documentado de exportar/borrar con verificación de identidad y cascadas; puede empezar con script administrativo auditado. UI autocontenida cuando soporte lo necesite. Incluir copias y catálogo manual privado.

### Context and evidence

No hay flujo de eliminación/exportación de cuenta. Legal local remite a contacto manual; expiración de sesiones/tokens limita uso, pero no se encontró purga de filas expiradas ni retención concreta de backups/logs.

Rutas/schema revisados. Almacena email, hash de contraseña, Google ID, verificaciones, aceptación de términos/adulto, sesiones, tokens, preferencias, despensa, lista y planes. No se verificó infraestructura/contratos de encargados.

### Files likely affected

- [src/app/preferences/page.tsx](/Users/sergioballesteros/ketohoy/src/app/preferences/page.tsx)
- [src/app/legal/page.tsx](/Users/sergioballesteros/ketohoy/src/app/legal/page.tsx)
- [prisma/schema.prisma](/Users/sergioballesteros/ketohoy/prisma/schema.prisma)
- [src/lib/auth.ts](/Users/sergioballesteros/ketohoy/src/lib/auth.ts)

### Implementation

- [ ] Documentar categorías, destino, plazo y responsable operativo
- [ ] Crear procedimiento mínimo probado en copia de BD, no borrado automático no revisado
- [ ] Si se añade self-service, reautenticar y confirmar impacto real

### Acceptance criteria

- [ ] Cuenta de prueba puede exportarse/borrarse sin afectar otra
- [ ] Se explica plazo de desaparición de copias y datos que se conservan
- [ ] Sesiones/tokens caducados se purgan con regla verificable

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Dos cuentas en staging: exportar y borrar una, revisar tablas relacionadas, sesiones y política de backup.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-031 — Faltan señales operativas del flujo crítico

Priority: P2  
Area: Architecture / Product  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `APIs, integración, activación`

### Goal

Logs estructurados mínimos con operación, requestId, status, latencia y proveedor; redacción de email/token/cookie y sin ingredientes personales. Contadores agregados de registro→plan→compra con decisión de privacidad. Empezar por salud/fallos, no SDK pesado.

### Context and evidence

Hay console.error/warn y logs PM2, pero no IDs de request, métricas de fallos/latencia, error tracking ni eventos de activación encontrados. Home incluso convierte fallos en vacío.

Búsqueda de analytics/monitoring y revisión de manejo de errores. No se accedió a panel externo de observabilidad ni se concluye que el servidor no tenga alertas fuera del repo.

### Files likely affected

- [src/lib/apiError.ts:37](/Users/sergioballesteros/ketohoy/src/lib/apiError.ts:37)
- [src/lib/mercadona.ts](/Users/sergioballesteros/ketohoy/src/lib/mercadona.ts)
- [src/lib/mailer.ts](/Users/sergioballesteros/ketohoy/src/lib/mailer.ts)
- [.github/workflows/deploy.yml](/Users/sergioballesteros/ketohoy/.github/workflows/deploy.yml)

### Implementation

- [ ] Usar un punto central de error y envolver integraciones con métricas simples
- [ ] Añadir requestId no sensible y política de redacción
- [ ] Documentar alertas y quién responde; revisar necesidad de analytics antes de instalar tracker

### Acceptance criteria

- [ ] Un 500 se correlaciona con operación y proveedor sin datos privados
- [ ] Se distinguen demo/partial/timeout y fallo de correo
- [ ] Se dispone de recuentos de éxito/fallo de generar y comprar

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Provocar fallo local de compra/correo/catálogo y localizar la señal; comprobar que logs no contienen tokens ni email.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-032 — Una caída de datos se convierte en inicio vacío o receta 404

Priority: P2  
Area: Backend / UX  
Effort: S  
Depends on: KH-014  
Confidence: Confirmado  
Route: `/; /recipes/:id`

### Goal

Distinguir not found de fallo técnico y registrar/presentar error con retry. Mantener datos previos cuando existan; no convertir outage en 404/ceros.

### Context and evidence

getStats captura cualquier error y devuelve EMPTY_STATS. getRecipe captura y devuelve null; error técnico se parece a inexistencia, aunque el layout también consulta existencia.

Catch de ambas funciones leído. No se apagó la BD del usuario ni se provocó outage en producción. Hay error boundary y UI de retry general, pero estos catch evitan llegar a ella.

### Files likely affected

- [src/app/page.tsx:121](/Users/sergioballesteros/ketohoy/src/app/page.tsx:121)
- [src/app/recipes/[id]/page.tsx:24](/Users/sergioballesteros/ketohoy/src/app/recipes/[id]/page.tsx:24)
- [src/app/error.tsx](/Users/sergioballesteros/ketohoy/src/app/error.tsx)

### Implementation

- [ ] Eliminar catch indiscriminado o devolver resultado discriminado
- [ ] Reusar boundary/estado de error existentes
- [ ] Añadir tests de not found vs excepción de BD

### Acceptance criteria

- [ ] Error de BD muestra recuperación y no “despensa vacía”
- [ ] Receta inexistente sigue 404; fallo de consulta da error técnico
- [ ] El fallo no permanece cacheado como éxito

### Verification

- [ ] Desktop — recorrer `/; /recipes/:id` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Mock de consulta falla en home y receta; comprobar mensaje, status, logs y posterior recuperación.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-033 — Validación de productos y referencias deja llegar errores evitables a BD/UI

Priority: P2  
Area: Backend / Data  
Effort: S  
Depends on: KH-001, KH-013  
Confidence: Confirmado  
Route: `POST /api/products; POST /api/shopping-list`

### Goal

Enum compartida, límites razonables, números finitos no negativos y validación de referencias/propietario antes de escribir. Guardar imageUrl solo de fuentes permitidas o manejar imagen inválida con fallback.

### Context and evidence

Campos category/source son strings libres y cantidades/nutrición/precio/longitudes no tienen límites de dominio suficientes. Crear compra con productId inexistente llega a FK y devuelve 500, no un error de cliente.

Prueba local de productId inexistente devuelve 500. Zod permite URLs/strings que después no encajan con remotePatterns; el crash por imagen host no permitido no se reprodujo y se marca riesgo.

### Files likely affected

- [src/app/api/products/route.ts:6](/Users/sergioballesteros/ketohoy/src/app/api/products/route.ts:6)
- [src/app/api/shopping-list/route.ts:8](/Users/sergioballesteros/ketohoy/src/app/api/shopping-list/route.ts:8)
- [next.config.ts](/Users/sergioballesteros/ketohoy/next.config.ts)

### Implementation

- [ ] Endurecer esquemas existentes en fronteras, sin duplicar tipos por pantalla
- [ ] Validar existencia/ownership antes de FK
- [ ] Cubrir inputs largos, Unicode, NaN/negativos y URL fuera de allowlist

### Acceptance criteria

- [ ] Producto/referencia inválidos dan 400/404 sin escribir
- [ ] No se admiten valores negativos, tags/nombres ilimitados o source reservado de usuario
- [ ] URL no soportada no tumba la página

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Enviar requests inválidos a copia local, revisar status/tablas y cargar la UI con fallback de imagen.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-034 — La integridad depende de findFirst donde faltan constraints de dominio

Priority: P2  
Area: Data / Architecture  
Effort: M  
Depends on: —  
Confidence: Riesgo por schema; carrera concreta Needs verification  
Route: `SQLite modelos de usuario`

### Goal

Definir claves de dominio, detectar y reconciliar duplicados antes de migrar, añadir constraints apropiadas y upsert. Resolver registros legacy con userId null conscientemente.

### Context and evidence

No hay unicidad por userId en preferencias, por user/product en despensa, por user/week en plan ni plan/day/type en comidas. Código comprueba/crea con findFirst. Las transacciones actuales protegen algunos caminos pero no expresan el contrato en BD.

Schema verificado. Tres GET concurrentes de preferencias crearon una sola fila y cinco incrementos de compra conservaron cantidad: NO se reprodujo duplicación/pérdida; es riesgo de integridad al crecer caminos/imports.

### Files likely affected

- [prisma/schema.prisma](/Users/sergioballesteros/ketohoy/prisma/schema.prisma)
- [src/app/api/preferences/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/preferences/route.ts)
- [src/app/api/pantry/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/pantry/route.ts)
- [src/app/api/weekly-plan/generate/route.ts](/Users/sergioballesteros/ketohoy/src/app/api/weekly-plan/generate/route.ts)

### Implementation

- [ ] Auditar duplicados en copia y elegir reglas de merge
- [ ] Añadir constraints y adaptar escrituras a upsert/transacciones
- [ ] Probar dos pestañas, import y migración con duplicados intencionados

### Acceptance criteria

- [ ] BD rechaza duplicados que contradicen contrato
- [ ] Migración conserva referencias y decide legacy
- [ ] Operaciones concurrentes devuelven estado válido sin 500 inesperados

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Inserciones concurrentes desde clientes separados y SQL directo en BD temporal; comparar cardinalidad.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-035 — El baseline puede marcar una migración nueva sin ejecutar su DDL

Priority: P1  
Area: Data / Architecture  
Effort: S  
Depends on: KH-011  
Confidence: Riesgo confirmado por código; schema VPS Needs verification  
Route: `Primer deploy de BD legacy`

### Goal

Baseline únicamente snapshot histórico exacto conocido; comprobar columnas/schema antes. Ejecutar normalmente migraciones posteriores y fallar antes de activar release si no coincide.

### Context and evidence

Si hay UserPreferences y no _prisma_migrations, se marcan TODAS las carpetas de migración como applied. Esa presencia no demuestra que el schema legacy incluya columnas de una migración recién añadida.

Bucle migrate resolve --applied sobre prisma/migrations/* y nueva migración de términos presente en checkout. No se inspeccionó schema vivo del VPS: condición de producción Needs verification.

### Files likely affected

- [.github/workflows/deploy.yml:68](/Users/sergioballesteros/ketohoy/.github/workflows/deploy.yml:68)
- [prisma/migrations/20261002100000_terms_acceptance/migration.sql](/Users/sergioballesteros/ketohoy/prisma/migrations/20261002100000_terms_acceptance/migration.sql)

### Implementation

- [ ] Fijar lista/snapshot de baseline histórico y verificar schema esperado
- [ ] Ensayar migrate deploy en copia legacy y actual
- [ ] Separar migración de activación del release y documentar recuperación

### Acceptance criteria

- [ ] BD legacy sin columnas nuevas las recibe mediante DDL
- [ ] BD ya migrada no reejecuta DDL
- [ ] Estado desconocido aborta con diagnóstico, sin marcar todas applied

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Fixtures de BD sin historia con/sin columnas de términos; comprobar schema e historial final.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-036 — Los backups solo se crean al desplegar y no tienen prueba de restauración

Priority: P2  
Area: Data / Architecture  
Effort: S  
Depends on: —  
Confidence: Needs verification en host; cobertura del repo confirmada  
Route: `Operación SQLite`

### Goal

Definir RPO/RTO con el propietario, copia consistente periódica y destino separado; verificar restore en entorno desechable. No añadir infraestructura distribuida para una sola SQLite.

### Context and evidence

Workflow hace .backup antes de migrar y conserva diez copias por número de deploy. No se encontró programación independiente ni ensayo automatizado de restore; datos nuevos entre despliegues no entran en esas copias.

Backup sí existe y falla de forma segura si falta sqlite3: fortaleza. Frecuencia adicional/offsite del VPS no comprobada; no se afirma inexistencia fuera del repo.

### Files likely affected

- [.github/workflows/deploy.yml:54](/Users/sergioballesteros/ketohoy/.github/workflows/deploy.yml:54)
- [docs/deployment-proxy.md](/Users/sergioballesteros/ketohoy/docs/deployment-proxy.md)

### Implementation

- [ ] Inventariar primero backups existentes del host
- [ ] Configurar mecanismo mínimo independiente de deploy si falta
- [ ] Documentar y ensayar restore sin tocar producción

### Acceptance criteria

- [ ] Frecuencia/retención/destino y responsable están documentados
- [ ] Restore de muestra supera integrity_check y login/lecturas básicas
- [ ] Copias cifradas/restringidas según datos que contienen

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Restaurar copia en directorio aislado, integrity_check, recuentos y sesión de prueba; medir tiempos reales.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-037 — El salto a un día sigue animado con reduced motion

Priority: P2  
Area: Motion / Accessibility  
Effort: XS  
Depends on: —  
Confidence: Confirmado  
Route: `/weekly-plan`

### Goal

Consultar matchMedia en el handler y usar auto para reduce. Mantener smooth normal si ayuda a conservar contexto y mover/indicar foco de forma predecible.

### Context and evidence

El handler usa scrollIntoView({behavior:“smooth”}) explícito. El CSS global de reduced motion no elimina ese movimiento JS.

Con prefers-reduced-motion:reduce, scrollY muestreado cada 70 ms: 4.5→71→230→611.5→1316→1681→1919→2086.5. Animación observada durante ~560 ms.

### Files likely affected

- [src/app/weekly-plan/page.tsx:192](/Users/sergioballesteros/ketohoy/src/app/weekly-plan/page.tsx:192)
- [src/app/globals.css](/Users/sergioballesteros/ketohoy/src/app/globals.css)

### Implementation

- [ ] Reusar comprobación reduced motion ya existente en Sheet/compra
- [ ] Elegir behavior auto o smooth según preferencia
- [ ] Añadir caso de navegación por día en ambos modos

### Acceptance criteria

- [ ] Reduce salta al destino sin desplazamiento interpolado
- [ ] Normal conserva navegación útil y encabezado no queda tapado por sticky

### Verification

- [ ] Desktop — recorrer `/weekly-plan` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Emular reduce, pulsar último día y registrar posiciones; probar teclado y sticky.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-038 — Favoritos no identifican el producto y el live region anuncia toda la rejilla

Priority: P2  
Area: Accessibility  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/explore`

### Goal

Nombre “Marcar [producto] como favorito”, conservar aria-pressed. Live region solo para contador/resultado/error; rejilla normal. No anunciar toda la tarjeta al variar cantidad.

### Context and evidence

Botones de favoritos repiten “Marcar favorito”/“Quitar favorito” sin producto. section aria-live engloba resultados completos y controles, además de live regions de cantidad.

DOM/código y snapshot de catálogo con muchas cards. Ambigüedad confirmada de nombres; cantidad exacta de locución duplicada requiere NVDA/VoiceOver y se marca Needs verification.

### Files likely affected

- [src/app/explore/ExploreClient.tsx:324](/Users/sergioballesteros/ketohoy/src/app/explore/ExploreClient.tsx:324)
- [src/app/explore/ExploreClient.tsx:364](/Users/sergioballesteros/ketohoy/src/app/explore/ExploreClient.tsx:364)

### Implementation

- [ ] Incluir product.name en nombres de favorito en catálogo y sheet
- [ ] Mover status a elemento dedicado y quitar live region de rejilla
- [ ] Validar con lector de pantalla real antes de cerrar

### Acceptance criteria

- [ ] Cada favorito es identificable fuera del contexto visual
- [ ] Búsqueda anuncia contador/estado una vez, no todos los controles
- [ ] Cantidad sigue anunciándose brevemente

### Verification

- [ ] Desktop — recorrer `/explore` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Recorrer lista de botones y filtrar con VoiceOver/NVDA; probar teclado y cinco productos de nombre parecido.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-039 — Fotos de recetas no representan de forma fiable el plato

Priority: P2  
Area: UI / Product  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `Landing y /recipes/:id`

### Goal

Curar primeras recetas/hero manualmente y permitir placeholder honesto para lo no revisado; conservar procedencia/licencia y no prometer foto exacta si es ilustrativa. No activar autofetch en navegación.

### Context and evidence

La búsqueda automática de stock elige una imagen disponible sin revisión semántica. La foto puede enseñar ingredientes/platos distintos de las instrucciones.

Producción con imágenes ya decodificadas: “Huevos revueltos con bacon y aguacate” muestra bowl de aguacate; tortilla de queso/jamón parece tortilla gruesa genérica; revuelto de espinacas presenta otro plato. No se trataron placeholders lazy como imágenes rotas. Capturas production-landing-320.png y production-recipe-1440.png.

### Files likely affected

- [prisma/backfillRecipeImages.ts](/Users/sergioballesteros/ketohoy/prisma/backfillRecipeImages.ts)
- [src/lib/unsplash.ts](/Users/sergioballesteros/ketohoy/src/lib/unsplash.ts)
- [src/components/Landing.tsx](/Users/sergioballesteros/ketohoy/src/components/Landing.tsx)
- [prisma/seed.ts](/Users/sergioballesteros/ketohoy/prisma/seed.ts)

### Implementation

- [ ] Revisar cuatro recetas landing y las más recomendadas
- [ ] Persistir selección revisada con script existente, sin edición durante esta auditoría
- [ ] Comprobar crop a 320/390/1440 y fallback

### Acceptance criteria

- [ ] Fotos destacadas corresponden a ingredientes y preparación o están marcadas ilustrativas
- [ ] No hay fetch de Unsplash en cada navegación
- [ ] Licencias/atribuciones necesarias se revisan contra proveedor

### Verification

- [ ] Desktop — recorrer `Landing y /recipes/:id` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Cotejar foto con ingredientes/pasos y cargar con imagen 404 en entorno aislado.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-040 — Guardar un sheet omite la salida que sí tienen ESC/X

Priority: P3  
Area: Motion / UI  
Effort: S  
Depends on: KH-019  
Confidence: Confirmado  
Route: `Sheets de producto y despensa`

### Goal

Exponer una única función de cierre tras éxito con salida opacity/translate 120–180 ms; iniciar request sin esperar animación. Reduce: cierre inmediato. Evitar timers distribuidos por callers.

### Context and evidence

Cerrar con ESC/overlay/X anima 180 ms; acciones de children/footer llaman onClose directo y desmontan instantáneamente. Es una simplificación deliberada documentada en el componente.

Código/comentario de Sheet y handlers. Entrada 200 ms; cierre por acción no tiene estado closing. No se precisa librería de animación.

### Files likely affected

- [src/components/Sheet.tsx:34](/Users/sergioballesteros/ketohoy/src/components/Sheet.tsx:34)
- [src/app/inventory/PantryItemSheet.tsx](/Users/sergioballesteros/ketohoy/src/app/inventory/PantryItemSheet.tsx)
- [src/app/explore/ExploreProductSheet.tsx](/Users/sergioballesteros/ketohoy/src/app/explore/ExploreProductSheet.tsx)

### Implementation

- [ ] Reusar estado closing de Sheet para todas las salidas
- [ ] Separar persistencia de animación y unmount
- [ ] Validar que no se duplica submit y que el foco se devuelve

### Acceptance criteria

- [ ] ESC/X/guardar exitoso comparten salida breve
- [ ] Guardar fallido mantiene diálogo; reduce no espera
- [ ] Restauración de foco no depende de cómo se cerró

### Verification

- [ ] Desktop — recorrer `Sheets de producto y despensa` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Guardar, ESC, X, overlay, error y reduced motion; comparar salida y tiempo percibido.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-041 — Inserciones y movimientos de listas saltan de posición

Priority: P3  
Area: Motion / UI  
Effort: S  
Depends on: KH-002, KH-020  
Confidence: Confirmado  
Route: `/inventory; /shopping-list`

### Goal

Priorizar feedback inmediato; entrada opacity + translateY 4px 120 ms, salida opacity/scale .98 120 ms. Si hace falta continuidad de filas, FLIP transform mínimo en la lista concreta; no dependencia global. Reduce: ningún desplazamiento.

### Context and evidence

Compras tiene salida de fila 140 ms opacity/translateX, pero el resto recoloca al desmontar. Despensa elimina tras refresh sin salida; check mueve directamente la fila a Comprado. Inserciones no comunican localización.

Implementación de leaving y listas con keys estables. Esto es polish espacial, no se midió CLS de interacción como Core Web Vital ni se recomienda animar height.

### Files likely affected

- [src/app/inventory/page.tsx](/Users/sergioballesteros/ketohoy/src/app/inventory/page.tsx)
- [src/app/shopping-list/page.tsx:70](/Users/sergioballesteros/ketohoy/src/app/shopping-list/page.tsx:70)
- [src/app/globals.css](/Users/sergioballesteros/ketohoy/src/app/globals.css)

### Implementation

- [ ] Compartir duraciones existentes para salida/entrada sin abstracción extensa
- [ ] Medir si reorder necesita FLIP antes de implementarlo
- [ ] Mantener foco válido cuando desaparece el control

### Acceptance criteria

- [ ] Fila añadida/quitada es reconocible sin retrasar request
- [ ] Check tiene feedback inmediato y movimiento breve opcional
- [ ] Reduce evita transforms y no retrasa dato/foco

### Verification

- [ ] Desktop — recorrer `/inventory; /shopping-list` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Añadir, eliminar, comprar y descomprar tres filas; teclado, 320 px, conexión lenta y reduced motion.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-042 — Autenticación pierde la receta de origen y el modo no sigue la URL

Priority: P2  
Area: UX / Product  
Effort: S  
Depends on: —  
Confidence: Confirmado  
Route: `/recipes/:id → /login; /login?modo=registro`

### Goal

Parámetro returnTo interno validado, preservar tras términos y OAuth si procede; actualizar modo con navegación/reemplazo de URL. No redirigir a dominios arbitrarios ni repetir automáticamente una compra.

### Context and evidence

Tras login/registro la redirección es siempre /. Cambiar modo actualiza estado local sin URL. Una receta pública que motiva el alta no se retoma automáticamente.

LoginForm switchMode y window.location.href leídos; receta pública CTA invita a entrar. Refresh/back no pueden reconstruir el modo cambiado solo en estado. No se realizó OAuth autorizado en producción.

### Files likely affected

- [src/app/login/LoginForm.tsx:31](/Users/sergioballesteros/ketohoy/src/app/login/LoginForm.tsx:31)
- [src/proxy.ts:36](/Users/sergioballesteros/ketohoy/src/proxy.ts:36)
- [src/app/recipes/[id]/AddMissingButton.tsx](/Users/sergioballesteros/ketohoy/src/app/recipes/[id]/AddMissingButton.tsx)

### Implementation

- [ ] Propagar ruta interna de origen por enlaces y auth/terms
- [ ] Validar pathname permitido con helper pequeño, no open redirect
- [ ] Sincronizar modo con query y probar history

### Acceptance criteria

- [ ] Login desde receta vuelve a la receta y muestra siguiente acción
- [ ] Refresh/back conserva modo representado en URL
- [ ] returnTo externo o malformado se ignora

### Verification

- [ ] Desktop — recorrer `/recipes/:id → /login; /login?modo=registro` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Receta anónima→registro/login→términos→receta; probar refresh/back y returnTo https://externo.invalid.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-043 — La landing carece de imagen social específica y CTA de cierre

Priority: P3  
Area: SEO / UX  
Effort: XS  
Depends on: —  
Confidence: Confirmado  
Route: `/ pública`

### Goal

Reusar un asset de marca existente para OG/Twitter con dimensiones/alt y CTA final discreto “Crear cuenta gratis”. Mantener FAQ accesible y disclaimer.

### Context and evidence

Home define title/description/canonical e index; no imagen Open Graph/Twitter específica. Tras FAQ no se repite la acción principal; en móvil queda lejos del CTA superior.

Metadata y landing de producción/local revisadas. Recetas sí tienen OG y Recipe JSON-LD; no se afirma que todo SEO esté ausente. Imagen social de landing no encontrada en metadata generada.

### Files likely affected

- [src/app/page.tsx:147](/Users/sergioballesteros/ketohoy/src/app/page.tsx:147)
- [src/app/layout.tsx:14](/Users/sergioballesteros/ketohoy/src/app/layout.tsx:14)
- [src/components/Landing.tsx](/Users/sergioballesteros/ketohoy/src/components/Landing.tsx)

### Implementation

- [ ] Añadir metadata social usando recursos existentes
- [ ] Repetir CTA tras FAQ con misma ruta/texto
- [ ] Validar URL absoluta y preview sin tracker

### Acceptance criteria

- [ ] Portada genera preview con título/descripción/imagen propia
- [ ] Final de landing tiene acceso directo al registro sin competir con FAQ

### Verification

- [ ] Desktop — recorrer `/ pública` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Inspeccionar HTML/meta y preview de compartición; recorrer landing a 320/1440 con teclado.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-044 — Día resaltado significa hoy, no sección que está viendo el usuario

Priority: P3  
Area: UI / UX  
Effort: S  
Depends on: KH-037  
Confidence: Confirmado  
Route: `/weekly-plan`

### Goal

Distinguir “Hoy” de selección/visible. O indicar solo Hoy con estilo no seleccionable, o añadir estado de día activo derivado del scroll sin necesidad de scroll library.

### Context and evidence

La barra de días marca la fecha actual y no refleja el día al que se saltó. En una lista larga se pueden interpretar ambos significados como selección.

Captura local-plan-390.png: contenido de lunes y viernes marcado HOY por la fecha de auditoría. Es una decisión deliberada plausible, no bug de calendario.

### Files likely affected

- [src/app/weekly-plan/page.tsx:192](/Users/sergioballesteros/ketohoy/src/app/weekly-plan/page.tsx:192)

### Implementation

- [ ] Nombrar semántica de Hoy y de selección
- [ ] Elegir el cambio mínimo de copy/estilo; observar scroll solo si necesario
- [ ] Validar días anteriores/futuros y teclado

### Acceptance criteria

- [ ] El estilo permite distinguir fecha de navegación
- [ ] Pulsar un día conserva orientación y sticky no oculta heading

### Verification

- [ ] Desktop — recorrer `/weekly-plan` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Entrar en viernes y saltar lunes/domingo; comprobar orientación y reduced motion.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-045 — Documentación ya no describe el stack ni el estado real de pruebas

Priority: P3  
Area: Architecture / Testing  
Effort: XS  
Depends on: —  
Confidence: Confirmado  
Route: `README y documentación`

### Goal

Actualizar fuentes de verdad breves: stack real, comandos, variables, BD segura y estado de suite. Evitar duplicar listas de features en varios documentos.

### Context and evidence

README menciona Framer Motion aunque no está en dependencias; cifras/estado de pruebas documentadas no coinciden con ejecución actual. Configuración de correo/URL/cookies debe explicar requerimientos y modo local.

package.json y npm test: 19 archivos, 156 tests. E2E se detiene. Motion real CSS/React. Documentación leída durante discovery.

### Files likely affected

- [README.md](/Users/sergioballesteros/ketohoy/README.md)
- [STATUS.md](/Users/sergioballesteros/ketohoy/STATUS.md)
- [docs/pendientes.md](/Users/sergioballesteros/ketohoy/docs/pendientes.md)
- [.env.example](/Users/sergioballesteros/ketohoy/.env.example)

### Implementation

- [ ] Corregir menciones/cifras obsoletas o eliminarlas si no se mantienen
- [ ] Documentar variables sin incluir secretos
- [ ] Enlazar tareas pendientes desde un único sitio

### Acceptance criteria

- [ ] Documentación coincide con comandos y dependencias actuales
- [ ] No afirma E2E completo sin evidencia
- [ ] Explica copia de BD y limitaciones de correo/OAuth

### Verification

- [ ] Desktop — N/A para layout; comprobar contrato/estado desde cliente HTTP y flujo dependiente en navegador cuando exista.
- [ ] Mobile — N/A para layout de servidor; mismo contrato desde consumidor móvil, sin diferencia por viewport.
- [ ] Keyboard — N/A si no cambia UI; si se añade control/feedback, comprobar foco, nombre y activación nativa.
- [ ] Reduced motion — N/A para lógica servidor; no introducir esperas visuales en la operación.
- [ ] Prueba específica — Seguir instrucciones en checkout/copia limpia y comparar outputs; revisión de enlaces y secretos.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## KH-046 — Producción y checkout divergen en información legal y consentimiento

Priority: P2  
Area: Product / Data  
Effort: S  
Depends on: KH-010, KH-035, KH-030  
Confidence: Divergencia confirmada; adecuación jurídica Needs verification  
Route: `Landing; /login; /legal; /accept-terms`

### Goal

Cerrar revisión factual del borrador, identidad/contacto, terceros y plazos; desplegar solo tras CI/migración verificados. Probar alta email/Google y cuenta existente contra CURRENT_TERMS_VERSION. Conservar separación informar privacidad vs aceptar términos.

### Context and evidence

Producción pública no mostró footer legal ni checkboxes de mayoría/aceptación; el checkout local sí los incorpora. /legal local se identifica como borrador y requiere revisión. No se debe declarar completada una mejora solo por existir localmente.

production-register-390.png y landing pública frente a fuente/local. Cambios ya presentes antes de auditoría y todavía no desplegados. No se probó consentimiento de usuarios existentes en producción.

### Files likely affected

- [src/app/legal/page.tsx](/Users/sergioballesteros/ketohoy/src/app/legal/page.tsx)
- [src/app/login/LoginForm.tsx](/Users/sergioballesteros/ketohoy/src/app/login/LoginForm.tsx)
- [src/components/Landing.tsx](/Users/sergioballesteros/ketohoy/src/components/Landing.tsx)
- [src/lib/terms.ts](/Users/sergioballesteros/ketohoy/src/lib/terms.ts)

### Implementation

- [ ] Revisar hechos legales/operativos con responsable competente, sin inventar obligaciones
- [ ] Cubrir cuentas legacy, email y OAuth con términos actualizados
- [ ] Verificar migración y entrega antes de publicar

### Acceptance criteria

- [ ] Contenido publicado corresponde al tratamiento real y deja de presentarse como borrador
- [ ] Alta y reaceptación registran versión/fecha en email y Google
- [ ] Prod/local coinciden en flujo después del release validado

### Verification

- [ ] Desktop — recorrer `Landing; /login; /legal; /accept-terms` a 1280/1440 y comprobar resultado, persistencia y feedback descritos; no pageerrors nuevos.
- [ ] Mobile — repetir flujo a 320 y 390; CTA/última fila visibles, sin overflow de documento; 768 si cambia layout. En teclado virtual/safe area no comprobados, registrar limitación o probar dispositivo físico.
- [ ] Keyboard — abrir/activar con Enter/Space, Tab/Shift+Tab, foco visible y retorno al cerrar; si desaparece una fila, foco alternativo válido.
- [ ] Reduced motion — emular reduce y repetir acción; sin scroll/transforms no deseados ni timers visuales que retrasen persistencia/foco.
- [ ] Prueba específica — Staging: alta ambos proveedores, usuario legacy, rechazo y aceptación de nueva versión; producción solo comprobación pública autorizada.
- [ ] Evidencia de cierre — registrar test/resultado y diferencias de contrato; ejecutar lint/build si cambia TS/Next, tests específicos y E2E afectados tras KH-010. Mantener datos/secretos fuera de logs.

## Condiciones comunes de entrega

- [ ] Los tests negativos fallan con la implementación anterior y pasan con la corrección, no solo replican el algoritmo.
- [ ] No aparecen regresiones de ownership, unidades, preferencias, foco ni respuesta de error en callers hermanos.
- [ ] Datos legacy/migraciones probados en copia y plan de recuperación cuando el cambio toca schema.
- [ ] Actualizar estado en AUDIT.md/este archivo después de verificación, nunca marcar resuelto por solo escribir código.
- [ ] Cualquier despliegue, proveedor real o borrado de cuentas usa autorización específica y procedimiento de release seguro.
