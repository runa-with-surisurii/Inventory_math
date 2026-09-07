(() => {
  const seedItems = [
    {name:'Rice Bag 25kg',category:'Dry Goods',stock:12,demand:18,supplier:'Golden Harvest',setup:28,lead:3,unit:32},
    {name:'Cooking Oil 5L',category:'Oil',stock:8,demand:12,supplier:'Prime Foods',setup:18,lead:2,unit:21},
    {name:'Chicken Breast',category:'Meat',stock:34,demand:45,supplier:'Fresh Farm',setup:35,lead:2,unit:7.5},
    {name:'Mozzarella 1kg',category:'Dairy',stock:6,demand:10,supplier:'Dairy Hub',setup:22,lead:4,unit:11.5},
    {name:'Tomato Crate',category:'Produce',stock:20,demand:28,supplier:'Green Market',setup:15,lead:1,unit:4.2},
    {name:'Burger Buns',category:'Bakery',stock:55,demand:60,supplier:'Daily Bake',setup:12,lead:1,unit:1.4}
  ];

  try {
    const current = JSON.parse(localStorage.getItem('kitcheniq-items') || 'null');
    if (!Array.isArray(current) || current.length === 0) {
      localStorage.setItem('kitcheniq-items', JSON.stringify(seedItems));
    }
  } catch {
    localStorage.setItem('kitcheniq-items', JSON.stringify(seedItems));
  }
})();
