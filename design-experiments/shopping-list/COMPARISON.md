# Comparación before / after

## Capturas

`before/` y `after/` muestran el mismo fixture sintético de 39 filas, 33 pendientes y 6 compradas en viewport 390, con necesidades/envases mixtos, tres necesidades desconocidas y un producto con motivo «Plan semanal · lunes, comida». Los escenarios 5/15 quitan filas mediante API en la base temporal; son checks de densidad, no datasets reales. El fixture no recrea 28 slots semanales completos.

Las capturas `*-full.png` son full-page: la navegación inferior fija puede aparecer dentro de la imagen al pasar la altura inicial; las capturas `*-top.png` / `*-mid.png` / `*-end.png` reflejan la vista de viewport. La cuenta y SQLite eran desechables y locales. Se simularon error HTTP, compra, descompra por teclado y borrar/deshacer solo en esa cuenta.

## 390 px — heurística

| Criterio | Before | After | Lectura |
|---|---|---|---|
| Densidad sin scroll (844 px de alto) | Aproximadamente 5–6 filas parciales/visibles. | Aproximadamente 8–9 filas visibles según el grupo/cantidad. | Mejora de barrido; no es medición científica. La categoría y el header ocupan parte del viewport. |
| Competencia por fila | Check, thumbnail, nombre, necesidad, texto original repetido, envase, compra, precio y controles de paquete. | Check, nombre, necesidad, envase/compra y disclosure. | Baja el ruido frontal; los detalles requieren un toque adicional. |
| Claridad de acción | Target circular existente de 44 px, compite visualmente con thumbnail/steppers. | Target de 48 px con una sola acción principal por fila. | Se identifica de inmediato; al marcar la fila cambia a sección Comprados. |
| Cantidad | Repite necesidad, texto original y paquete en varias líneas; control de paquete puede parecer una cantidad de compra sin separar la semántica. | «Necesitas …» y «Envase: … · compra …» en renglones distintos. | Menos ambigua si los campos existen; dato ausente sigue por confirmar. |
| Unknown | Campo y envase desconocidos se repiten en bloque de cuatro líneas. | «Cantidad por confirmar» y/o «Envase por confirmar» visibles, texto original detrás de disclosure. | Unknown se distingue como falta de dato, no como cero/error. |
| Comprado | Sección al final, strikethrough/atenuación, más metadata repetida. | Sección al final; check verde, rótulo «Comprado», necesidad y acción de devolver. | Estado legible sin depender del tachado; la fila se desplaza fuera de su zona original. |
| Navegación | Bottom nav fijo consume aproximadamente la misma franja. | Sin nuevos sticky bars; bottom nav igual. | No empeora la interferencia; sigue limitando viewport de 320/390. |

## Desktop

A 1280 el shell experimental se amplía, alinea navegación/contenido y pone secciones en dos columnas; el header y las filas siguen siendo simples. A 768 se usa una columna completa. La navegación inferior fija continúa siendo un patrón de la aplicación y puede parecer móvil en desktop; no se rediseñó fuera del scope.

## 5 / 15 / 39+ y adversarial

- 5 y 15 pendientes usan las mismas filas; no se activan filtros/capas de búsqueda solo por cantidad.
- 39+ queda en una lista larga pero dividida en grupos con contadores. En 100 filas se capturó altura completa; la tabla no se pagina ni añade carga progresiva.
- Names/units largos hacen wrap y no usan `white-space: nowrap`; productos sin imagen se ven igual porque el concepto omite thumbnails.
- Error purchase conserva la fila y anuncia error; la repetición de compra utiliza el lock y la API existentes. Se probó un HTTP 500 interceptado en el navegador local.
- La tecla Enter desmarca un producto comprado. Quitar una fila desde detalles y tocar Deshacer la restaura mediante el handler existente.
- `prefers-reduced-motion: reduce` estaba activo en el contexto de captura. La lógica de remove existente salta su espera/transición bajo esa preferencia.
- En 100 filas, el contador y los 100 elementos se verificaron en DOM; no hubo overflow horizontal a 320 ni 390 px. Capturas: `after/100-320.png` y `after/100-390.png`.
- Se capturó el estado de todo comprado con 5 elementos (`after/all-bought-390.png`) y lista vacía (`after/empty-390.png`). No hay overflow horizontal en 320/390 px. La navegación fija hace que la captura full-page pueda incluirse dentro de la imagen.

## Resultado de validación automatizada

La suite E2E completa ejecutó 101 pruebas: 86 pasaron y 14 fallaron porque la preparación de datos/planes devolvió HTTP 422 en `/api/weekly-plan/generate` antes de entrar en sus escenarios; una quedó omitida. El fallo de KH-027 impidió validar esa ruta de extremo a extremo con este fixture. Las pruebas de navegador sí llegaron a validar compra, error, descompra y deshacer desde la lista. La causa del 422 no se investigó ni se corrigió aquí porque pertenece al generador del plan y queda fuera del experimento visual. La primera ejecución con el ejecutable Chromium de Playwright no pudo arrancar; el recuento anterior usa Chrome local mediante configuración temporal.

## Qué empeora

- La categoría es una aproximación a zonas, no la disposición real de esa tienda. Cinco grupos pueden ser exceso para listas pequeñas.
- Marcar desplaza la fila a Comprados; quien sigue un recorrido en orden puede perder su referencia espacial. El mensaje/estado confirma compra, pero no conserva la fila en sitio.
- Abrir detalles y acceder a ajustar paquetes cuesta un toque más; un texto largo/unknown requiere abrir disclosure para recuperar la cadena original.
- Se oculta el total estimado de cabecera y precios por fila quedan en detalle. Se pierde comparación económica rápida, útil para algunas personas.
- Desktop muestra dos columnas de zona; esto aprovecha espacio, pero el orden de lectura izquierda/derecha puede diferir del recorrido de la tienda.
- No hay categoría corregible ni ubicación por supermercado. El shell oscuro heredado se mantiene en navegación/toast/sheet, por lo que el experimento no constituye una identidad unificada.
