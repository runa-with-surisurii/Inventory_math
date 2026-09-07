export function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeTiers(tiers) {
  return tiers
    .map((tier, index) => ({
      id: index + 1,
      min: Number(tier.min),
      max: tier.max === "" || tier.max === null || tier.max === undefined ? Infinity : Number(tier.max),
      unitCost: Number(tier.unitCost)
    }))
    .sort((a, b) => a.min - b.min);
}

export function validateInputs({ weeklyDemand, workingWeeks, setupCost, holdingRate, tiers }) {
  const errors = [];
  const positiveFields = [
    ["Weekly demand", weeklyDemand],
    ["Working weeks per year", workingWeeks],
    ["Setup cost", setupCost],
    ["Holding cost rate", holdingRate]
  ];

  positiveFields.forEach(([label, value]) => {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) errors.push(`${label} must be greater than zero.`);
  });

  if (!tiers.length) errors.push("At least one quantity discount tier is required.");

  tiers.forEach((tier, index) => {
    if (!Number.isFinite(tier.min) || tier.min <= 0) errors.push(`Tier ${index + 1} minimum must be greater than zero.`);
    if (tier.max !== Infinity && (!Number.isFinite(tier.max) || tier.max < tier.min)) errors.push(`Tier ${index + 1} maximum is invalid.`);
    if (!Number.isFinite(tier.unitCost) || tier.unitCost <= 0) errors.push(`Tier ${index + 1} unit cost must be greater than zero.`);
    const next = tiers[index + 1];
    if (next && tier.max >= next.min) errors.push(`Tier ${index + 1} overlaps Tier ${index + 2}.`);
  });

  return errors;
}

export function calculateQuantityDiscountFlow({ itemName, weeklyDemand, workingWeeks, setupCost, holdingRate, tiers }) {
  const normalizedTiers = normalizeTiers(tiers);
  const errors = validateInputs({
    weeklyDemand,
    workingWeeks,
    setupCost,
    holdingRate,
    tiers: normalizedTiers
  });

  if (errors.length) return { errors };

  const weekly = Number(weeklyDemand);
  const weeks = Number(workingWeeks);
  const K = Number(setupCost);
  const rate = Number(holdingRate);
  const annualDemand = weekly * weeks;

  const comparisons = normalizedTiers.map((tier) => {
    const holdingCost = rate * tier.unitCost;
    const rawEOQ = Math.sqrt((2 * annualDemand * K) / holdingCost);
    const candidateQ = Math.min(Math.max(rawEOQ, tier.min), tier.max);
    const setupCostPart = (annualDemand * K) / candidateQ;
    const purchaseCostPart = annualDemand * tier.unitCost;
    const holdingCostPart = (holdingCost * candidateQ) / 2;
    const totalCost = setupCostPart + purchaseCostPart + holdingCostPart;
    const adjustment =
      rawEOQ < tier.min
        ? `EOQ is below this tier, so use minimum ${tier.min}.`
        : rawEOQ > tier.max
          ? `EOQ is above this tier, so use maximum ${tier.max}.`
          : "EOQ is inside this tier, so use it directly.";

    return {
      ...tier,
      holdingCost,
      rawEOQ,
      candidateQ,
      setupCostPart,
      purchaseCostPart,
      holdingCostPart,
      totalCost,
      adjustment
    };
  });

  const best = comparisons.reduce((lowest, current) => (current.totalCost < lowest.totalCost ? current : lowest));
  const ordersPerYear = annualDemand / best.candidateQ;
  const timeYears = best.candidateQ / annualDemand;
  const timeWeeks = timeYears * weeks;

  return {
    errors: [],
    itemName,
    weeklyDemand: weekly,
    workingWeeks: weeks,
    setupCost: K,
    holdingRate: rate,
    annualDemand,
    comparisons,
    best,
    ordersPerYear,
    timeYears,
    timeWeeks
  };
}
