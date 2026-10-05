# KH-005 — contrato implementado

Mapa previo y evidencia del dominio: `DOMAIN-MAP.md`. Implementación y cierre: 2026-10-04.

## Conceptos y campos

| Concepto | Representación / significado |
| --- | --- |
| Receta publicada | RecipeIngredient.quantity conserva su texto libre; no cambia la receta ni añade raciones ficticias |
| Necesidad culinaria | ShoppingListItem.requiredQuantity + requiredUnit; nullable juntos. Cantidad publicada del ingrediente, nunca contador de compra |
| Texto original | originalIngredientText copia EXACTAMENTE RecipeIngredient.quantity cuando existe. El origen no contiene una frase completa adicional; name conserva el nombre por separado |
| Origen | sourceType legacy/manual/recipe/meal y sourceKey; reason es explicación humana del título, no clave |
| Producto asociado | productId opcional; asociación mediante PATCH quantity con productId accesible no cambia necesidad/texto/origen |
| Envase | Product.packageQuantity + packageUnit nullable juntos: contenido físico por paquete, declarado explícitamente por quien crea un producto manual |
| Compra | purchaseQuantity: cantidad de paquetes seleccionados. Nullable para necesidades recién generadas/legacy. POST manual/catálogo selecciona el contador explícito (default de ese flujo: 1 paquete). PATCH incrementa/selecciona compra, nunca cantidad culinaria |
| Stock | PantryItem.quantity + unit: cantidad que hay. Desconocido no es cero; paquetes no son gramos |
| Reversión | pantryItemId identifica fila exacta; pantryDelta + pantryDeltaUnit registra stock añadido en la unidad de esa fila; pantryCreated conserva creación. checked indica comprado |

ShoppingListItem.quantity se conserva para compatibilidad histórica y consumidores de contador del catálogo: en NUEVAS compras numéricas es espejo textual de purchaseQuantity. No es fuente de verdad culinaria ni de transferencia. Migración NO copia quantity legacy a purchaseQuantity ni requiredQuantity. Legacy se muestra sin cifras físicas falsas y su texto histórico sigue disponible por API. Undo explícito envía purchaseQuantity:null y legacyQuantity (texto opaco), preservando quantity antiguo sin seleccionar un paquete por defecto.

## Raciones y escalado

Recipe/WeeklyMeal/seed no tienen base servings ni planned servings. No se conoce factor ni se aplica amount×planned/base. La cantidad normalizada corresponde a la receta publicada, con raciones desconocidas. POST de origen solo admite mealId opcional, no acepta servings inventadas. KH-015 evalúa la suficiencia para la cantidad publicada sin factor de raciones ficticio; no consume stock ni materializa un delta de necesidad en la lista.

## Unidades y conversiones

Inventario readonly original/seed: g, ml, ud/uds (incluye 1/2 y 1/4), cda/cdas, cdta, lata/latas, loncha/lonchas, hoja/hojas; stock null/kg. Tests también kg/L y cadenas numéricas sin unidad.

Utilidad pequeña `quantities.ts`: aliases españoles, g↔kg factor 1000 y ml↔l/L factor 1000; conteo ud/uds/unidad/unidades se normaliza a unidad. cda/cdas, cdta, lata, loncha, hoja, paquete conservan dimensiones propias. No equivalencias entre conteo/masa/volumen/cucharadas/envases. Unidades explícitas no reconocidas solo son compatibles con la misma cadena normalizada.

Parser de ingrediente deliberadamente limitado: expresión completa número decimal (punto/coma) o fracción + unidad inventariada. `200g`→200/g, `1/2 ud`→0.5/unidad; `2 cdas`→2/cda. Número sin unidad, texto libre, rangos/unidades no demostradas quedan null/null conservando el texto. Nunca parser de nombre comercial, referencePrice, macros o demo para tamaño de paquete.

## Origen, agregación e idempotencia

sourceKey es JSON de tuple:

- receta directa: `["recipe", recipeId, ingredientId]`;
- comida del plan: `["meal", planId, mealId, recipeId, ingredientId]`.

