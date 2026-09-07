import assert from 'node:assert/strict';

function eoq(annualDemand, setupCost, holdingCost) {
  return Math.sqrt((2 * annualDemand * setupCost) / holdingCost);
}

function candidateQuantity(eoqValue, min, max) {
  let quantity = Math.max(min, Math.ceil(eoqValue));
  if (Number.isFinite(max)) quantity = Math.min(quantity, max);
  return quantity;
}

function totalCost(annualDemand, unitCost, setupCost, holdingCost, quantity) {
  return annualDemand * unitCost + (annualDemand / quantity) * setupCost + (quantity / 2) * holdingCost;
}

const annualDemand = 18 * 52;
const setupCost = 28;
const unitCost = 30;
const holdingCost = unitCost * 0.2;
const calculatedEOQ = eoq(annualDemand, setupCost, holdingCost);

assert.ok(calculatedEOQ > 0, 'EOQ should be positive');
assert.equal(candidateQuantity(12.1, 1, 49), 13, 'EOQ should round up to a valid order quantity');
assert.equal(candidateQuantity(80, 100, Infinity), 100, 'Candidate should respect the tier minimum');
assert.equal(candidateQuantity(150, 1, 99), 99, 'Candidate should respect the tier maximum');

const quantity = candidateQuantity(calculatedEOQ, 1, 49);
const cost = totalCost(annualDemand, unitCost, setupCost, holdingCost, quantity);
assert.ok(Number.isFinite(cost) && cost > 0, 'Total inventory cost should be a positive finite value');

console.log('✓ EOQ calculation tests passed');
console.log(`✓ Example EOQ: ${calculatedEOQ.toFixed(2)} units`);
console.log(`✓ Example candidate Q: ${quantity} units`);
console.log(`✓ Example annual total cost: $${cost.toFixed(2)}`);
