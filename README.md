# KitchenIQ — Restaurant Kitchen Inventory Decision System

A lightweight inventory planning dashboard for restaurant operations. The current version is a frontend demo with local browser storage and an EOQ quantity-discount decision solver.

## Features

- Inventory dashboard with stock value and stock-health metrics
- Kitchen item table with search, category/status filters, add and delete actions
- Reorder queue with reorder-point and suggested-order calculations
- Supplier quantity-discount comparison
- EOQ decision solver with step-by-step calculation and total-cost comparison
- Editable quantity-discount tiers
- Reports with demand and inventory-value visualizations
- Responsive layout for desktop and mobile
- Demo data persisted in `localStorage`

## Run locally

Requirements: Node.js 18+

```bash
npm start
```

Open `http://localhost:4173` in a browser.

## Tests

```bash
npm test
```

The tests cover the core EOQ, candidate-quantity, and total-cost calculations.

## EOQ model

The solver uses:

- Annual demand: `D = weekly demand × working weeks`
- Holding cost: `h = unit cost × holding rate`
- EOQ: `Q = √(2DK / h)`
- Total annual cost: `T = Dc + (D/Q)K + (Q/2)h`

For quantity discounts, the calculated EOQ is adjusted to the feasible quantity range of each tier and the lowest total annual cost is selected.

## Next production phase

The demo can be extended with a real backend/database, user authentication, supplier records, purchase orders, inventory transaction history, automatic demand forecasting, and exportable reports.