Unicidad SQL `(userId, sourceKey)`. Endpoint receta crea snapshots de necesidades, una fila POR origen, dentro de transacción; repetir el mismo origen devuelve snapshot existente, sin incrementar ni sobrescribir historia comprada. No dedupe por nombre ni productId. Dos slots/recetas producen filas independientes incluso con el mismo ingrediente. `sumCompatible` permite sumar 500 g+1 kg→1500 g conservando filas de procedencia; no hay agrupación visual/materialización destructiva. Incompatibles nunca se fusionan. Manual/catálogo seleccionan compras adicionales y fusionan solo sus contadores pendientes sin necesidad/texto, nunca con recetas o legacy.

Regeneración/retry de los mismos IDs es idempotente. Otro plan/slot es otro origen. Una llamada directa a la misma receta no declara una segunda ocasión de cocina: usar otro slot o alta manual para una intención nueva. Eliminar una fila elimina esa intención; volver a generarla es explícitamente añadirla de nuevo (undo de receta vuelve por endpoint de origen). Limpiar historia comprada también elimina su clave, no hay tombstones. Snapshots no son sincronización continua con edición de receta/seed; cambios de receta/plan no borran necesidades anteriores automáticamente. No se implementa compra del menú. Catálogo calcula subtotal solo desde purchaseQuantity conocida y sus steppers apuntan a compras manuales sin necesidad/texto, nunca a una fila de receta ni contador legacy. Detalle/alta indica paquetes explícitamente.

## Envase, compra y despensa

Envase conocido y compra conocida: `stock añadido = packageQuantity × purchaseQuantity`. 300 g necesarios + paquete 500 g + 1 paquete comprado → 500 g, nunca 300. Se convierte a unidad de stock existente solo si determinista/compatible. Unidad incompatible o stock sin cantidad/unidad fiable → fila separada, dejando stock anterior intacto. API de asociación conserva necesidad y valida ownership; no UI compleja nueva.

Contenido de paquete desconocido pero contador elegido → stock como N paquetes, sin inventar contenido físico. Contador también desconocido (legacy/receta aún sin seleccionar) → nueva fila stock null/null; pantryDelta=0 significa **no cantidad numérica transferida**, no stock cero. La UI muestra “Paquetes por elegir”/contenido no especificado; contador puede elegirse con + o API PATCH. Mercadona actual NO aporta package size al adaptador consumido: todos sus nuevos paquetes permanecen desconocidos. Demo/peso en nombre no lo demuestra. KH-005 no redefinió POST pantry; la extensión KH-016 se describe abajo. Alta manual conserva ofertas del mismo nombre/categoría con distintos pares packageQuantity/packageUnit en productos distintos; repetir el mismo par reutiliza su producto. Selector de despensa conserva cualquier unidad explícita recibida, incluida unidad normalizada de conteo.

Compra/descompra/múltiple mantiene transacción de KH-002/KH-006: checked, productos manuales creados, stock, fila/unidad/delta se confirman o revierten juntos. Unbuy usa fila/delta registrado aunque cambie Product; si stock cambia a una unidad compatible, convierte delta. Unidad incompatible → 409 y rollback completo. Legacy sin fila/unidad de transferencia fiable no permite inferir sustracción: se revierte checked sin alterar stock. Si fila transferida ya fue eliminada, no se resta otra fila de ese producto. No resta stock de otra cuenta.

## Invariantes y límites

- Cantidades presentes finitas/positivas; pares cantidad/unidad juntos y unidad no vacía. Delta firmado finito/no cero; compra final positiva. Zod compartido valida inputs/operaciones y rechaza overflow. Representación textual no redondea cantidades pequeñas a cero.
- Productos privados accesibles solo al propietario; slot debe pertenecer a su usuario y receta actual. GET lista/compra/edición/múltiple filtran userId. Claves no cruzan cuentas.
- Nutrición KH-025 permanece por 100 g/ml, no se multiplica ni sobrescribe al comprar. unknown sigue unknown; paquete no demuestra precisión nutricional.
- Migración aditiva `20261003200000_quantity_contract`: nulls para cantidades/origen desconocidos; sourceType legacy; no modifica checked/ownership/stock/quantity/pantryDelta previo. Prueba deploy real + integrity + re-deploy + rollback lógico de columnas/índice solo en copias desechables antes de nuevas escrituras.
- Raciones y paquete Mercadona desconocidos son límites de datos, no precisión inventada. KH-015/KH-016 amplían lectura de disponibilidad y alta de presencia como se describe abajo; compra del menú sigue pendiente en KH-027.

## Extensión KH-015 — disponibilidad (2026-10-04)

