const seedItems = [
  { name: 'Rice Bag 25kg', category: 'Dry Goods', stock: 12, demand: 18, supplier: 'Golden Harvest', setup: 28, lead: 3, unit: 32 },
  { name: 'Cooking Oil 5L', category: 'Oil', stock: 8, demand: 12, supplier: 'Prime Foods', setup: 18, lead: 2, unit: 21 },
  { name: 'Chicken Breast', category: 'Meat', stock: 34, demand: 45, supplier: 'Fresh Farm', setup: 35, lead: 2, unit: 7.5 },
  { name: 'Mozzarella 1kg', category: 'Dairy', stock: 6, demand: 10, supplier: 'Dairy Hub', setup: 22, lead: 4, unit: 11.5 },
  { name: 'Tomato Crate', category: 'Produce', stock: 20, demand: 28, supplier: 'Green Market', setup: 15, lead: 1, unit: 4.2 },
  { name: 'Burger Buns', category: 'Bakery', stock: 55, demand: 60, supplier: 'Daily Bake', setup: 12, lead: 1, unit: 1.4 }
];

const defaultTiers = [
  { min: 1, max: 49, c: 32 },
  { min: 50, max: 99, c: 30 },
  { min: 100, max: Infinity, c: 28 }
];

const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Number(value).toFixed(2)}`;
const cloneItems = (value) => JSON.parse(JSON.stringify(value));
const cloneTiers = () => defaultTiers.map((tier) => ({ ...tier }));

let items = loadItems();
let tiers = cloneTiers();

function loadItems() {
  try {
    const saved = localStorage.getItem('kitcheniq-items');
    return saved ? JSON.parse(saved) : cloneItems(seedItems);
  } catch {
    return cloneItems(seedItems);
  }
}

function saveItems() {
  localStorage.setItem('kitcheniq-items', JSON.stringify(items));
}

function status(item) {
  const reorder = item.demand * item.lead / 7;
  if (item.stock <= 0) return 'Critical';
  if (item.stock < reorder) return 'Low';
  return 'Healthy';
}

function reorderPoint(item) {
  return Math.ceil(item.demand * item.lead / 7);
}

function recommendedOrder(item) {
  return Math.max(1, Math.ceil(item.demand * 2 - item.stock));
}

function initials(name) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function renderDashboard() {
  const low = items.filter((item) => status(item) !== 'Healthy').length;
  const critical = items.filter((item) => status(item) === 'Critical').length;
  const value = items.reduce((sum, item) => sum + item.stock * item.unit, 0);
  $('#metrics').innerHTML = [
    ['Total Items', items.length, 'Active inventory records'],
    ['Low Stock', low, 'Below reorder point'],
    ['Critical', critical, 'Requires immediate action'],
    ['Stock Value', money(value), 'Current inventory value']
  ].map(([label, valueText, note]) => `<article class="metric"><div class="metric-top"><div class="metric-label">${label}</div><div class="metric-icon">${label[0]}</div></div><div class="metric-value">${valueText}</div><div class="metric-note">${note}</div></article>`).join('');

  $('#healthBars').innerHTML = items.length ? items.map((item) => {
    const point = reorderPoint(item);
    const ratio = Math.min(100, Math.round((item.stock / Math.max(point * 2, 1)) * 100));
    const state = status(item).toLowerCase();
    return `<div class="health-row"><div class="health-label"><strong>${item.name}</strong><span>${item.stock} in stock · ROP ${point}</span></div><div class="health-track"><div class="health-fill ${state}" style="width:${ratio}%"></div></div></div>`;
  }).join('') : '<div class="empty">No inventory records yet.</div>';

  const alerts = items.filter((item) => status(item) !== 'Healthy');
  $('#dashboardAlerts').innerHTML = alerts.length ? alerts.map((item) => {
    const state = status(item).toLowerCase();
    return `<div class="alert-item"><span class="alert-dot ${state}"></span><div class="alert-main"><strong>${item.name}</strong><span>${item.supplier} · ROP ${reorderPoint(item)}</span></div><div class="alert-qty">Order ${recommendedOrder(item)}</div></div>`;
  }).join('') : '<div class="empty">All inventory levels are healthy.</div>';

  $('#navAlert').textContent = low;
  $('#queueCount').textContent = `${low} item${low === 1 ? '' : 's'} need attention`;
}

function renderItems() {
  const query = ($('#searchItems')?.value || '').trim().toLowerCase();
  const category = $('#categoryFilter')?.value || 'all';
  const stateFilter = $('#statusFilter')?.value || 'all';
  const filtered = items.filter((item) => {
    const matchesQuery = !query || `${item.name} ${item.category} ${item.supplier}`.toLowerCase().includes(query);
    const matchesCategory = category === 'all' || item.category === category;
    const matchesStatus = stateFilter === 'all' || status(item).toLowerCase() === stateFilter;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  $('#itemRows').innerHTML = filtered.length ? filtered.map((item) => {
    const state = status(item);
    return `<tr><td><div class="item-name"><span class="item-avatar">${initials(item.name)}</span><div><strong>${item.name}</strong><span class="stock-sub">${item.supplier}</span></div></div></td><td>${item.category}</td><td><span class="stock-number">${item.stock}</span><span class="stock-sub">units</span></td><td>${reorderPoint(item)}</td><td>${item.demand}</td><td>${money(item.unit)}</td><td>${money(item.stock * item.unit)}</td><td><span class="status ${state.toLowerCase()}">${state}</span></td><td><button class="icon-button delete-item" data-name="${encodeURIComponent(item.name)}" title="Delete item">×</button></td></tr>`;
  }).join('') : '<tr><td colspan="9"><div class="empty">No items match your filters.</div></td></tr>';

  const categories = [...new Set(items.map((item) => item.category))].sort();
  const current = $('#categoryFilter').value;
  $('#categoryFilter').innerHTML = `<option value="all">All categories</option>${categories.map((category) => `<option value="${category}">${category}</option>`).join('')}`;
  $('#categoryFilter').value = categories.includes(current) ? current : 'all';

  document.querySelectorAll('.delete-item').forEach((button) => button.addEventListener('click', () => {
    const name = decodeURIComponent(button.dataset.name);
    if (!confirm(`Delete ${name}?`)) return;
    items = items.filter((item) => item.name !== name);
    saveItems();
    refresh();
  }));
}

function renderReorder() {
  const queue = items.filter((item) => status(item) !== 'Healthy');
  $('#reorderCards').innerHTML = queue.length ? queue.map((item) => {
    const state = status(item).toLowerCase();
    return `<article class="reorder-card ${state}"><span class="status ${state}">${state}</span><h3>${item.name}</h3><p>${item.category} · ${item.supplier}</p><div class="reorder-metrics"><div class="mini-metric"><span>Stock</span><strong>${item.stock}</strong></div><div class="mini-metric"><span>ROP</span><strong>${reorderPoint(item)}</strong></div><div class="mini-metric"><span>Order</span><strong>${recommendedOrder(item)}</strong></div></div><button class="primary-action compact reorder-solver" data-name="${encodeURIComponent(item.name)}">Analyze with EOQ →</button></article>`;
  }).join('') : '<div class="empty">No reorder actions are currently required.</div>';

  document.querySelectorAll('.reorder-solver').forEach((button) => button.addEventListener('click', () => {
    const index = items.findIndex((item) => item.name === decodeURIComponent(button.dataset.name));
    openView('solver');
    $('#itemSelect').value = String(index);
    loadItem();
  }));
}

function renderDiscounts() {
  $('#discountCards').innerHTML = items.slice(0, 6).map((item) => `<article class="discount-card"><div class="supplier-name">${item.supplier}</div><div class="supplier-item">${item.name} · Current ${money(item.unit)}</div>${tiers.map((tier, index) => `<div class="tier"><span>Tier ${index + 1}: ${tier.min}–${tier.max === Infinity ? '∞' : tier.max}</span><strong>${money(Math.max(0.01, tier.c - index * 2))}</strong></div>`).join('')}</article>`).join('') || '<div class="empty">No supplier data available.</div>';
}

function renderReports() {
  const totalValue = items.reduce((sum, item) => sum + item.stock * item.unit, 0);
  const weeklyDemand = items.reduce((sum, item) => sum + item.demand, 0);
  const low = items.filter((item) => status(item) !== 'Healthy').length;
  $('#reportMetrics').innerHTML = [['Weekly demand', weeklyDemand, 'Units across all items'], ['Inventory value', money(totalValue), 'Current stock value'], ['Healthy items', items.length - low, `${items.length ? Math.round(((items.length - low) / items.length) * 100) : 0}% of inventory`], ['Reorder items', low, 'Needs review']].map(([label, valueText, note]) => `<article class="metric"><div class="metric-label">${label}</div><div class="metric-value">${valueText}</div><div class="metric-note">${note}</div></article>`).join('');
  const maxDemand = Math.max(...items.map((item) => item.demand), 1);
  $('#demandChart').innerHTML = items.map((item) => `<div class="chart-row"><span>${item.name}</span><div class="chart-track"><div class="chart-fill" style="width:${(item.demand / maxDemand) * 100}%"></div></div><strong>${item.demand}</strong></div>`).join('') || '<div class="empty">No data.</div>';
  const byCategory = {};
  items.forEach((item) => { byCategory[item.category] = (byCategory[item.category] || 0) + item.stock * item.unit; });
  const maxValue = Math.max(...Object.values(byCategory), 1);
  $('#valueChart').innerHTML = Object.entries(byCategory).map(([category, value]) => `<div class="chart-row"><span>${category}</span><div class="chart-track"><div class="chart-fill" style="width:${(value / maxValue) * 100}%"></div></div><strong>${money(value)}</strong></div>`).join('') || '<div class="empty">No data.</div>';
}

function renderTiers() {
  $('#tierBody').innerHTML = tiers.map((tier, index) => `<tr><td>Tier ${index + 1}</td><td><input class="tier-min" data-index="${index}" type="number" min="1" value="${tier.min}"></td><td><input class="tier-max" data-index="${index}" type="number" min="1" value="${tier.max === Infinity ? '' : tier.max}" placeholder="∞"></td><td><input class="tier-cost" data-index="${index}" type="number" min="0.01" step="0.01" value="${tier.c}"></td><td><button type="button" class="icon-button remove-tier" data-index="${index}">×</button></td></tr>`).join('');
  document.querySelectorAll('.remove-tier').forEach((button) => button.addEventListener('click', () => { if (tiers.length <= 1) return; tiers.splice(Number(button.dataset.index), 1); renderTiers(); }));
}

function readTiers() {
  const result = [];
  document.querySelectorAll('#tierBody tr').forEach((row, index) => {
    const min = Number(row.querySelector('.tier-min').value);
    const maxValue = row.querySelector('.tier-max').value.trim();
    const max = maxValue ? Number(maxValue) : Infinity;
    const c = Number(row.querySelector('.tier-cost').value);
    if (min > 0 && c > 0 && (max === Infinity || max >= min)) result.push({ min, max, c, index });
  });
  return result;
}

function loadItem() {
  const item = items[Number($('#itemSelect').value)];
  if (!item) return;
  const form = $('#calculationForm');
  form.itemName.value = item.name;
  form.weeklyDemand.value = item.demand;
  form.setupCost.value = item.setup;
}

function calculate(event) {
  event.preventDefault();
  const form = $('#calculationForm');
  const name = form.itemName.value.trim();
  const weeklyDemand = Number(form.weeklyDemand.value);
  const weeks = Number(form.workingWeeks.value);
  const K = Number(form.setupCost.value);
  const rate = Number(form.holdingRate.value) / 100;
  const calculationTiers = readTiers();
  if (!name || weeklyDemand <= 0 || weeks <= 0 || K <= 0 || rate <= 0 || !calculationTiers.length) {
    $('#errorBox').hidden = false;
    $('#errorBox').textContent = 'Please enter valid positive values and at least one valid discount tier.';
    return;
  }
  $('#errorBox').hidden = true;
  const D = weeklyDemand * weeks;
  const rows = calculationTiers.map((tier, index) => {
    const h = tier.c * rate;
    const eoq = Math.sqrt((2 * D * K) / h);
    let q = Math.max(tier.min, Math.ceil(eoq));
    if (tier.max !== Infinity) q = Math.min(q, tier.max);
    const total = D * tier.c + (D / q) * K + (q / 2) * h;
    return { ...tier, index, h, eoq, q, total };
  });
  const best = rows.reduce((current, row) => row.total < current.total ? row : current);
  $('#finalDecision').innerHTML = `<div class="decision"><div class="result-muted">Recommended decision for</div><h2>${name}</h2><div class="big">${best.q} units</div><p>Best Tier: <strong>Tier ${best.index + 1}</strong> · Unit Cost ${money(best.c)}</p><div class="decision-grid"><div class="decision-stat"><span>Annual demand</span><strong>${D} units</strong></div><div class="decision-stat"><span>Annual total cost</span><strong>${money(best.total)}</strong></div><div class="decision-stat"><span>EOQ before discount</span><strong>${best.eoq.toFixed(2)}</strong></div><div class="decision-stat"><span>Holding cost</span><strong>${money(best.h)}</strong></div></div></div>`;
  $('#steps').innerHTML = [`Annual Demand A = ${weeklyDemand} × ${weeks} = <strong>${D}</strong> units/year`,`Holding Cost h = ${money(best.c)} × ${form.holdingRate.value}% = <strong>${money(best.h)}</strong> per unit/year`,`EOQ Q = √(2AK / h) = √(2 × ${D} × ${K} / ${best.h.toFixed(2)}) = <strong>${best.eoq.toFixed(2)}</strong>`,`Discount feasibility → Candidate Q = <strong>${best.q}</strong> units for Tier ${best.index + 1}`,`Minimum total cost → <strong>Tier ${best.index + 1}</strong> at ${money(best.total)} per year`].map((text, index) => `<div class="step"><div class="step-no">${index + 1}</div><div>${text}</div></div>`).join('');
  $('#comparisonBody').innerHTML = rows.map((row) => `<tr><td>Tier ${row.index + 1}</td><td>${row.min}–${row.max === Infinity ? '∞' : row.max}</td><td>${money(row.c)}</td><td>${money(row.h)}</td><td>${row.eoq.toFixed(2)}</td><td>${row.q}</td><td>${money(row.total)}</td><td>${row === best ? '<span class="status healthy">BEST</span>' : '-'}</td></tr>`).join('');
}

function openView(viewId) {
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === viewId));
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === viewId));
  const titles = { dashboard: 'Kitchen Dashboard', items: 'Kitchen Items', reorder: 'Reorder Queue', discounts: 'Supplier Discounts', solver: 'EOQ Decision Solver', reports: 'Inventory Reports' };
  $('#pageTitle').textContent = titles[viewId] || 'Kitchen Dashboard';
  $('#sidebar').classList.remove('open');
}

function refresh() {
  renderDashboard();
  renderItems();
  renderReorder();
  renderDiscounts();
  renderReports();
}

document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => openView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => openView(button.dataset.go)));
$('#loadSelected').addEventListener('click', loadItem);
$('#calculationForm').addEventListener('submit', calculate);
$('#searchItems').addEventListener('input', renderItems);
$('#categoryFilter').addEventListener('change', renderItems);
$('#statusFilter').addEventListener('change', renderItems);
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#today').textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date());
$('#addTier').addEventListener('click', () => { const last = tiers[tiers.length - 1]; const min = last.max === Infinity ? last.min + 50 : last.max + 1; tiers.push({ min, max: Infinity, c: Math.max(0.01, last.c - 2) }); renderTiers(); });
$('#addItem').addEventListener('click', () => { $('#itemModal').hidden = false; });
$('#closeModal').addEventListener('click', () => { $('#itemModal').hidden = true; });
$('#itemModal').addEventListener('click', (event) => { if (event.target.id === 'itemModal') $('#itemModal').hidden = true; });
$('#itemForm').addEventListener('submit', (event) => { event.preventDefault(); const form = event.target; const data = new FormData(form); items.push({ name: data.get('name').trim(), category: data.get('category').trim(), stock: Number(data.get('stock')), demand: Number(data.get('demand')), unit: Number(data.get('unit')), lead: Number(data.get('lead')), supplier: data.get('supplier').trim(), setup: Number(data.get('setup')) }); saveItems(); form.reset(); $('#itemModal').hidden = true; refresh(); });
$('#resetData').addEventListener('click', () => { if (!confirm('Reset the demo inventory to its original sample data?')) return; items = cloneItems(seedItems); saveItems(); refresh(); });

renderTiers();
refresh();
loadItem();
calculate({ preventDefault() {} });
