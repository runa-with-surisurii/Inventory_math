(() => {
  // New items may not have historical demand yet. Instead of hiding them,
  // estimate demand variability as 10% of the item's weekly demand.
  // This keeps the required stochastic formula:
  // Safety Stock = K(1-L)σ, R = μ + Safety Stock
  const SERVICE_FACTOR = 1.645; // 95% service level
  const SHORTAGE_PROBABILITY = 0.05;
  const VARIABILITY_RATE = 0.10;

  const num = (v) => Number(v) || 0;
  const ceilUnits = (v) => Math.max(0, Math.ceil(num(v)));
  const round = (v) => Math.round(num(v) * 100) / 100;

  function getItems() {
    try {
      const value = JSON.parse(localStorage.getItem('kitcheniq-items') || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function getHistory(name) {
    try {
      const history = JSON.parse(localStorage.getItem('kitcheniq-history') || '{}');
      return Array.isArray(history[name]) ? history[name].map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }

  function sampleSD(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  function calculate(item) {
    const demand = num(item.demand);
    const history = getHistory(item.name);
    const mean = history.length ? history.reduce((a, b) => a + b, 0) / history.length : demand;
    const sigma = history.length >= 2 ? sampleSD(history) : demand * VARIABILITY_RATE;
    const safetyStock = SERVICE_FACTOR * (1 - SHORTAGE_PROBABILITY) * sigma;
    const reorderPoint = mean + safetyStock;
    return { mean, sigma, safetyStock, reorderPoint, hasHistory: history.length >= 2 };
  }

  function render() {
    const target = document.getElementById('stochasticCards');
    if (!target) return;
    const items = getItems();
    if (!items.length) return;

    target.innerHTML = items.map(item => {
      const r = calculate(item);
      const source = r.hasHistory
        ? 'Based on historical demand'
        : 'Estimated σ = 10% of weekly demand until history is available';
      return `<article class="analysis-card stochastic-card">
        <h3>${String(item.name || '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}</h3>
        <p>${String(item.category || '')} · ${String(item.supplier || '')}</p>
        <div class="analysis-values">
          <div><span>Mean demand μ</span><strong>${round(r.mean)}</strong></div>
          <div><span>Std. deviation σ</span><strong>${round(r.sigma)}</strong></div>
          <div><span>Safety stock</span><strong>${ceilUnits(r.safetyStock)}</strong></div>
          <div><span>Reorder point R</span><strong>${ceilUnits(r.reorderPoint)}</strong></div>
        </div>
        <small>R = μ + K(1−L)σ · K = ${SERVICE_FACTOR}, L = 5% · ${source}</small>
      </article>`;
    }).join('');
  }

  function start() {
    render();
    setTimeout(render, 300);
    setTimeout(render, 1000);
    setTimeout(render, 2000);
    window.addEventListener('storage', render);
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-view="uncertainty"]')) setTimeout(render, 50);
      if (event.target.closest('#addItem') || event.target.closest('#itemForm')) setTimeout(render, 300);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
