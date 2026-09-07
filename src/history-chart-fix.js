(() => {
  function drawDemandTrend() {
    const view = document.getElementById('history');
    const panel = view?.querySelector('.panel');
    const select = document.getElementById('historyItem');
    if (!view || !panel || !select) return;

    let card = document.querySelector('.history-chart-card');
    if (!card) {
      card = document.createElement('section');
      card.className = 'panel history-chart-card';
      card.innerHTML = '<div class="panel-header"><div><h2>Demand Trend</h2><span>Weekly historical demand and average line</span></div><span class="date-chip" id="historyChartAvg">No data</span></div><div id="historyChart"></div>';
      panel.parentNode.insertBefore(card, panel.nextSibling);
    }

    const chart = document.getElementById('historyChart');
    const avgEl = document.getElementById('historyChartAvg');
    let history = {};
    try { history = JSON.parse(localStorage.getItem('kitcheniq-history') || '{}'); } catch {}

    const name = select.options[select.selectedIndex]?.text || '';
    const data = Array.isArray(history[name]) ? history[name].map(Number).filter(Number.isFinite) : [];
    if (!data.length) {
      chart.innerHTML = '<div class="empty">No historical data for this item yet.</div>';
      if (avgEl) avgEl.textContent = 'No data';
      return;
    }

    const W = 760, H = 300, p = { l: 48, r: 24, t: 24, b: 42 };
    const max = Math.max(...data), min = Math.min(...data), range = Math.max(max - min, 1);
    const x = i => p.l + i * (W - p.l - p.r) / Math.max(data.length - 1, 1);
    const y = v => p.t + (max - v) * (H - p.t - p.b) / range;
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const avgY = y(avg);
    const points = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');

    chart.innerHTML = `<div class="history-chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Historical weekly demand trend"><line x1="${p.l}" y1="${avgY}" x2="${W-p.r}" y2="${avgY}" class="history-average-line"/><polyline points="${points}" fill="none" class="history-line"/>${data.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="5" class="history-point"><title>Week ${i+1}: ${v} units</title></circle>`).join('')}${data.map((v,i)=>`<text x="${x(i)}" y="${H-14}" text-anchor="middle" class="history-axis">W${i+1}</text>`).join('')}<text x="${W-p.r}" y="${avgY-8}" text-anchor="end" class="history-average-label">Avg ${avg.toFixed(1)}</text></svg></div><div class="history-chart-stats"><div><span>Weeks recorded</span><strong>${data.length}</strong></div><div><span>Average demand</span><strong>${avg.toFixed(1)} / week</strong></div><div><span>Peak demand</span><strong>${max} units</strong></div><div><span>Lowest demand</span><strong>${min} units</strong></div></div>`;
    if (avgEl) avgEl.textContent = `Avg ${avg.toFixed(1)} / week`;
  }

  function start() {
    drawDemandTrend();
    setTimeout(drawDemandTrend, 100);
    setTimeout(drawDemandTrend, 500);
    document.getElementById('historyItem')?.addEventListener('change', drawDemandTrend);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('load', start, { once: true });
})();