`ingredientAvailability` devuelve matched (identidad relacionada), presence (fila no caducada), required/available nullable y status/reason. `sufficient`: cantidad compatible verificada que cubre necesidad; `insufficient`: cantidad compatible conocida menor; `unknown`: necesidad/stock desconocido o dimensión incompatible; `missing`: sin stock utilizable (reason absent/expired). Un valor desconocido nunca es cero/infinito. Available es la cantidad comprobable del mejor grupo de identidad, expresada en la unidad requerida; null si no puede comprobarse. Un grupo conocido suficiente puede demostrar cobertura aunque existan otras filas desconocidas; un grupo corto con filas desconocidas/incompatibles queda unknown.

Parser, convertQuantity y sumCompatible son los originales de KH-005. Sin conversiones conteo↔masa/volumen/envase ni inferencia de package size. ID exacto encontrado gana sobre nombres. Fallback conservador por igualdad de tokens completos sin tildes, artículos/preposiciones de enlace y plurales comunes; equivalencia explícita pollo↔pechuga de pollo preservada. Sal≠salmón y leche≠leche de almendras. Suma solo filas no caducadas de un mismo productId y usuario solicitado; no suma productos distintos por nombre ni mezcla referencias manuales/globales. ExpiresAt es DateTime: se excluye cuando timestamp válido es anterior a now; ausente/inválido no demuestra caducidad.

`recipeAvailability` cuenta sufficient/insufficient/unknown/missing, presence y needsReview; ready exige todos los ingredientes obligatorios sufficient y al menos uno obligatorio. Opcionales no condicionan ready. Scoring mantiene ratio de presencia y selección parcial/fallback, pero solo ready comunica cantidad suficiente. availableIngredients representa presencia; missingIngredients representa necesidades por verificar/completar y puede incluir ingredientes presentes. No son conjuntos complementarios; total procede del contrato estructurado. Inicio, recipes/suggestions, detalle, plan, sheet de sustitución y endpoint faltantes usan el mismo contrato. El filtro explícito “Cantidad suficiente” exige ready, sin restringir el pool normal del plan.

Añadir faltantes conserva la necesidad publicada completa y su origen, incluso si hay stock insuficiente/desconocido; solo omite sufficient. No resta stock para inventar un nuevo requiredQuantity, no altera snapshots previos ni contadores/envases/deltas. Comparación por receta/ingrediente en el momento de la lectura; no reserva ni descuenta stock entre comidas/días. No existe duplicación de productId obligatorio en las recetas actuales (comprobación readonly); no introduce planificación de consumo semanal.

## Extensión KH-016 — alta de presencia (2026-10-04)

`POST /api/pantry` devuelve la fila efectiva con product y `outcome: created|existing`: created/201 crea stock inicial; existing/200 conserva quantity/unit y toda la fila previa, aunque la solicitud tenga otra cantidad/unidad. Búsqueda+alta se realizan en transacción y se filtra ownership antes de buscar existing. No unicidad nueva productId/usuario: se mantienen filas legítimas de transferencias KH-005. Si hay varias, existing devuelve la más antigua sin modificar ninguna. Import Mercadona utiliza el mismo helper y pantryItem.outcome. `PATCH /api/pantry/:id` continúa editando quantity/unit explícitamente con su validación/ownership vigente.

UI existing anuncia “Ya está en tu despensa. Se conserva la cantidad actual.” y ofrece editar en el flujo de despensa. Undo usa la misma alta: created confirma restauración; existing conserva el stock reañadido desde otra pestaña y permite editar, sin sobrescribir/incrementar ni anunciar restauración. Stock físico, required/purchase/package quantity y deltas de transferencia no cambian de significado. Alta/edición manual conserva unidad ud elegida cuando la cantidad se conoce; no convierte unidades explícitas en null. El retorno de foco del sheet de alta sigue pendiente en KH-019. KH-027 sigue sin implementar.

## Extensión KH-027 — snapshot de compra semanal (2026-10-05)

### Mapa previo y primitives reutilizadas

`WeeklyPlan(id, userId, weekStart)` → `WeeklyMeal(id, planId, dayOfWeek, mealType, recipeId)` → `Recipe.ingredients(id, name, quantity, productId, optional)` → `PantryItem(userId, productId, quantity, unit, expiresAt)` → faltantes virtuales → filas agregadas `ShoppingListItem`.

