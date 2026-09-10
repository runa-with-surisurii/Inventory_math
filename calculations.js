// KitchenIQ - Central calculation engine
// Keep ALL mathematical formulas here so the calculation logic is easy to read,
// test, and explain during the presentation.

export function round(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return 0;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

export function ceilUnits(value) {
  return Math.max(0, Math.ceil(Number(value) || 0));
}

// ------------------------------------------------------------
// Basic inventory calculations
// ------------------------------------------------------------

// Reorder Point from the deterministic lead-time demand model.
// Used only where the system needs a simple lead-time coverage value.
export function calculateLeadTimeReorderPoint({ weeklyDemand, leadTimeDays }) {
  const demand = Number(weeklyDemand);
  const lead = Number(leadTimeDays);
  if (!(demand > 0 && lead > 0)) return 0;
  return ceilUnits((demand * lead) / 7);
}

// Simple one-time order quantity used by the reorder queue.
export function calculateOrderQuantity({ weeklyDemand, stock, coverageWeeks = 2 }) {
  const demand = Number(weeklyDemand);
  const currentStock = Number(stock);
  const weeks = Number(coverageWeeks);
  if (!(demand > 0) || !Number.isFinite(currentStock) || !(weeks > 0)) return 0;
  return Math.max(1, ceilUnits(demand * weeks - currentStock));
}

// ------------------------------------------------------------
// STOCHASTIC INVENTORY CONTROL - required course formula
// ------------------------------------------------------------
//
// R = μ + K(1-L)σ
// Safety Stock = R - μ = K(1-L)σ
//
// μ = mean demand
// σ = standard deviation of demand
// L = allowable shortage / stockout probability
// K = service/safety factor
// R = reorder point
//
// IMPORTANT: Do not replace this with another safety-stock formula.
// This is the stochastic formula used by KitchenIQ.

export const SERVICE_FACTORS = {
  0.90: 1.282,
  0.95: 1.645,
  0.99: 2.326
};

export function serviceFactor(serviceLevel = 0.95) {
  const level = Number(serviceLevel);
  if (SERVICE_FACTORS[level]) return SERVICE_FACTORS[level];

  // Common normal-distribution approximations for other service levels.
  if (level >= 0.995) return 2.576;
  if (level >= 0.99) return 2.326;
  if (level >= 0.975) return 1.96;
  if (level >= 0.95) return 1.645;
  if (level >= 0.90) return 1.282;
  return 1.0;
}

export function calculateStochasticControl({ meanDemand: mu, standardDeviation: sigma, shortageProbability: L = 0.05, safetyFactor: K }) {
  const mean = Number(mu);
  const sd = Number(sigma);
  const lossProbability = Number(L);
  const factor = K === undefined ? serviceFactor(1 - lossProbability) : Number(K);

  if (!(mean >= 0) || !(sd >= 0) || !(lossProbability >= 0 && lossProbability < 1) || !(factor > 0)) {
    return { errors: ['μ, σ, L and K must contain valid values.'] };
  }

  const safetyStock = factor * (1 - lossProbability) * sd;
  const reorderPoint = mean + safetyStock;

  return {
    errors: [],
    meanDemand: mean,
    standardDeviation: sd,
    shortageProbability: lossProbability,
    serviceLevel: 1 - lossProbability,
    safetyFactor: factor,
    safetyStock,
    reorderPoint
  };
}

export function calculateStochasticFromHistory(history, options = {}) {
  const values = (Array.isArray(history) ? history : [])
    .map(Number)
    .filter(Number.isFinite);

  if (!values.length) {
    return { errors: ['No historical demand data is available.'] };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  // Sample standard deviation is used because the stored weeks are observed data.
  const variance = values.length > 1
    ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
    : 0;
  const sigma = Math.sqrt(variance);
  const shortageProbability = options.shortageProbability ?? 0.05;
  const safetyFactor = options.safetyFactor ?? serviceFactor(1 - shortageProbability);

  return {
    ...calculateStochasticControl({
      meanDemand: mean,
      standardDeviation: sigma,
      shortageProbability,
      safetyFactor
    }),
    observations: values.length,
    history: values
  };
}

export function calculateDemandScenario({ meanDemand, increasePercent, standardDeviation, shortageProbability = 0.05 }) {
  const increase = Number(increasePercent) || 0;
  const newMean = Number(meanDemand) * (1 + increase / 100);
  return calculateStochasticControl({
    meanDemand: newMean,
    standardDeviation: Number(standardDeviation) || 0,
    shortageProbability
  });
}

// ------------------------------------------------------------
// EOQ
// ------------------------------------------------------------
// Q* = sqrt(2Ka/h)
// t* = Q*/a

export function calculateEOQ({ demandRate: a, setupCost: K, holdingCost: h }) {
  const demand = Number(a);
  const setup = Number(K);
  const holding = Number(h);
  if (!(demand > 0 && setup > 0 && holding > 0)) {
    return { errors: ['a, K and h must be greater than zero.'] };
  }

  const Q = Math.sqrt((2 * setup * demand) / holding);
  const t = Q / demand;
  return { errors: [], demandRate: demand, setupCost: setup, holdingCost: holding, Q, t };
}

// ------------------------------------------------------------
// EOQ with planned shortages
// ------------------------------------------------------------
// Q* = sqrt((2aK/h) * ((p+h)/p))
// S* = Q*p/(p+h)
// Maximum shortage = Q-S

export function calculateEOQWithShortage({ demandRate: a, setupCost: K, holdingCost: h, shortageCost: p }) {
  const demand = Number(a);
  const setup = Number(K);
  const holding = Number(h);
  const shortage = Number(p);

  if (!(demand > 0 && setup > 0 && holding > 0 && shortage > 0)) {
    return { errors: ['a, K, h and p must be greater than zero.'] };
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

// ------------------------------------------------------------
// Quantity discount EOQ
// ------------------------------------------------------------

export function normalizeTiers(tiers) {
  return (Array.isArray(tiers) ? tiers : [])
    .map((tier, index) => ({
      id: index + 1,
      min: Number(tier.min),
      max: tier.max === '' || tier.max === null || tier.max === undefined ? Infinity : Number(tier.max),
      unitCost: Number(tier.unitCost ?? tier.c)
    }))
    .sort((a, b) => a.min - b.min);
}

export function validateInputs({ weeklyDemand, workingWeeks, setupCost, holdingRate, tiers }) {
  const errors = [];
  const positiveFields = [
    ['Weekly demand', weeklyDemand],
    ['Working weeks per year', workingWeeks],
    ['Setup cost', setupCost],
    ['Holding cost rate', holdingRate]
  ];

  positiveFields.forEach(([label, value]) => {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
      errors.push(`${label} must be greater than zero.`);
    }
  });

  if (!tiers.length) errors.push('At least one quantity discount tier is required.');

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
  const errors = validateInputs({ weeklyDemand, workingWeeks, setupCost, holdingRate, tiers: normalizedTiers });
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

    return {
      ...tier,
      holdingCost,
      rawEOQ,
      candidateQ,
      setupCostPart,
      purchaseCostPart,
      holdingCostPart,
      totalCost
    };
  });

  const best = comparisons.reduce((lowest, current) => current.totalCost < lowest.totalCost ? current : lowest);
  const ordersPerYear = annualDemand / best.candidateQ;
  const timeYears = best.candidateQ / annualDemand;
  const timeWeeks = timeYears * weeks;

  return {
    errors: [], itemName, weeklyDemand: weekly, workingWeeks: weeks,
    setupCost: K, holdingRate: rate, annualDemand, comparisons, best,
    ordersPerYear, timeYears, timeWeeks
  };
}

// ------------------------------------------------------------
// UI bridge
// ------------------------------------------------------------
// The existing demo was calculating some values directly inside src/app.js.
// This bridge makes the important stochastic/EOQ results use this central file
// without requiring a second copy of the formulas.

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function historyForItem(name) {
  try {
    const history = JSON.parse(localStorage.getItem('kitcheniq-history') || '{}');
    return Array.isArray(history[name]) ? history[name] : [];
  } catch {
    return [];
  }
}

function renderCentralStochastic() {
  const target = document.getElementById('stochasticCards');
  if (!target) return;

  let items = [];
  try { items = JSON.parse(localStorage.getItem('kitcheniq-items') || '[]'); } catch { items = []; }
  if (!items.length) {
    target.innerHTML = '<div class="empty">No inventory items available.</div>';
    return;
  }

  target.innerHTML = items.map(item => {
    const result = calculateStochasticFromHistory(historyForItem(item.name), { shortageProbability: 0.05 });
    if (result.errors?.length) return '';

    return `<article class="analysis-card stochastic-card">
      <h3>${esc(item.name)}</h3>
      <p>${esc(item.category || '')} · ${esc(item.supplier || '')}</p>
      <div class="analysis-values">
        <div><span>Mean demand μ</span><strong>${round(result.meanDemand)}</strong></div>
        <div><span>Std. deviation σ</span><strong>${round(result.standardDeviation)}</strong></div>
        <div><span>Safety stock</span><strong>${ceilUnits(result.safetyStock)}</strong></div>
        <div><span>Reorder point R</span><strong>${ceilUnits(result.reorderPoint)}</strong></div>
      </div>
      <small>R = μ + K(1−L)σ · K = ${result.safetyFactor}, L = 5%</small>
    </article>`;
  }).join('') || '<div class="empty">No historical demand data available.</div>';
}

function renderCentralSolver() {
  const form = document.getElementById('calculationForm');
  if (!form) return;

  const weekly = Number(form.weeklyDemand?.value);
  const weeks = Number(form.workingWeeks?.value);
  const setup = Number(form.setupCost?.value);
  const rate = Number(form.holdingRate?.value) / 100;
  const tiers = [...document.querySelectorAll('#tierBody tr')].map(row => ({
    min: Number(row.querySelector('.tier-min')?.value),
    max: row.querySelector('.tier-max')?.value ? Number(row.querySelector('.tier-max').value) : Infinity,
    unitCost: Number(row.querySelector('.tier-cost')?.value)
  }));

  const result = calculateQuantityDiscountFlow({
    itemName: form.itemName?.value?.trim(),
    weeklyDemand: weekly,
    workingWeeks: weeks,
    setupCost: setup,
    holdingRate: rate,
    tiers
  });

  const errorBox = document.getElementById('errorBox');
  if (result.errors.length) {
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = result.errors.join(' '); }
    return;
  }
  if (errorBox) errorBox.hidden = true;

  const best = result.best;
  const finalDecision = document.getElementById('finalDecision');
  if (finalDecision) {
    finalDecision.innerHTML = `<div class="decision"><div class="result-muted">Recommended decision for</div><h2>${esc(result.itemName)}</h2><div class="big">${ceilUnits(best.candidateQ)} units</div><p>Best Tier: <strong>Tier ${best.id}</strong> · Unit Cost ${money(best.unitCost)}</p><div class="decision-grid"><div class="decision-stat"><span>Annual demand</span><strong>${result.annualDemand} units</strong></div><div class="decision-stat"><span>Annual total cost</span><strong>${money(best.totalCost)}</strong></div><div class="decision-stat"><span>EOQ before discount</span><strong>${best.rawEOQ.toFixed(2)}</strong></div><div class="decision-stat"><span>Holding cost</span><strong>${money(best.holdingCost)}</strong></div></div></div>`;
  }

  const steps = document.getElementById('steps');
  if (steps) {
    steps.innerHTML = [
      `Annual Demand = ${weekly} × ${weeks} = <strong>${result.annualDemand}</strong> units/year`,
      `Holding Cost = ${money(best.unitCost)} × ${Number(form.holdingRate.value)}% = <strong>${money(best.holdingCost)}</strong> per unit/year`,
      `EOQ = √(2 × ${result.annualDemand} × ${setup} / ${best.holdingCost.toFixed(2)}) = <strong>${best.rawEOQ.toFixed(2)}</strong>`,
      `Discount feasibility → Candidate Q = <strong>${ceilUnits(best.candidateQ)}</strong> units for Tier ${best.id}`,
      `Minimum total cost → <strong>Tier ${best.id}</strong> at ${money(best.totalCost)} per year`
    ].map((text, index) => `<div class="step"><div class="step-no">${index + 1}</div><div>${text}</div></div>`).join('');
  }

  const comparison = document.getElementById('comparisonBody');
  if (comparison) {
    comparison.innerHTML = result.comparisons.map(row => `<tr><td>Tier ${row.id}</td><td>${row.min}–${row.max === Infinity ? '∞' : row.max}</td><td>${money(row.unitCost)}</td><td>${money(row.holdingCost)}</td><td>${row.rawEOQ.toFixed(2)}</td><td>${ceilUnits(row.candidateQ)}</td><td>${money(row.totalCost)}</td><td>${row === best ? '<span class="status healthy">Recommended</span>' : '—'}</td></tr>`).join('');
  }
}

