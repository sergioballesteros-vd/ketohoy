# Tres direcciones visuales

Las tres mantienen los mismos contratos de datos y la misma arquitectura web. Difieren en jerarquía, densidad, protagonismo de fotografía y orientación de navegación.

## A — Cocina cotidiana (recomendada)

- **Concepto/sensación:** ayuda culinaria sencilla, confiable y amable; “sé qué toca y qué falta”.
- **Tipografía:** sans humanista/legible para UI; serif opcional solo para titulares de receta editoriales. Números tabulares en ingredientes/lista.
- **Densidad:** media y ajustada al momento; lista alta densidad, home baja, semana compacta.
- **Superficies/cards:** base marfil suave y capas blancas cálidas; cards solo para contenido que se puede elegir, filas para inventario.
- **Color:** conservar verde bosque como identidad con lima para acción primaria puntual; sumar crema, tomate/ámbar, grises cálidos. Estados con texto/icono, no solo tinte.
- **Foto/iconografía:** fotografía apetitosa, recorte consistente; miniaturas en plan; iconos lineales simples con etiquetas en estados.
- **Navegación:** móvil con Inicio, Plan, Compra, Despensa; Explorar accesible desde Inicio y navegación secundaria. Desktop añade lateral/rail y área ancha.
- **Motion:** sutil y explicativo: check, swap, alta en lista; transición de sheet breve y reversible.
- **Ventajas:** habla de comida, soporta datos secundarios y no parece tracker ni ecommerce.
- **Riesgos:** paleta cálida + cards puede parecer template wellness; restringir radios, sombras y badges, conservar jerarquía por tarea.

### Moodboard A

- **Mealime:** puente semana → compra → cocinar; referencia de continuidad, no de estilo.
- **Paprika:** ingredientes e instrucciones como piezas de trabajo durante cocina.
- **Bring!:** orden de productos basado en recorrido del súper; tomar grupos revisables y fila detallada, no sus tiles.
- **Apple Reminders Grocery:** categorías reconocibles y corrección simple, no asumir IA disponible.
- **Cronometer:** procedencia/targets como apoyo contextual en detalle; sin trasladar tracking/calorie wheel.

### Tokens de partida A

- Spacing 4/8/12/16/24/32/48 px; gutters 16 px en 390, 20–24 en tablet, max width de lectura 720–800.
- Radios: 8 px controles/fila, 12 px cards, 16 px sheet; evitar pills salvo tags cortos.
- Tipo: 12 metadata, 14 secundario, 16 cuerpo/lista, 20 título de área, 28–32 título de pantalla. Cantidad/producto nunca menos de 16 en compra.
- Superficies: page warm-white; primary surface white; inset warm gray; forest reservado para nav/identity/high emphasis.
- Border 1 px cálido para límites; sombra solo overlays/sheet; sin glow.
- Roles: forest/nav; lime CTA primario; text ink; muted gray; availability colors de estado revisadas a AA con par texto/icon.
- Motion: 120–180 ms ease-out en feedback, 180–240 ms sheet; sin autoplay.

## B — Recetario editorial

- **Concepto/sensación:** revista culinaria contemporánea, inspira explorar y cocinar con calma.
- **Tipografía:** serif expresiva en títulos y sans sobria en UI; ingredientes con sans tabular para mantener cantidades ordenadas.
- **Densidad:** baja; más espacio y menos metadata en listas.
- **Superficies/cards:** páginas blancas, bloques de color casi ausentes, imagen a sangre en portada de receta; cards visuales.
- **Color:** crema/blanco, carbón, verdes herbales y acento cítrico pequeño.
- **Foto/iconografía:** foto grande, tratamiento/crop coherente; iconos pocos y universales.
- **Navegación:** tabs más discretos, Explore prominent; plan en calendario/día.
- **Motion:** crossfade corto de imágenes y expansión de ingredientes.
- **Ventajas:** mayor apetito y descubrimiento, diferenciarse de fitness.
- **Riesgos:** supermercado y plan de 28 comidas se vuelven largos; fotos inconsistentes rompen la dirección; accessibility y contraste de texto sobre foto.

### Moodboard B

- **Samsung Food:** guardado de recetas conectadas con menú semanal y compra.
- **Paprika:** detalle de receta que ayuda durante cocción.
- **Mealime:** listas de ingredientes convertidas en lista agrupada.
- **YAZIO:** sección reconocible de recetas, para organizar descubrimiento sin heredar sus métricas.

