import { calculateQuantityDiscountFlow, round } from "./calculations.js";
import { kitchenItems } from "./data.js";

const form = document.querySelector("#calculationForm");
const itemSelect = document.querySelector("#itemSelect");
const tierBody = document.querySelector("#tierBody");
const errorBox = document.querySelector("#errorBox");
const steps = document.querySelector("#steps");
const comparisonBody = document.querySelector("#comparisonBody");
const finalDecision = document.querySelector("#finalDecision");

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function fmt(value, digits = 2) {
  return round(Number(value), digits).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function fmtInt(value) {
  return round(Number(value), 0).toLocaleString();
}

function currency(value) {
  return money.format(round(Number(value), 2));
}

function tierRange(tier) {
  return `${fmtInt(tier.min)} - ${tier.max === Infinity || tier.max === "" ? "No limit" : fmtInt(tier.max)}`;
}

function resultFor(item) {
  return calculateQuantityDiscountFlow({
    itemName: item.name,
    weeklyDemand: item.weeklyDemand,
    workingWeeks: item.workingWeeks,
    setupCost: item.setupCost,
    holdingRate: item.holdingRate / 100,
    tiers: item.tiers
  });
}

function leadTimeDemand(item) {
  return item.weeklyDemand * (item.leadTimeDays / 7);
}

function renderNav() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-button").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#${button.dataset.view}`).classList.add("active");
    });
  });
}

function renderDashboard() {
  const results = kitchenItems.map((item) => ({ item, result: resultFor(item), leadDemand: leadTimeDemand(item) }));
  const lowStock = results.filter(({ item, leadDemand }) => item.currentStock <= leadDemand);
  const annualPurchaseCost = results.reduce((sum, { result }) => sum + result.best.purchaseCostPart, 0);
  const lowestTotalCost = results.reduce((sum, { result }) => sum + result.best.totalCost, 0);

  document.querySelector("#metrics").innerHTML = [
    ["Kitchen items", kitchenItems.length, "Restaurant ingredients and supplies"],
    ["Low-stock alerts", lowStock.length, "Stock below lead-time demand"],
    ["Annual purchase value", currency(annualPurchaseCost), "Based on selected best tiers"],
    ["Total EOQ cost", currency(lowestTotalCost), "Best total cost across items"]
  ]
    .map(
      ([label, value, caption]) => `
      <article class="metric-card">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${caption}</small>
      </article>`
    )
    .join("");

  document.querySelector("#suggestions").innerHTML = results
    .map(({ item, result, leadDemand }) => {
      const alert = item.currentStock <= leadDemand;
      return `
        <article class="suggestion-card ${alert ? "urgent" : ""}">
          <div>
            <strong>${item.name}</strong>
            <span>${item.supplier} - ${item.leadTimeDays} day lead time</span>
          </div>
          <div>
            <b>${alert ? "Reorder soon" : "Stock okay"}</b>
            <small>Stock ${fmtInt(item.currentStock)} / lead demand ${fmt(leadDemand, 1)} / best Q ${fmt(result.best.candidateQ, 2)}</small>
          </div>
        </article>`;
    })
    .join("");
}

function renderItems() {
  document.querySelector("#itemRows").innerHTML = kitchenItems
    .map(
      (item) => `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td>${item.category}</td>
        <td>${fmtInt(item.currentStock)}</td>
        <td>${fmtInt(item.weeklyDemand)}</td>
        <td>${item.supplier}</td>
        <td>${currency(item.setupCost)}</td>
      </tr>`
    )
    .join("");
}

function renderDiscounts() {
  document.querySelector("#discountCards").innerHTML = kitchenItems
    .map(
      (item) => `
      <article class="discount-card">
        <div>
          <strong>${item.name}</strong>
          <span>${item.supplier}</span>
        </div>
        <table>
          <thead><tr><th>Range</th><th>Unit cost c_j</th></tr></thead>
          <tbody>
            ${item.tiers.map((tier) => `<tr><td>${tier.min} - ${tier.max || "No limit"}</td><td>${currency(tier.unitCost)}</td></tr>`).join("")}
          </tbody>
        </table>
      </article>`
    )
    .join("");
}

function renderItemSelect() {
  itemSelect.innerHTML = kitchenItems.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
}

function renderTiers(tiers) {
  tierBody.innerHTML = tiers
    .map(
      (tier, index) => `
      <tr>
        <td>Tier ${index + 1}</td>
        <td><input aria-label="Tier ${index + 1} minimum quantity" name="tierMin" type="number" min="1" step="1" value="${tier.min}" /></td>
        <td><input aria-label="Tier ${index + 1} maximum quantity" name="tierMax" type="number" min="1" step="1" value="${tier.max}" placeholder="No limit" /></td>
        <td><input aria-label="Tier ${index + 1} unit cost" name="tierCost" type="number" min="0.01" step="0.01" value="${tier.unitCost}" /></td>
      </tr>`
    )
    .join("");
}

function loadItemIntoForm(item) {
  form.elements.itemName.value = item.name;
  form.elements.weeklyDemand.value = item.weeklyDemand;
  form.elements.workingWeeks.value = item.workingWeeks;
  form.elements.setupCost.value = item.setupCost;
  form.elements.holdingRate.value = item.holdingRate;
  renderTiers(item.tiers);
  calculateAndRender();
}

function readFormData() {
  const data = new FormData(form);
  const mins = data.getAll("tierMin");
  const maxes = data.getAll("tierMax");
  const costs = data.getAll("tierCost");

  return {
    itemName: String(data.get("itemName") || "").trim(),
    weeklyDemand: Number(data.get("weeklyDemand")),
    workingWeeks: Number(data.get("workingWeeks")),
    setupCost: Number(data.get("setupCost")),
    holdingRate: Number(data.get("holdingRate")) / 100,
    tiers: mins.map((min, index) => ({ min, max: maxes[index], unitCost: costs[index] }))
  };
}

