// Categorías de alimento de AppFit y reglas para clasificar un producto de Open Food Facts. Lógica pura.
// Una sola lista para el catálogo (CIQUAL y OFF), los alimentos propios y los productos escaneados.
// SIN IMPORTS a propósito: también la importa la tubería del catálogo (`scripts/catalogo`, Node), que no
// resuelve los imports sin extensión de la app.

/** Las 29 categorías, en el orden en que se muestran en los selectores. «Otros» es el cajón de lo que no encaja. */
export const CATEGORIAS_ALIMENTO = [
  'Frutas',
  'Verduras y hortalizas',
  'Patatas y tubérculos',
  'Legumbres',
  'Frutos secos y semillas',
  'Cereales, arroz y pasta',
  'Pan y tostadas',
  'Cereales de desayuno y barritas',
  'Galletas, bollería y pasteles',
  'Carnes',
  'Embutidos y fiambres',
  'Pescados',
  'Mariscos',
  'Huevos',
  'Leche y nata',
  'Yogures y postres lácteos',
  'Quesos',
  'Bebidas vegetales',
  'Alternativas vegetales',
  'Aceites y grasas',
  'Salsas y condimentos',
  'Dulces y chocolate',
  'Helados',
  'Bebidas',
  'Bebidas alcohólicas',
  'Snacks salados',
  'Platos preparados',
  'Alimentos infantiles',
  'Otros',
] as const

export type CategoriaAlimento = (typeof CATEGORIAS_ALIMENTO)[number]

const CONJUNTO = new Set<string>(CATEGORIAS_ALIMENTO)

/** true si el texto es exactamente una de las categorías (los registros antiguos o importados pueden traer otra cosa). */
export function esCategoriaAlimento(x: unknown): x is CategoriaAlimento {
  return typeof x === 'string' && CONJUNTO.has(x)
}

