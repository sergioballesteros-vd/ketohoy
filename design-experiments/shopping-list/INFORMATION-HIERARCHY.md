# Jerarquía de información de Shopping List

Inventario basado en `ShoppingListPage`, `ShoppingItem`, el `GET /api/shopping-list`, `Product.category` y KH-005. P2 sigue estando disponible; P2 no significa dato descartado.

| Nivel | Información | Exposición en el experimento | Motivo |
|---|---|---|---|
| P0 | Check / comprado / devolver a pendientes | Target de 48 px en la fila; icono y etiqueta visible de «Comprado» | Acción física rápida y estado comprensible sin depender solo del color o del tachado. |
| P0 | Nombre del producto/ingrediente | Primera línea, tipografía de fila | Identifica qué coger. Admite saltos de línea. |
| P0 | Necesidad culinaria: valor + unidad | «Necesitas …» solo si existen ambos campos | Explica el requisito de receta; no equivale a envases que comprar. |
| P0 | Necesidad no numérica/unknown | «Cantidad por confirmar» | Incertidumbre honesta; nunca muestra cero ni inventa equivalencia. |
| P0 | Envase conocido/desconocido; número de paquetes solo si existe | Segunda línea: «Envase: …» o «Envase por confirmar», con el contador separado | No convierte 300 g necesarios en 300 g de compra. Un paquete conocido no implica contenido conocido. |
| P0 | Cantidad pendiente/comprada | Resumen textual en cabecera y conteo por grupo | Responde cuánto falta sin porcentaje decorativo. |
| P1 | Categoría de producto existente | Sección amplia a partir de `Product.category`; ausencia → Otros | Hace más recorrible la lista sin clasificar por heurística de nombre. No equivale a un pasillo. |
| P1 | `purchaseQuantity` y controles para ajustarla | Disclosure «Detalles y origen»; etiqueta «Paquetes de compra» | Conserva el ajuste existente con menos ruido en la fila principal. El valor sigue significando paquetes, no necesidad culinaria. |
| P1 | `Product.packageQuantity` + `packageUnit` | La fila muestra el contenido si está declarado; detalle conserva el dato | Mantiene separados contenido del producto y lo que pide la receta. |
| P2 | `originalIngredientText`, incluida cadena no parseable | Dentro de detalles, literalmente cuando existe | Conserva texto contractual y explica casos desconocidos sin elevarlo a cantidad verificada. |
| P2 | `reason`, receta/menú semanal inferido de `sourceKey` | Dentro de detalles; etiqueta genérica del origen si no hay explicación humana | Mantiene la procedencia accesible sin repetirla en todas las filas. El ID opaco no se enseña. |
| P2 | Precio de referencia | Dentro de detalles | Puede ayudar a planificar, pero no debe convertir una lista física en checkout. |
| P2 | `ShoppingListItem.quantity` histórico | No se presenta como cantidad física; queda como texto histórico tras detalles si `purchaseQuantity` es null | No reinterpretar el contador histórico como necesidad, paquetes o stock. |
| P2 | Historial checked, `pantryDelta`, `pantryCreated`, id de fila y trazabilidad weekly | Sigue en API/modelo y handlers existentes; el UI permite ver/comprar/descomprar. El disclosure muestra origen legible, no todos los IDs internos. | Trazabilidad y reversión no se borran al reducir densidad visual. |
| P2 | `Product.imageUrl` | Sin thumbnail en la fila experimental | En 39 filas la imagen consume ancho y compite con el nombre. Sigue asociada al producto. |
| P3 | `sourceKey` crudo, claves/hash/slot IDs, errores internos | Nunca visibles literalmente | Identificadores técnicos no ayudan a elegir un producto en la tienda. |
| P3 | Estado de disponibilidad de despensa | No presente en el contrato de lista que consume esta pantalla | La API de lista no ofrece `sufficient / insufficient / unknown / missing` por fila; no inventarlos ni reducirlos. La compra sigue transfiriendo stock mediante el handler existente. |

## Dato que falta

La categoría disponible es una taxonomía pequeña de producto, no un plano de tienda, orden editable ni corrección por usuario. El experimento degrada valores nulos/desconocidos a «Otros». Para availability, esta respuesta de lista tampoco entrega los cuatro estados; no se simula su presencia en la fila.