function renderErrors(errors) {
  errorBox.hidden = !errors.length;
  errorBox.innerHTML = errors.map((error) => `<p>${error}</p>`).join("");
}

function renderSteps(result) {
  const best = result.best;
  steps.innerHTML = `
    <article class="step-card">
      <span>Step 1</span>
      <h3>Find Annual Demand</h3>
      <code>a = weekly demand x working weeks per year</code>
      <p>a = ${fmtInt(result.weeklyDemand)} x ${fmtInt(result.workingWeeks)} = <strong>${fmtInt(result.annualDemand)} units per year</strong></p>
    </article>
    <article class="step-card">
      <span>Step 2</span>
      <h3>Find Holding Cost for Each Tier</h3>
      <code>h_j = holding cost rate x c_j</code>
      ${result.comparisons.map((tier) => `<p>Tier ${tier.id}: h_${tier.id} = ${fmt(result.holdingRate, 2)} x ${currency(tier.unitCost)} = <strong>${currency(tier.holdingCost)}</strong></p>`).join("")}
    </article>
    <article class="step-card">
      <span>Step 3</span>
      <h3>Find EOQ for Each Tier</h3>
      <code>Q_j = sqrt(2aK / h_j)</code>
      ${result.comparisons.map((tier) => `<p>Tier ${tier.id}: Q_${tier.id} = sqrt(2 x ${fmtInt(result.annualDemand)} x ${currency(result.setupCost)} / ${currency(tier.holdingCost)}) = <strong>${fmt(tier.rawEOQ, 2)}</strong>. ${tier.adjustment}</p>`).join("")}
    </article>
    <article class="step-card">
      <span>Step 4</span>
      <h3>Calculate Total Cost for Each Tier</h3>
      <code>T_j = aK / Q + a c_j + h_j Q / 2</code>
      ${result.comparisons.map((tier) => `<p>Tier ${tier.id}: T_${tier.id} = ${currency(tier.setupCostPart)} + ${currency(tier.purchaseCostPart)} + ${currency(tier.holdingCostPart)} = <strong>${currency(tier.totalCost)}</strong></p>`).join("")}
    </article>
    <article class="step-card">
      <span>Step 5</span>
      <h3>Compare Total Costs</h3>
      <p>The lowest total cost is <strong>${currency(best.totalCost)}</strong> from Tier ${best.id}.</p>
    </article>
    <article class="step-card">
      <span>Step 6</span>
      <h3>Calculate Orders Per Year</h3>
      <code>Orders per year = a / Q*</code>
      <p>${fmtInt(result.annualDemand)} / ${fmt(best.candidateQ, 2)} = <strong>${fmt(result.ordersPerYear, 2)} orders</strong></p>
    </article>
    <article class="step-card">
      <span>Step 7</span>
      <h3>Calculate Time Between Orders</h3>
      <code>t* = Q* / a; weeks = t* x working weeks</code>
      <p>(${fmt(best.candidateQ, 2)} / ${fmtInt(result.annualDemand)}) x ${fmtInt(result.workingWeeks)} = <strong>${fmt(result.timeWeeks, 2)} weeks</strong></p>
    </article>`;
}

function renderComparison(result) {
  comparisonBody.innerHTML = result.comparisons
    .map(
      (tier) => `
      <tr class="${tier.id === result.best.id ? "best-row" : ""}">
        <td>Tier ${tier.id}</td>
        <td>${tierRange(tier)}</td>
        <td>${currency(tier.unitCost)}</td>
        <td>${currency(tier.holdingCost)}</td>
        <td>${fmt(tier.rawEOQ, 2)}</td>
        <td>${fmt(tier.candidateQ, 2)}</td>
        <td>${currency(tier.totalCost)}</td>
        <td>${tier.id === result.best.id ? "<strong>Best Tier</strong>" : "Compared"}</td>
      </tr>`
    )
    .join("");
}

function renderFinalDecision(result) {
  finalDecision.innerHTML = `
    <div class="decision-title">
      <span>Final recommendation for</span>
      <strong>${result.itemName}</strong>
    </div>
    <div class="decision-grid">
      <article><span>Best order quantity Q*</span><strong>${fmt(result.best.candidateQ, 2)}</strong></article>
      <article><span>Best price tier</span><strong>Tier ${result.best.id}</strong></article>
      <article><span>Selected unit cost c_j</span><strong>${currency(result.best.unitCost)}</strong></article>
      <article><span>Lowest total cost T_j</span><strong>${currency(result.best.totalCost)}</strong></article>
      <article><span>Orders per year</span><strong>${fmt(result.ordersPerYear, 2)}</strong></article>
      <article><span>Time between orders</span><strong>${fmt(result.timeWeeks, 2)} weeks</strong></article>
    </div>`;
}

function calculateAndRender() {
  const result = calculateQuantityDiscountFlow(readFormData());
  renderErrors(result.errors);
  if (result.errors.length) return;
  renderSteps(result);
  renderComparison(result);
  renderFinalDecision(result);
}

function bindSolver() {
  itemSelect.addEventListener("change", () => {
    const selected = kitchenItems.find((item) => item.id === itemSelect.value);
    loadItemIntoForm(selected);
  });
  document.querySelector("#loadSelected").addEventListener("click", () => {
    const selected = kitchenItems.find((item) => item.id === itemSelect.value);
    loadItemIntoForm(selected);
  });
  form.addEventListener("input", calculateAndRender);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateAndRender();
    finalDecision.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

renderNav();
renderDashboard();
renderItems();
renderDiscounts();
renderItemSelect();
bindSolver();
loadItemIntoForm(kitchenItems[0]);
