// Kategorie produktów w katalogu — wspólne dla serwera (walidacja zapisu)
// i przeglądarki (lista rozwijana w formularzu). Przepisy mają własną,
// osobną kategorię „🍲 Przepisy" i do wyboru tu nie trafiają.
//
// „Przetworzone" zbiera gotowe dania, przekąski, słodycze, sosy, napoje
// i wyroby typu kiełbasa czy parówki. Wędliny w plastrach (szynka, boczek)
// zostają w mięsie, chleb i makaron w zbożach.

export const FOOD_CATEGORIES = [
  "🥛 Nabiał",
  "🥩 Mięso",
  "🐟 Ryby",
  "🥦 Warzywa",
  "🍎 Owoce",
  "🌾 Zboża",
  "🍟 Przetworzone",
  "🥚 Inne",
];

export const FALLBACK_CATEGORY = "🥚 Inne";

// Podpowiedź kategorii dla produktu z Open Food Facts na podstawie jego
// `categories_tags`. Reguły sprawdzamy po kolei — „przetworzone" pierwsze,
// bo pizza z serem ma też tag nabiału, a kiełbasa tag mięsa. Jogurty mają
// w OFF tag „desserts", więc deserów tu celowo nie ma.
const RULES = [
  [/^en:(meals|pizzas|sandwiches|soups|sausages|sauces|condiments|confectioneries|chocolates|biscuits-and-cakes|pastries|salty-snacks|chips-and-fries|crisps|alcoholic-beverages|sodas|sweetened-beverages|dietary-supplements|bodybuilding-supplements|frozen-desserts|ice-creams)$/, "🍟 Przetworzone"],
  [/^en:(dairies|milks|cheeses|yogurts|fermented-milk-products)$/, "🥛 Nabiał"],
  [/^en:(fishes|seafood|fish-and-seafood|fatty-fishes)$/, "🐟 Ryby"],
  [/^en:(meats|poultries|prepared-meats|hams)$/, "🥩 Mięso"],
  [/^en:(fruits|dried-fruits|fresh-fruits|frozen-fruits|berries)$/, "🍎 Owoce"],
  [/^en:(vegetables|fresh-vegetables|frozen-vegetables|pickles|mushrooms)$/, "🥦 Warzywa"],
  [/^en:(cereals-and-potatoes|breads|pastas|cereal-grains|flours|rices|breakfast-cereals|potatoes)$/, "🌾 Zboża"],
  [/^en:(nuts|seeds|eggs|fats|vegetable-oils|honeys|sugars|legumes)$/, "🥚 Inne"],
];

// Wiele produktów w OFF nie ma tagów kategorii — wtedy podpowiada nazwa.
// Początki słów, w tej samej kolejności co wyżej: „pizza z serem" to
// przetworzone, nie nabiał. Granica słowa przez lookbehind, bo `\b` w JS
// nie widzi polskich liter („łosoś" po spacji nie miałby granicy).
const NAME_RULES = [
  [/(?<!\p{L})(pizz|chips|czips|baton|czekolad|ciast|ciastk|babecz|pącz|cukierk|żelk|lody|sos|ketchup|majonez|musztard|kiełbas|kiełbask|parów|pasztet|kabanos|nugget|zup(?!eł)|sernik|kanapk|sałatk|piwo|wino(?!gr)|wódk|napój|napoj|lemoniad|krakers|paluszk|precl|pretzel|frytk|pierog|naleśnik|burger|kebab|lasagn|dżem|gofr|herbatnik|draż)/u, "🍟 Przetworzone"],
  [/(?<!\p{L})(jogurt|ser|serek|mleko|mleczn|kefir|skyr|twaróg|twarog|mozzarell|mozarell|maślank|śmietan|burrat|feta|parmezan)/u, "🥛 Nabiał"],
  [/(?<!\p{L})(łosoś|losos|tuńczyk|tunczyk|dorsz|makrel|śledź|sledz|krewet|pstrąg|mintaj|sardyn|ryb)/u, "🐟 Ryby"],
  [/(?<!\p{L})(kurczak|kurcz|indyk|wołow|wolow|wieprz|schab|karków|szynk|boczek|polędwic|mięs|filet)/u, "🥩 Mięso"],
  [/(?<!\p{L})(jabłk|jablk|banan|truskaw|borówk|borowk|malin|winogr|pomarańcz|cytryn|gruszk|śliwk|wiśni|mango|ananas|kiwi|owoc|rodzynk|daktyl|morel)/u, "🍎 Owoce"],
  [/(?<!\p{L})(ogór|ogor|pomidor|papryk|marchew|kapust|sałat|brokuł|kalafior|cebul|czosn|szpinak|cukini|dyni|bura|buracz|pieczark|warzyw|ziemniak|kukurydz|groszek|fasolk|rukol|oliwk)/u, "🥦 Warzywa"],
  [/(?<!\p{L})(chleb|bułk|bulk|bagietk|makaron|spaghetti|penne|ryż|ryz|kasz|płatk|platk|mąk|musli|granol|tortill|wafle ryż|bajgiel|grahamk)/u, "🌾 Zboża"],
  [/(?<!\p{L})(orzech|orzeszk|migdał|nasion|pestk|jaj|olej|oliwa|miód|miod|cukier|soczewic|ciecierzyc|tofu)/u, "🥚 Inne"],
];

export function guessFoodCategory(tags, name = "") {
  const list = Array.isArray(tags) ? tags : [];
  for (const [re, category] of RULES) {
    if (list.some(t => re.test(t))) return category;
  }
  const n = String(name).toLowerCase();
  for (const [re, category] of NAME_RULES) {
    if (re.test(n)) return category;
  }
  return FALLBACK_CATEGORY;
}
