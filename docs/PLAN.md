# Gestão 3D — Architecture & MVP Plan

Web app to replace the spreadsheet used to manage a small 3D printing business: sales, products, inventory, materials, purchases, costs, profit, sales channels and a financial dashboard.

- **UI language:** Brazilian Portuguese (pt-BR)
- **Formats:** currency `R$ 1.234,56`, dates `DD/MM/YYYY`, time zone `America/Sao_Paulo`
- **Status:** approved on 2026-09-28 with the default answers in [section 10](#10-decisions)
- **Progress:** stages 0–6 done (setup, database, Configurações, Produtos, Nova venda, sales list, Dashboard). Next: stage 7, Estoque.

---

## 1. Architecture

```
React SPA (Vite, TS, Tailwind)
  ├─ UI (pages/components)          → calls hooks only
  ├─ hooks (TanStack Query)          → loading, caching, refetching
  ├─ api (supabase-js)               → reads from tables/views, writes via RPC
  └─ domain/ (pure TS, unit-tested)  → all money, cost, margin and stock math
              │
Supabase
  ├─ Postgres: tables, constraints, views for reports
  ├─ RPC functions (plpgsql): every write that touches several tables
  │   runs in ONE transaction (create_sale, register_purchase, …)
  └─ Auth (single user now; created_by columns ready for more users)
```

**Rule for financial logic:** the database is the source of truth. RPCs re-check inputs, recalculate costs and fees, and write the snapshots. The TypeScript code in `domain/` runs the same formulas only for the live preview in forms, and it's where the unit tests live. If the preview and the saved values ever disagree, the saved values win.

## 2. Stack

| Area | Choice |
|---|---|
| UI | React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (Radix-based dialogs, selects, combobox, date picker), react-icons, sonner for toasts |
| Data | Supabase (Postgres + Auth + RPC), `@supabase/supabase-js`, types generated with `supabase gen types` |
| State/fetching | TanStack Query |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Money math (client) | decimal.js-light (no floats), rounded half-up to 2 places at the end |
| Dates | date-fns with pt-BR locale |
| CSV | papaparse (import now, export later) |
| Tests | Vitest |
| Hosting | Vercel or Netlify (static) + Supabase free tier |
| Package manager | yarn (`package-lock.json` removed) |

## 3. Database schema

All tables have `id uuid` (default `gen_random_uuid()`), `created_at` and `updated_at`.

**Column types:**

| Kind | Type |
|---|---|
| Money | `NUMERIC(12,2)` |
| Unit costs | `NUMERIC(14,6)` (e.g. R$ 0,113900/g) |
| Quantities | `NUMERIC(14,3)` |

`CHECK` constraints block invalid negative values.

### Settings / lookups

- **`sales_channels`**: name, is_active, `fee_rules jsonb null` (reserved for future fee rules per channel), sort_order
  - Initial data: Mercado Livre, Shopee, TikTok Shop, Pessoal
- **`units`**: code, name
  - Initial data: `un`, `g`, `kg`, `m`, `pct`, `rolo`. You can add more.
- **`categories`**: name, `kind` (`product` | `material` | `expense`), `is_operational` (for expenses)
- **`suppliers`**: name, contact, notes

### Products

- **`products`**: name, sku, description, category_id, is_active, is_customizable, default_price, estimated_cost (manual fallback), `auto_deduct_materials bool`, `stock_mode` (`made_to_order` | `stocked`), archived_at
- **`variation_types`**: name (Cor, Tamanho, Modelo…)
- **`variation_values`**: variation_type_id, value (Azul, Rosa, Pequeno…)
- **`product_variants`**: product_id, sku (unique), price (null means use the product's price), cost_override (null means calculated), min_stock, current_qty (cached), is_default, is_active
- **`product_variant_values`**: variant_id, variation_value_id (the Cor/Tamanho/Modelo combination)
- **`product_materials`** (cost sheet): product_id, `variant_id null` (a row with a variant overrides the product-level row), inventory_item_id, quantity
- **`product_extra_costs`**: product_id, label (Energia, Mão de obra…), amount per unit

Every product has at least one variant (a hidden "Padrão" one if it has no variations). That way sales and stock always point at a variant, with no special cases.

### Inventory

- **`inventory_items`**: name, category_id, unit_id, current_qty (cached), min_qty, avg_cost, supplier_id, archived_at
- **`stock_movements`**:
  - target: **exactly one of** `inventory_item_id` / `product_variant_id` (enforced by CHECK)
  - type: `IN` | `OUT` | `ADJUSTMENT`
  - quantity (signed) and unit_cost (snapshot)
  - reason: `purchase` | `sale` | `production` | `manual` | `loss` | `reversal` | `import`
  - source links: purchase_item_id, sale_item_id, production_id
  - occurred_at, notes, created_by
- **`productions`** (stocked products only): variant_id, quantity, date. It uses up materials and adds finished units.

### Purchases / cash

- **`purchases`**: date, supplier_id, notes, total, deleted_at
- **`purchase_items`**: purchase_id, description, category_id, inventory_item_id (null means an expense with no stock), quantity, total_amount, `unit_price` (generated column), add_to_stock, stock_qty_per_unit (e.g. 1 rolo = 1000 g)
- **`other_incomes`**: date, description, amount (the "outras entradas" line in cash flow)

### Sales

- **`sales`**: sale_date, channel_id, gross_amount, received_amount, fees, total_cost, profit, notes, deleted_at
- **`sale_items`**:
  - variant_id and quantity
  - money snapshots: unit_price, gross_amount, received_amount, fees, unit_cost, total_cost, profit
  - customization: is_customized, customization_notes
  - **text snapshots:** product_name, sku, variant_label

The snapshots mean renaming a product, changing its cost or deleting it never changes a past sale.

## 4. Relationships

```
categories 1─* products 1─* product_variants *─* variation_values *─1 variation_types
products 1─* product_materials *─1 inventory_items *─1 units
products 1─* product_extra_costs
sales_channels 1─* sales 1─* sale_items *─1 product_variants
purchases 1─* purchase_items *─0..1 inventory_items
stock_movements *─1 (inventory_items XOR product_variants)
stock_movements *─0..1 purchase_items | sale_items | productions
```

## 5. Sale registration flow

1. **Produto:** searchable combobox with recently sold products first. If the product has only one variant, it's selected automatically.
2. **Variação:** pick Cor/Tamanho/Modelo. Price and SKU fill in automatically, and the unit cost loads from the `variant_cost` view.
3. **Other fields:** channel and date default to what was used last and today. Quantity defaults to 1. "Personalizado" (with a notes field) only shows for products that allow customization.
4. **Live summary** from `domain/sale.ts`: Bruto, Taxas, Recebido, Custo, Lucro, Margem (over amount received), plus margin over gross.
5. **Save:** calls the `create_sale` RPC, which in one transaction:
   - validates the input
   - recalculates and snapshots the cost
   - inserts the sale and its items
   - deducts stock: materials if the product is made-to-order with auto-deduct on, or finished units if it's stocked
6. A toast confirms the save and **"Registrar outra"** keeps the channel and date filled in.

**Multiple items:** the schema allows several items per sale, with the received amount split in proportion to each item's gross value. The first version of the form handles one item per sale, like the spreadsheet.

**Editing:** reverses the sale's stock movements and applies them again. The cost snapshot stays the same unless the product or quantity changes or "recalcular custo" is clicked.

**Deleting:** soft delete with reversing stock movements, so nothing is lost.

## 6. Inventory flow

- Stock never changes by editing a number. Every change is a `stock_movement`, and a trigger updates `current_qty` in the same transaction.
- **Purchase with "Adicionar ao estoque":** creates an IN movement at the purchase unit cost and recalculates the average cost.
- **Weighted average on IN:** `new_avg = (qty·avg + in_qty·in_cost) / (qty + in_qty)`
  - If current qty ≤ 0, the new average is the incoming cost.
  - OUT and ADJUSTMENT movements never change the average.
- Every movement keeps its own `unit_cost`, so costs are never silently overwritten.
- **Low stock:** `current_qty < min_qty` on both materials and variants. It feeds the "Estoque baixo" badge, the dashboard count and a "Para comprar" list.

## 7. Cost calculation strategy

**Variant unit cost** is resolved in this order:

1. `cost_override`, if set
2. the cost sheet
3. `products.estimated_cost`

**Cost sheet** = Σ(material qty × material's current avg cost) + Σ extra costs. The variant-level sheet is used if one exists; otherwise the product-level one.

**At sale time** the cost is frozen into `sale_items.unit_cost`. A spool purchase is never a sale cost; only the grams used count.

**Formulas:**

| Value | Formula |
|---|---|
| Fees | gross − received |
| Total cost | unit cost × qty |
| Profit | received − total cost |
| Margin | profit / received × 100 |
| Margin over gross | profit / gross × 100 |

**Money on the client** uses Decimal math and rounds half-up to 2 decimals. SQL uses the same rounding.

**Reports** come from SQL views/RPCs over a date range: `report_summary`, `report_by_channel`, `report_by_product`, `report_costs_by_category`, `cash_flow`.

**Profit and cash flow stay separate:**
- **Profit** comes from sales snapshots.
- **Cash flow** comes from received amounts, other income and purchases.

## 8. MVP scope and order

Each stage ends with tests, a type-checked build and a check in the running app.

| Stage | What gets built |
|---|---|
| 0 | Dependencies, Supabase client, auth/login, sidebar layout, formatting (R$, DD/MM/YYYY) |
| 1 | Migrations: schema, constraints, triggers, RPCs, initial data (4 channels, units, categories) |
| 2 | Configurações: channels, categories, units, variation types/values, suppliers |
| 3 | Produtos + variants |
| 4 | Nova venda + `domain/` calculations and tests |
| 5 | Sales list (filters, totals, sort, edit, delete) |
| 6 | Dashboard (cards, charts, period filter, low stock) |
| 7 | Estoque: materials, movements, history, finished goods |
| 8 | Compras/despesas + weighted average cost |
| 9 | Ficha de custo + automatic deduction + production entry |
| 10 | Relatórios + fluxo de caixa |
| 11 | CSV import with preview/validation. Imported sales keep the spreadsheet's "Custo por peça" as their snapshot and don't move stock. |

The dashboard comes after sales (stage 6) because it needs real sales data.

**Out of the MVP:** channel fee rules, CSV/Excel export (the code is structured for it), multiple users.

## 9. Folder structure

```
supabase/
  migrations/        0001_schema.sql, 0002_stock.sql, 0003_sales_rpc.sql, 0004_reports.sql …
  seed.sql
src/
  app/               router.tsx, providers.tsx, layout/ (Sidebar, Topbar)
  components/ui/     shadcn primitives
  components/        DataTable, MoneyInput, StatCard, DateRangeFilter, EmptyState, ConfirmDialog, PageHeader
  domain/            money.ts, sale.ts, cost.ts, stock.ts, period.ts  (+ *.test.ts)
  features/
    dashboard/ sales/ products/ inventory/ purchases/ reports/ settings/ import/
      api.ts  hooks.ts  schemas.ts  components/  pages/
  lib/               supabase.ts, format.ts (BRL/dates), errors.ts
  types/database.ts  (generated)
```

## 10. Decisions

Approved with these defaults:

| # | Topic | Decision |
|---|---|---|
| 1 | Supabase setup | Free cloud project. The URL and anon key go in `.env.local`; migrations are applied with `supabase db push` or run as SQL. |
| 2 | Finished stock vs materials | Per-product `stock_mode`. **Sob encomenda:** the sale deducts materials. **Estoque pronto:** "Registrar produção" deducts materials and adds finished units; the sale deducts finished units. Materials are never counted twice. |
| 3 | Negative stock | Allowed, with a visible alert (starting stock won't be fully registered on day one). |
| 4 | Cost sheet per variant | One cost sheet per product, with an optional override per variant. |
| 5 | Profit vs expenses | "Lucro líquido" = received − cost of goods sold. A separate **"Resultado do período"** card = lucro − despesas operacionais (non-stock costs like ads or MEI tax). |
| 6 | Filament units | PLA/PETG stock kept in grams. A purchase line can say "1 rolo = 1000 g". |
| 7 | Received vs gross | Received ≤ gross is enforced. Any shipping charged to the customer goes into gross, so fees are never negative. |
| 8 | Cash flow date | The sale date. A separate "data de recebimento" for marketplace payouts can come later. |
| 9 | Existing code | The tabbed `Reports.tsx` page is replaced by the sidebar layout. The existing theme tokens are kept and a light theme is added. |
| 10 | Spreadsheet import | A sample export (CSV/XLSX) will be shared before stage 11 so the import matches the real columns. |
