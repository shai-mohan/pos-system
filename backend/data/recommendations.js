// Rule-based AI recommendations: item name -> suggested item names
const RECOMMENDATIONS = {
  Burger: ['Fries', 'Coke'],
  'Grilled Chicken': ['Fries', 'Coke'],
  Pasta: ['Coke', 'Garlic Bread'],
  Latte: ['Croissant', 'Cheesecake'],
  Cappuccino: ['Croissant', 'Brownie'],
  Americano: ['Croissant', 'Cheesecake'],
  'Green Tea': ['Brownie', 'Cheesecake'],
  'Chai Latte': ['Croissant', 'Brownie'],
  Cheesecake: ['Latte', 'Cappuccino'],
  Croissant: ['Latte', 'Cappuccino'],
  Brownie: ['Cappuccino', 'Latte'],
  Fries: ['Burger', 'Coke'],
  Coke: ['Burger', 'Fries'],
};

function getRecommendations(cartItemNames, allMenuItems, limit = 3) {
  const cartSet = new Set(cartItemNames.map((n) => n.toLowerCase()));
  const suggested = new Set();

  for (const name of cartItemNames) {
    const rules = RECOMMENDATIONS[name] || [];
    for (const rec of rules) {
      if (!cartSet.has(rec.toLowerCase())) {
        suggested.add(rec);
      }
    }
  }

  const available = allMenuItems.filter(
    (item) => item.available && suggested.has(item.name)
  );

  if (available.length < limit) {
    const extras = allMenuItems
      .filter(
        (item) =>
          item.available &&
          !cartSet.has(item.name.toLowerCase()) &&
          !available.some((a) => a.id === item.id)
      )
      .slice(0, limit - available.length);
    available.push(...extras);
  }

  return available.slice(0, limit);
}

module.exports = { getRecommendations, RECOMMENDATIONS };
