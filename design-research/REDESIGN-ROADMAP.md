# Roadmap de redesign (propuesta, no implementada)

## Secuencia

| Fase | Alcance | Criterio de salida |
|---|---|---|
| 0. Aclarar contratos/visual baseline | **Captura local completada** para landing y ocho superficies autenticadas, con fixture sintético en copia temporal de BD; consolidar tokens/componentes durante el concepto visual. | Evidencias 320/390/768/1280 disponibles; observaciones rastreables; no alterar findings KH. Contraste, teclado y dispositivos físicos quedan para validación de implementación. |
| 1. Foundations/design system | Tipo, spacing, color roles, focus, buttons, rows, sheets, errors/loading; tokens web modestos, sin nueva librería. | AA contrast verificado en estados, teclado, touch 44+, `prefers-reduced-motion`. |
| 2. Navigation | Destinos principales y nav móvil/escritorio. | Desde cualquier tarea se llega a Plan, Compra, Despensa en una acción predecible. |
| 3. Shopping list — **primer experimento** | Lista 390 con grupos, categorías editables, check/undo, cantidad/unidades, unknown/source disclosures. | Compra de una mano simulada con 20+ items; cada fila legible, estados no ambiguos, undo y foco conservados. |
| 4. Weekly plan | Resumen + day focus; slots compactos; incomplete, swap y CTA agregado. | 28 slots no crean 28 cards grandes; purchase bridge conserva fuentes/status/stock virtual. |
| 5. Recipe detail | Hero contenido, ingredients/availability/quantities, cooking steps/macros. | Ingrediente escaneable a una mano, unknown sigue unknown, step progression accesible. |
| 6. Pantry | Search, categorías y edición breve de stock/expiry. | Búsqueda encuentra producto en inventario largo; distinguir stock, consumo, package y expiry. |
| 7. Home | Qué toca comer, una atención y siguiente acción. | No se vuelve dashboard; acciones siguientes apuntan al flujo correcto y reflejan estado fresco. |
| 8. Explore/catalog | Search, filters, cards y confianza nutricional/keto; alta a despensa/lista. | No induce compra/checkout; etiquetas source/estimate/unknown y UX filtros fiable. |
| 9. Preferences/onboarding | Secuencia de restrictions → generación del primer resultado → gustos ajustables. | Las alergias se solicitan con contexto antes de plan; no se pierde estado saved/dirty. |
| 10. Landing/auth | Mostrar ciclo real, confianza, FAQ/legal y CTA de cierre; auth breve. | Mensaje coincide con producto actual; title/crop/CTA se leen en 320; legal no se mezcla con marketing. |
| 11. Consistency pass | Responsive, errores, empty/skeleton/toast, iconografía, imágenes y motion. | Revisión completa 320/390/768/1280+, teclado y lector con checklist verificable. |

La lista sube antes de Home y Weekly Plan respecto al orden inicial sugerido porque el brief identifica supermercado como entorno crítico y la lista prueba antes la densidad, unidades, unknown, estados y focus. Home se valida luego con los contratos reales de los destinos; el plan se rediseña antes que el home para tener CTA de compra coherente.

## Interacción con findings KH

La columna relaciona diseño con hallazgos del registro KH; **no cambia ningún estado**. El progreso actual declara 28 findings aún sin implementar; su prioridad/estado completo se consulta solo en `AUDIT-TASKS.md`. Los contratos funcionales ya implementados KH-005/015/025/027 se tratan como invariantes de diseño.