/** Minúsculas y sin tildes (como `normalizeName` de la app y `normalizar` de la tubería). */
function sinTildes(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Etiqueta de OFF sin el prefijo de idioma (`en:milks` → `milks`). */
export function sinPrefijoIdioma(etiqueta: string): string {
  return etiqueta.trim().replace(/^[a-z]{2}:/, '')
}

// ───────────────────────── Open Food Facts ─────────────────────────

/**
 * Reglas por orden de prioridad: la primera categoría cuya lista contenga alguna etiqueta del producto gana.
 * Las etiquetas son las de `categories_tags` sin el prefijo `en:`. Lo que no encaje cae a `pnns_groups_2` y,
 * si tampoco, a «Otros».
 */
const REGLAS_CATEGORIA: [CategoriaAlimento, string[]][] = [
  ['Bebidas vegetales', ['plant-based-milks', 'plant-based-milk-alternatives', 'milk-substitutes', 'soy-milks', 'soy-milk', 'oat-milks', 'oat-drinks', 'almond-milks', 'almond-drinks', 'rice-milks', 'rice-drinks', 'coconut-milks', 'plant-milks', 'vegetable-milks', 'nut-milks', 'plant-based-drinks']],
  ['Alternativas vegetales', ['meat-analogues', 'meat-alternatives', 'meat-substitutes', 'meatless-burgers', 'vegetarian-burgers', 'vegan-burgers', 'vegetarian-sausages', 'tofu', 'tempeh', 'seitan', 'plant-based-desserts', 'plant-based-yogurts', 'plant-based-cheeses', 'cheese-substitutes', 'dairy-substitutes', 'yogurt-alternatives', 'dairy-alternatives', 'vegan-cheeses', 'plant-based-creams', 'plant-based-spreads']],
  ['Alimentos infantiles', ['baby-foods', 'baby-milks', 'infant-formulas']],
  ['Bebidas alcohólicas', ['alcoholic-beverages', 'beers', 'wines', 'spirits', 'liqueurs', 'ciders', 'sangrias', 'vermouths', 'whiskies', 'rums', 'gins', 'vodkas', 'cavas', 'sparkling-wines', 'red-wines', 'white-wines', 'rose-wines']],
  ['Helados', ['ice-creams-and-sorbets', 'ice-creams', 'sorbets', 'frozen-desserts', 'ice-cream-tubs', 'ice-cream-bars', 'ice-cream-cones']],
  ['Quesos', ['cheeses', 'fresh-cheeses', 'soft-cheeses', 'hard-cheeses', 'cheese-spreads', 'processed-cheeses', 'grated-cheeses', 'goat-cheeses', 'sheep-cheeses', 'cow-cheeses', 'mozzarella', 'cured-cheeses', 'semi-cured-cheeses', 'cheese-slices', 'cream-cheeses', 'blue-cheeses', 'shredded-cheeses', 'spanish-cheeses', 'manchego']],
  ['Yogures y postres lácteos', ['yogurts', 'fermented-milk-products', 'fermented-milks', 'dairy-desserts', 'milk-desserts', 'puddings', 'flans', 'custards', 'cuajadas', 'kefirs', 'skyr', 'greek-yogurts', 'natural-yogurts', 'flavoured-yogurts', 'fruit-yogurts', 'sweetened-yogurts', 'yogurts-drinks', 'drinkable-yogurts', 'fromage-blanc', 'quarks', 'rice-puddings', 'natillas']],
  ['Leche y nata', ['milks', 'uht-milks', 'skimmed-milks', 'semi-skimmed-milks', 'whole-milks', 'condensed-milks', 'evaporated-milks', 'milk-powders', 'creams', 'whipping-creams', 'dairy-creams', 'cooking-creams', 'cow-milks', 'lactose-free-milks', 'flavoured-milks', 'milk-drinks', 'milkshakes', 'milk-beverages']],
  ['Huevos', ['eggs', 'chicken-eggs', 'egg-products']],
  ['Embutidos y fiambres', ['cold-cuts', 'hams', 'cured-hams', 'cooked-hams', 'iberian-hams', 'serrano-hams', 'sausages', 'chorizos', 'salchichones', 'fuets', 'sobrasadas', 'mortadelles', 'mortadellas', 'salamis', 'turkey-breast-slices', 'charcuteries', 'delicatessen', 'bacon', 'lomos', 'chopped-pork', 'pates', 'foie-gras', 'morcillas', 'black-puddings', 'processed-meats', 'dry-sausages', 'cured-meats', 'smoked-meats', 'frankfurters', 'prepared-meats']],
  ['Pescados', ['fishes', 'seafood', 'canned-fishes', 'tunas', 'canned-tunas', 'sardines', 'canned-sardines', 'salmons', 'smoked-fishes', 'smoked-salmons', 'anchovies', 'mackerels', 'cods', 'salted-cods', 'hakes', 'fish-fillets', 'fish-products', 'frozen-fishes', 'fatty-fishes', 'whitefishes', 'fish-sticks', 'canned-fish', 'bonito', 'trouts', 'herrings']],
  ['Mariscos', ['crustaceans', 'molluscs', 'shrimps', 'prawns', 'mussels', 'clams', 'squids', 'octopus', 'cephalopods', 'canned-seafood', 'canned-molluscs', 'canned-mussels', 'crabs', 'lobsters', 'surimi', 'cockles']],
  ['Carnes', ['meats', 'poultries', 'chicken-meat', 'chickens', 'turkeys', 'pork-meats', 'beef-meats', 'beef', 'porks', 'lamb-meats', 'minced-meat', 'ground-beef', 'burgers', 'meatballs', 'meat-preparations', 'fresh-meats', 'frozen-meats', 'chicken-breasts', 'cutlets', 'steaks', 'fillets']],
  ['Cereales de desayuno y barritas', ['breakfast-cereals', 'cereal-bars', 'muesli', 'granolas', 'corn-flakes', 'chocolate-cereals', 'oat-flakes', 'rolled-oats', 'cereal-flakes', 'puffed-cereals', 'snack-bars', 'energy-bars', 'protein-bars', 'fruit-bars', 'muesli-bars', 'cereals-with-chocolate', 'extruded-cereals']],
  ['Galletas, bollería y pasteles', ['biscuits', 'cookies', 'biscuits-and-cakes', 'cakes', 'pastries', 'viennoiseries', 'croissants', 'muffins', 'madeleines', 'magdalenas', 'donuts', 'sponge-cakes', 'chocolate-biscuits', 'shortbread-cookies', 'wafers', 'sweet-biscuits', 'sandwich-cookies', 'tarts', 'brioches', 'pastry', 'bakery-products', 'napolitanas', 'ensaimadas', 'palmeras', 'churros', 'galletas', 'sobaos', 'bizcochos', 'waffles', 'pancakes', 'crepes', 'cream-cakes', 'chocolate-cakes', 'fruit-cakes', 'pies', 'sweet-pies']],
  ['Pan y tostadas', ['breads', 'sliced-breads', 'baguettes', 'toasts', 'rusks', 'bread-rolls', 'sandwich-breads', 'wholemeal-breads', 'flatbreads', 'tortilla-wraps', 'wraps', 'pitas', 'breadsticks', 'crispbreads', 'bagels', 'buns', 'toasted-breads', 'special-breads', 'panes', 'picos', 'grissini', 'bread-crumbs', 'breadcrumbs', 'panettone', 'tortillas']],
  ['Dulces y chocolate', ['chocolates', 'chocolate-bars', 'dark-chocolates', 'milk-chocolates', 'white-chocolates', 'cocoa-and-its-products', 'chocolate-spreads', 'hazelnut-spreads', 'candies', 'confectioneries', 'gummies', 'jams', 'marmalades', 'fruit-jams', 'sweet-spreads', 'honeys', 'sugars', 'sweeteners', 'lollipops', 'chewing-gum', 'chewing-gums', 'caramels', 'marshmallows', 'nougats', 'turrones', 'marzipans', 'dulce-de-leche', 'membrillo', 'quince-jellies', 'fruit-jellies', 'bonbons', 'chocolate-candies', 'cocoa-powders', 'sprinkles', 'syrups', 'sweet-snacks', 'jellies', 'compotes', 'fruit-compotes', 'fruit-purees', 'condensed-milk-spreads', 'sugar', 'brown-sugars', 'powdered-sugar', 'agave-syrups', 'maple-syrups']],
  ['Snacks salados', ['salty-snacks', 'appetizers', 'chips-and-fries', 'crisps', 'potato-crisps', 'tortilla-chips', 'popcorn', 'pretzels', 'crackers', 'puffed-snacks', 'snacks', 'nut-snacks', 'cheese-snacks', 'corn-snacks', 'extruded-snacks', 'rice-cakes', 'savory-snacks', 'aperitifs', 'cocktail-snacks', 'pork-rinds', 'olives', 'pickles', 'gherkins', 'pickled-vegetables', 'pickled-olives', 'stuffed-olives']],
  ['Frutos secos y semillas', ['nuts', 'seeds', 'almonds', 'walnuts', 'hazelnuts', 'peanuts', 'pistachios', 'cashew-nuts', 'sunflower-seeds', 'pumpkin-seeds', 'chia-seeds', 'flax-seeds', 'nut-butters', 'peanut-butters', 'nuts-and-their-products', 'dried-nuts', 'roasted-nuts', 'salted-nuts', 'seeds-and-their-products', 'sesame-seeds', 'mixed-nuts', 'pine-nuts', 'chestnuts', 'tahini']],
  ['Legumbres', ['legumes', 'pulses', 'legumes-and-their-products', 'chickpeas', 'lentils', 'beans', 'white-beans', 'red-beans', 'black-beans', 'canned-legumes', 'cooked-legumes', 'dried-legumes', 'peas', 'green-peas', 'canned-chickpeas', 'canned-lentils', 'canned-beans', 'hummus', 'soybeans', 'edamame', 'fava-beans', 'broad-beans']],
  ['Patatas y tubérculos', ['potatoes', 'sweet-potatoes', 'frozen-potatoes', 'mashed-potatoes', 'potato-products', 'french-fries', 'fries', 'potato-gnocchi', 'yams', 'cassava', 'boiled-potatoes']],
  ['Cereales, arroz y pasta', ['pastas', 'pasta', 'dried-pastas', 'fresh-pastas', 'rices', 'rice', 'flours', 'wheat-flours', 'semolinas', 'couscous', 'noodles', 'instant-noodles', 'cereals-and-their-products', 'cereal-grains', 'quinoa', 'oats', 'cereals', 'spaghetti', 'macaroni', 'cooked-rice', 'basmati-rices', 'long-grain-rices', 'round-grain-rices', 'wholegrain-pastas', 'gluten-free-flours', 'cornflours', 'starches', 'breakfast-porridges', 'porridge', 'corn', 'sweet-corn', 'polenta', 'bulgur', 'fideos', 'lasagna-sheets', 'pasta-shells', 'tagliatelle']],
  ['Aceites y grasas', ['oils', 'olive-oils', 'vegetable-oils', 'extra-virgin-olive-oils', 'sunflower-oils', 'fats', 'butters', 'margarines', 'vegetable-fats', 'animal-fats', 'spreadable-fats', 'lards', 'coconut-oils', 'seed-oils', 'plant-based-oils', 'dairy-fats', 'vegetable-butters', 'vegetable-margarines', 'ghee']],
  ['Salsas y condimentos', ['sauces', 'condiments', 'ketchup', 'ketchups', 'mayonnaises', 'mustards', 'vinegars', 'dressings', 'salad-dressings', 'tomato-sauces', 'pesto-sauces', 'soy-sauces', 'spices', 'herbs', 'salts', 'stocks', 'bouillons', 'broths', 'seasonings', 'cooking-helpers', 'sofritos', 'fried-tomato-sauces', 'pasta-sauces', 'tartar-sauces', 'barbecue-sauces', 'hot-sauces', 'spice-mixes', 'gravy', 'mixed-spices', 'aioli', 'alioli', 'balsamic-vinegars', 'wine-vinegars', 'seasoning-mixes', 'stock-cubes', 'flavoring-cubes', 'sauces-and-condiments']],
  ['Platos preparados', ['meals', 'prepared-meals', 'pizzas', 'pizzas-pies-and-quiches', 'soups', 'sandwiches', 'canned-meals', 'ready-meals', 'frozen-meals', 'lasagnas', 'croquettes', 'empanadas', 'quiches', 'salads', 'prepared-salads', 'gazpachos', 'salmorejos', 'creams-soups', 'broth-soups', 'tortillas-de-patatas', 'spanish-omelettes', 'paellas', 'stews', 'cannelloni', 'ravioli', 'filled-pastas', 'meals-with-meat', 'meals-with-fish', 'vegetable-dishes', 'dishes', 'canned-dishes', 'chilled-meals', 'sushi', 'burgers-meals', 'nuggets', 'chicken-nuggets', 'breaded-products', 'fried-foods', 'kebabs', 'fajitas', 'burritos', 'tacos', 'dumplings', 'spring-rolls', 'sandwich-fillings']],
  ['Bebidas', ['beverages', 'sodas', 'carbonated-drinks', 'waters', 'fruit-juices', 'juices-and-nectars', 'juices', 'nectars', 'energy-drinks', 'teas', 'coffees', 'iced-teas', 'sweetened-beverages', 'unsweetened-beverages', 'mineral-waters', 'spring-waters', 'sparkling-waters', 'colas', 'lemonades', 'orangeades', 'isotonic-drinks', 'sports-drinks', 'tonic-waters', 'sodas-with-sweeteners', 'beverages-and-beverages-preparations', 'non-alcoholic-beverages', 'flavoured-waters', 'coffee-drinks', 'cocoa-drinks', 'chocolate-drinks', 'smoothies', 'fruit-based-beverages', 'plant-based-beverages', 'drinks', 'instant-beverages', 'beverage-preparations', 'infusions', 'herbal-teas', 'horchatas', 'kombuchas', 'soft-drinks']],
  ['Verduras y hortalizas', ['vegetables', 'canned-vegetables', 'frozen-vegetables', 'tomatoes', 'canned-tomatoes', 'fresh-vegetables', 'leaf-vegetables', 'root-vegetables', 'mushrooms', 'onions', 'carrots', 'lettuces', 'spinach', 'peppers', 'cucumbers', 'pumpkins', 'artichokes', 'asparagus', 'beetroots', 'cabbages', 'cauliflowers', 'broccoli', 'zucchini', 'aubergines', 'garlic', 'seaweeds', 'algae', 'tomato-purees', 'crushed-tomatoes', 'fried-tomatoes', 'canned-corn', 'pickled-vegetables', 'salad-mixes', 'vegetable-purees', 'vegetable-juices', 'vegetables-and-their-products']],
  ['Frutas', ['fruits', 'fresh-fruits', 'canned-fruits', 'frozen-fruits', 'dried-fruits', 'fruits-based-foods', 'fruit-salads', 'citrus', 'apples', 'bananas', 'oranges', 'berries', 'strawberries', 'peaches', 'pears', 'pineapples', 'fruits-and-their-products', 'dried-plant-based-foods', 'stone-fruits', 'tropical-fruits', 'raisins', 'dates', 'prunes', 'apricots', 'avocados', 'coconuts', 'lemons', 'melons', 'watermelons', 'kiwis', 'grapes', 'figs', 'mangoes', 'fruit-cups', 'fruit-in-syrup', 'peaches-in-syrup', 'canned-peaches', 'fruit-cocktails', 'fruits-in-jelly', 'apple-sauces']],
]

/** `pnns_groups_2` de OFF (minúsculas) → categoría, para cuando las etiquetas de categoría no bastan. */
const PNNS_A_CATEGORIA: Record<string, CategoriaAlimento> = {
  'milk and yogurt': 'Yogures y postres lácteos',
  cheese: 'Quesos',
  'processed meat': 'Embutidos y fiambres',
  meat: 'Carnes',
  'fish and seafood': 'Pescados',
  eggs: 'Huevos',
  fruits: 'Frutas',
  vegetables: 'Verduras y hortalizas',
  legumes: 'Legumbres',
  nuts: 'Frutos secos y semillas',
  bread: 'Pan y tostadas',
  'breakfast cereals': 'Cereales de desayuno y barritas',
  cereals: 'Cereales, arroz y pasta',
  potatoes: 'Patatas y tubérculos',
  'biscuits and cakes': 'Galletas, bollería y pasteles',
  'chocolate products': 'Dulces y chocolate',
  sweets: 'Dulces y chocolate',
  'ice cream': 'Helados',
  'sweetened beverages': 'Bebidas',
  'unsweetened beverages': 'Bebidas',
  'waters and flavored waters': 'Bebidas',
  'fruit juices': 'Bebidas',
  'fruit nectars': 'Bebidas',
  'artificially sweetened beverages': 'Bebidas',
  'alcoholic beverages': 'Bebidas alcohólicas',
  'salty and fatty products': 'Snacks salados',
  appetizers: 'Snacks salados',
  sandwiches: 'Platos preparados',
  'pizza pies and quiche': 'Platos preparados',
  'one-dish meals': 'Platos preparados',
  soups: 'Platos preparados',
  'dressings and sauces': 'Salsas y condimentos',
  fats: 'Aceites y grasas',
  'dairy desserts': 'Yogures y postres lácteos',
  'plant-based milk substitutes': 'Bebidas vegetales',
  'dried fruits': 'Frutas',
  'fruit nectars ': 'Bebidas',
}

/** Última red: palabras del nombre (sin tildes, en minúsculas) → categoría, cuando ni las etiquetas ni `pnns_groups_2` sirven. */
const PALABRAS_A_CATEGORIA: [CategoriaAlimento, string[]][] = [
  ['Bebidas alcohólicas', ['cerveza', 'vino', 'cava', 'sidra', 'whisky', 'ginebra', 'ron', 'vodka', 'licor']],
  ['Salsas y condimentos', ['mayonesa', 'ketchup', 'salsa', 'vinagre', 'mostaza', 'alioli', 'sofrito', 'pesto']],
  ['Yogures y postres lácteos', ['yogur', 'yogurt', 'kefir', 'natillas', 'cuajada', 'gelatina', 'flan', 'skyr']],
  ['Quesos', ['queso', 'quesitos', 'mozzarella', 'cheese']],
  ['Leche y nata', ['leche', 'nata']],
  ['Galletas, bollería y pasteles', ['galletas', 'galleta', 'magdalenas', 'bizcocho', 'croissant', 'donuts']],
  ['Dulces y chocolate', ['chocolate', 'caramelos', 'mermelada', 'miel', 'turron']],
  ['Pan y tostadas', ['pan', 'tostadas', 'baguette']],
  ['Platos preparados', ['pizza', 'lasana', 'gazpacho', 'salmorejo', 'sopa', 'crema', 'tortilla', 'croquetas']],
  ['Bebidas', ['zumo', 'agua', 'refresco', 'cola', 'te', 'cafe', 'bebida', 'isotonica']],
]

/** Categoría AppFit por las etiquetas de OFF (reglas ordenadas), luego `pnns_groups_2`, luego el nombre, si no «Otros». */
export function categoriaDeOff(etiquetas: string[], pnns2: string, nombre = ''): CategoriaAlimento {
  const set = new Set(etiquetas)
  for (const [categoria, tags] of REGLAS_CATEGORIA) {
    if (tags.some((t) => set.has(t))) return categoria
  }
  const porPnns = PNNS_A_CATEGORIA[pnns2.trim().toLowerCase()]
  if (porPnns) return porPnns
  const palabras = new Set(sinTildes(nombre).split(/[^a-z0-9]+/).filter(Boolean))
  for (const [categoria, lista] of PALABRAS_A_CATEGORIA) {
    if (lista.some((p) => palabras.has(p))) return categoria
  }
  return 'Otros'
}
