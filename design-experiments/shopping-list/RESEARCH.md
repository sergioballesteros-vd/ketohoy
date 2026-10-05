# Research — lista de compra

## Alcance y evidencia

La investigación se hizo el 5 de octubre de 2026 con documentación pública de producto, búsqueda manual en Gummble y los contratos de KetoHoy. No se usaron Design MCP, Lookbook ni Mobbin Forge como autoridad. Se separa lo visto de lo deducido y de las decisiones del experimento.

## Referencias pertinentes

1. **Apple Reminders — Grocery lists** ([guía de soporte](https://support.apple.com/en-au/105086), [manual de iPhone](https://support.apple.com/guide/iphone/make-a-grocery-list-iph80ba26e1f/27/ios/27)). Referencia de lista de supermercado y secciones.
2. **Mealime — Grocery list** ([guía oficial](https://support.mealime.com/article/151-getting-started-guide), [cómo funciona](https://support.mealime.com/article/75-how-the-grocery-list-works)). Referencia cercana al camino plan semanal → ingredientes → compra física.
3. **Gummble — búsqueda pública «grocery list»** ([resultados](https://gummble.com/search?q=grocery+list&content_type=screens)). La búsqueda cargó 20 pantallas; 17 indicaban acceso de pago. Una vista libre de Rappi abierta desde los resultados era una pantalla de dirección, no una lista operativa, así que no se usa como evidencia de patrón. El límite de acceso no justifica completar el benchmark con pantallas irrelevantes.
4. **KetoHoy — categorías y contrato actuales** ([categorías](../../src/lib/categories.ts), [contrato KH-005](../../audit-assets/kh-005/CONTRACT.md)). Evidencia local para decidir qué agrupación es posible sin inferir pasillos desde nombres.

## OBSERVED — visto o documentado en la fuente

- Apple Reminders separa una lista de supermercado en categorías automáticas, permite recolocar un producto y recuerda una corrección manual. La guía incluye secciones como Produce, Meat y Frozen Foods.
- Mealime describe una lista que reúne los ingredientes del plan y los ordena por departamentos; al tocar un ingrediente da acceso a cantidades/tamaños, sustitutos y recetas de origen. También indica marcar cada elemento durante la compra física.
- En Gummble los resultados de búsqueda fueron más pertinentes que las pantallas gratuitas que se podían abrir. No se observó en esa sesión una interacción real de check, comprado ni detalle de grocery list; no se atribuye a Gummble ningún patrón visual usado aquí.
- KetoHoy ya almacena una categoría seleccionada para el producto en el catálogo: `meat`, `fish`, `eggs`, `dairy`, `vegetables`, `fruit`, `nuts`, `oils`, `sauces`, `drinks` u `other`. La lista puede no tener producto/categoría asociada.
- El contrato separa `requiredQuantity`/`requiredUnit`, texto original, contenido del envase, `purchaseQuantity`, stock y los orígenes `sourceKey`; unknown es válido y no se convierte en cero. Las filas por receta/slot se conservan separadas y compradas no se reabren al regenerar.

## INFERRED — conclusión a partir de varias fuentes

- Las secciones de supermercado pueden acortar el barrido de una lista larga, pero un orden rígido por tienda es frágil: cambia por tienda y la categoría de producto no identifica un pasillo exacto.
- El patrón útil para KetoHoy es una sección amplia y corregible en el futuro, con un destino neutral para categoría ausente/no reconocida; no una predicción por nombre de ingrediente.
- Nombre, necesidad culinaria y check resuelven la acción inmediata. Cantidad original, paquete, precio y procedencia aportan contexto secundario, pero esconderlos no debe borrar diferencias de dominio.
- El conteo pendiente comunica mejor «qué falta» que una barra decorativa. El porcentaje o una cifra grande no añade decisión para esta tarea.

## PROPOSED — decisiones de este experimento

- Agrupar por zonas amplias solo desde `product.category`: Fruta y verdura; Carne y pescado; Refrigerados; Despensa; Otros. La taxonomía no identifica pasillos: «Otros» absorbe categoría ausente/desconocida, y se mostrará el nombre de zona, no un número de pasillo.
- Mantener en cada fila check, nombre, cantidad necesaria honesta y estado del envase; pasar texto original, procedencia y ajuste del número de paquetes a un disclosure nativo.
- No mostrar fotos, total/precio en la jerarquía principal, filtros, búsqueda, ofertas ni navegación fija adicional. Usar el bottom nav que ya tiene la aplicación.
- Mantener comprados al final, visibles y distinguibles con icono, texto «Comprado» y acción accesible para devolver a pendientes. El check existente conserva la operación de unpurchase y su transferencia de despensa.

## Límites del research

Solo hay dos referencias de producto con guías públicas útiles y ninguna sesión con personas comprando en tienda. Gummble Free no permitió observar la lista relevante; sus resultados no se presentaron como prueba. Las capturas locales usan datos sintéticos para probar densidad; no miden frecuencia, retención ni satisfacción.
