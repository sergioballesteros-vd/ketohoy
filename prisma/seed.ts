import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.resolve(__dirname, '../dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clear existing data in dependency order
  await prisma.weeklyMeal.deleteMany()
  await prisma.weeklyPlan.deleteMany()
  await prisma.shoppingListItem.deleteMany()
  await prisma.recipeIngredient.deleteMany()
  await prisma.pantryItem.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.product.deleteMany()
  await prisma.userPreferences.deleteMany()

  // Default user preferences
  await prisma.userPreferences.create({
    data: { ketoMode: 'flexible' },
  })

  // --- PRODUCTS ---
  const productData = [
    // Carnes
    { name: 'Pechuga de pollo', category: 'meat', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 31, fatPer100g: 3.6, caloriesPer100g: 165, tags: JSON.stringify(['proteína', 'rápido', 'versátil']) },
    { name: 'Muslos de pollo', category: 'meat', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 26, fatPer100g: 15, caloriesPer100g: 245, tags: JSON.stringify(['proteína', 'jugoso']) },
    { name: 'Carne picada de ternera', category: 'meat', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 26, fatPer100g: 20, caloriesPer100g: 290, tags: JSON.stringify(['proteína', 'versátil']) },
    { name: 'Bacon en lonchas', category: 'meat', ketoScore: 5, netCarbsPer100g: 0.5, proteinPer100g: 37, fatPer100g: 42, caloriesPer100g: 541, tags: JSON.stringify(['grasa', 'desayuno', 'crujiente']) },
    { name: 'Jamón serrano', category: 'meat', ketoScore: 4, netCarbsPer100g: 0.3, proteinPer100g: 30, fatPer100g: 8, caloriesPer100g: 241, tags: JSON.stringify(['proteína', 'sin cocinar']) },
    { name: 'Chorizo', category: 'meat', ketoScore: 4, netCarbsPer100g: 2, proteinPer100g: 24, fatPer100g: 38, caloriesPer100g: 455, tags: JSON.stringify(['embutido', 'grasa']) },
    { name: 'Salchichas de Frankfurt', category: 'meat', ketoScore: 3, netCarbsPer100g: 3, proteinPer100g: 12, fatPer100g: 27, caloriesPer100g: 310, tags: JSON.stringify(['rápido', 'procesado']) },
    { name: 'Lomo de cerdo', category: 'meat', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 29, fatPer100g: 9, caloriesPer100g: 242, tags: JSON.stringify(['proteína', 'plancha']) },
    { name: 'Filete de ternera', category: 'meat', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 28, fatPer100g: 14, caloriesPer100g: 250, tags: JSON.stringify(['proteína', 'plancha']) },
    { name: 'Pavo en lonchas', category: 'meat', ketoScore: 4, netCarbsPer100g: 1, proteinPer100g: 20, fatPer100g: 2, caloriesPer100g: 104, tags: JSON.stringify(['proteína', 'sin cocinar', 'bajo en grasa']) },
    // Pescados
    { name: 'Salmón fresco', category: 'fish', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 25, fatPer100g: 13, caloriesPer100g: 208, tags: JSON.stringify(['omega3', 'proteína']) },
    { name: 'Atún en aceite (lata)', category: 'fish', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 27, fatPer100g: 8, caloriesPer100g: 198, tags: JSON.stringify(['proteína', 'rápido', 'conserva']) },
    { name: 'Sardinas en aceite (lata)', category: 'fish', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 21, fatPer100g: 12, caloriesPer100g: 208, tags: JSON.stringify(['omega3', 'conserva']) },
    { name: 'Merluza congelada', category: 'fish', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 17, fatPer100g: 1.5, caloriesPer100g: 82, tags: JSON.stringify(['proteína', 'bajo en grasa']) },
    { name: 'Gambas congeladas', category: 'fish', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 24, fatPer100g: 1, caloriesPer100g: 106, tags: JSON.stringify(['proteína', 'mariscos']) },
    // Huevos
    { name: 'Huevos camperos (12 uds)', category: 'eggs', ketoScore: 5, netCarbsPer100g: 0.6, proteinPer100g: 13, fatPer100g: 11, caloriesPer100g: 155, tags: JSON.stringify(['proteína', 'versátil', 'desayuno']) },
    // Lácteos
    { name: 'Queso curado semicurado', category: 'dairy', ketoScore: 4, netCarbsPer100g: 0.5, proteinPer100g: 25, fatPer100g: 33, caloriesPer100g: 403, tags: JSON.stringify(['grasa', 'calcio', 'snack']) },
    { name: 'Queso fresco Burgos', category: 'dairy', ketoScore: 4, netCarbsPer100g: 2, proteinPer100g: 14, fatPer100g: 12, caloriesPer100g: 174, tags: JSON.stringify(['calcio', 'suave']) },
    { name: 'Queso mozzarella', category: 'dairy', ketoScore: 4, netCarbsPer100g: 2.2, proteinPer100g: 22, fatPer100g: 17, caloriesPer100g: 254, tags: JSON.stringify(['calcio', 'fundible']) },
    { name: 'Nata para cocinar', category: 'dairy', ketoScore: 4, netCarbsPer100g: 3, proteinPer100g: 2, fatPer100g: 35, caloriesPer100g: 337, tags: JSON.stringify(['grasa', 'salsas']) },
    { name: 'Mantequilla', category: 'dairy', ketoScore: 5, netCarbsPer100g: 0.6, proteinPer100g: 0.9, fatPer100g: 81, caloriesPer100g: 744, tags: JSON.stringify(['grasa', 'cocina']) },
    { name: 'Yogur griego natural sin azúcar', category: 'dairy', ketoScore: 4, netCarbsPer100g: 4, proteinPer100g: 10, fatPer100g: 5, caloriesPer100g: 97, tags: JSON.stringify(['probiótico', 'desayuno']) },
    { name: 'Nata montada', category: 'dairy', ketoScore: 4, netCarbsPer100g: 3, proteinPer100g: 2, fatPer100g: 35, caloriesPer100g: 337, tags: JSON.stringify(['grasa', 'postre']) },
    // Verduras
    { name: 'Lechuga iceberg', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 1.8, proteinPer100g: 0.9, fatPer100g: 0.1, caloriesPer100g: 14, tags: JSON.stringify(['fibra', 'ensalada', 'wrap']) },
    { name: 'Espinacas baby', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 1.4, proteinPer100g: 2.9, fatPer100g: 0.4, caloriesPer100g: 23, tags: JSON.stringify(['hierro', 'fibra', 'salteado']) },
    { name: 'Brócoli', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 4, proteinPer100g: 2.8, fatPer100g: 0.4, caloriesPer100g: 34, tags: JSON.stringify(['fibra', 'vitaminas', 'guarnición']) },
    { name: 'Calabacín', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 2.1, proteinPer100g: 1.2, fatPer100g: 0.3, caloriesPer100g: 17, tags: JSON.stringify(['versátil', 'guarnición']) },
    { name: 'Champiñones laminados', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 2, proteinPer100g: 3.1, fatPer100g: 0.3, caloriesPer100g: 22, tags: JSON.stringify(['umami', 'salteado']) },
    { name: 'Pepino', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 2.2, proteinPer100g: 0.6, fatPer100g: 0.1, caloriesPer100g: 15, tags: JSON.stringify(['refrescante', 'ensalada']) },
    { name: 'Tomates cherry', category: 'vegetables', ketoScore: 3, netCarbsPer100g: 5.8, proteinPer100g: 0.9, fatPer100g: 0.2, caloriesPer100g: 30, tags: JSON.stringify(['ensalada', 'vitamina C']) },
    { name: 'Aguacate', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 1.8, proteinPer100g: 2, fatPer100g: 15, caloriesPer100g: 160, tags: JSON.stringify(['grasa saludable', 'cremoso']) },
    { name: 'Pimiento rojo', category: 'vegetables', ketoScore: 3, netCarbsPer100g: 6, proteinPer100g: 1, fatPer100g: 0.3, caloriesPer100g: 31, tags: JSON.stringify(['vitamina C', 'color']) },
    { name: 'Cebolla morada', category: 'vegetables', ketoScore: 3, netCarbsPer100g: 8, proteinPer100g: 1.1, fatPer100g: 0.1, caloriesPer100g: 40, tags: JSON.stringify(['sabor', 'ensalada']) },
    // Frutos secos
    { name: 'Almendras naturales', category: 'nuts', ketoScore: 5, netCarbsPer100g: 4.7, proteinPer100g: 21, fatPer100g: 50, caloriesPer100g: 579, tags: JSON.stringify(['snack', 'grasa saludable']) },
    { name: 'Nueces peladas', category: 'nuts', ketoScore: 5, netCarbsPer100g: 3.7, proteinPer100g: 15, fatPer100g: 65, caloriesPer100g: 654, tags: JSON.stringify(['omega3', 'snack']) },
    { name: 'Anacardos naturales', category: 'nuts', ketoScore: 4, netCarbsPer100g: 22, proteinPer100g: 18, fatPer100g: 44, caloriesPer100g: 553, tags: JSON.stringify(['snack', 'moderado']) },
    // Aceites y salsas
    { name: 'Aceite de oliva virgen extra', category: 'oils', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 0, fatPer100g: 100, caloriesPer100g: 884, tags: JSON.stringify(['grasa saludable', 'cocina']) },
    { name: 'Mostaza Dijon', category: 'sauces', ketoScore: 5, netCarbsPer100g: 5, proteinPer100g: 4, fatPer100g: 4, caloriesPer100g: 66, tags: JSON.stringify(['condimento', 'sin azúcar']) },
    { name: 'Mayonesa', category: 'sauces', ketoScore: 5, netCarbsPer100g: 1, proteinPer100g: 1, fatPer100g: 75, caloriesPer100g: 680, tags: JSON.stringify(['grasa', 'condimento']) },
    // Más verduras
    { name: 'Coliflor', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 3, proteinPer100g: 1.9, fatPer100g: 0.3, caloriesPer100g: 25, tags: JSON.stringify(['fibra', 'versátil', 'guarnición']) },
    { name: 'Espárragos', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 2, proteinPer100g: 2.2, fatPer100g: 0.1, caloriesPer100g: 20, tags: JSON.stringify(['fibra', 'primavera', 'plancha']) },
    { name: 'Berenjena', category: 'vegetables', ketoScore: 4, netCarbsPer100g: 3, proteinPer100g: 1, fatPer100g: 0.2, caloriesPer100g: 25, tags: JSON.stringify(['versátil', 'relleno', 'horno']) },
    { name: 'Rúcula', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 2, proteinPer100g: 2.6, fatPer100g: 0.7, caloriesPer100g: 25, tags: JSON.stringify(['ensalada', 'picante', 'fresco']) },
    { name: 'Col rizada', category: 'vegetables', ketoScore: 5, netCarbsPer100g: 3.6, proteinPer100g: 4.3, fatPer100g: 0.9, caloriesPer100g: 50, tags: JSON.stringify(['hierro', 'salteado', 'fibra']) },
    { name: 'Puerro', category: 'vegetables', ketoScore: 3, netCarbsPer100g: 12, proteinPer100g: 1.5, fatPer100g: 0.3, caloriesPer100g: 61, tags: JSON.stringify(['sabor', 'salsas', 'moderado']) },
    // Más proteínas
    { name: 'Costillas de cerdo', category: 'meat', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 18, fatPer100g: 22, caloriesPer100g: 278, tags: JSON.stringify(['proteína', 'grasa', 'horno']) },
    { name: 'Bacalao congelado', category: 'fish', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 18, fatPer100g: 0.7, caloriesPer100g: 82, tags: JSON.stringify(['proteína', 'bajo en grasa', 'versátil']) },
    { name: 'Almejas', category: 'fish', ketoScore: 5, netCarbsPer100g: 2, proteinPer100g: 14, fatPer100g: 1, caloriesPer100g: 74, tags: JSON.stringify(['mariscos', 'vapor', 'rápido']) },
    { name: 'Mejillones', category: 'fish', ketoScore: 5, netCarbsPer100g: 3.7, proteinPer100g: 12, fatPer100g: 2, caloriesPer100g: 86, tags: JSON.stringify(['mariscos', 'vapor', 'omega3']) },
    { name: 'Sepia', category: 'fish', ketoScore: 5, netCarbsPer100g: 0.5, proteinPer100g: 16, fatPer100g: 1, caloriesPer100g: 79, tags: JSON.stringify(['mariscos', 'plancha', 'proteína']) },
    // Más lácteos
    { name: 'Ricotta', category: 'dairy', ketoScore: 4, netCarbsPer100g: 3, proteinPer100g: 11, fatPer100g: 13, caloriesPer100g: 174, tags: JSON.stringify(['cremoso', 'relleno', 'postre']) },
    { name: 'Crema de queso', category: 'dairy', ketoScore: 4, netCarbsPer100g: 3.5, proteinPer100g: 7, fatPer100g: 33, caloriesPer100g: 342, tags: JSON.stringify(['cremoso', 'untar', 'snack']) },
    { name: 'Queso parmesano', category: 'dairy', ketoScore: 4, netCarbsPer100g: 3.2, proteinPer100g: 36, fatPer100g: 29, caloriesPer100g: 431, tags: JSON.stringify(['intenso', 'rallado', 'gratinar']) },
    // Condimentos extra
    { name: 'Aceite de coco', category: 'oils', ketoScore: 5, netCarbsPer100g: 0, proteinPer100g: 0, fatPer100g: 100, caloriesPer100g: 884, tags: JSON.stringify(['grasa saludable', 'cocina', 'keto']) },
    { name: 'Vinagre de manzana', category: 'sauces', ketoScore: 5, netCarbsPer100g: 0.9, proteinPer100g: 0, fatPer100g: 0, caloriesPer100g: 22, tags: JSON.stringify(['condimento', 'sin azúcar', 'aliño']) },
    { name: 'Salsa de soja sin gluten', category: 'sauces', ketoScore: 3, netCarbsPer100g: 8, proteinPer100g: 8, fatPer100g: 0, caloriesPer100g: 60, tags: JSON.stringify(['umami', 'condimento', 'asiático']) },
    { name: 'Cacao en polvo sin azúcar', category: 'other', ketoScore: 4, netCarbsPer100g: 10, proteinPer100g: 20, fatPer100g: 11, caloriesPer100g: 228, tags: JSON.stringify(['postre', 'chocolate', 'sin azúcar']) },
  ]

  const products = await Promise.all(
    productData.map((data) =>
      prisma.product.create({ data: { ...data, source: 'mercadona' } })
    )
  )

  // Helper to find product id by name substring
  const pid = (nameFragment: string): string | null => {
    const p = products.find((p) => p.name.toLowerCase().includes(nameFragment.toLowerCase()))
    return p ? p.id : null
  }

  // --- RECIPES ---
  const recipesData = [
    // Desayunos
    {
      title: 'Huevos revueltos con bacon y aguacate',
      description: 'Cremosos huevos revueltos acompañados de bacon crujiente y aguacate fresco.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 10,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Cortar el bacon en tiras y freír en sartén a fuego medio hasta que esté crujiente.',
        'Batir los huevos con sal y pimienta.',
        'Bajar el fuego y añadir los huevos a la sartén, remover constantemente hasta que estén cremosos.',
        'Servir con medio aguacate en rodajas y el bacon encima.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '3 uds', key: 'huevos' },
        { name: 'Bacon en lonchas', qty: '3 lonchas', key: 'bacon' },
        { name: 'Aguacate', qty: '1/2 ud', key: 'aguacate' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cdta', key: 'aceite' },
      ],
    },
    {
      title: 'Tortilla de queso y jamón',
      description: 'Tortilla francesa rellena de queso fundido y jamón serrano.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 8,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Batir 3 huevos con sal y pimienta.',
        'Calentar mantequilla en sartén antiadherente.',
        'Verter los huevos y dejar cuajar a fuego medio-bajo.',
        'Añadir el queso y el jamón en un lado, doblar la tortilla y servir.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '3 uds', key: 'huevos' },
        { name: 'Queso curado semicurado', qty: '40g', key: 'queso' },
        { name: 'Jamón serrano', qty: '2 lonchas', key: 'jamón' },
        { name: 'Mantequilla', qty: '1 cdta', key: 'mantequilla' },
      ],
    },
    {
      title: 'Yogur griego con nueces y canela',
      description: 'Bol de yogur griego natural con nueces y un toque de canela.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 3,
      difficulty: 'very_easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['desayuno', 'sin cocinar', 'probiótico']),
      steps: JSON.stringify([
        'Poner el yogur en un bol.',
        'Añadir un puñado de nueces por encima.',
        'Espolvorear con canela al gusto y servir.',
      ]),
      ingredients: [
        { name: 'Yogur griego natural sin azúcar', qty: '200g', key: 'yogur' },
        { name: 'Nueces peladas', qty: '30g', key: 'nueces' },
      ],
    },
    {
      title: 'Huevos fritos con bacon',
      description: 'Clásicos huevos fritos acompañados de bacon crujiente, desayuno keto perfecto.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 8,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Freír el bacon en sartén hasta que esté crujiente; reservar.',
        'En la misma sartén con la grasa del bacon, freír los huevos a fuego medio.',
        'Sazonar con sal y pimienta y servir junto al bacon.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '2 uds', key: 'huevos' },
        { name: 'Bacon en lonchas', qty: '4 lonchas', key: 'bacon' },
      ],
    },
    {
      title: 'Revuelto de espinacas y queso',
      description: 'Suave revuelto de huevos con espinacas baby salteadas y queso fundido.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 12,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'hierro', 'sin gluten']),
      steps: JSON.stringify([
        'Saltear las espinacas con mantequilla en sartén a fuego medio 2 minutos.',
        'Batir los huevos y verter sobre las espinacas.',
        'Remover suavemente a fuego bajo hasta que estén casi cuajados.',
        'Añadir el queso rallado, apagar el fuego y mezclar hasta fundir.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '3 uds', key: 'huevos' },
        { name: 'Espinacas baby', qty: '60g', key: 'espinacas' },
        { name: 'Queso mozzarella', qty: '40g', key: 'mozzarella' },
        { name: 'Mantequilla', qty: '1 cdta', key: 'mantequilla' },
      ],
    },
    // Comidas
    {
      title: 'Ensalada keto de pollo y aguacate',
      description: 'Refrescante ensalada con pollo a la plancha, aguacate cremoso y aderezo de aceite de oliva.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 15,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['ensalada', 'sin gluten', 'fresco']),
      steps: JSON.stringify([
        'Cocinar la pechuga de pollo a la plancha con sal y pimienta; dejar reposar y cortar en tiras.',
        'Lavar y trocear la lechuga iceberg.',
        'Cortar el aguacate en cubos y los tomates cherry por la mitad.',
        'Mezclar todo en un bol, aliñar con aceite de oliva y sal.',
      ]),
      ingredients: [
        { name: 'Pechuga de pollo', qty: '150g', key: 'pechuga' },
        { name: 'Lechuga iceberg', qty: '1/2 ud', key: 'lechuga' },
        { name: 'Aguacate', qty: '1 ud', key: 'aguacate' },
        { name: 'Tomates cherry', qty: '8 uds', key: 'tomates' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Salmón al horno con brócoli',
      description: 'Filete de salmón al horno con brócoli al vapor, rico en omega-3 y proteínas.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['horno', 'omega3', 'sin gluten']),
      steps: JSON.stringify([
        'Precalentar el horno a 200°C.',
        'Colocar el salmón en bandeja, salpimentar y rociar con aceite de oliva.',
        'Hornear 15 minutos hasta que esté hecho.',
        'Mientras, cocer el brócoli al vapor 8 minutos; salpimentar y servir junto al salmón.',
      ]),
      ingredients: [
        { name: 'Salmón fresco', qty: '200g', key: 'salmón' },
        { name: 'Brócoli', qty: '200g', key: 'brócoli' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Hamburguesa sin pan con queso y lechuga',
      description: 'Jugosa hamburguesa de ternera envuelta en lechuga en lugar de pan, con queso fundido.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin gluten', 'proteína', 'rápido']),
      steps: JSON.stringify([
        'Formar 2 hamburguesas con la carne picada, salpimentar.',
        'Cocinar en sartén caliente 4 minutos por lado.',
        'Poner el queso encima del último minuto para que funda.',
        'Envolver cada hamburguesa en hojas de lechuga iceberg con mostaza Dijon.',
      ]),
      ingredients: [
        { name: 'Carne picada de ternera', qty: '200g', key: 'ternera' },
        { name: 'Queso curado semicurado', qty: '2 lonchas', key: 'queso' },
        { name: 'Lechuga iceberg', qty: '4 hojas', key: 'lechuga' },
        { name: 'Mostaza Dijon', qty: '1 cda', key: 'mostaza' },
      ],
    },
    {
      title: 'Pollo a la plancha con ensalada verde',
      description: 'Sencillo pollo a la plancha acompañado de una ensalada verde con pepino y aceite de oliva.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 12,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['rápido', 'sin gluten', 'ligero']),
      steps: JSON.stringify([
        'Salpimentar la pechuga de pollo y cocinar a la plancha 5-6 minutos por lado.',
        'Mientras, preparar la ensalada con lechuga y pepino en rodajas.',
        'Aliñar la ensalada con aceite de oliva y sal.',
        'Servir el pollo junto a la ensalada.',
      ]),
      ingredients: [
        { name: 'Pechuga de pollo', qty: '180g', key: 'pechuga' },
        { name: 'Lechuga iceberg', qty: '1/2 ud', key: 'lechuga' },
        { name: 'Pepino', qty: '1/2 ud', key: 'pepino' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Atún con tomates cherry y aceite de oliva',
      description: 'Plato rápido de atún en conserva con tomates cherry y un buen chorro de aceite de oliva.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 5,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin cocinar', 'rápido', 'conserva']),
      steps: JSON.stringify([
        'Escurrir el atún y colocarlo en un plato.',
        'Cortar los tomates cherry por la mitad y añadirlos.',
        'Aliñar con aceite de oliva, sal y pimienta.',
        'Opcional: añadir un poco de mostaza para dar sabor.',
      ]),
      ingredients: [
        { name: 'Atún en aceite (lata)', qty: '2 latas', key: 'atún' },
        { name: 'Tomates cherry', qty: '10 uds', key: 'tomates' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
        { name: 'Mostaza Dijon', qty: '1 cdta', key: 'mostaza' },
      ],
    },
    {
      title: 'Calabacines rellenos de carne picada',
      description: 'Calabacines vaciados y rellenos con sofrito de carne picada de ternera gratinados con queso.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 25,
      difficulty: 'medium',
      ketoLevel: 'strict',
      tags: JSON.stringify(['horno', 'relleno', 'sin gluten']),
      steps: JSON.stringify([
        'Precalentar horno a 200°C. Partir los calabacines por la mitad y vaciar la pulpa.',
        'Sofreír la carne picada con sal y pimienta en sartén 5 minutos; mezclar con la pulpa picada.',
        'Rellenar los calabacines con la mezcla de carne.',
        'Cubrir con queso rallado y hornear 15 minutos hasta dorar.',
      ]),
      ingredients: [
        { name: 'Calabacín', qty: '2 uds', key: 'calabacín' },
        { name: 'Carne picada de ternera', qty: '250g', key: 'ternera' },
        { name: 'Queso mozzarella', qty: '80g', key: 'mozzarella' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Ensalada de gambas y aguacate',
      description: 'Fresca ensalada con gambas cocidas, aguacate y un aderezo de mayonesa y limón.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 10,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['mariscos', 'sin gluten', 'fresco']),
      steps: JSON.stringify([
        'Descongelar y cocer las gambas en agua con sal 3 minutos; escurrir y enfriar.',
        'Cortar el aguacate en dados.',
        'Mezclar gambas y aguacate con la lechuga.',
        'Aliñar con mayonesa y un chorrito de limón.',
      ]),
      ingredients: [
        { name: 'Gambas congeladas', qty: '200g', key: 'gambas' },
        { name: 'Aguacate', qty: '1 ud', key: 'aguacate' },
        { name: 'Lechuga iceberg', qty: '1/4 ud', key: 'lechuga' },
        { name: 'Mayonesa', qty: '2 cdas', key: 'mayonesa' },
      ],
    },
    // Cenas
    {
      title: 'Pollo con salsa cremosa de nata',
      description: 'Pechugas de pollo cocinadas en una rica salsa cremosa de nata y especias.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['cremoso', 'sin gluten', 'salsa']),
      steps: JSON.stringify([
        'Cortar el pollo en trozos y dorar en sartén con aceite de oliva.',
        'Añadir la nata para cocinar, sal, pimienta y dejar reducir 8 minutos a fuego medio.',
        'Rectificar de sal y servir caliente.',
      ]),
      ingredients: [
        { name: 'Pechuga de pollo', qty: '300g', key: 'pechuga' },
        { name: 'Nata para cocinar', qty: '200ml', key: 'nata' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Revuelto de calabacín y queso',
      description: 'Tierno calabacín salteado mezclado con huevos revueltos y queso fundido.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 10,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['vegetariano', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Cortar el calabacín en dados pequeños y saltear con aceite de oliva 4 minutos.',
        'Batir los huevos con sal.',
        'Verter los huevos sobre el calabacín y revolver a fuego bajo.',
        'Añadir el queso rallado al final y servir.',
      ]),
      ingredients: [
        { name: 'Calabacín', qty: '1 ud', key: 'calabacín' },
        { name: 'Huevos camperos (12 uds)', qty: '3 uds', key: 'huevos' },
        { name: 'Queso curado semicurado', qty: '40g', key: 'queso' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Ensalada de atún, huevo y lechuga',
      description: 'Clásica ensalada con atún, huevo duro y lechuga aliñada con aceite de oliva.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 8,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin cocinar', 'rápido', 'proteína']),
      steps: JSON.stringify([
        'Cocer los huevos 10 minutos, pelar y partir en cuartos.',
        'Lavar y trocear la lechuga.',
        'Escurrir el atún.',
        'Montar la ensalada y aliñar con aceite de oliva y sal.',
      ]),
      ingredients: [
        { name: 'Atún en aceite (lata)', qty: '1 lata', key: 'atún' },
        { name: 'Huevos camperos (12 uds)', qty: '2 uds', key: 'huevos' },
        { name: 'Lechuga iceberg', qty: '1/2 ud', key: 'lechuga' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Salmón a la plancha con espinacas salteadas',
      description: 'Salmón a la plancha jugoso servido sobre un lecho de espinacas salteadas con ajo.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['omega3', 'hierro', 'sin gluten']),
      steps: JSON.stringify([
        'Calentar sartén con aceite a fuego alto.',
        'Salpimentar el salmón y cocinar 3-4 minutos por lado.',
        'En otra sartén, saltear las espinacas con ajo y aceite de oliva 2 minutos.',
        'Servir el salmón sobre las espinacas.',
      ]),
      ingredients: [
        { name: 'Salmón fresco', qty: '200g', key: 'salmón' },
        { name: 'Espinacas baby', qty: '100g', key: 'espinacas' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Merluza al vapor con brócoli',
      description: 'Merluza cocinada al vapor con brócoli, plato ligero y muy saludable.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 18,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['vapor', 'ligero', 'sin gluten']),
      steps: JSON.stringify([
        'Colocar la merluza y el brócoli en la vaporera.',
        'Cocinar al vapor 12-15 minutos según el grosor.',
        'Sazonar con sal, pimienta y un chorrito de aceite de oliva.',
        'Servir inmediatamente.',
      ]),
      ingredients: [
        { name: 'Merluza congelada', qty: '200g', key: 'merluza' },
        { name: 'Brócoli', qty: '150g', key: 'brócoli' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Champiñones rellenos de bacon y queso',
      description: 'Champiñones grandes rellenos con bacon y queso fundido, horneados hasta dorar.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['horno', 'umami', 'sin gluten']),
      steps: JSON.stringify([
        'Precalentar horno a 200°C. Limpiar los champiñones y retirar los tallos.',
        'Picar el bacon y mezclar con el queso rallado.',
        'Rellenar los champiñones con la mezcla.',
        'Hornear 15 minutos hasta que el queso esté dorado.',
      ]),
      ingredients: [
        { name: 'Champiñones laminados', qty: '300g', key: 'champiñones' },
        { name: 'Bacon en lonchas', qty: '100g', key: 'bacon' },
        { name: 'Queso curado semicurado', qty: '80g', key: 'queso' },
      ],
    },
    {
      title: 'Tortilla española sin patatas',
      description: 'Tortilla de huevos con cebolla y calabacín en lugar de patata, versión keto del clásico.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['sin gluten', 'vegetariano', 'clásico']),
      steps: JSON.stringify([
        'Saltear la cebolla morada picada y el calabacín en rodajas con aceite 5 minutos.',
        'Batir los huevos con sal y mezclar con las verduras.',
        'Verter en sartén antiadherente y cuajar a fuego medio-bajo tapado 5 minutos.',
        'Dar la vuelta con un plato y cuajar el otro lado 3 minutos.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '4 uds', key: 'huevos' },
        { name: 'Calabacín', qty: '1 ud', key: 'calabacín' },
        { name: 'Cebolla morada', qty: '1/2 ud', key: 'cebolla' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    // Múltiple tipo
    {
      title: 'Pollo al curry con nata',
      description: 'Tiernos trozos de pollo en salsa de curry cremosa con nata, plato reconfortante.',
      mealTypes: JSON.stringify(['lunch', 'dinner']),
      prepTimeMinutes: 25,
      difficulty: 'medium',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['curry', 'sin gluten', 'cremoso']),
      steps: JSON.stringify([
        'Dorar los trozos de pollo en sartén con aceite y reservar.',
        'En la misma sartén, sofreír la cebolla 3 minutos.',
        'Añadir el curry en polvo (1 cdta), el pollo y la nata.',
        'Cocinar a fuego medio 15 minutos hasta reducir la salsa.',
      ]),
      ingredients: [
        { name: 'Pechuga de pollo', qty: '300g', key: 'pechuga' },
        { name: 'Nata para cocinar', qty: '200ml', key: 'nata' },
        { name: 'Cebolla morada', qty: '1/2 ud', key: 'cebolla' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Ternera salteada con champiñones',
      description: 'Filetes de ternera salteados con champiñones en salsa de mantequilla y hierbas.',
      mealTypes: JSON.stringify(['lunch', 'dinner']),
      prepTimeMinutes: 18,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['salteado', 'sin gluten', 'umami']),
      steps: JSON.stringify([
        'Cortar la ternera en tiras y salpimentar.',
        'Saltear en sartén caliente con aceite hasta dorar; reservar.',
        'En la misma sartén, dorar los champiñones con mantequilla 4 minutos.',
        'Añadir la ternera, mezclar y servir caliente.',
      ]),
      ingredients: [
        { name: 'Filete de ternera', qty: '250g', key: 'ternera' },
        { name: 'Champiñones laminados', qty: '200g', key: 'champiñones' },
        { name: 'Mantequilla', qty: '1 cda', key: 'mantequilla' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Wraps de lechuga con pollo y aguacate',
      description: 'Hojas de lechuga rellenas de pollo desmenuzado, aguacate y mayonesa, sin carbohidratos.',
      mealTypes: JSON.stringify(['lunch', 'dinner']),
      prepTimeMinutes: 10,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin gluten', 'rápido', 'fresco']),
      steps: JSON.stringify([
        'Desmenuzar el pollo cocido o a la plancha.',
        'Machacar el aguacate con sal y pimienta.',
        'Extender el aguacate en hojas de lechuga.',
        'Añadir el pollo y un poco de mayonesa; enrollar y servir.',
      ]),
      ingredients: [
        { name: 'Pechuga de pollo', qty: '200g', key: 'pechuga' },
        { name: 'Aguacate', qty: '1 ud', key: 'aguacate' },
        { name: 'Lechuga iceberg', qty: '6 hojas', key: 'lechuga' },
        { name: 'Mayonesa', qty: '2 cdas', key: 'mayonesa' },
      ],
    },
    // Snacks
    {
      title: 'Queso curado con aceitunas',
      description: 'Trocitos de queso curado acompañados de aceitunas, snack keto sin preparación.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 2,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'rápido']),
      steps: JSON.stringify([
        'Cortar el queso en dados o lonchas.',
        'Servir junto a un puñado de aceitunas.',
      ]),
      ingredients: [
        { name: 'Queso curado semicurado', qty: '60g', key: 'queso' },
      ],
    },
    {
      title: 'Almendras tostadas con sal',
      description: 'Almendras naturales ligeramente tostadas con sal, snack perfecto y saciante.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 2,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'frutos secos']),
      steps: JSON.stringify([
        'Medir un puñado de almendras (unos 30g).',
        'Si se desea, tostar en sartén seca 2 minutos y añadir sal.',
        'Servir en un bol.',
      ]),
      ingredients: [
        { name: 'Almendras naturales', qty: '30g', key: 'almendras' },
      ],
    },
    {
      title: 'Huevo cocido con sal y aceite',
      description: 'Huevo duro con un chorrito de aceite de oliva y sal, proteína pura y sin complicaciones.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 10,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'proteína', 'sin gluten']),
      steps: JSON.stringify([
        'Poner el huevo en agua fría y llevar a ebullición.',
        'Cocer 9-10 minutos para huevo duro.',
        'Enfriar bajo agua fría, pelar y servir con sal y aceite de oliva.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '1 ud', key: 'huevos' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cdta', key: 'aceite' },
      ],
    },
    // ── Desayunos nuevos ──────────────────────────────────────────
    {
      title: 'Crema de queso con salmón y pepino',
      description: 'Crema de queso untada con lonchas de salmón ahumado y rodajas de pepino fresco.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 5,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'sin cocinar', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Untar la crema de queso en un plato.',
        'Colocar las lonchas de salmón encima.',
        'Añadir el pepino en rodajas y servir.',
      ]),
      ingredients: [
        { name: 'Crema de queso', qty: '80g', key: 'crema queso' },
        { name: 'Salmón fresco', qty: '100g', key: 'salmón' },
        { name: 'Pepino', qty: '1/2 ud', key: 'pepino' },
      ],
    },
    {
      title: 'Revuelto de champiñones y pavo',
      description: 'Suave revuelto de huevos con champiñones salteados y pavo en lonchas.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 10,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'proteína', 'sin gluten']),
      steps: JSON.stringify([
        'Saltear los champiñones con mantequilla 3 minutos.',
        'Añadir el pavo troceado y rehogar 1 minuto.',
        'Batir los huevos, verter sobre la sartén y revolver a fuego bajo hasta cuajar.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '3 uds', key: 'huevos' },
        { name: 'Champiñones laminados', qty: '100g', key: 'champiñones' },
        { name: 'Pavo en lonchas', qty: '60g', key: 'pavo' },
        { name: 'Mantequilla', qty: '1 cdta', key: 'mantequilla' },
      ],
    },
    {
      title: 'Tortilla de espinacas y ricotta',
      description: 'Tortilla esponjosa rellena de espinacas salteadas y cremosa ricotta.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 12,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'hierro', 'cremoso', 'sin gluten']),
      steps: JSON.stringify([
        'Saltear las espinacas con aceite 2 minutos; escurrir.',
        'Batir los huevos con sal y pimienta.',
        'Cuajar en sartén antiadherente a fuego medio-bajo.',
        'Colocar la ricotta y las espinacas en un lado, doblar y servir.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '3 uds', key: 'huevos' },
        { name: 'Espinacas baby', qty: '60g', key: 'espinacas' },
        { name: 'Ricotta', qty: '50g', key: 'ricotta' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cdta', key: 'aceite' },
      ],
    },
    {
      title: 'Huevos con aguacate y salmón',
      description: 'Huevos fritos sobre aguacate aplastado con salmón, desayuno saciante y rico en omega-3.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 10,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'omega3', 'sin gluten', 'saciante']),
      steps: JSON.stringify([
        'Machacar el aguacate con sal y pimienta en un plato.',
        'Freír los huevos en aceite de oliva.',
        'Colocar los huevos sobre el aguacate y añadir el salmón en trozos.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '2 uds', key: 'huevos' },
        { name: 'Aguacate', qty: '1 ud', key: 'aguacate' },
        { name: 'Salmón fresco', qty: '80g', key: 'salmón' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cdta', key: 'aceite' },
      ],
    },
    {
      title: 'Revuelto de bacon y parmesano',
      description: 'Cremoso revuelto de huevos con bacon crujiente y parmesano rallado.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 8,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'rápido', 'sin gluten', 'intenso']),
      steps: JSON.stringify([
        'Freír el bacon troceado hasta que esté crujiente.',
        'Batir los huevos con sal y pimienta y verter sobre el bacon.',
        'Revolver a fuego bajo hasta cuajar casi del todo.',
        'Añadir el parmesano rallado, apagar el fuego y servir.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '3 uds', key: 'huevos' },
        { name: 'Bacon en lonchas', qty: '3 lonchas', key: 'bacon' },
        { name: 'Queso parmesano', qty: '20g', key: 'parmesano' },
      ],
    },
    {
      title: 'Bol de kale salteado con huevo',
      description: 'Col rizada salteada con ajo y aceite de coco, coronada con un huevo frito.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 10,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'hierro', 'sin gluten', 'nutritivo']),
      steps: JSON.stringify([
        'Calentar el aceite de coco en sartén a fuego medio.',
        'Saltear el kale troceado con una pizca de sal 4 minutos.',
        'Freír el huevo aparte y colocar sobre el kale.',
      ]),
      ingredients: [
        { name: 'Col rizada', qty: '80g', key: 'kale' },
        { name: 'Huevos camperos (12 uds)', qty: '1 ud', key: 'huevos' },
        { name: 'Aceite de coco', qty: '1 cda', key: 'aceite coco' },
      ],
    },
    {
      title: 'Crema de queso con nueces y canela',
      description: 'Bol de crema de queso con nueces picadas y un toque de canela, sin cocción.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 3,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'sin cocinar', 'rápido', 'dulce']),
      steps: JSON.stringify([
        'Poner la crema de queso en un bol.',
        'Añadir las nueces picadas por encima.',
        'Espolvorear con canela al gusto y servir.',
      ]),
      ingredients: [
        { name: 'Crema de queso', qty: '100g', key: 'crema queso' },
        { name: 'Nueces peladas', qty: '30g', key: 'nueces' },
      ],
    },
    {
      title: 'Huevos escalfados con espinacas',
      description: 'Huevos pochados sobre cama de espinacas salteadas con aceite de oliva.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'hierro', 'sin gluten', 'proteína']),
      steps: JSON.stringify([
        'Saltear las espinacas con aceite y sal 2 minutos; reservar en plato.',
        'Hervir agua con un chorrito de vinagre. Crear remolino y cascar el huevo dentro.',
        'Cocinar 3 minutos para yema líquida. Escurrir y colocar sobre las espinacas.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '2 uds', key: 'huevos' },
        { name: 'Espinacas baby', qty: '100g', key: 'espinacas' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
        { name: 'Vinagre de manzana', qty: '1 cdta', key: 'vinagre' },
      ],
    },
    {
      title: 'Tortilla de queso fresco y aguacate',
      description: 'Tortilla francesa abierta con queso fresco Burgos desmenuzado y aguacate en dados.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 8,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'cremoso', 'sin gluten', 'rápido']),
      steps: JSON.stringify([
        'Batir los huevos con sal y cuajar en sartén antiadherente con mantequilla.',
        'Antes de doblar, añadir el queso fresco desmenuzado.',
        'Servir abierta con el aguacate en dados por encima.',
      ]),
      ingredients: [
        { name: 'Huevos camperos (12 uds)', qty: '2 uds', key: 'huevos' },
        { name: 'Queso fresco Burgos', qty: '60g', key: 'burgos' },
        { name: 'Aguacate', qty: '1/2 ud', key: 'aguacate' },
        { name: 'Mantequilla', qty: '1 cdta', key: 'mantequilla' },
      ],
    },
    {
      title: 'Sardinas con huevo duro y pepino',
      description: 'Desayuno rápido con sardinas en aceite, huevo duro y pepino, sin cocinar nada nuevo.',
      mealTypes: JSON.stringify(['breakfast']),
      prepTimeMinutes: 12,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['desayuno', 'omega3', 'sin gluten', 'conserva']),
      steps: JSON.stringify([
        'Cocer el huevo 10 minutos, pelar y cortar en cuartos.',
        'Abrir las sardinas y escurrir el exceso de aceite.',
        'Servir junto al huevo y el pepino en rodajas.',
      ]),
      ingredients: [
        { name: 'Sardinas en aceite (lata)', qty: '1 lata', key: 'sardinas' },
        { name: 'Huevos camperos (12 uds)', qty: '1 ud', key: 'huevos' },
        { name: 'Pepino', qty: '1/2 ud', key: 'pepino' },
      ],
    },
    // ── Comidas nuevas ────────────────────────────────────────────
    {
      title: 'Espárragos con jamón y huevo a la plancha',
      description: 'Espárragos a la plancha envueltos en jamón serrano con un huevo frito.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 12,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['rápido', 'sin gluten', 'proteína']),
      steps: JSON.stringify([
        'Cocinar los espárragos a la plancha con aceite y sal 5 minutos.',
        'Envolver en lonchas de jamón serrano.',
        'Freír el huevo en la misma sartén y servir encima.',
      ]),
      ingredients: [
        { name: 'Espárragos', qty: '200g', key: 'espárragos' },
        { name: 'Jamón serrano', qty: '4 lonchas', key: 'jamón' },
        { name: 'Huevos camperos (12 uds)', qty: '1 ud', key: 'huevos' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Bacalao a la plancha con brócoli',
      description: 'Lomo de bacalao a la plancha con brócoli al vapor, plato ligero y proteico.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin gluten', 'proteína', 'bajo en grasa']),
      steps: JSON.stringify([
        'Cocer el brócoli al vapor 8 minutos.',
        'Salpimentar el bacalao y cocinar a la plancha con aceite 4 minutos por lado.',
        'Servir con el brócoli y un chorrito de aceite de oliva.',
      ]),
      ingredients: [
        { name: 'Bacalao congelado', qty: '200g', key: 'bacalao' },
        { name: 'Brócoli', qty: '200g', key: 'brócoli' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Ensalada de rúcula con salmón y parmesano',
      description: 'Refrescante ensalada de rúcula con salmón a la plancha y virutas de parmesano.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 12,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['ensalada', 'omega3', 'sin gluten', 'fresco']),
      steps: JSON.stringify([
        'Cocinar el salmón a la plancha 3-4 minutos por lado; dejar reposar y desmigar.',
        'Colocar la rúcula en un bol, añadir el salmón.',
        'Aliñar con aceite de oliva y vinagre de manzana. Añadir el parmesano en virutas.',
      ]),
      ingredients: [
        { name: 'Salmón fresco', qty: '180g', key: 'salmón' },
        { name: 'Rúcula', qty: '60g', key: 'rúcula' },
        { name: 'Queso parmesano', qty: '25g', key: 'parmesano' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
        { name: 'Vinagre de manzana', qty: '1 cdta', key: 'vinagre' },
      ],
    },
    {
      title: 'Sepia a la plancha con ajo y aceite',
      description: 'Sepia tierna a la plancha con un majado de ajo y perejil sobre aceite de oliva.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 10,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['mariscos', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Cortar la sepia en trozos y salpimentar.',
        'Cocinar a la plancha muy caliente 3-4 minutos.',
        'Aliñar con aceite de oliva y ajo picado. Servir inmediatamente.',
      ]),
      ingredients: [
        { name: 'Sepia', qty: '300g', key: 'sepia' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Mejillones al vapor con limón',
      description: 'Mejillones al vapor abiertos al natural con un chorrito de limón, plato rapidísimo.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 10,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['mariscos', 'rápido', 'sin gluten', 'omega3']),
      steps: JSON.stringify([
        'Limpiar los mejillones bajo el grifo.',
        'Colocar en cazuela con un dedo de agua, tapar y cocer a fuego fuerte hasta que abran (5-7 min).',
        'Desechar los que no abran. Servir con zumo de limón.',
      ]),
      ingredients: [
        { name: 'Mejillones', qty: '500g', key: 'mejillones' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cdta', key: 'aceite' },
      ],
    },
    {
      title: 'Hamburguesa doble con bacon y aguacate',
      description: 'Dos hamburguesas de ternera apiladas con bacon crujiente y aguacate, sin pan.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin gluten', 'proteína', 'saciante']),
      steps: JSON.stringify([
        'Formar dos hamburguesas con la carne picada y salpimentar.',
        'Freír el bacon hasta crujiente; reservar.',
        'Cocinar las hamburguesas 4 minutos por lado.',
        'Montar: hamburguesa + bacon + aguacate en rodajas + hamburguesa.',
      ]),
      ingredients: [
        { name: 'Carne picada de ternera', qty: '300g', key: 'ternera' },
        { name: 'Bacon en lonchas', qty: '4 lonchas', key: 'bacon' },
        { name: 'Aguacate', qty: '1 ud', key: 'aguacate' },
      ],
    },
    {
      title: 'Coliflor salteada con bacon y parmesano',
      description: 'Coliflor en ramilletes salteada con bacon y gratinada con parmesano, guarnición estrella.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin gluten', 'guarnición', 'crujiente']),
      steps: JSON.stringify([
        'Cocer la coliflor en agua salada 5 minutos; escurrir bien.',
        'Saltear el bacon troceado en sartén hasta dorar.',
        'Añadir la coliflor y saltear 4 minutos hasta dorar los bordes.',
        'Servir con parmesano rallado por encima.',
      ]),
      ingredients: [
        { name: 'Coliflor', qty: '300g', key: 'coliflor' },
        { name: 'Bacon en lonchas', qty: '80g', key: 'bacon' },
        { name: 'Queso parmesano', qty: '30g', key: 'parmesano' },
      ],
    },
    {
      title: 'Pavo a la plancha con rúcula y parmesano',
      description: 'Filete de pavo a la plancha sobre cama de rúcula fresca con virutas de parmesano.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 12,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['ligero', 'sin gluten', 'proteína']),
      steps: JSON.stringify([
        'Salpimentar el pavo y cocinar a la plancha 4 minutos por lado.',
        'Extender la rúcula en el plato, colocar el pavo encima.',
        'Añadir el parmesano en virutas y un chorrito de aceite de oliva.',
      ]),
      ingredients: [
        { name: 'Pavo en lonchas', qty: '200g', key: 'pavo' },
        { name: 'Rúcula', qty: '60g', key: 'rúcula' },
        { name: 'Queso parmesano', qty: '25g', key: 'parmesano' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Almejas al vapor con ajo',
      description: 'Almejas abiertas al vapor con un sofrito rápido de ajo y aceite de oliva.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 8,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['mariscos', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Lavar las almejas y desechar las abiertas.',
        'Calentar aceite en cazuela, añadir ajo picado 1 minuto.',
        'Añadir las almejas, tapar y cocer a fuego fuerte hasta que abran (3-4 min).',
        'Desechar las que no abran y servir con el jugo.',
      ]),
      ingredients: [
        { name: 'Almejas', qty: '400g', key: 'almejas' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Ensalada de espinacas, gambas y aguacate',
      description: 'Ensalada templada con gambas salteadas, espinacas frescas y aguacate cremoso.',
      mealTypes: JSON.stringify(['lunch']),
      prepTimeMinutes: 10,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['ensalada', 'mariscos', 'sin gluten', 'fresco']),
      steps: JSON.stringify([
        'Saltear las gambas con aceite y sal 2 minutos.',
        'En un bol, mezclar las espinacas con el aguacate en dados.',
        'Añadir las gambas templadas y aliñar con aceite de oliva y vinagre de manzana.',
      ]),
      ingredients: [
        { name: 'Gambas congeladas', qty: '200g', key: 'gambas' },
        { name: 'Espinacas baby', qty: '80g', key: 'espinacas' },
        { name: 'Aguacate', qty: '1 ud', key: 'aguacate' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
        { name: 'Vinagre de manzana', qty: '1 cdta', key: 'vinagre' },
      ],
    },
    // ── Cenas nuevas ──────────────────────────────────────────────
    {
      title: 'Berenjena rellena de carne y mozzarella',
      description: 'Berenjenas asadas rellenas de sofrito de ternera y cubiertas de mozzarella gratinada.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 25,
      difficulty: 'medium',
      ketoLevel: 'strict',
      tags: JSON.stringify(['horno', 'relleno', 'sin gluten']),
      steps: JSON.stringify([
        'Precalentar horno a 200°C. Partir las berenjenas y vaciar la pulpa.',
        'Sofreír la carne picada con la pulpa troceada 5 minutos, salpimentar.',
        'Rellenar las berenjenas con la mezcla de carne.',
        'Cubrir con mozzarella rallada y hornear 15 minutos hasta dorar.',
      ]),
      ingredients: [
        { name: 'Berenjena', qty: '2 uds', key: 'berenjena' },
        { name: 'Carne picada de ternera', qty: '250g', key: 'ternera' },
        { name: 'Queso mozzarella', qty: '100g', key: 'mozzarella' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Costillas de cerdo al horno',
      description: 'Costillas de cerdo al horno con especias, crujientes por fuera y jugosas por dentro.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 25,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['horno', 'sin gluten', 'proteína', 'grasa']),
      steps: JSON.stringify([
        'Precalentar horno a 220°C.',
        'Frotar las costillas con sal, pimienta y aceite de oliva.',
        'Hornear 20 minutos, dando la vuelta a mitad de cocción.',
        'Dejar reposar 3 minutos antes de servir.',
      ]),
      ingredients: [
        { name: 'Costillas de cerdo', qty: '400g', key: 'costillas' },
        { name: 'Aceite de oliva virgen extra', qty: '2 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Bacalao con espinacas y nata',
      description: 'Bacalao pochado en salsa cremosa de nata con espinacas, plato reconfortante.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['cremoso', 'sin gluten', 'proteína']),
      steps: JSON.stringify([
        'Dorar el bacalao troceado en sartén con aceite 3 minutos; reservar.',
        'En la misma sartén, añadir las espinacas y saltear 2 minutos.',
        'Verter la nata, salpimentar y dejar reducir 5 minutos.',
        'Añadir el bacalao y cocer 3 minutos más. Servir caliente.',
      ]),
      ingredients: [
        { name: 'Bacalao congelado', qty: '200g', key: 'bacalao' },
        { name: 'Espinacas baby', qty: '100g', key: 'espinacas' },
        { name: 'Nata para cocinar', qty: '150ml', key: 'nata' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Coliflor gratinada con queso',
      description: 'Coliflor cocida bañada en nata y gratinada con queso curado, guarnición o plato único.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['horno', 'vegetariano', 'sin gluten']),
      steps: JSON.stringify([
        'Cocer la coliflor en agua salada 8 minutos; escurrir.',
        'Colocar en fuente de horno, verter la nata por encima y salpimentar.',
        'Cubrir con queso curado rallado y gratinar 10 minutos.',
      ]),
      ingredients: [
        { name: 'Coliflor', qty: '400g', key: 'coliflor' },
        { name: 'Nata para cocinar', qty: '100ml', key: 'nata' },
        { name: 'Queso curado semicurado', qty: '80g', key: 'queso' },
      ],
    },
    {
      title: 'Sepia salteada con champiñones',
      description: 'Sepia tierna salteada con champiñones y un toque de salsa de soja sin gluten.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 15,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['mariscos', 'umami', 'sin gluten']),
      steps: JSON.stringify([
        'Saltear los champiñones con aceite en sartén caliente 4 minutos.',
        'Añadir la sepia troceada y saltear 3 minutos a fuego alto.',
        'Añadir un chorrito de salsa de soja, remover y servir.',
      ]),
      ingredients: [
        { name: 'Sepia', qty: '250g', key: 'sepia' },
        { name: 'Champiñones laminados', qty: '200g', key: 'champiñones' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
        { name: 'Salsa de soja sin gluten', qty: '1 cda', key: 'soja' },
      ],
    },
    {
      title: 'Crema de calabacín y ricotta',
      description: 'Crema suave de calabacín con ricotta, nutritiva y fácil de hacer.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['crema', 'vegetariano', 'sin gluten', 'cremoso']),
      steps: JSON.stringify([
        'Rehogar el calabacín troceado con aceite y sal 5 minutos.',
        'Añadir 300ml de agua caliente y cocer 10 minutos.',
        'Triturar con la ricotta hasta obtener crema suave.',
        'Rectificar de sal, añadir pimienta y servir caliente.',
      ]),
      ingredients: [
        { name: 'Calabacín', qty: '2 uds', key: 'calabacín' },
        { name: 'Ricotta', qty: '100g', key: 'ricotta' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    {
      title: 'Mejillones en salsa verde',
      description: 'Mejillones cocidos en una salsa verde de perejil y ajo, plato rápido y sabroso.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 12,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['mariscos', 'sin gluten', 'omega3']),
      steps: JSON.stringify([
        'Sofreír ajo picado en aceite de oliva 1 minuto.',
        'Añadir los mejillones limpios y tapar a fuego fuerte.',
        'Cuando abran, añadir perejil picado y un chorrito de aceite. Servir con el jugo.',
      ]),
      ingredients: [
        { name: 'Mejillones', qty: '500g', key: 'mejillones' },
        { name: 'Aceite de oliva virgen extra', qty: '3 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Puerro con bacon gratinado',
      description: 'Puerros cocidos al vapor envueltos en bacon y gratinados con queso curado.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['horno', 'sin gluten', 'gratinado']),
      steps: JSON.stringify([
        'Cocer los puerros limpios al vapor 8 minutos hasta que estén tiernos.',
        'Envolver cada puerro en lonchas de bacon.',
        'Colocar en fuente, cubrir con queso rallado y gratinar 10 minutos.',
      ]),
      ingredients: [
        { name: 'Puerro', qty: '3 uds', key: 'puerro' },
        { name: 'Bacon en lonchas', qty: '6 lonchas', key: 'bacon' },
        { name: 'Queso curado semicurado', qty: '80g', key: 'queso' },
      ],
    },
    {
      title: 'Pollo al ajillo',
      description: 'Trozos de pollo dorados en abundante ajo y aceite de oliva, clásico reconfortante keto.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['sin gluten', 'ajo', 'clásico']),
      steps: JSON.stringify([
        'Salpimentar los muslos de pollo troceados.',
        'Dorar en sartén con aceite abundante a fuego medio-alto 8 minutos.',
        'Añadir varios dientes de ajo laminados y cocer 5 minutos más.',
        'Servir con el aceite del ajillo por encima.',
      ]),
      ingredients: [
        { name: 'Muslos de pollo', qty: '400g', key: 'muslos' },
        { name: 'Aceite de oliva virgen extra', qty: '4 cdas', key: 'aceite' },
      ],
    },
    {
      title: 'Pavo en salsa de champiñones',
      description: 'Pechuga de pavo en salsa cremosa de champiñones y nata, cena ligera y sabrosa.',
      mealTypes: JSON.stringify(['dinner']),
      prepTimeMinutes: 20,
      difficulty: 'easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['cremoso', 'sin gluten', 'ligero']),
      steps: JSON.stringify([
        'Dorar el pavo fileteado en sartén con aceite 3 minutos por lado; reservar.',
        'Saltear los champiñones en la misma sartén 4 minutos.',
        'Añadir la nata, salpimentar y cocer 5 minutos.',
        'Añadir el pavo y calentar 2 minutos más. Servir.',
      ]),
      ingredients: [
        { name: 'Pavo en lonchas', qty: '250g', key: 'pavo' },
        { name: 'Champiñones laminados', qty: '200g', key: 'champiñones' },
        { name: 'Nata para cocinar', qty: '150ml', key: 'nata' },
        { name: 'Aceite de oliva virgen extra', qty: '1 cda', key: 'aceite' },
      ],
    },
    // ── Snacks nuevos ─────────────────────────────────────────────
    {
      title: 'Crema de queso con palitos de pepino',
      description: 'Crema de queso para dipear con palitos frescos de pepino, snack sin carbos.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 3,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'rápido', 'sin gluten']),
      steps: JSON.stringify([
        'Poner la crema de queso en un bol pequeño.',
        'Cortar el pepino en bastones.',
        'Dipear y listo.',
      ]),
      ingredients: [
        { name: 'Crema de queso', qty: '60g', key: 'crema queso' },
        { name: 'Pepino', qty: '1/2 ud', key: 'pepino' },
      ],
    },
    {
      title: 'Sardinas de lata directas',
      description: 'Sardinas en aceite de oliva directas del bote, snack keto sin preparación.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 1,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'omega3', 'conserva']),
      steps: JSON.stringify([
        'Abrir la lata y servir las sardinas en un plato.',
        'Opcional: añadir un chorrito de limón.',
      ]),
      ingredients: [
        { name: 'Sardinas en aceite (lata)', qty: '1 lata', key: 'sardinas' },
      ],
    },
    {
      title: 'Rollito de pavo con crema de queso',
      description: 'Loncha de pavo enrollada con crema de queso, snack proteico en segundos.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 3,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'proteína', 'rápido']),
      steps: JSON.stringify([
        'Extender la crema de queso sobre las lonchas de pavo.',
        'Enrollar y servir.',
      ]),
      ingredients: [
        { name: 'Pavo en lonchas', qty: '3 lonchas', key: 'pavo' },
        { name: 'Crema de queso', qty: '40g', key: 'crema queso' },
      ],
    },
    {
      title: 'Aguacate con sal y vinagre',
      description: 'Medio aguacate maduro con sal en escamas y un toque de vinagre de manzana.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 2,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'grasa saludable']),
      steps: JSON.stringify([
        'Partir el aguacate por la mitad y retirar el hueso.',
        'Añadir sal y unas gotas de vinagre de manzana. Comer con cuchara.',
      ]),
      ingredients: [
        { name: 'Aguacate', qty: '1/2 ud', key: 'aguacate' },
        { name: 'Vinagre de manzana', qty: '1 cdta', key: 'vinagre' },
      ],
    },
    {
      title: 'Mix de almendras y nueces',
      description: 'Puñado de almendras y nueces mezcladas, snack keto perfecto para llevar.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 1,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'frutos secos', 'rápido']),
      steps: JSON.stringify([
        'Mezclar las almendras y nueces en un bol o bolsita.',
        'Servir.',
      ]),
      ingredients: [
        { name: 'Almendras naturales', qty: '20g', key: 'almendras' },
        { name: 'Nueces peladas', qty: '15g', key: 'nueces' },
      ],
    },
    {
      title: 'Jamón serrano con queso curado',
      description: 'Lonchas de jamón serrano con taquitos de queso curado, combinación clásica keto.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 2,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'sin cocinar', 'proteína', 'español']),
      steps: JSON.stringify([
        'Cortar el queso en dados.',
        'Servir junto a las lonchas de jamón.',
      ]),
      ingredients: [
        { name: 'Jamón serrano', qty: '3 lonchas', key: 'jamón' },
        { name: 'Queso curado semicurado', qty: '40g', key: 'queso' },
      ],
    },
    {
      title: 'Gambas cocidas con mayonesa',
      description: 'Gambas cocidas frías con mayonesa para dipear, snack o entrante rápido.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 8,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['snack', 'mariscos', 'sin gluten', 'proteína']),
      steps: JSON.stringify([
        'Cocer las gambas en agua con sal 3 minutos; escurrir y enfriar.',
        'Pelar y servir con la mayonesa para dipear.',
      ]),
      ingredients: [
        { name: 'Gambas congeladas', qty: '150g', key: 'gambas' },
        { name: 'Mayonesa', qty: '2 cdas', key: 'mayonesa' },
      ],
    },
    // ── Postres ───────────────────────────────────────────────────
    {
      title: 'Mousse de cacao y nata',
      description: 'Mousse esponjosa de cacao puro sin azúcar con nata montada, postre keto indulgente.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 10,
      difficulty: 'easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['postre', 'chocolate', 'sin azúcar', 'sin gluten']),
      steps: JSON.stringify([
        'Montar la nata bien fría hasta punto de nieve.',
        'Añadir el cacao tamizado poco a poco, mezclando con movimientos envolventes.',
        'Repartir en vasitos y enfriar al menos 10 minutos antes de servir.',
      ]),
      ingredients: [
        { name: 'Nata montada', qty: '200ml', key: 'nata montada' },
        { name: 'Cacao en polvo sin azúcar', qty: '2 cdas', key: 'cacao' },
      ],
    },
    {
      title: 'Nata montada con nueces y canela',
      description: 'Bol de nata montada natural con nueces troceadas y canela, postre keto en minutos.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 5,
      difficulty: 'very_easy',
      ketoLevel: 'strict',
      tags: JSON.stringify(['postre', 'sin azúcar', 'sin gluten', 'rápido']),
      steps: JSON.stringify([
        'Montar la nata hasta punto de nieve.',
        'Servir en bol con las nueces picadas por encima.',
        'Espolvorear canela al gusto.',
      ]),
      ingredients: [
        { name: 'Nata montada', qty: '150ml', key: 'nata montada' },
        { name: 'Nueces peladas', qty: '25g', key: 'nueces' },
      ],
    },
    {
      title: 'Yogur griego con cacao y almendras',
      description: 'Yogur griego sin azúcar con cacao puro y almendras tostadas, postre rápido y saciante.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 3,
      difficulty: 'very_easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['postre', 'probiótico', 'sin azúcar', 'sin gluten']),
      steps: JSON.stringify([
        'Poner el yogur en un bol.',
        'Espolvorear el cacao por encima.',
        'Añadir las almendras troceadas y servir.',
      ]),
      ingredients: [
        { name: 'Yogur griego natural sin azúcar', qty: '200g', key: 'yogur' },
        { name: 'Cacao en polvo sin azúcar', qty: '1 cda', key: 'cacao' },
        { name: 'Almendras naturales', qty: '20g', key: 'almendras' },
      ],
    },
    {
      title: 'Crema de queso con almendras y cacao',
      description: 'Crema de queso mezclada con cacao y almendras, postre estilo trufas sin hornear.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 5,
      difficulty: 'very_easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['postre', 'sin azúcar', 'sin gluten', 'sin cocinar']),
      steps: JSON.stringify([
        'Mezclar la crema de queso con el cacao hasta integrar.',
        'Añadir las almendras troceadas.',
        'Servir en vasito o enfriar 10 minutos para que tome cuerpo.',
      ]),
      ingredients: [
        { name: 'Crema de queso', qty: '100g', key: 'crema queso' },
        { name: 'Cacao en polvo sin azúcar', qty: '1 cda', key: 'cacao' },
        { name: 'Almendras naturales', qty: '20g', key: 'almendras' },
      ],
    },
    {
      title: 'Parfait de yogur griego y nueces',
      description: 'Capas de yogur griego y nueces en vasito, postre elegante y sin azúcar.',
      mealTypes: JSON.stringify(['snack']),
      prepTimeMinutes: 5,
      difficulty: 'very_easy',
      ketoLevel: 'moderate',
      tags: JSON.stringify(['postre', 'probiótico', 'sin azúcar', 'sin gluten']),
      steps: JSON.stringify([
        'Poner una capa de yogur en el fondo del vasito.',
        'Añadir una capa de nueces troceadas.',
        'Repetir las capas y terminar con nueces. Espolvorear canela.',
      ]),
      ingredients: [
        { name: 'Yogur griego natural sin azúcar', qty: '200g', key: 'yogur' },
        { name: 'Nueces peladas', qty: '30g', key: 'nueces' },
      ],
    },
  ]

  // Name key → product name mapping for pid lookup
  const keyToName: Record<string, string> = {
    pechuga: 'Pechuga de pollo',
    muslos: 'Muslos de pollo',
    ternera: 'Carne picada de ternera',
    bacon: 'Bacon en lonchas',
    jamón: 'Jamón serrano',
    chorizo: 'Chorizo',
    salchichas: 'Salchichas de Frankfurt',
    lomo: 'Lomo de cerdo',
    filete: 'Filete de ternera',
    pavo: 'Pavo en lonchas',
    salmón: 'Salmón fresco',
    atún: 'Atún en aceite (lata)',
    sardinas: 'Sardinas en aceite (lata)',
    merluza: 'Merluza congelada',
    gambas: 'Gambas congeladas',
    huevos: 'Huevos camperos (12 uds)',
    queso: 'Queso curado semicurado',
    burgos: 'Queso fresco Burgos',
    mozzarella: 'Queso mozzarella',
    nata: 'Nata para cocinar',
    mantequilla: 'Mantequilla',
    yogur: 'Yogur griego natural sin azúcar',
    'nata montada': 'Nata montada',
    lechuga: 'Lechuga iceberg',
    espinacas: 'Espinacas baby',
    brócoli: 'Brócoli',
    calabacín: 'Calabacín',
    champiñones: 'Champiñones laminados',
    pepino: 'Pepino',
    tomates: 'Tomates cherry',
    aguacate: 'Aguacate',
    pimiento: 'Pimiento rojo',
    cebolla: 'Cebolla morada',
    almendras: 'Almendras naturales',
    nueces: 'Nueces peladas',
    anacardos: 'Anacardos naturales',
    aceite: 'Aceite de oliva virgen extra',
    mostaza: 'Mostaza Dijon',
    mayonesa: 'Mayonesa',
    // nuevos productos
    coliflor: 'Coliflor',
    espárragos: 'Espárragos',
    berenjena: 'Berenjena',
    rúcula: 'Rúcula',
    kale: 'Col rizada',
    puerro: 'Puerro',
    costillas: 'Costillas de cerdo',
    bacalao: 'Bacalao congelado',
    almejas: 'Almejas',
    mejillones: 'Mejillones',
    sepia: 'Sepia',
    ricotta: 'Ricotta',
    'crema queso': 'Crema de queso',
    parmesano: 'Queso parmesano',
    'aceite coco': 'Aceite de coco',
    vinagre: 'Vinagre de manzana',
    soja: 'Salsa de soja sin gluten',
    cacao: 'Cacao en polvo sin azúcar',
  }

  for (const recipe of recipesData) {
    const { ingredients, ...recipeFields } = recipe
    const created = await prisma.recipe.create({ data: recipeFields })

    for (const ing of ingredients) {
      const productName = keyToName[ing.key]
      const productId = productName ? pid(productName) : null
      await prisma.recipeIngredient.create({
        data: {
          recipeId: created.id,
          productId: productId ?? undefined,
          name: ing.name,
          quantity: ing.qty,
        },
      })
    }
  }

  // --- PANTRY (items básicos para que las sugerencias funcionen de base) ---
  const pantryKeys = [
    'huevos', 'aceite', 'mantequilla', 'bacon', 'pechuga',
    'lechuga', 'aguacate', 'queso', 'espinacas', 'atún',
    'salmón', 'champiñones', 'calabacín', 'nata', 'mayonesa',
  ]
  const pantryProducts = pantryKeys
    .map(k => keyToName[k])
    .filter(Boolean)
    .map(name => products.find(p => p.name === name))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)

  await Promise.all(
    pantryProducts.map(p => prisma.pantryItem.create({ data: { productId: p.id } }))
  )

  console.log(`✓ Created ${products.length} products`)
  console.log(`✓ Created ${recipesData.length} recipes`)
  console.log(`✓ Created ${pantryProducts.length} pantry items`)
  console.log('✓ Created default UserPreferences')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
