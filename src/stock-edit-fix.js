(() => {
  // Reliable inventory stock editor for the Kitchen Items modal.
  // Saves the value directly to browser storage, including values such as 5.
  window.addEventListener('load', () => {
    const form = document.getElementById('itemForm');
    if (!form || form.dataset.stockFixBound === '1') return;
    form.dataset.stockFixBound = '1';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const stockInput = form.elements.stock;
      const stock = Number(stockInput.value);
      const indexValue = form.elements.editIndex?.value ?? '';

      if (!Number.isFinite(stock) || stock < 0) {
        stockInput.setCustomValidity('Stock must be 0 or greater.');
        stockInput.reportValidity();
        return;
      }
      stockInput.setCustomValidity('');

      let items;
      try {
        items = JSON.parse(localStorage.getItem('kitcheniq-items') || '[]');
      } catch {
        items = [];
      }

      const item = {
        name: form.elements.name.value.trim(),
        category: form.elements.category.value.trim(),
        stock,
        demand: Number(form.elements.demand.value),
        unit: Number(form.elements.unit.value),
        lead: Number(form.elements.lead.value),
        supplier: form.elements.supplier.value.trim(),
        setup: Number(form.elements.setup.value)
      };

      const index = Number(indexValue);
      if (Number.isInteger(index) && index >= 0 && index < items.length) {
        items[index] = item;
      } else {
        items.push(item);
      }

      localStorage.setItem('kitcheniq-items', JSON.stringify(items));
      window.location.reload();
    }, true);
  });

  // Load the new-item stochastic calculation after the main application.
  window.addEventListener('load', () => {
    const script = document.createElement('script');
    script.src = './src/new-item-safety-stock-fix.js?v=20260911';
    document.body.appendChild(script);
  });
})();
