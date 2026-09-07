export const kitchenItems = [
  {
    id: "rice",
    name: "Rice Bag 25kg",
    category: "Dry Ingredient",
    currentStock: 18,
    weeklyDemand: 18,
    workingWeeks: 52,
    setupCost: 28,
    holdingRate: 20,
    leadTimeDays: 5,
    supplier: "Dry Goods Wholesaler",
    tiers: [
      { min: 1, max: 49, unitCost: 24 },
      { min: 50, max: 149, unitCost: 22.8 },
      { min: 150, max: "", unitCost: 21.9 }
    ]
  },
  {
    id: "oil",
    name: "Cooking Oil Tin 18L",
    category: "Dry Ingredient",
    currentStock: 7,
    weeklyDemand: 8,
    workingWeeks: 52,
    setupCost: 26,
    holdingRate: 18,
    leadTimeDays: 5,
    supplier: "Dry Goods Wholesaler",
    tiers: [
      { min: 1, max: 19, unitCost: 31 },
      { min: 20, max: 59, unitCost: 29.5 },
      { min: 60, max: "", unitCost: 28.4 }
    ]
  },
  {
    id: "chicken",
    name: "Chicken Breast kg",
    category: "Fresh Ingredient",
    currentStock: 20,
    weeklyDemand: 72,
    workingWeeks: 52,
    setupCost: 32,
    holdingRate: 24,
    leadTimeDays: 2,
    supplier: "Fresh Food Supplier",
    tiers: [
      { min: 1, max: 49, unitCost: 5.4 },
      { min: 50, max: 119, unitCost: 5.15 },
      { min: 120, max: "", unitCost: 4.95 }
    ]
  },
  {
    id: "boxes",
    name: "Takeaway Food Box",
    category: "Packaging",
    currentStock: 135,
    weeklyDemand: 180,
    workingWeeks: 52,
    setupCost: 14,
    holdingRate: 8,
    leadTimeDays: 6,
    supplier: "Packaging Supplier",
    tiers: [
      { min: 1, max: 199, unitCost: 0.18 },
      { min: 200, max: 599, unitCost: 0.16 },
      { min: 600, max: "", unitCost: 0.14 }
    ]
  }
];