### Tokens de partida B

- Spacing 4/8/16/24/32/48/64; márgenes mayores y máximo 840 px.
- Radios 4/8 px; cards cuadradas; imagen 4:3/3:2 consistente; evita sombras.
- Tipo serif 32–40 display / 26–30 recipe, sans 16 body, 13 meta, 16 quantity.
- Superficie blanco/crema; hairlines tenues; fotografías no llevan texto operativo encima.
- Paleta carbon/cream/leaf; lime solo para confirmación.
- Motion 180–260 ms para paneles y cambio de fotografía; pasos/compra casi instantáneos; reduced-motion corta desplazamiento y fades largos.

## C — Despensa al mando

- **Concepto/sensación:** herramienta práctica y muy rápida, como una lista bien ordenada en cocina/supermercado.
- **Tipografía:** sans neutral con números tabulares; jerarquía directa y títulos compactos.
- **Densidad:** alta pero ordenada; muchas filas con grupos persistentes.
- **Superficies/cards:** casi todo son filas/listas, bordes y separadores; muy pocas cards.
- **Color:** blanco/gris claro y carbón; verde como un estado o control puntual, semántica consistente para stock/compra.
- **Foto/iconografía:** miniatura opcional solo en Explore/detail; iconos auxiliares.
- **Navegación:** Compra/Despensa dominan la barra; plan y explorar en destinos adyacentes.
- **Motion:** mínimo; confirmar cambios localmente, insertar/quitar sin salto brusco.
- **Ventajas:** mejor para supermercado y grandes listas, reduce ruido visual.
- **Riesgos:** puede sentirse fría o administrativa y debilitar inspiración; requiere buena respuesta para usuarios nuevos.

### Moodboard C

- **Bring!:** modo list para cantidad y detalle, categoría/recorrido; no el mosaico promocional.
- **OurGroceries:** check elimina el item activo y deja lo comprado abajo.
- **Apple Reminders Grocery:** agrupación operable y corrección de categoría.
- **Grocy:** relación stock → disponibilidad de receta; extraer la lógica comprensible, no estética de ERP.
- **Todoist:** captura simple primero, atributos secundarios al expandir.

### Tokens de partida C

- Spacing 4/8/12/16/24/32; filas 56–64 px; separación entre grupos 20–24.
- Radios 4–8 px, botones 8; casi sin cards/shadows.
- Tipo 12 meta, 14 secondary, 16 list item, 18 section title; números tabulares y cantidad con peso 600.
- Page white, inset gray 50, border gray 200; acciones verde oscuro con texto blanco y foco visible.
- Estados foreground+label+icon; no depender del fondo. Error con affordance de reintento.
- 80–140 ms feedback; reordenamiento espacial solo si se conserva foco; reduce motion elimina slide/reflow.

## Recomendación

Elegir A. Incluye suficiente calidez/apetito para comida, conserva verde con propósito, da cabida a jerarquía de estado y no sacrifica la lista de tienda. La primera prueba debe mostrar una lista real y larga, cantidades mixtas, unknown y undo a 390 px, no un hero visual.

## Motion web

- **Botón:** pressed/focus claro en 80–120 ms; el resultado visual confirma la acción, no simula una escritura ya confirmada.
- **Sheet:** entra desde abajo en mobile y conserva overlay/foco; desktop puede usar diálogo lateral/centrado. Escape/backdrop/X comparten intención y focus return.
- **Insert/removal:** la nueva fila aparece cerca de su categoría con altura/opacity breve; compra mueve a final/plegable con posibilidad de deshacer. Evitar reordenar todo durante el tap.
- **Cambio de día:** estado seleccionado cambia de inmediato; scroll programático corto, controlable y sin animación bajo `prefers-reduced-motion`.
- **Skeleton/loading:** ocupa el tamaño de la fila final y etiqueta región busy; evita shimmer rápido.
- **Success/undo:** toast breve con acción contextual; el feedback no puede ocultar alerta ni deshacer otra acción.
- **Accesibilidad:** estado anunciado con regiones live sucintas, foco administrado y teclado; `prefers-reduced-motion: reduce` quita desplazamiento y transformaciones no esenciales.
