# KH-025 — investigación previa al cambio (2026-10-03)

## Evidencia y límites

Fuente primaria: [schema oficial OFF](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/), propiedades `nutriments.carbohydrates` (disponibles, excluye fibra), `carbohydrates-total` (incluye fibra) y patrón `_100g` (g por 100 g o 100 ml para líquidos, producto vendido). El schema describe el objeto legacy `nutriments`, distinto del nuevo objeto `nutrition` v3.5. No inferimos la convención por país, prefijo EAN, nombre ni `countries_tags`.

Contexto europeo: Reglamento UE 1169/2011, anexo I, definiciones de hidratos de carbono y fibra; anexo XV, presentación separada. [Texto oficial](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32011R1169). Este contexto no sustituye el contrato del campo OFF.

Captura del endpoint realmente usado: https://world.openfoodfacts.org/api/v0/product/8480000348654.json. `off-8480000348654.json` conserva un extracto sin alterar los nutriments y metadatos de producto (consultado 2026-10-03). Almendra al natural Hacendado: carbohydrates_100g=5.9, fiber_100g=12.2, sugars_100g=5.9, nutrition_data_per=100g. URL de foto de etiqueta conservada; el visor web no pudo abrirla, por lo que no afirmamos haber verificado visualmente el envase. Contrato primario del campo + payload real demuestran la doble resta: max(0,5.9-12.2)=0, score 5; correcto 5.9, score 4. Regresión de handlers anterior falla: expected 5.9, received 0 (/tmp/kh025-before.log). IDs 7001–7005 son fixtures del catálogo; solo el EAN/nutriments de almendras son captura real.

## Mapa e inventario completo

| Fuente | Campo/basis recibido | Fibra | Incluye fibra / evidencia | Antes / transformación correcta |
| --- | --- | --- | --- | --- |
| Mercadona catálogo/detalle | RawHit: nombre, categoría, EAN, precios; NO se leen macros del payload | No se lee | No aplicable | normalizeMercadonaProducts → snapshot getMercadonaProduct; EAN → OFF. No asumir nutrición Mercadona |
| OFF por EAN (única API nutricional) | nutriments.carbohydrates_100g, g/100 g o 100 ml, vendido; no `_value`, `_serving` ni `_prepared` | fiber_100g, misma basis; ausente permanece null | NO, demostrado por schema del objeto recibido | fetchNutritionByEan copia → resolver resta universal → import persiste. Correcto: validar valor, identidad de disponibles, sin restar fibra |
| OFF carbohydrates-total | Campo documentado pero NO consumido por KetoHoy | Podría existir | SÍ en schema; no hay fuente productiva usada con ese campo | No introducir conversión nueva; si solo existe total, disponibles desconocidos. No inventar fibra 0 |
| Manual POST products | netCarbsPer100g explícito, g/100 g; no admite raw carbs/fibra | No se admite | Contrato declarado disponibles; exactitud usuario no verificable | Persistencia directa, sin resta. Score elegido/default y confianza estimada; no garantía nutricional |
| Seed (57 referencias) | netCarbsPer100g literal; sin fuente documental del número | Ausente | UNKNOWN en cuanto a origen; el nombre declara netos pero no demuestra cifras | Mantener referencias/manual y scores existentes, sin recalcular ni fabricar total/fibra |
| Legacy OFF persistido | carbsPer100g copiado; netCarbsPer100g derivado anteriormente; sin EAN/payload/fecha/convención persistidos | Puede faltar | UNKNOWN de la importación histórica concreta | No recalcular desde el contrato público actual. Conservar cifras para recuperación, marcar unknown y score conservador hasta reimportación |
| Demo / fallbacks | DEMO_MERCADONA_PRODUCTS: sin macros; categoría/nombre | Ausente | UNKNOWN | classifyProduct: category_estimate o unknown; nunca inventar disponibles |
| Recetas/ingredientes | Recipe sin macros; RecipeIngredient nombre, quantity string y productId | No campos propios | No aplicable | recipeScoring usa ketoLevel de Recipe, no el score nutricional de Product; no calcula ni suma carbohidratos. KH-005 fuera de alcance |

Flujo completo: Mercadona catálogo + detalle → normalizeMercadonaProducts → EAN → fetchNutritionByEan (única interpretación OFF) → snapshot resolver → classifyProduct (KH-007) → búsqueda/categoría/detalle; import reutiliza snapshot → Product → API products/search/pantry/shopping-list → UI KetoBadge/KetoNote/PantryItemSheet. Recetas usan su ketoLevel editorial, no macros ni scores nutricionales de productos. POST manual → Product directamente; seed → referencias manuales; compra libre → producto sin macros. No otras APIs nutricionales ni otra fórmula localizada (grafo search_code/trace_path, inventario de 126 coincidencias en src/prisma/e2e).

## Contrato diseñado antes del fix

Disponibles excluye fibra, sin descuentos de polioles. Normalización OFF una vez, en el adaptador; números ausentes, negativos, no finitos o inválidos quedan null. Fibra mayor que disponibles es válida (almendras demuestra el caso), no se limita ni resta. Scoring conserva exactamente thresholds 5/10/20/35/50 y consume solo disponibles validados. Total no utilizado no se transforma.

`nutritionConvention`: available_excluding_fiber para nuevas importaciones verificadas/manuales explícitos; unknown por defecto para legacy, semillas o datos ausentes. `nutritionSource`/clasificación KH-007 siguen indicando evidencia/confianza; convención no equivale a precisión del dato. Nombre SQL netCarbsPer100g se conserva por compatibilidad; cifra válida para scoring medido solo con convención/evidencia conocida. Legacy unknown puede conservar cifra antigua, que no debe mostrarse como netos ni usarse para score nutricional. carbsPer100g de nuevas importaciones OFF es disponibles, NO total; documentar cerca del schema y adaptador. Copy de OFF indica 100 g/ml porque `_100g` no distingue líquidos en su nombre.

Lectura readonly original: 74 productos: manual/category 9, mercadona/category 4, mercadona/manual 57, mercadona/openfoodfacts 4. Los cuatro OFF no tienen fibra guardada; no justifica declarar todos los legacy correctos. No actualizar original; SHA256 baseline 2bd85c08f82c3924a4dcd7491b396a36429465fe4d0b34d964b061b4ed6658ad.
