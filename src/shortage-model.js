(() => {
  const money = (n) => `$${Number(n).toFixed(2)}`;
  const num = (n, d = 2) => Number(n).toFixed(d);

  function calculateEOQ({ a, K, h }) {
    if (!(a > 0 && K > 0 && h > 0)) return null;
    const Q = Math.sqrt((2 * a * K) / h);
    const t = Q / a;
    return { Q, t };
  }

  function calculateShortage({ a, K, h, p }) {
    if (!(a > 0 && K > 0 && h > 0 && p > 0)) return null;
    const Q = Math.sqrt((2 * a * K / h) * ((p + h) / p));
    const S = Q * (p / (p + h));
    const maxShortage = Q - S;
    const cycleTime = Q / a;
    return { Q, S, maxShortage, cycleTime };
  }

  function render() {
    const host = document.querySelector('#shortageCards');
    if (!host) return;

    const items = JSON.parse(localStorage.getItem('kitcheniq-items') || '[]');
    const pInput = document.querySelector('#shortageCost');
    const holdingInput = document.querySelector('#shortageHoldingRate');
    const p = Number(pInput?.value || 5);
    const holdingRate = Number(holdingInput?.value || 20) / 100;

    if (!items.length || !(p > 0)) {
      host.innerHTML = '<div class="empty-state">Enter a shortage cost p greater than 0 to calculate planned shortages.</div>';
      return;
    }

    host.innerHTML = items.map((item) => {
      const a = Number(item.demand || 0) * 52;
      const K = Number(item.setup || 0);
      const c = Number(item.unit || 0);
      const h = c * holdingRate;
      const result = calculateShortage({ a, K, h, p });
      if (!result) return '';

      return `<article class="analysis-card">
        <div class="analysis-card-head"><div><strong>${item.name}</strong><span>Planned shortage EOQ model</span></div></div>
        <div class="analysis-stats">
          <div><span>Demand rate a / year</span><strong>${num(a, 0)}</strong></div>
          <div><span>Setup cost K</span><strong>${money(K)}</strong></div>
          <div><span>Holding cost h / unit-year</span><strong>${money(h)}</strong></div>
          <div><span>Shortage cost p</span><strong>${money(p)}</strong></div>
          <div><span>Optimal order Q*</span><strong>${num(result.Q)}</strong></div>
          <div><span>Cycle time t* = Q*/a</span><strong>${num(result.cycleTime, 4)} year</strong></div>
          <div><span>Inventory after batch S*</span><strong>${num(result.S)}</strong></div>
          <div><span>Maximum shortage Q* − S*</span><strong>${num(result.maxShortage)}</strong></div>
        </div>
        <div class="analysis-note">Order ${num(result.Q)} units per cycle. Inventory can fall to a maximum shortage of ${num(result.maxShortage)} units before the next batch. Higher K increases Q* and t*; higher h decreases them.</div>
      </article>`;
    }).join('');
  }

  window.KitchenIQShortage = { calculateEOQ, calculateShortage, render };
  window.addEventListener('load', () => {
    const p = document.querySelector('#shortageCost');
    const h = document.querySelector('#shortageHoldingRate');
    p?.addEventListener('input', render);
    h?.addEventListener('input', render);
    render();
  });
})();
