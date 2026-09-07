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

// EOQ model using the requested notation:
// Q* = sqrt(2 K a / h),  t* = Q* / a.
export function calculateEOQ({ demandRate: a, setupCost: K, holdingCost: h }) {
  const demand = Number(a);
  const setup = Number(K);
  const holding = Number(h);
  if (!(demand > 0 && setup > 0 && holding > 0)) return { errors: ["a, K and h must be greater than zero."] };

  const Q = Math.sqrt((2 * setup * demand) / holding);
  const t = Q / demand;
  return { errors: [], demandRate: demand, setupCost: setup, holdingCost: holding, Q, t };
}

// EOQ model with planned shortages using the requested notation:
// Q* = sqrt((2 a K / h) * ((p + h) / p))
// S* = Q* p / (p + h)
// Q* - S* = maximum shortage.
export function calculateEOQWithShortage({ demandRate: a, setupCost: K, holdingCost: h, shortageCost: p }) {
  const demand = Number(a);
  const setup = Number(K);
  const holding = Number(h);
  const shortage = Number(p);
  if (!(demand > 0 && setup > 0 && holding > 0 && shortage > 0)) {
    return { errors: ["a, K, h and p must be greater than zero."] };
  }

  const Q = Math.sqrt(((2 * demand * setup) / holding) * ((shortage + holding) / shortage));
  const t = Q / demand;
  const S = Q * (shortage / (shortage + holding));
  const maximumShortage = Q - S;

  return {
    errors: [],
    demandRate: demand,
    setupCost: setup,
    holdingCost: holding,
    shortageCost: shortage,
    Q,
    t,
    S,
    maximumShortage
  };
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
