# Auditoría visual de la UI actual

**Fecha:** 5 de octubre de 2026. Capturas tomadas en Chromium contra el build local (`next start`, `127.0.0.1:3117`) en viewports de 320, 390, 768 y 1280 px. Las pantallas autenticadas usan una copia temporal de `dev.db` con migraciones al día y datos sintéticos E2E. Se aceptaron términos únicamente para la cuenta descartable local, con autorización del usuario. La base original no recibió escrituras.

## Alcance y evidencia

Se capturaron landing en cuatro anchos; home, plan semanal, detalle de receta, comidas, lista de compra, despensa, explorar y preferencias en cuatro anchos cada uno; login y términos a 390; y los sheets de añadir a lista/despensa a 390. `/register` mostró una pantalla vacía en la ruta probada y no se considera evidencia válida. La receta capturada es «Queso curado con aceitunas». El fixture contiene un plan generado de 28 slots y una lista semanal con 39 necesidades. La despensa vacía es un estado válido del fixture.

Durante la primera carga, la copia temporal no incluía cuatro migraciones y algunas API fallaron. Se verificó el estado de migración, se aplicaron esas migraciones solo a la copia y se recapturó cada pantalla autenticada. No se usan las capturas fallidas como evidencia. El fixture contiene datos sintéticos y ningún flujo escribió en servicios externos.

Las capturas son páginas completas en Chromium, no dispositivos físicos. La anchura del documento no excedió el viewport en las combinaciones capturadas. No se midieron contrastes WCAG ni tamaños táctiles con instrumental; tampoco se comprobó lector de pantalla, Safari/iOS, teclado virtual, safe areas o motion exhaustivamente.

## Top 10 problemas/oportunidades por impacto

1. **La lista de compra obliga a escanear demasiada metadata por producto.** Con 39 necesidades cada fila repite necesidad, texto original, ausencia de especificación del envase, paquetes por elegir y origen semanal. El patrón crea una página muy larga y diluye producto, cantidad y check. Priorizar la acción de compra; revelar trazabilidad y contrato del paquete al expandir.
2. **La compra no está agrupada para recorrer una tienda.** Las necesidades aparecen como una secuencia plana. Agrupar por zona/categoría revisable puede reducir recorridos, manteniendo origen y cantidades sin inferir datos desconocidos.
3. **El plan completo de 28 slots tiene mucha repetición vertical.** La navegación por días ayuda a orientarse, pero cada slot vuelve a mostrar imagen, título, tiempo y estado. En 320 px el contenido se percibe especialmente denso. Conservar los 28 slots y llevar la jerarquía a resumen semanal más foco diario.
4. **El catálogo de explorar parece una cuadrícula de productos de tienda.** En desktop usa cinco columnas y se extiende mucho verticalmente; las imágenes no son uniformes y varias celdas carecen de imagen útil. Hacer más claro que se exploran alimentos para contexto keto/despensa, no que se inicia un checkout.
5. **La navegación móvil reparte seis destinos en una franja estrecha.** En 320 px cada destino dispone de poco ancho para icono y etiqueta. Verificar targets de 44 px, etiquetas y prioridad de Plan/Compra/Despensa en un dispositivo real antes de rediseñar.
6. **Home ofrece varias rutas de acción con jerarquía similar.** La comida actual y sus faltantes son útiles; recetas sugeridas y accesos a plan, compra y despensa se acumulan en el mismo recorrido. Reforzar la próxima acción contextual sin convertir el inicio en un dashboard.
7. **Una sola familia verde oscuro/lima domina casi todas las superficies.** El sistema resulta coherente, pero distingue poco entre cocinar, comprar, disponibilidad y exploración. Definir colores por rol y acompañar estados con texto/icono. Esto es juicio visual; no se certificó contraste.
8. **La ficha de receta comunica bien lo inmediato, pero el hero consume mucha altura móvil.** Título, tiempo, tipo, faltantes e ingredientes son escaneables; reducir el espacio de la imagen facilitaría llegar a ingredientes y pasos con menos scroll, conservando la foto como contexto.
9. **La despensa vacía explica qué hacer, pero el crecimiento de la lista requiere búsqueda.** El estado de cero productos es claro. Para inventarios reales, KH-029 ya señala que hace falta encontrar y editar productos sin recorrer una lista extensa.
10. **La landing no demuestra el ciclo completo antes del registro.** La promesa y las recetas se entienden, pero no hay una muestra reconocible de semana, faltantes y lista resultante ni CTA de cierre claro. Añadir una demostración concreta y consistente con el producto actual (KH-043 pendiente).