El plan no tiene revisión monotónica. El fingerprint SHA256 deriva de plan, slots ordenados y requisitos publicados (IDs, nombres, productId y texto original), sin timestamps de ejecución. Swap conserva slotId y cambia recipeId; regenerar cambia planId/slotIds. `ingredientSourceKey` extrae literalmente las tuples KH-005 y es usado tanto por el endpoint individual como por el cálculo semanal. `matchingPantryStock` extrae, sin cambiar KH-015, filtros de usuario, ID exacto prioritario, fallback de nombre y caducidad. Se reutilizan parser, convertQuantity y sumCompatible; no se duplican conversiones ni se consulta Mercadona/OFF.

Antes, `/weekly-plan` ofrecía una llamada individual por receta/slot. El endpoint individual filtra sufficient, conserva la cantidad publicada completa de los demás y devuelve snapshots idempotentes por origen; no reserva stock entre comidas. Por eso dos slots de 300 g con 500 g pueden omitirse ambos al añadir individualmente. Se conserva ese contrato; `before/after` ejecuta los handlers reales y prueba 0 filas individuales frente a 100 g en la operación semanal, seguido de retry idéntico. No se fabrica una regresión en el comportamiento anterior.

### Operación y cantidades

`POST /api/weekly-plan/shopping-list { planId }` autentica y resuelve el plan de la semana actual de esa cuenta dentro de una transacción real. Exige exactamente siete días con desayuno/comida/snack/cena únicos y receta presente; incompleto devuelve 422/incomplete_plan sin sincronización. Plan ajeno, antiguo o reemplazado devuelve 404 y pide recargar. La UI bloquea el CTA incompleto y durante generación/swap/preparación. Una sola llamada cliente para el menú entero; queries locales agrupadas, sin lectura por ingrediente de catálogo remoto.

Orden estable: día → breakfast/lunch/snack/dinner → slotId → ingredientId; pantry por id y desempate productId. Copia virtual de stock; solo stock conocido/compatible/no caducado del usuario cuenta. Mantiene la identidad exacta incluso tras agotar una fila y usa un único grupo productId, como KH-015. Nunca suma productos distintos por nombre ni escribe pantry. Consume la porción conocida aunque haya stock adicional desconocido/incompatible; el faltante queda por verificar en esos casos. Una diferencia microscópica de aritmética flotante se absorbe solo con tolerancia relativa a la cantidad conocida; necesidades legítimas pequeñas no se redondean a cero.

500 g de pollo y dos slots de 300 g → primer slot cubierto 300 g, segundo cubierto 200 g/faltante 100 g. 1 kg frente a total 600 g → ninguna fila; 1 kg frente a 1200 g → 200 g. Dos unidades frente a gramos no demuestran cobertura. Cantidad publicada desconocida mantiene null/null, texto exacto, estado unknown y origen; presencia por nombre no la elimina. Opcionales no forman parte de compra obligatoria. Sin raciones inventadas ni stock de paquetes reinterpretado como gramos.

### Agregación, source y sincronización

Solo se agregan requisitos numéricos de mismo productId o nombre exactamente igual normalizado a minúsculas/trim, y unidades compatibles demostradas por KH-005. Nombre fallback no amplía esa identidad para fusionar productos. Dimensiones incompatibles y requisitos desconocidos quedan separados. requiredQuantity/unit expresa el **faltante semanal**, no el total publicado ni la selección comercial. Originales se conservan por contribución; originalIngredientText del grupo solo se rellena cuando hay un único origen.

Nuevo campo nullable `sourceContributions` guarda JSON `{ version:1, planId, weekStart, sources }`. Cada contribución conserva sourceKey KH-005, planId/slotId/recipeId/ingredientId, nombre, texto publicado exacto, cantidad/unidad publicada, coveredQuantity, missingQuantity y status covered/required/unknown. Si un grupo tiene faltantes, también conserva sus slots ya cubiertos para explicar el reparto. Grupo totalmente cubierto no genera fila de compra.

sourceType=weekly-plan; sourceKey=`["weekly-plan", planId, SHA256(orígenes publicados del grupo)]`, con unicidad existente `(userId, sourceKey)`. El hash incluye TODOS sus requisitos, también los cubiertos, y no depende del stock virtual/descuento ni de timestamps. La revisión del plan se devuelve en el resumen; la identidad de cada grupo depende solo de sus contribuciones originales, evitando resucitar grupos comprados por un swap ajeno.

