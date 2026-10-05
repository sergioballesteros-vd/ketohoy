# Principios de diseño para KetoHoy

## Dirección elegida: Cocina cotidiana

La app debe sentirse como una ayuda doméstica fiable que quita decisiones, no como nutricionista, ERP o tienda. El lenguaje visual puede abrir apetito, pero las decisiones de compra y stock deben ser más claras que la fotografía.

## Principios para resolver decisiones de UI

1. **En una tarea, una acción domina.** Home muestra qué comer y la siguiente acción; la lista muestra completar item; receta muestra empezar/cambiar de paso. La acción primaria ocupa una sola zona fija o una sola prominencia por pantalla.
2. **En compra, primero nombre + cantidad + estado.** Producto e intención de compra usan la tipografía más legible; foto, macro, marca y origen son secundarios o bajo demanda. Cada fila accionable tiene target táctil mínimo de 44 × 44 px.
3. **“No sabemos” debe parecer distinto de “no hay”.** `unknown`, `insufficient`, `missing` y `sufficient` tienen etiqueta y señal textual/iconográfica propia; el color nunca es la única señal. Unknown se expresa como “por revisar”, no como cero, disponible o faltante cuantificado.
4. **Conserva el porqué del faltante.** En una lista semanal, mostrar receta/día fuente al expandir; sumar solo requisitos compatibles y mantener el stock virtual y contribuciones. Nunca reemplazar necesidad culinaria, paquete elegido, compra y pantry stock por un solo número.
5. **28 comidas requieren zoom por tiempo.** El resumen semanal enseña completitud/días; móvil abre en el día actual con navegación de siete días y slots concisos. No poner 28 tarjetas grandes simultáneamente. En desktop, semana visible como matriz compacta.
6. **Cocinar y comprar son tareas diferentes.** Receta expone ingredientes/cantidades/paso activo; shopping deja solo detalles de compra. El hero no desplaza la información para cocinar y la fila de compra no hereda metadata de receta innecesaria.
7. **Preferencias críticas temprano; afinidad después.** Alergias/restricciones deben conocerse antes de recomendar; gustos/cocina/tiempos se preguntan de forma progresiva. Antes del formulario largo, mostrar el valor que habilita KetoHoy y ofrecer edición posterior.
8. **Nutrición no promete más confianza que la fuente.** Valor, base de referencia y procedencia se agrupan; estimado/desconocido se nombra como tal. Ningún badge de “keto” se infiere solo de un color, proveedor de supermercado o nombre de categoría.

## Consecuencias prácticas

- Texto directo en español cotidiano. Evitar tono médico, reto, castigo por no cumplir o `dashboard` de macros.
- Verde es marca/acción/estado con moderación; categoría y disponibilidad también usan icono + etiqueta.
- Fotos normalizadas por consistencia y adecuación al plato; sin foto sigue siendo una receta usable.
- Contrast AA, zoom/reflow, keyboard, foco perceptible y semantic labels forman parte de definición de listo. En lista, probar 320 y 390; en escritorio, 768 y 1280+.
- Motion web comunica causa, resultado y continuidad; `prefers-reduced-motion` omite desplazamiento animado no esencial y transiciones decorativas.
