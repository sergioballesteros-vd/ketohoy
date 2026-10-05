# Decisión

## Ganador: B — Zonas fiables

- Da una ruta visual de tienda con categorías reales del producto, sin intentar adivinar pasillos por el nombre.
- Mantiene visible lo que la persona necesita coger y si la cantidad o el envase está por confirmar.
- Reduce la fila a check, nombre y dos líneas semánticamente separadas; los detalles siguen disponibles en el mismo producto.
- Mantiene targets de 48 px, estados comprados claros y controles nativos de disclosure/teclado.
- No toca API, modelo, idempotencia, snapshots ni transferencia a despensa; el grupo cambia solo presentación.

La decisión es un ganador para este experimento visual, no una dirección validada en compra real ni un design system final. En 1280 px se amplía el shell solo cuando `?redesign=1`; en móvil no se añade otra barra fija.

## Data gaps que condicionan el ganador

- Las categorías son amplias y no describen el orden/pasillo de una tienda particular. Ninguna categoría, cadena desconocida o producto sin categoría cae en «Otros».
- El endpoint de lista no expone la disponibilidad de despensa por fila. El experimento no inventa `sufficient`, `insufficient`, `unknown` ni `missing`.
- Weekly source conserva clave y snapshots de backend, pero la fila no recibe un resumen humano de cada slot. El disclosure muestra razón o «compra del plan semanal» cuando `sourceKey` lo identifica, sin mostrar IDs/hash.