## Hallazgos por dimensión

- **Jerarquía y densidad:** el detalle de receta separa título, tiempo, estado de ingrediente y pasos con claridad. Plan y compra preservan información funcional, pero la reiteración dificulta el escaneo en móvil.
- **Estados y cantidades:** la lista distingue necesidad y origen semanal, y deja explícito que el contenido del envase no está especificado. No borrar este `unknown` al compactar. El detalle presenta «Falta 1 ingrediente» y cantidad culinaria separada.
- **Acciones:** el CTA de preparar compra en el plan es visible. El sheet de añadir a lista muestra búsqueda, sugerencias y modo manual; el de despensa ofrece búsqueda/sugerencias. Ambos son overlays oscuros con opciones visibles y necesitan comprobación con teclado móvil.
- **Home y catálogo:** home ya responde «qué toca hoy» mediante una receta actual y sus faltantes. Explorar es visualmente denso; consistencia de foto y jerarquía entre nombre, precio/peso y estimación keto merecen refinamiento.
- **Tipografía y color:** cantidades y títulos principales se distinguen. El verde lima funciona para acción, pero no debe comunicar estado por sí solo. Contraste AA pendiente de medición.
- **Responsive:** las ocho superficies autenticadas se capturaron a 320/390/768/1280 sin overflow horizontal del documento. Esto no equivale a validar todos los componentes, texto ampliado o dispositivos físicos.
- **Motion y accesibilidad:** no auditados exhaustivamente. Mantener foco y posición de fila en cambios, targets ≥44 px, navegación por teclado y `prefers-reduced-motion` como criterios de implementación.

## Capturas

Prefijo `current/`; cada superficie principal está disponible como `-{320,390,768,1280}.png`.

| Superficie | Archivos | Estado / foco |
|---|---|---|
| Landing | `landing-*` | Página pública y propuesta de valor |
| Login y términos | `login-390.png`, `terms-390.png` | Acceso y aceptación local |
| Home | `home-*` | Comida actual, sugerencias y accesos |
| Plan semanal | `weekly-plan-*` | 28 slots y acción de preparar compra |
| Detalle de receta | `recipe-detail-*` | Queso curado con aceitunas, faltantes e ingredientes |
| Comidas | `meals-*` | Lista de recetas y filtros |
| Lista de compra | `shopping-list-*` | 39 necesidades semanales |
| Despensa | `inventory-*` | Estado vacío válido |
| Explorar | `explore-*` | Catálogo de alimentos |
| Preferencias | `preferences-*` | Restricciones y ajustes |
| Sheets | `pantry-add-sheet-390.png`, `shopping-add-sheet-390*.png` | Alta y búsqueda contextual |

## Límites

La comparación sí consultó la web pública de Appllama; el MCP no está conectado a esta sesión. Los resultados de catálogo y previews se documentan en `COMPETITIVE-RESEARCH.md`; la mayoría de pantallas detalladas requiere Pro. No se inspeccionaron las apps nativas interactivamente. `/register` quedó sin captura válida. No se alteró código de producto, CSS, rutas, APIs, esquema ni dependencias; tampoco se ejecutó la suite de tests, commit o deploy.