function installUIBridge() {
  const form = document.getElementById('calculationForm');
  if (form && !form.dataset.centralCalculations) {
    form.dataset.centralCalculations = 'true';
    form.addEventListener('submit', event => {
      // app.js has its original handler too; this listener runs after it and
      // replaces the displayed result with the centralized calculation.
      event.preventDefault();
      renderCentralSolver();
    });
  }

  document.querySelectorAll('.nav-button').forEach(button => {
    if (button.dataset.centralBound) return;
    button.dataset.centralBound = 'true';
    button.addEventListener('click', () => setTimeout(renderCentralStochastic, 0));
  });

  const historyItem = document.getElementById('historyItem');
  if (historyItem && !historyItem.dataset.centralBound) {
    historyItem.dataset.centralBound = 'true';
    historyItem.addEventListener('change', () => setTimeout(renderCentralStochastic, 0));
  }

  const demandIncrease = document.getElementById('demandIncrease');
  if (demandIncrease && !demandIncrease.dataset.centralBound) {
    demandIncrease.dataset.centralBound = 'true';
    demandIncrease.addEventListener('input', () => setTimeout(renderCentralStochastic, 0));
  }

  setTimeout(renderCentralStochastic, 50);
}

// Expose the calculation engine for the UI and browser console.
export const KitchenIQCalculations = {
  round,
  ceilUnits,
  calculateLeadTimeReorderPoint,
  calculateOrderQuantity,
  serviceFactor,
  calculateStochasticControl,
  calculateStochasticFromHistory,
  calculateDemandScenario,
  calculateEOQ,
  calculateEOQWithShortage,
  normalizeTiers,
  validateInputs,
  calculateQuantityDiscountFlow
};

if (typeof window !== 'undefined') {
  window.KitchenIQCalculations = KitchenIQCalculations;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installUIBridge);
  } else {
    installUIBridge();
  }
}
