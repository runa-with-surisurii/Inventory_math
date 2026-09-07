(() => {
  const money = n => `$${Number(n).toFixed(2)}`;

  function calculateFromForm() {
    const form = document.getElementById('calculationForm');
    if (!form) return null;
    const a = Number(form.weeklyDemand?.value) * Number(form.workingWeeks?.value);
    const K = Number(form.setupCost?.value);
    const rate = Number(form.holdingRate?.value) / 100;
    const rows = [...document.querySelectorAll('#tierBody tr')].map((row, index) => {
      const min = Number(row.querySelector('.tier-min')?.value);
      const maxValue = row.querySelector('.tier-max')?.value;
      const max = maxValue ? Number(maxValue) : Infinity;
      const c = Number(row.querySelector('.tier-cost')?.value);
      const h = c * rate;
      if (!(min > 0 && c > 0 && h > 0)) return null;
      const Q = Math.sqrt((2 * a * K) / h);
      const candidateQ = Math.min(Math.max(Q, min), max);
      const total = (a * K) / candidateQ + a * c + (h * candidateQ) / 2;
      return { index, min, max, c, h, Q, candidateQ, total };
    }).filter(Boolean);
    if (!(a > 0 && K > 0 && rate > 0 && rows.length)) return null;
    return { ...rows.reduce((best, row) => row.total < best.total ? row : best), a, K };
  }

  function renderFormula() {
    const host = document.getElementById('finalDecision');
    const result = calculateFromForm();
    if (!host || !result) return;
    document.getElementById('eoqFormulaApplied')?.remove();

    const cycleYears = result.Q / result.a;
    const weeks = Number(document.getElementById('calculationForm').workingWeeks.value);
    const cycleWeeks = cycleYears * weeks;
    const box = document.createElement('div');
    box.id = 'eoqFormulaApplied';
    box.className = 'analysis-note';
    box.innerHTML = `<strong>Requested EOQ formula applied</strong><br>
      Q* = √(2Ka / h) = √(2 × ${result.K} × ${result.a} / ${result.h.toFixed(2)}) = <strong>${result.Q.toFixed(2)} units</strong><br>
      t* = Q* / a = ${result.Q.toFixed(2)} / ${result.a} = <strong>${cycleYears.toFixed(4)} year (${cycleWeeks.toFixed(2)} weeks)</strong><br>
      <small>K = setup cost · h = unit holding cost · a = annual demand · c = unit purchase cost</small><br>
      <small>K ↑ → Q*, t* ↑ &nbsp; | &nbsp; h ↑ → Q*, t* ↓</small>`;
    host.appendChild(box);
  }

  window.addEventListener('load', () => {
    const form = document.getElementById('calculationForm');
    if (!form) return;
    form.addEventListener('input', () => setTimeout(renderFormula, 0));
    form.addEventListener('submit', () => setTimeout(renderFormula, 0));
    document.getElementById('loadSelected')?.addEventListener('click', () => setTimeout(renderFormula, 0));
    setTimeout(renderFormula, 350);
  });
})();
