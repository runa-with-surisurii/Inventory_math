(() => {
  const money = n => `$${Number(n).toFixed(2)}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
    return rows.reduce((best, row) => row.total < best.total ? row : best);
  }

  function renderFormula() {
    const host = document.getElementById('finalDecision');
    const result = calculateFromForm();
    if (!host || !result) return;
    const old = document.getElementById('eoqFormulaApplied');
    if (old) old.remove();
    const cycleYears = result.candidateQ / (Number(document.getElementById('calculationForm').weeklyDemand.value) * Number(document.getElementById('calculationForm').workingWeeks.value));
    const cycleWeeks = cycleYears * Number(document.getElementById('calculationForm').workingWeeks.value);
    const box = document.createElement('div');
    box.id = 'eoqFormulaApplied';
    box.className = 'analysis-note';
    box.innerHTML = `<strong>EOQ formula applied</strong><br>Q* = √(2Ka / h) = √(2 × ${aFmt(result)} × ${money(result.K || Number(document.getElementById('calculationForm').setupCost.value))} / ${money(result.h)}) = <strong>${result.Q.toFixed(2)}</strong> units<br>t* = Q* / a = ${result.candidateQ.toFixed(2)} / ${Number(document.getElementById('calculationForm').weeklyDemand.value) * Number(document.getElementById('calculationForm').workingWeeks.value)} = <strong>${cycleYears.toFixed(4)} year (${cycleWeeks.toFixed(2)} weeks)</strong><br><small>K ↑ → Q*, t* ↑ &nbsp; | &nbsp; h ↑ → Q*, t* ↓</small>`;
    host.appendChild(box);
  }

  function aFmt(result) {
    const form = document.getElementById('calculationForm');
    return (Number(form.weeklyDemand.value) * Number(form.workingWeeks.value)).toFixed(0);
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