Retry con los mismos datos no crea ni actualiza filas/timestamps. Cambios de stock recalculan el faltante pendiente. Swap reconstruye contribuciones del slot cambiado y conserva las de los otros; un mismo ingrediente compartido puede requerir redistribución virtual determinista entre slots. Regenerar limpia solo snapshots pendientes inequívocos de esa misma semana, incluso del plan eliminado. No sincroniza manuales, legacy, recipe/meal individuales ni otras semanas. Si previamente se añadieron necesidades individuales del plan, permanecen como intenciones separadas: no se deduplican automáticamente entre fuentes.

JSON inválido, versión desconocida o claves ambiguas weekly-plan permanecen intactos: ninguna migración borra datos inciertos. Asociaciones explícitas accesibles y purchaseQuantity elegida se preservan en un grupo pendiente con la misma identidad. Cambiar requisitos puede crear otra identidad, sin inferir elección de envases. Comprar/descomprar sigue usando KH-002/KH-006 y los deltas KH-005; preparar no ejecuta checkout ni modifica stock.

Filas checked=true no se borran/actualizan/reabren. La misma identidad comprada se omite; otro grupo/revisión puede producir pendientes nuevos. No se infiere consumo real de compras históricas ni se reparte un grupo comprado entre revisiones distintas. La cobertura se demuestra con el pantry actual; stock desconocido sigue desconocido. Limpiar/eliminar una fila elimina su identidad según KH-005; volver a preparar es petición explícita de generar el snapshot pendiente actual. Deshacer de una fila semanal usa la operación agregada sobre el plan vigente, pudiendo restaurar otros faltantes pendientes omitidos; no llama al endpoint de una receta con un ID de plan.

### Transacción, UI y migración

Lecturas de plan/pantry y delete/create/update de snapshots se realizan en una transacción. SQLite toma primero el writer mediante UPDATE id=id acotado a usuario/plan, sin cambiar valores ni timestamps; evita upgrade de snapshot de lectura invalidado por otro escritor. Trigger real de fallo tras borrar pendientes prueba rollback completo; concurrencia de primeros requests y retries conserva una única lista. Manuales, history y stock se comparan antes/después como filas completas; A/B prueba aislamiento de plan/lista/pantry/productos privados.

CTA “Preparar compra de esta semana”; idle/preparing/success/warning/error, bloqueo doble clic y guard ref, timeout de confirmación 30 s, estado busy y status/live pequeño. Resumen confirmado por servidor: pendientes, creadas/actualizadas/sin cambios, cantidades por verificar e histórico omitido, enlace a lista existente para decidir paquetes. Cambios de plan descartan resumen anterior. Ningún éxito optimista. No nuevo modal ni live region con toda la lista.

Migración aditiva `20261005120000_weekly_shopping_sources` añade solo TEXT nullable; no backfill ni reinterpretación. Tests de deploy real, integridad, FK, re-deploy y rollback lógico de columna antes de nuevas escrituras solo en copias desechables. BD original y producción intactas; aplicar esta migración en el entorno de destino será requisito de una entrega futura autorizada.

### KH-020 — restauración tras eliminar

El POST manual de compras mantiene su semántica aditiva habitual. El cliente de Deshacer envía explícitamente `restore: true`: dentro de la transacción se devuelve la intención pendiente equivalente si existe, sin sumar ni sobrescribir paquetes, necesidad, texto o historial comprado. La identidad queda acotada al usuario, producto/nombre, tipo manual/legacy, cantidad/unidad requerida y texto original. Devuelve la fila efectiva y `outcome: created | existing`; repetir una restauración tras perder la respuesta no duplica paquetes ni legacy desconocido. Los productos privados mantienen su comprobación de acceso. Los orígenes recipe/meal siguen su endpoint idempotente de origen; weekly-plan vuelve a preparar el snapshot actual según KH-027.

El snapshot de undo se conserva en el callback durante Deshacer y sus reintentos; se consume solo al confirmar HTTP. No se inserta una copia local para fingir una restauración. Despensa conserva `created/existing` de KH-016. Remove fallido conserva/recupera la fila; undo fallido ofrece Reintentar sin anunciar restauración. Las lecturas antiguas quedan invalidadas por generación y las mutaciones repetidas se bloquean por fila. Se conserva el wrapper de sesión: 401 redirige a login y TERMS_REQUIRED a aceptación. No se añade almacenamiento durable de undo entre navegaciones ni se altera stock/delta al limpiar historia comprada.
