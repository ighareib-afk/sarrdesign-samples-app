# Sarrdesign - Sample Display Control

A web app (works on desktop and mobile browsers) that runs the whole lifecycle of a showroom
display sample: **sales area manager request &rarr; commercial director review &rarr; factory
production &rarr; downtown warehouse receiving &rarr; admin-approved dismissal &rarr; assembly
team placement at the showroom &rarr; returns / reassignment**, with a full dated history per
distributor and showroom.

## What it solves

- Factory batches arriving in pieces, sometimes months apart &rarr; the **Incoming** screen shows,
  per SKU, what's been approved, what's shipped, what's received, and how much is still outstanding.
- The downtown warehouse working blind &rarr; **Warehouse Stock** shows exactly what's sitting there
  and which distributor/showroom/request it belongs to.
- Samples moving between traders without a record &rarr; **nothing leaves the warehouse** (new
  placement or a reassignment from one trader to another) without an admin-approved "dismissal".
- Giving the same sample twice to one showroom by accident &rarr; placing a sample triggers an
  automatic duplicate-display check against what's already live at that showroom.
- No historical record &rarr; the **History Archive** gives a full dated timeline per distributor
  or per showroom: every request, shipment, receipt, placement, and return.
- Minimum order quantity (5-10 pcs) enforcement &rarr; captured on every request line and checked
  by the commercial director during review.
- Dummy vs. sellable samples &rarr; flagged per line item.

## Roles

| Role | Can do |
|---|---|
| Sales Area Manager | Create sample requests against a distributor/showroom, attach the distributor order reference |
| Commercial Director | Review/approve or reject each SKU, check SKU-matches-stock and MOQ, send approved requests to the factory, export product lists |
| Factory | See the production queue, log shipments (partial batches supported), export the Excel list per request |
| Warehouse | Log receipts from the factory, see current stock, request a dismissal (cannot move stock without admin approval) |
| Assembly Team (4 people) | See what's approved to place, place samples at showrooms (with duplicate-display warning), record returns |
| Admin (you) | Everything above, plus the only role that can **approve a dismissal**, manage products, distributors/showrooms, and users |

## Running locally

```bash
cd backend
python3 -m venv ../venv && source ../venv/bin/activate
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000. The database (SQLite) and product/distributor seed data are created
automatically on first run.

### Default logins (password `ChangeMe123!` for all - **change these immediately**)

- `ighareib@gmail.com` - Admin (you)
- `sales@sarrdesign.demo` - Sales Area Manager
- `director@sarrdesign.demo` - Commercial Director
- `factory@sarrdesign.demo` - Factory
- `warehouse@sarrdesign.demo` - Warehouse
- `assembly@sarrdesign.demo` - Assembly Team

Go to **Users** as the admin to change passwords, rename accounts, or add real people. Delete or
disable the demo accounts once real users are set up.

## Deploying so your team can use it from a phone or desktop browser

The easiest free option is **Render**:

1. Push this folder to a GitHub repo (or use Render's "deploy from a public/private repo" flow).
2. In Render, choose **New +  Blueprint** and point it at the repo - it will read `render.yaml`
   and set everything up (web service + a small persistent disk for the database).
3. First boot seeds the database automatically. Log in as the admin and change every password.
4. Share the Render URL with your team.

Alternative: **Railway** or any host that runs a Python web service also works - use the
`Procfile` (`web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`).

**Important for production:** the free tiers of most hosts use an ephemeral filesystem unless you
attach a persistent disk (the included `render.yaml` does this for Render). If you'd rather use a
real database server, set the `DATABASE_URL` environment variable to a Postgres connection string
(`postgresql://user:pass@host/db`) - the app already supports it via SQLAlchemy, and
`psycopg2-binary` is in `requirements.txt`.

Set a real `SECRET_KEY` environment variable in production (Render's blueprint generates one for
you automatically).

## Data that was seeded from your files

- **Products**: all 588 SKUs from `SD_Master data sheet_July_2026.xlsx` were imported as-is
  (code, color, family, kind, application, English/Arabic descriptions, price). Add new products
  or delist discontinued ones from the **Products** screen - delisting keeps them visible in
  historical requests but hides them from new ones. You can also re-upload a refreshed Excel file
  at any time from the same screen to bulk update prices/descriptions.
- **Distributors & showrooms**: the first 3 pages of `Distributors & Retailers List` (the
  machine-readable "authorized agents" table) were parsed automatically - 13 distributors / 62
  showroom addresses. **Pages 4-20 of that PDF are scanned images**, not selectable text, so they
  could not be parsed automatically. Please add those distributors/traders and showrooms from the
  **Distributors** screen (or ask me to OCR and re-import them as a follow-up) - the screen
  supports adding, editing, and setting the minimum order quantity per showroom.
- The paper "sample circulation form" (نموذج تداول عينات) you attached is what the **New Sample
  Request** screen replaces - the app continues its numbering from `SD-0245` onward.

## Notes on things you specifically called out

- Every action (create, approve, ship, receive, dismiss, place, return) is timestamped and
  attributed to the logged-in user - visible in the request's approval history and the History
  Archive.
- A request line tracks quantities separately at every stage (requested &rarr; approved &rarr;
  shipped &rarr; received &rarr; assigned &rarr; returned), so a partially-shipped or
  partially-received batch never gets lost or double-counted.
- Reassigning a sample from one trader's showroom to another goes through the same admin-approved
  dismissal flow; the original placement is kept in history marked "reassigned" rather than
  deleted, so both traders' archives stay accurate.
