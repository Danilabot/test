const { loadCatalog, materialsForRegion } = require('./src/catalog');
const { buildRetentionOffer, saveOrder, roundRub } = require('./src/order');
const { createPrompt } = require('./src/prompt');

function formatRub(value) {
  return value.toLocaleString('ru-RU') + ' ₽';
}

async function chooseRegion(prompt, catalog) {
  console.log('Выберите регион доставки:');
  catalog.regions.forEach((region, index) => {
    console.log(`  ${index + 1}. ${region.title}`);
  });

  const choice = await prompt.askNumber('Регион: ', 1, catalog.regions.length);
  return catalog.regions[choice - 1];
}

async function chooseMaterial(prompt, items, region) {
  console.log(`\nМатериалы с ценами для региона «${region.title}»:`);
  items.forEach((item, index) => {
    const number = String(index + 1).padStart(2, ' ');
    console.log(`  ${number}. [${item.category}] ${item.name} — ${formatRub(item.price)} / ${item.unit}`);
  });

  const choice = await prompt.askNumber('\nНомер товара: ', 1, items.length);
  return items[choice - 1];
}

function printOrderPreview(item, region, quantity) {
  const total = roundRub(item.price * quantity);
  console.log('\nВаш заказ:');
  console.log(`  Регион:     ${region.title}`);
  console.log(`  Товар:      ${item.name}`);
  console.log(`  Категория:  ${item.category}`);
  console.log(`  Цена:       ${formatRub(item.price)} / ${item.unit}`);
  console.log(`  Количество: ${quantity} ${item.unit}`);
  console.log(`  Итого:      ${formatRub(total)}`);
  return total;
}

function buildOrder(region, item, quantity, source) {
  return {
    createdAt: new Date().toISOString(),
    region: { code: region.code, title: region.title },
    item: {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      unitPrice: item.price,
      quantity,
      total: roundRub(item.price * quantity),
    },
    pricing: source,
    status: 'confirmed',
  };
}

async function run() {
  const catalog = loadCatalog();
  const prompt = createPrompt();

  try {
    console.log('=== Монолит Северо-Запад: заявка на материалы ===\n');

    const region = await chooseRegion(prompt, catalog);
    const items = materialsForRegion(catalog, region.code);
    const selected = await chooseMaterial(prompt, items, region);

    const quantity = await prompt.askNumber(`Количество (${selected.unit}): `, 1, 100000);
    printOrderPreview(selected, region, quantity);

    if (await prompt.askYesNo('\nОформляем заявку? (y/n): ')) {
      const order = buildOrder(region, selected, quantity, 'base');
      const file = saveOrder(order);
      console.log(`\nЗаявка оформлена. Файл: ${file}`);
      return;
    }

    const offer = buildRetentionOffer(catalog, selected, region.code);
    const offerTotal = roundRub(offer.price * quantity);

    console.log('\nПодождите, у нас есть предложение для вас:');
    if (offer.type === 'analog') {
      console.log(`  Аналог в той же категории: ${offer.material.name}`);
      console.log(`  Цена: ${formatRub(offer.price)} / ${offer.material.unit} (выгода ${formatRub(offer.saving)} за единицу)`);
    } else {
      console.log(`  Вы выбрали самый доступный товар в категории «${selected.category}».`);
      console.log(`  Дарим персональную скидку ${offer.discountPercent}%: ${formatRub(offer.price)} / ${offer.material.unit}`);
    }
    console.log(`  Итого по предложению: ${formatRub(offerTotal)}`);

    if (await prompt.askYesNo('\nОформляем по этому предложению? (y/n): ')) {
      const finalItem = {
        id: offer.material.id,
        name: offer.material.name,
        category: offer.material.category,
        unit: offer.material.unit,
        price: offer.price,
      };
      const source = offer.type === 'discount' ? `discount-${offer.discountPercent}` : 'analog';
      const order = buildOrder(region, finalItem, quantity, source);
      const file = saveOrder(order);
      console.log(`\nЗаявка оформлена. Файл: ${file}`);
      return;
    }

    console.log('\nЗаявка не оформлена. Будем рады видеть вас снова.');
  } finally {
    prompt.close();
  }
}

run().catch((error) => {
  console.error(`Ошибка: ${error.message}`);
  process.exit(1);
});
