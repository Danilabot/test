const fs = require('fs');
const path = require('path');
const { priceFor, cheapestInCategory } = require('./catalog');

const DISCOUNT = 0.05;

function roundRub(value) {
  return Math.round(value * 100) / 100;
}

function buildRetentionOffer(catalog, selected, regionCode) {
  const cheapest = cheapestInCategory(catalog, selected.category, regionCode);
  const selectedPrice = selected.price;

  if (cheapest.id !== selected.id) {
    return {
      type: 'analog',
      material: cheapest,
      price: priceFor(cheapest, regionCode),
      saving: selectedPrice - priceFor(cheapest, regionCode),
    };
  }

  const discounted = roundRub(selectedPrice * (1 - DISCOUNT));
  return {
    type: 'discount',
    material: selected,
    price: discounted,
    saving: roundRub(selectedPrice - discounted),
    discountPercent: DISCOUNT * 100,
  };
}

function saveOrder(order) {
  const dir = path.join(__dirname, '..', 'orders');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `order-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(order, null, 2), 'utf8');

  return file;
}

module.exports = { buildRetentionOffer, saveOrder, roundRub };
