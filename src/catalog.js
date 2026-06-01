const fs = require('fs');
const path = require('path');

function loadCatalog() {
  const file = path.join(__dirname, '..', 'data', 'catalog.json');
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.regions) || data.regions.length === 0) {
    throw new Error('В каталоге не заданы регионы');
  }
  if (!Array.isArray(data.materials) || data.materials.length === 0) {
    throw new Error('В каталоге нет материалов');
  }

  return data;
}

function priceFor(material, regionCode) {
  const price = material.prices[regionCode];
  if (typeof price !== 'number') {
    throw new Error(`Нет цены для товара "${material.name}" в регионе ${regionCode}`);
  }
  return price;
}

function materialsForRegion(catalog, regionCode) {
  return catalog.materials
    .map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      unit: m.unit,
      price: priceFor(m, regionCode),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, 'ru') || a.price - b.price);
}

function cheapestInCategory(catalog, category, regionCode) {
  const sameGroup = catalog.materials.filter((m) => m.category === category);

  return sameGroup.reduce((best, current) => {
    if (!best) return current;
    return priceFor(current, regionCode) < priceFor(best, regionCode) ? current : best;
  }, null);
}

module.exports = {
  loadCatalog,
  priceFor,
  materialsForRegion,
  cheapestInCategory,
};
