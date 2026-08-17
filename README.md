# BlueFinch Purchase Management Dashboard

An ERP-style purchase-management dashboard built with HTML, CSS, JavaScript, and PHP APIs backed by JSON files (no database required).

## Included functionality

- Dashboard with total, draft, pending, and completed PO metrics, recent orders, and a status chart.
- Purchase-order list with search, status filtering, view, edit, delete, draft, and submit actions.
- Purchase-order form with auto-generated PO numbers, supplier selection, item-master picker, dynamic item rows, and live totals.
- Supplier and Item Masters with generated identifiers, search, add, edit, and delete actions.
- PHP validation and JSON API responses for all supplier, item, purchase-order, and dashboard data flows.

## Run locally

For the PHP API flow, run the project through a PHP-capable host such as Vercel's local development command:

```bash
npx vercel dev
```

Open the local URL printed by Vercel. The app also has a client-side preview fallback if the PHP endpoints are unavailable.

## Deploy

1. Push this directory to a GitHub repository.
2. Import the repository into Vercel.
3. Deploy with the included `vercel.json`; it maps the `api/*.php` files to Vercel PHP functions.

Vercel's serverless filesystem is ephemeral. The seeded JSON data is suitable for this task and demo use; production deployments should replace it with persistent storage.