| Propuesta | Findings relacionados | Riesgo/conflicto | Coordinación recomendada |
|---|---|---|---|
| Nuevo navigation shell | KH-026, KH-042, KH-044, KH-043 | Puede desviar login de receta origen; acción activa podría dar significado de “hoy” a sección visible. | Definir rutas/deep links y selección de sección al mismo tiempo; test de atajos. |
| Home orientada a siguiente acción | KH-014, KH-023, KH-026, KH-032 | Contador stale o fallo API mostrado como ausencia/vacío; fixture demo presentado real. | Esperar API freshness/error semantics; estados vacíos distinguibles. |
| Week/day focus y slots | KH-004, KH-027, KH-037, KH-044 | Resumir puede ocultar plan inválido/incompleto; CTA semanal no muestra origen/needs review; motion reduce. | Respetar exactamente 28 únicos; conservar día seleccionado y status de ingrediente; KH-037 y KH-044 antes de motion de navegación. |
| Card/foto receta | KH-039, KH-038, KH-007, KH-025 | Imagen o badge sugiere calidad/certeza no respaldada; favorite status puede no tener contexto de producto. | No usar fotos para comunicar disponibilidad o keto; representar source en badge. |
| Detalle receta y faltantes | KH-005, KH-015, KH-025, KH-027, KH-039 | Confundir cantidad culinaria con compra; net carbs legacy unknown presentado medido; “add missing” slot se vuelve global. | Tratar contratos KH como no negociables; source disclosure; incluir error/unknown sin CTA erróneo. |
| Lista scan-first, checked + undo | KH-002, KH-005, KH-006, KH-016, KH-020, KH-027, KH-028, KH-041 | Plegar/quitar demasiado pronto pierde fila/foco, source, package o undo; catálogo manual comparte identity. | Cambiar layout sobre filas/server outcomes actuales, no reescribir semántica. Esperar KH-041 para transición de reordenamiento; offline KH-028 visible como limitación. |
| Pantry search/quantity/expiry | KH-005, KH-016, KH-018, KH-020, KH-023, KH-029 | Merge incorrectly changed stock; search race; expiry/unknown grouping creates false status. | Mantener búsqueda y mutation recovery; separar todos los quantities; permitir “desconocido”. |
| Catalog/filters | KH-007, KH-008, KH-009, KH-023, KH-024, KH-038 | Nutrition/filters incorrectos y responses stale; data fallback parece real; image/label misleading. | Mantener protección de request actual, filtros contract; no diseñar badge “Muy keto” como certeza universal. |
| Onboarding/preferences | KH-003, KH-017, KH-021, KH-026, KH-030, KH-042, KH-046 | Reordenar preferencias puede no guardar, reducir restricciones o romper consent/origen. | Diseño solo sobre campos y API actuales; secuenciación no implica ampliar datos sensibles. |
| Sheets, toast, transitions | KH-019, KH-020, KH-037, KH-040, KH-041 | Foco perdido/reduced motion no aplicados; toast viejo tapa feedback actual; rows jump. | Coordinar KH-040/041 pendientes antes de un sistema global de transitions. |
| Login/landing and legal copy | KH-021, KH-042, KH-043, KH-046 | Enumerar cuentas, pérdida de receta original, legal difference producción/local; prometer flujo no disponible. | Mantener privacidad; cerrar UX solo con comportamiento y legal copy consolidados. |

## Quick wins vs structural redesign

### Quick wins de bajo riesgo visual (una vez contrastados con estados)

- Alinear escala tipográfica y reforzar contrastes de texto secundario/labels; números tabulares para cantidades.
- Normalizar recorte/ratio de fotos aceptadas y reservar fallback de imagen.
- Hacer botones/inputs con targets y foco consistentes; no cambiar su semántica.
- Limitar color de marca a tareas importantes, usar texto+icono para estado.
- Revisar truncado en 320, separación del CTA y copy de warnings.
- Skeleton/empty/error con copy que distingue carga, ausencia y fallo.

### Structural redesign

- Nueva jerarquía de navegación, semana/día y 28 slots.
- Lista por contexto de compra, ubicación/grupos editables, source disclosure, checked items y undo.
- Receta orientada a manos ocupadas y lectura de cantidad/pasos.
- Home como próxima acción y con ausencia de dashboard.
- Pantry search y categorización escalable.
- Explore no ecommerce; onboarding progresivo.

Quick wins no deben sortear contrato/estados conocidos ni salir antes de audit visual auth; estructural solo después de elegir A y cerrar KH cercano.
