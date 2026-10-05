# Tres conceptos

## A — Línea de paso

- **Jerarquía y fila:** check → nombre → necesidad/unidad; envase aparte. Una fila baja y separadores simples; disclosure nativo para el resto.
- **Agrupación:** lista plana, quizá ordenada por el usuario en una iteración futura.
- **Comprados:** al final, visibles/compactos; se pueden devolver a pendientes.
- **Cabecera/progreso:** «N pendientes · M comprados», sin precio ni porcentaje.
- **Unknown/envase:** texto «Cantidad por confirmar»; paquete por separado y explícito.
- **Origen:** solo en detalles.
- **Móvil:** densidad y barrido rápidos; orden indiferenciado deja al usuario organizar mentalmente la tienda.
- **Desktop:** una columna ancha o centrada, misma secuencia y targets.
- **A favor:** es la opción más neutral ante categorías erróneas y mantiene estable el orden.
- **En contra:** no ayuda a recorrer la tienda y exige más memoria de trabajo con 39 productos.

## B — Zonas fiables (elegido)

- **Jerarquía y fila:** misma fila compacta de A; los datos P0 permanecen juntos y los detalles contractuales se despliegan bajo demanda.
- **Agrupación:** cinco zonas amplias calculadas solo desde `Product.category`; producto sin categoría → «Otros».
- **Comprados:** sección visible al final, con check y rótulo «Comprado»; devolverlo a pendientes sigue en el mismo control.
- **Cabecera/progreso:** conteo pendiente/comprado y «Añadir». Sin barra, total o sticky extra.
- **Unknown/envase:** necesidad desconocida tiene etiqueta tranquila; paquete desconocido nunca hereda el valor de la necesidad.
- **Origen:** `reason` o fuente reconocible de `sourceKey` dentro de detalles; texto original literal allí también.
- **Móvil:** zonas al ancho completo, targets 48 px, sin foto ni steppers expuestos. No hay cabeceras sticky.
- **Desktop:** contenedor alineado con navegación y dos columnas de zonas desde ancho grande.
- **A favor:** conecta la lista con el recorrido físico aprovechando datos existentes, y se degrada con seguridad.
- **En contra:** las zonas no son pasillos; las secciones añaden ruido si solo hay cinco productos y una lista puede moverse de sección al marcar/comprar.

## C — Próxima necesidad

- **Jerarquía y fila:** estado/enfoque de la siguiente necesidad, nombre, cantidad y acceso al resto.
- **Agrupación:** siguiente sección ampliada y el resto plegado con conteos.
- **Comprados:** resumen plegado al final; deshacer desde su sección.
- **Cabecera/progreso:** pendiente global y una llamada a la siguiente zona.
- **Unknown/envase:** advertencia neutral, detalles a un toque.
- **Origen:** abrir la fila enfocada.
- **Móvil:** reduce información visible y puede guiar un recorrido si la tienda y las categorías se conocen.
- **Desktop:** dos columnas o navegación por zonas.
- **A favor:** menos elementos simultáneos para quien hace compras breves o repetitivas.
- **En contra:** una lista de 39 no debería esconder filas tras acordeones; obliga a recordar que hay más y puede no coincidir con el supermercado.

## Comparación y selección

Se elige B porque el problema es una lista real de 39, no un empty state: el agrupamiento ayuda a recorrerla, las categorías ya existen y la salida «Otros» no adivina. A es la alternativa más segura si un piloto demuestra que la taxonomía confunde. C no supera la prueba de transparencia con listas largas.
