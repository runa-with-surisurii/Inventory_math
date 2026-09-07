(() => {
  const HISTORY_KEY = 'kitcheniq-history';
  const ITEMS_KEY = 'kitcheniq-items';

  const readJSON = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#39;'
  }[c]));

  function ensureChartCard() {
    const historyView = document.getElementById('history');
    if (!historyView) return null;

    let card = document.getElementById('demandTrendCard');
    if (card) return card;

    const panel = historyView.querySelector('.panel');
    if (!panel) return null;

    card = document.createElement('section');
    card.id = 'demandTrendCard';
    card.className = 'panel history-chart-card';
    card.innerHTML = `
      <div class="panel-header">
        <div>
          <h2>Demand Trend</h2>
          <span>Weekly historical demand and average line</span>
        </div>
        <span class="date-chip" id="historyChartAvg">No data</span>
      </div>
      <div id="historyChart" class="history-chart"></div>`;

    panel.insertAdjacentElement('afterend', card);
    return card;
  }

  function getSelectedItem() {
    const select = document.getElementById('historyItem');
    if (!select || !select.options.length) return null;

    const items = readJSON(ITEMS_KEY, []);
    const index = Number(select.value);
    if (Number.isInteger(index) && items[index]) return items[index];

    const selectedName = select.options[select.selectedIndex]?.textContent?.trim();
    return items.find((item) => item.name === selectedName) || null;
  }

  function getHistoricalDemand(item) {
    if (!item?.name) return [];

    const history = readJSON(HISTORY_KEY, {});
    const values = Array.isArray(history[item.name]) ? history[item.name] : [];
    return values.map(number).filter((value) => value !== null && value >= 0);
  }

  function drawChart() {
    const card = ensureChartCard();
    const chart = document.getElementById('historyChart');
    const avgEl = document.getElementById('historyChartAvg');
    if (!card || !chart) return;

    const item = getSelectedItem();
    const data = getHistoricalDemand(item);

    if (!item) {
      chart.innerHTML = '<div class="empty">Add a kitchen item to view demand history.</div>';
      if (avgEl) avgEl.textContent = 'No item';
      return;
    }

    if (!data.length) {
      chart.innerHTML = `
        <div class="history-chart-empty">
          <strong>No historical demand yet</strong>
          <span>Click “+ Add week” above and enter weekly demand for ${escapeHTML(item.name)}.</span>
        </div>`;
      if (avgEl) avgEl.textContent = 'No data';
      return;
    }

    const width = 760;
    const height = 320;
    const pad = { left: 56, right: 28, top: 28, bottom: 52 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = Math.max(max - min, 1);
    const x = (index) => pad.left + (data.length === 1 ? plotWidth / 2 : index * plotWidth / (data.length - 1));
    const y = (value) => pad.top + (max - value) * plotHeight / range;
    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
    const avgY = y(average);
    const points = data.map((value, index) => `${x(index)},${y(value)}`).join(' ');

    const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = max - ratio * range;
      const gy = pad.top + ratio * plotHeight;
      return `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}" class="history-grid-line"/>
        <text x="${pad.left - 10}" y="${gy + 4}" text-anchor="end" class="history-axis">${Math.round(value)}</text>`;
    }).join('');

    const labels = data.map((value, index) => {
      const labelX = x(index);
      return `<text x="${labelX}" y="${height - 18}" text-anchor="middle" class="history-axis">W${index + 1}</text>`;
    }).join('');

    const pointsMarkup = data.map((value, index) => `
      <circle cx="${x(index)}" cy="${y(value)}" r="5" class="history-point">
        <title>Week ${index + 1}: ${value} units</title>
      </circle>`).join('');

    chart.innerHTML = `
      <div class="history-chart-wrap">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Weekly historical demand trend for ${escapeHTML(item.name)}">
          ${grid}
          <line x1="${pad.left}" y1="${avgY}" x2="${width - pad.right}" y2="${avgY}" class="history-average-line"/>
          <polyline points="${points}" fill="none" class="history-line"/>
          ${pointsMarkup}
          ${labels}
          <text x="${width - pad.right}" y="${Math.max(pad.top + 12, avgY - 9)}" text-anchor="end" class="history-average-label">Avg ${average.toFixed(1)}</text>
        </svg>
      </div>
      <div class="history-chart-stats">
        <div><span>Weeks recorded</span><strong>${data.length}</strong></div>
        <div><span>Average demand</span><strong>${average.toFixed(1)} / week</strong></div>
        <div><span>Peak demand</span><strong>${Math.max(...data)} units</strong></div>
        <div><span>Lowest demand</span><strong>${Math.min(...data)} units</strong></div>
      </div>`;

    if (avgEl) avgEl.textContent = `Avg ${average.toFixed(1)} / week`;
  }

  function init() {
    if (!document.getElementById('history')) return;

    ensureChartCard();
    drawChart();

    document.getElementById('historyItem')?.addEventListener('change', drawChart);
    document.getElementById('addHistory')?.addEventListener('click', () => setTimeout(drawChart, 0));

    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === HISTORY_KEY || event.key === ITEMS_KEY) drawChart();
    });

    window.addEventListener('inventory-history-updated', drawChart);
    window.addEventListener('inventory-items-updated', drawChart);

    const rows = document.getElementById('historyRows');
    if (rows) {
      new MutationObserver(drawChart).observe(rows, { childList: true, subtree: true, characterData: true });
    }

    // app.js renders the Historical Data table during startup, so redraw after it finishes.
    setTimeout(drawChart, 100);
    setTimeout(drawChart, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

(() => {
  window.addEventListener('load', () => {
    const view = document.getElementById('uncertainty');
    const cards = document.getElementById('stochasticCards');
    if (!view || !cards) return;
    const panel = view.querySelector('.panel');
    if (panel) {
      const header = panel.querySelector('.panel-header');
      if (header && !document.getElementById('serviceLevel')) {
        const label = document.createElement('label');
        label.className = 'field-inline';
        label.innerHTML = '<span>Service level</span><select id="serviceLevel"><option value="0.90">90%</option><option value="0.95" selected>95%</option><option value="0.99">99%</option></select>';
        header.appendChild(label);
      }
    }

    const zTable = { '0.90': 1.2816, '0.95': 1.6449, '0.99': 2.3263 };
    const num = (x) => Number.isFinite(Number(x)) ? Number(x) : 0;
    const esc = (s) => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c]));
    const getData = () => {
      let items = [];
      let hist = {};
      try { items = JSON.parse(localStorage.getItem('kitcheniq-items') || '[]'); } catch {}
      try { hist = JSON.parse(localStorage.getItem('kitcheniq-history') || '{}'); } catch {}
      return items.map(item => {
        const data = Array.isArray(hist[item.name]) ? hist[item.name].map(num).filter(v => v >= 0) : [];
        const fallback = num(item.demand);
        const values = data.length ? data : [fallback];
        const mean = values.reduce((a,b) => a+b,0) / values.length;
        const variance = values.length > 1 ? values.reduce((a,b) => a+(b-mean)**2,0)/(values.length-1) : 0;
        const sigmaWeekly = Math.sqrt(variance);
        const lead = Math.max(1,num(item.lead));
        const meanLead = mean*lead/7;
        const sigmaLead = sigmaWeekly*Math.sqrt(lead/7);
        return { item, values, mean, sigmaWeekly, lead, meanLead, sigmaLead };
      });
    };
    const render = () => {
      const service = num(document.getElementById('serviceLevel')?.value) || .95;
      const z = zTable[String(service)] || 1.6449;
      const data = getData();
      cards.innerHTML = data.length ? data.map(({item,values,mean,sigmaWeekly,lead,meanLead,sigmaLead}) => {
        const ss = z*sigmaLead;
        const rop = Math.ceil(meanLead+ss);
        const stock = num(item.stock);
        const needs = stock <= rop;
        const shortage = (1-service)*100;
        const weeks = values.length;
        return `<article class="analysis-card"><h3>${esc(item.name)}</h3><p>${esc(item.category)} · ${esc(item.supplier)}</p><div class="analysis-values"><div><span>Average demand μ</span><strong>${mean.toFixed(2)} / week</strong></div><div><span>Std. deviation σ</span><strong>${sigmaWeekly.toFixed(2)} / week</strong></div><div><span>Lead-time demand</span><strong>${meanLead.toFixed(2)}</strong></div><div><span>Safety Stock</span><strong>${Math.ceil(ss)} units</strong></div><div><span>Stochastic ROP</span><strong>${rop} units</strong></div><div><span>Current stock</span><strong>${stock} units</strong></div></div><small>Service level ${Math.round(service*100)}% · z = ${z.toFixed(3)} · ${weeks} week${weeks===1?'':'s'} of data · shortage risk ${shortage.toFixed(0)}%</small><div class="status ${needs?'low':'healthy'}" style="margin-top:12px;display:inline-block">${needs?'REORDER — stock ≤ ROP':'STOCK OK — above ROP'}</div></article>`;
      }).join('') : '<div class="empty">No inventory items available.</div>';
    };
    const rerender = () => { render(); window.dispatchEvent(new Event('inventory-stochastic-updated')); };
    document.getElementById('serviceLevel')?.addEventListener('change', rerender);
    document.getElementById('demandIncrease')?.addEventListener('input', render);
    render();
    setTimeout(render, 300);
  });
})();