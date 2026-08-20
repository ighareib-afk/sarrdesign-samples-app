/* Sarrdesign Sample Display Control - single-file frontend app */
const API = "/api";
let CURRENT_USER = null;
let PRODUCTS = [];
let DISTRIBUTORS = [];
let SHOWROOMS_BY_DIST = {};
let RETURN_REASONS = [];

/* ---------------------------------------------------------------------- */
/* Utilities                                                              */
/* ---------------------------------------------------------------------- */

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDateShort(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function badge(status) {
  const label = (status || "").replace(/_/g, " ");
  return `<span class="badge status-${esc(status)}">${esc(label)}</span>`;
}

function toast(msg, type = "info") {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast" + (type === "error" ? " error" : type === "success" ? " success" : "");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

async function api(method, path, body, isForm = false) {
  const opts = { method, credentials: "include", headers: {} };
  if (body !== undefined && body !== null) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  let res;
  try {
    res = await fetch(API + path, opts);
  } catch (e) {
    toast("Network error - is the server reachable?", "error");
    throw e;
  }
  if (res.status === 401) {
    CURRENT_USER = null;
    location.hash = "#/login";
    throw new Error("unauthenticated");
  }
  const ct = res.headers.get("content-type") || "";
  let data = null;
  if (ct.includes("application/json")) {
    data = await res.json();
  }
  if (!res.ok) {
    const msg = (data && data.detail) ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : `Error ${res.status}`;
    toast(msg, "error");
    const err = new Error(msg);
    err.data = data;
    throw err;
  }
  return data;
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

/* ---------------------------------------------------------------------- */
/* Nav / role config                                                      */
/* ---------------------------------------------------------------------- */

const NAV = [
  { href: "#/dashboard", label: "Dashboard", roles: "*" },
  { href: "#/requests/new", label: "New Request", roles: ["sales_manager"] },
  { href: "#/requests", label: "Sample Requests", roles: ["sales_manager", "commercial_director", "factory", "admin"] },
  { href: "#/factory", label: "Factory Queue", roles: ["factory", "commercial_director", "admin"] },
  { href: "#/warehouse/incoming", label: "Incoming", roles: ["warehouse", "commercial_director", "factory", "admin"] },
  { href: "#/warehouse/stock", label: "Warehouse Stock", roles: ["warehouse", "admin", "commercial_director", "assembly"] },
  { href: "#/dismissals", label: "Dismissal Approvals", roles: ["warehouse", "assembly", "admin"] },
  { href: "#/returns", label: "Record Return", roles: ["warehouse", "assembly", "admin"] },
  { href: "#/history", label: "History Archive", roles: "*" },
  { href: "#/products", label: "Products", roles: ["admin", "commercial_director"] },
  { href: "#/distributors", label: "Distributors", roles: ["admin", "commercial_director", "sales_manager"] },
  { href: "#/users", label: "Users", roles: ["admin"] },
];

function navFor(role) {
  return NAV.filter((n) => n.roles === "*" || n.roles.includes(role));
}

const ROLE_LABEL = {
  admin: "Admin", sales_manager: "Sales Area Manager", commercial_director: "Commercial Director",
  factory: "Factory", warehouse: "Warehouse", assembly: "Assembly Team",
};

/* ---------------------------------------------------------------------- */
/* Shell / layout                                                         */
/* ---------------------------------------------------------------------- */

function renderShell(activeHref) {
  const app = document.getElementById("app");
  const links = navFor(CURRENT_USER.role).map((n) =>
    `<a href="${n.href}" class="${n.href === activeHref ? "active" : ""}" data-link>${esc(n.label)}</a>`
  ).join("");
  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="dot"></span> Sarrdesign &middot; Sample Display Control</div>
      <div class="who">${esc(CURRENT_USER.name)} &middot; <b>${esc(ROLE_LABEL[CURRENT_USER.role] || CURRENT_USER.role)}</b>
        <button class="logout" id="logoutBtn" style="margin-left:12px;">Log out</button>
      </div>
    </div>
    <div class="nav">${links}</div>
    <main id="main"></main>
  `;
  qs("#logoutBtn").addEventListener("click", async () => {
    await api("POST", "/auth/logout");
    CURRENT_USER = null;
    location.hash = "#/login";
  });
  qsa("[data-link]").forEach((a) => a.addEventListener("click", (e) => { /* default hash nav */ }));
  return qs("#main");
}

/* ---------------------------------------------------------------------- */
/* Shared data caches                                                     */
/* ---------------------------------------------------------------------- */

async function ensureCaches() {
  if (PRODUCTS.length === 0) PRODUCTS = await api("GET", "/products");
  if (DISTRIBUTORS.length === 0) DISTRIBUTORS = await api("GET", "/distributors");
  if (RETURN_REASONS.length === 0) RETURN_REASONS = await api("GET", "/meta/return-reasons");
}

async function showroomsFor(distId) {
  if (!SHOWROOMS_BY_DIST[distId]) {
    SHOWROOMS_BY_DIST[distId] = await api("GET", `/showrooms?distributor_id=${distId}`);
  }
  return SHOWROOMS_BY_DIST[distId];
}

/* ---------------------------------------------------------------------- */
/* Login                                                                  */
/* ---------------------------------------------------------------------- */

function viewLogin() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <h1>Sarrdesign</h1>
        <p class="sub">Sample Display Control - sign in</p>
        <form id="loginForm">
          <label>Email</label>
          <input type="email" id="email" required autocomplete="username">
          <label>Password</label>
          <input type="password" id="password" required autocomplete="current-password">
          <button type="submit" style="width:100%;margin-top:16px;">Sign in</button>
        </form>
        <div class="demo-hint">
          Demo accounts (password <b>ChangeMe123!</b>):<br>
          sales@sarrdesign.demo &middot; director@sarrdesign.demo &middot; factory@sarrdesign.demo<br>
          warehouse@sarrdesign.demo &middot; assembly@sarrdesign.demo
        </div>
      </div>
    </div>
  `;
  qs("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = qs("#email").value.trim();
    const password = qs("#password").value;
    try {
      const data = await api("POST", "/auth/login", { email, password });
      CURRENT_USER = data.user;
      location.hash = "#/dashboard";
      route();
    } catch (err) { /* toast already shown */ }
  });
}

/* ---------------------------------------------------------------------- */
/* Dashboard                                                              */
/* ---------------------------------------------------------------------- */

async function viewDashboard() {
  const main = renderShell("#/dashboard");
  main.innerHTML = `<div class="card"><p class="muted">Loading...</p></div>`;
  const role = CURRENT_USER.role;
  let cards = [];
  try {
    if (role === "sales_manager") {
      const mine = await api("GET", "/requests?mine=true");
      const submitted = mine.filter((r) => r.status === "submitted").length;
      const rejected = mine.filter((r) => r.status === "director_rejected").length;
      cards = [
        ["Your requests", mine.length], ["Awaiting director review", submitted], ["Rejected", rejected],
      ];
    } else if (role === "commercial_director") {
      const pending = await api("GET", "/requests?status=submitted");
      const approved = await api("GET", "/requests?status=director_approved");
      cards = [["Pending your review", pending.length], ["Approved, awaiting factory send", approved.length]];
    } else if (role === "factory") {
      const queue = await api("GET", "/factory/queue");
      cards = [["Items in production queue", queue.length]];
    } else if (role === "warehouse") {
      const incoming = await api("GET", "/warehouse/incoming");
      const stock = await api("GET", "/warehouse/stock");
      const dismissals = await api("GET", "/warehouse/dismissal-requests?status=pending");
      cards = [["Awaiting/incoming from factory", incoming.length], ["SKUs currently in warehouse", stock.length], ["Pending dismissal approvals", dismissals.length]];
    } else if (role === "assembly") {
      const approved = await api("GET", "/warehouse/dismissal-requests?status=approved");
      cards = [["Approved, ready to display", approved.length]];
    } else if (role === "admin") {
      const pendingDismissals = await api("GET", "/warehouse/dismissal-requests?status=pending");
      const incoming = await api("GET", "/warehouse/incoming");
      const stock = await api("GET", "/warehouse/stock");
      cards = [["Dismissal approvals awaiting you", pendingDismissals.length], ["Items in transit / delayed", incoming.length], ["SKUs in warehouse", stock.length]];
    }
  } catch (e) { /* ignore, toast shown */ }

  main.innerHTML = `
    <div class="stat-row">${cards.map(([label, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${esc(label)}</div></div>`).join("")}</div>
    <div class="card">
      <h2>Workflow at a glance</h2>
      <p class="small muted">
        Sales area manager creates a sample request against a showroom &rarr; commercial director reviews each SKU
        against the distributor's order &rarr; approved lines go to the factory &rarr; factory ships (often in partial
        batches) &rarr; warehouse confirms receipt &rarr; a dismissal must be approved by the admin before any sample
        leaves the warehouse &rarr; assembly team displays it at the showroom &rarr; returns/replacements flow back
        through the warehouse. Every step is dated and attributed.
      </p>
    </div>
  `;
}

/* ---------------------------------------------------------------------- */
/* New sample request (sales manager)                                     */
/* ---------------------------------------------------------------------- */

let draftItems = [];

async function viewNewRequest() {
  const main = renderShell("#/requests/new");
  await ensureCaches();
  draftItems = [];
  main.innerHTML = `
    <div class="card">
      <h2>New Sample Request</h2>
      <div class="grid cols-2">
        <div>
          <label>Distributor / Trader</label>
          <select id="distSel"><option value="">Select...</option>
            ${DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)} (${esc(d.governorate || "")})</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Showroom / Booth / Stand</label>
          <select id="showroomSel"><option value="">Select distributor first</option></select>
        </div>
      </div>
      <div class="grid cols-2">
        <div>
          <label>Purpose</label>
          <select id="purposeSel">
            <option value="new_stand">New stand / booth</option>
            <option value="addition">Addition to existing stand</option>
            <option value="replacement">Replacement</option>
            <option value="live_show">Live show (sellable / water flow)</option>
          </select>
        </div>
        <div>
          <label>Distributor order reference (PO #, invoice, etc.)</label>
          <input id="orderRef" placeholder="e.g. PO-1044">
        </div>
      </div>
      <label>Notes</label>
      <textarea id="notes" placeholder="Any context for the commercial director"></textarea>
    </div>

    <div class="card">
      <h2>Sample lines</h2>
      <p class="small muted">Search by code, family, or color. Enter the quantity of this SKU in the distributor's
        order too - the commercial director uses it to confirm the 5-10 piece minimum order quantity.</p>
      <div class="grid cols-4">
        <div style="grid-column: span 2;">
          <label>Product</label>
          <input id="productSearch" list="productOptions" placeholder="Type code / family / color...">
          <datalist id="productOptions">
            ${PRODUCTS.map((p) => `<option value="${esc(p.code)} - ${esc(p.family || "")} - ${esc(p.color || "")}" data-id="${p.id}">`).join("")}
          </datalist>
        </div>
        <div>
          <label>Qty requested (samples)</label>
          <input id="qtyReq" type="number" min="1" value="1">
        </div>
        <div>
          <label>Qty in distributor order (this SKU)</label>
          <input id="qtyOrder" type="number" min="0" placeholder="e.g. 8">
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <input type="checkbox" id="isDummy" checked style="width:auto;"> Dummy sample (not sellable)
        <span class="muted small" style="margin-left:6px;">uncheck for a sellable sample (e.g. to simulate live water flow)</span>
      </label>
      <button type="button" id="addLineBtn" class="secondary mt">+ Add line</button>

      <div id="linesTable" class="mt"></div>

      <div class="right mt">
        <button type="button" id="submitReqBtn">Submit request for review</button>
      </div>
    </div>
  `;

  qs("#distSel").addEventListener("change", async (e) => {
    const distId = e.target.value;
    const sel = qs("#showroomSel");
    if (!distId) { sel.innerHTML = `<option value="">Select distributor first</option>`; return; }
    sel.innerHTML = `<option value="">Loading...</option>`;
    const rooms = await showroomsFor(distId);
    sel.innerHTML = rooms.length
      ? rooms.map((r) => `<option value="${r.id}">${esc(r.name)} - ${esc(r.address || "")} (min ${r.min_order_qty})</option>`).join("")
      : `<option value="">No showrooms yet - add one under Distributors</option>`;
  });

  function renderLines() {
    const box = qs("#linesTable");
    if (draftItems.length === 0) { box.innerHTML = `<p class="muted small">No lines added yet.</p>`; return; }
    box.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Code</th><th>Family / Color</th><th>Qty</th><th>Order Qty</th><th>Type</th><th></th>
    </tr></thead><tbody>
      ${draftItems.map((it, idx) => `<tr>
        <td>${esc(it.code)}</td>
        <td>${esc(it.family)} / ${esc(it.color)}</td>
        <td>${it.qty_requested}</td>
        <td>${it.distributor_order_qty ?? "-"}</td>
        <td>${it.is_dummy ? '<span class="pill-dummy">Dummy</span>' : '<span class="pill-sellable">Sellable</span>'}</td>
        <td><button type="button" class="ghost" data-remove="${idx}">Remove</button></td>
      </tr>`).join("")}
    </tbody></table></div>`;
    qsa("[data-remove]", box).forEach((btn) => btn.addEventListener("click", () => {
      draftItems.splice(Number(btn.dataset.remove), 1);
      renderLines();
    }));
  }

  qs("#addLineBtn").addEventListener("click", () => {
    const input = qs("#productSearch");
    const opts = qsa("#productOptions option");
    const match = opts.find((o) => o.value === input.value);
    if (!match) { toast("Pick a product from the suggestions list", "error"); return; }
    const product = PRODUCTS.find((p) => String(p.id) === match.dataset.id);
    const qty = Number(qs("#qtyReq").value) || 1;
    const orderQty = qs("#qtyOrder").value === "" ? null : Number(qs("#qtyOrder").value);
    draftItems.push({
      product_id: product.id, code: product.code, family: product.family, color: product.color,
      qty_requested: qty, distributor_order_qty: orderQty, is_dummy: qs("#isDummy").checked,
    });
    input.value = ""; qs("#qtyReq").value = 1; qs("#qtyOrder").value = "";
    renderLines();
  });

  qs("#submitReqBtn").addEventListener("click", async () => {
    const distributor_id = Number(qs("#distSel").value);
    const showroom_id = Number(qs("#showroomSel").value);
    if (!distributor_id || !showroom_id) { toast("Choose a distributor and showroom", "error"); return; }
    if (draftItems.length === 0) { toast("Add at least one sample line", "error"); return; }
    const payload = {
      distributor_id, showroom_id, purpose: qs("#purposeSel").value,
      distributor_order_ref: qs("#orderRef").value || null, notes: qs("#notes").value || null,
      items: draftItems.map((it) => ({
        product_id: it.product_id, qty_requested: it.qty_requested,
        is_dummy: it.is_dummy, distributor_order_qty: it.distributor_order_qty,
      })),
    };
    try {
      const req = await api("POST", "/requests", payload);
      toast(`Request ${req.request_number} submitted`, "success");
      location.hash = `#/requests/${req.id}`;
    } catch (e) { /* toast shown */ }
  });

  renderLines();
}

/* ---------------------------------------------------------------------- */
/* Requests list                                                          */
/* ---------------------------------------------------------------------- */

async function viewRequestsList() {
  const main = renderShell("#/requests");
  const role = CURRENT_USER.role;
  main.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <h2 style="margin:0;">Sample Requests</h2>
        <div class="row" style="max-width:420px;">
          <select id="statusFilter">
            <option value="">All statuses</option>
            ${["submitted", "director_approved", "director_rejected", "sent_to_factory", "in_production",
              "partially_received", "fully_received", "partially_assigned", "completed", "cancelled"]
              .map((s) => `<option value="${s}">${s.replace(/_/g, " ")}</option>`).join("")}
          </select>
          ${role === "sales_manager" ? `<label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="mineOnly" checked style="width:auto;"> My requests only</label>` : ""}
        </div>
      </div>
      <div id="reqTableWrap" class="table-wrap mt"></div>
    </div>
  `;

  async function load() {
    const status = qs("#statusFilter").value;
    let path = "/requests";
    const params = [];
    if (status) params.push(`status=${status}`);
    const mineEl = qs("#mineOnly");
    if (mineEl && mineEl.checked) params.push("mine=true");
    if (params.length) path += "?" + params.join("&");
    const reqs = await api("GET", path);
    const wrap = qs("#reqTableWrap");
    if (reqs.length === 0) { wrap.innerHTML = `<div class="empty-state">No requests found.</div>`; return; }
    wrap.innerHTML = `<table><thead><tr>
      <th>#</th><th>Date</th><th>Distributor</th><th>Showroom</th><th>Sales Manager</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${reqs.map((r) => `<tr>
        <td>${esc(r.request_number)}</td>
        <td>${fmtDateShort(r.date_created)}</td>
        <td dir-auto>${esc(r.distributor_name)}</td>
        <td dir-auto>${esc(r.showroom_name)}</td>
        <td>${esc(r.sales_manager_name)}</td>
        <td>${badge(r.status)}</td>
        <td><a href="#/requests/${r.id}">Open &rarr;</a></td>
      </tr>`).join("")}
    </tbody></table>`;
  }

  qs("#statusFilter").addEventListener("change", load);
  const mineEl = qs("#mineOnly");
  if (mineEl) mineEl.addEventListener("change", load);
  load();
}

/* ---------------------------------------------------------------------- */
/* Request detail                                                         */
/* ---------------------------------------------------------------------- */

async function viewRequestDetail(id) {
  const main = renderShell("#/requests");
  main.innerHTML = `<div class="card"><p class="muted">Loading...</p></div>`;
  const r = await api("GET", `/requests/${id}`);
  const role = CURRENT_USER.role;

  const canReview = role === "commercial_director" && (r.status === "submitted" || r.status === "director_approved");
  const canSendToFactory = (role === "commercial_director" || role === "admin") && r.status === "director_approved";
  const canExport = (role === "factory" || role === "commercial_director" || role === "admin");
  const canShip = role === "factory";
  const canReceive = role === "warehouse";

  main.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <div>
          <h2 style="margin:0;">${esc(r.request_number)} ${badge(r.status)}</h2>
          <p class="small muted">Created ${fmtDate(r.date_created)} by ${esc(r.sales_manager_name)}</p>
        </div>
        <div>
          ${canExport ? `<a href="/api/requests/${r.id}/export.xlsx"><button class="secondary" type="button">Export Excel</button></a>` : ""}
          ${canSendToFactory ? `<button id="sendFactoryBtn" class="success">Send to Factory</button>` : ""}
        </div>
      </div>
      <div class="grid cols-3 mt">
        <div><label style="margin:0;">Distributor</label><div dir-auto>${esc(r.distributor_name)}</div></div>
        <div><label style="margin:0;">Showroom</label><div dir-auto>${esc(r.showroom_name)}</div></div>
        <div><label style="margin:0;">Purpose</label><div>${esc((r.purpose || "").replace(/_/g, " "))}</div></div>
      </div>
      ${r.distributor_order_ref ? `<div class="mt"><label style="margin:0;">Order reference</label><div>${esc(r.distributor_order_ref)}</div></div>` : ""}
      ${r.notes ? `<div class="mt"><label style="margin:0;">Notes</label><div>${esc(r.notes)}</div></div>` : ""}
    </div>

    <div class="card">
      <h2>Sample lines</h2>
      <div id="itemsWrap"></div>
    </div>

    <div class="card">
      <h2>Attachments</h2>
      <div id="attachWrap"></div>
      <form id="attachForm" class="row mt">
        <input type="file" id="attachFile" required>
        <select id="attachKind">
          <option value="distributor_order">Distributor order</option>
          <option value="scanned_form">Scanned paper form</option>
          <option value="other">Other</option>
        </select>
        <button type="submit">Upload</button>
      </form>
    </div>

    <div class="card">
      <h2>Approval history</h2>
      <ul class="timeline">
        ${r.approvals.map((a) => `<li><span class="date">${fmtDate(a.created_at)}</span> - <b>${esc(a.actor_name || "?")}</b> ${esc(a.action)} ${a.notes ? "- " + esc(a.notes) : ""}</li>`).join("") || '<p class="muted small">No actions yet.</p>'}
      </ul>
    </div>
  `;

  renderItems(r, { canReview, canShip, canReceive });

  const attachWrap = qs("#attachWrap");
  attachWrap.innerHTML = r.attachments.length
    ? `<ul>${r.attachments.map((a) => `<li>${esc(a.file_name)} <span class="muted small">(${esc(a.kind)}, ${fmtDateShort(a.created_at)})</span></li>`).join("")}</ul>`
    : `<p class="muted small">No attachments yet.</p>`;

  qs("#attachForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("file", qs("#attachFile").files[0]);
    fd.append("kind", qs("#attachKind").value);
    try {
      await api("POST", `/requests/${id}/attachments`, fd, true);
      toast("Attachment uploaded", "success");
      viewRequestDetail(id);
    } catch (err) { /* toast shown */ }
  });

  const sendBtn = qs("#sendFactoryBtn");
  if (sendBtn) sendBtn.addEventListener("click", async () => {
    try {
      await api("POST", `/requests/${id}/send-to-factory`);
      toast("Sent to factory", "success");
      viewRequestDetail(id);
    } catch (err) { /* toast shown */ }
  });
}

function renderItems(r, perms) {
  const wrap = qs("#itemsWrap");
  wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
    <th>Code</th><th>Color / Family</th><th>Requested</th><th>Approved</th><th>Type</th>
    <th>MOQ check</th><th>Status</th><th>Shipped</th><th>Received</th><th>Assigned</th><th></th>
  </tr></thead><tbody>
    ${r.items.map((it) => `<tr>
      <td>${esc(it.product_code)}</td>
      <td>${esc(it.product_color)} / ${esc(it.product_family)}</td>
      <td>${it.qty_requested}</td>
      <td>${it.qty_approved}</td>
      <td>${it.is_dummy ? '<span class="pill-dummy">Dummy</span>' : '<span class="pill-sellable">Sellable</span>'}</td>
      <td>${it.distributor_order_qty !== null ? `order:${it.distributor_order_qty} ${it.min_order_met === true ? "✓" : it.min_order_met === false ? "✗" : ""}` : "-"}</td>
      <td>${badge(it.status)}</td>
      <td>${it.qty_shipped_from_factory}</td>
      <td>${it.qty_received_warehouse}</td>
      <td>${it.qty_assigned_showroom}</td>
      <td>${it.director_notes ? `<span class="small muted" title="${esc(it.director_notes)}">note</span>` : ""}</td>
    </tr>`).join("")}
  </tbody></table></div>`;

  if (perms.canReview) {
    const pending = r.items.filter((it) => it.status === "pending_review");
    if (pending.length) {
      const box = el(`<div class="card" style="margin-top:14px;"><h3>Review pending lines</h3><div id="reviewLines"></div>
        <div class="right mt"><button id="submitReviewBtn">Submit review</button></div></div>`);
      wrap.after(box);
      const reviewBox = qs("#reviewLines", box);
      reviewBox.innerHTML = pending.map((it) => `
        <div class="line-item-row" data-item="${it.id}">
          <b>${esc(it.product_code)}</b> - ${esc(it.product_color)} / ${esc(it.product_family)}
          <span class="small muted">requested ${it.qty_requested}, order qty ${it.distributor_order_qty ?? "n/a"}</span>
          <div class="grid cols-4 mt">
            <div><label>Decision</label>
              <select class="dec-decision"><option value="approve">Approve</option><option value="reject">Reject</option></select>
            </div>
            <div><label>Qty approved</label><input class="dec-qty" type="number" min="0" value="${it.qty_requested}"></div>
            <div><label>SKU matches distributor stock?</label>
              <select class="dec-sku"><option value="true">Yes</option><option value="false">No</option></select>
            </div>
            <div><label>Min order qty met (5-10)?</label>
              <select class="dec-moq"><option value="true" ${it.min_order_met ? "selected" : ""}>Yes</option><option value="false" ${it.min_order_met === false ? "selected" : ""}>No</option></select>
            </div>
          </div>
          <label>Notes</label><input class="dec-notes" placeholder="optional">
        </div>
      `).join("");

      qs("#submitReviewBtn", box).addEventListener("click", async () => {
        const rows = qsa(".line-item-row", reviewBox);
        const items = rows.map((row) => ({
          item_id: Number(row.dataset.item),
          decision: qs(".dec-decision", row).value,
          qty_approved: Number(qs(".dec-qty", row).value),
          sku_matches_stock: qs(".dec-sku", row).value === "true",
          min_order_met: qs(".dec-moq", row).value === "true",
          director_notes: qs(".dec-notes", row).value || null,
        }));
        try {
          await api("POST", `/requests/${r.id}/review`, { items });
          toast("Review submitted", "success");
          viewRequestDetail(r.id);
        } catch (e) { /* toast shown */ }
      });
    }
  }

  if (perms.canShip) {
    const shippable = r.items.filter((it) => ["sent_to_factory", "in_production", "partially_shipped"].includes(it.status));
    if (shippable.length) {
      const box = el(`<div class="card" style="margin-top:14px;"><h3>Log factory shipment</h3><div id="shipLines"></div></div>`);
      wrap.after(box);
      const shipBox = qs("#shipLines", box);
      shipBox.innerHTML = shippable.map((it) => {
        const remaining = it.qty_approved - it.qty_shipped_from_factory;
        return `<div class="line-item-row">
          <b>${esc(it.product_code)}</b> - approved ${it.qty_approved}, shipped so far ${it.qty_shipped_from_factory}, remaining ${remaining}
          <div class="row mt">
            <input type="number" min="1" max="${remaining}" value="${remaining}" class="ship-qty" placeholder="qty sent">
            <input class="ship-batch" placeholder="batch ref (optional)">
            <button type="button" class="ship-btn" data-item="${it.id}">Log shipment</button>
          </div>
        </div>`;
      }).join("");
      qsa(".ship-btn", shipBox).forEach((btn) => btn.addEventListener("click", async () => {
        const row = btn.closest(".line-item-row");
        const qty_sent = Number(qs(".ship-qty", row).value);
        const batch_ref = qs(".ship-batch", row).value || null;
        try {
          await api("POST", "/factory/shipments", { item_id: Number(btn.dataset.item), qty_sent, batch_ref });
          toast("Shipment logged", "success");
          viewRequestDetail(r.id);
        } catch (e) { /* toast shown */ }
      }));
    }
  }

  if (perms.canReceive) {
    const receivable = r.items.filter((it) => it.qty_shipped_from_factory > it.qty_received_warehouse);
    if (receivable.length) {
      const box = el(`<div class="card" style="margin-top:14px;"><h3>Log warehouse receipt</h3><div id="recLines"></div></div>`);
      wrap.after(box);
      const recBox = qs("#recLines", box);
      recBox.innerHTML = receivable.map((it) => {
        const remaining = it.qty_shipped_from_factory - it.qty_received_warehouse;
        return `<div class="line-item-row">
          <b>${esc(it.product_code)}</b> - shipped ${it.qty_shipped_from_factory}, received so far ${it.qty_received_warehouse}, in transit ${remaining}
          <div class="row mt">
            <input type="number" min="1" max="${remaining}" value="${remaining}" class="rec-qty">
            <button type="button" class="rec-btn" data-item="${it.id}">Log receipt</button>
          </div>
        </div>`;
      }).join("");
      qsa(".rec-btn", recBox).forEach((btn) => btn.addEventListener("click", async () => {
        const row = btn.closest(".line-item-row");
        const qty_received = Number(qs(".rec-qty", row).value);
        try {
          await api("POST", "/warehouse/receipts", { item_id: Number(btn.dataset.item), qty_received });
          toast("Receipt logged", "success");
          viewRequestDetail(r.id);
        } catch (e) { /* toast shown */ }
      }));
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Factory queue                                                          */
/* ---------------------------------------------------------------------- */

async function viewFactoryQueue() {
  const main = renderShell("#/factory");
  main.innerHTML = `<div class="card"><h2>Production Queue</h2><div id="wrap"><p class="muted">Loading...</p></div></div>`;
  const items = await api("GET", "/factory/queue");
  const wrap = qs("#wrap");
  if (items.length === 0) { wrap.innerHTML = `<div class="empty-state">Nothing waiting on the factory right now.</div>`; return; }
  wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
    <th>Request</th><th>Distributor / Showroom</th><th>Code</th><th>Color</th><th>Approved</th><th>Shipped</th><th>Remaining</th><th>Status</th><th></th>
  </tr></thead><tbody>
    ${items.map((it) => `<tr>
      <td><a href="#/requests/${it.request_id}">${esc(it.request_number)}</a></td>
      <td dir-auto>${esc(it.distributor_name)} / ${esc(it.showroom_name)}</td>
      <td>${esc(it.product_code)}</td>
      <td>${esc(it.product_color)}</td>
      <td>${it.qty_approved}</td>
      <td>${it.qty_shipped_from_factory}</td>
      <td>${it.qty_approved - it.qty_shipped_from_factory}</td>
      <td>${badge(it.status)}</td>
      <td><a href="#/requests/${it.request_id}">Ship &rarr;</a></td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

/* ---------------------------------------------------------------------- */
/* Warehouse: incoming / stock                                            */
/* ---------------------------------------------------------------------- */

async function viewWarehouseIncoming() {
  const main = renderShell("#/warehouse/incoming");
  main.innerHTML = `<div class="card"><h2>Incoming from Factory</h2>
    <p class="small muted">Approved samples not yet fully in the downtown warehouse. Watch "days since last update" for items stuck for months.</p>
    <div id="wrap"><p class="muted">Loading...</p></div></div>`;
  const items = await api("GET", "/warehouse/incoming");
  const wrap = qs("#wrap");
  if (items.length === 0) { wrap.innerHTML = `<div class="empty-state">Nothing outstanding from the factory.</div>`; return; }
  wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
    <th>Request</th><th>Distributor / Showroom</th><th>Code</th><th>Approved</th><th>Shipped</th><th>Received</th>
    <th>Outstanding (never shipped)</th><th>Pending receipt</th><th>Status</th>
  </tr></thead><tbody>
    ${items.map((it) => `<tr>
      <td><a href="#/requests/${it.request_id}">${esc(it.request_number)}</a></td>
      <td dir-auto>${esc(it.distributor_name)} / ${esc(it.showroom_name)}</td>
      <td>${esc(it.product_code)}</td>
      <td>${it.qty_approved}</td>
      <td>${it.qty_shipped_from_factory}</td>
      <td>${it.qty_received_warehouse}</td>
      <td>${it.outstanding_from_factory > 0 ? `<b style="color:var(--red)">${it.outstanding_from_factory}</b>` : 0}</td>
      <td>${it.pending_receive}</td>
      <td>${badge(it.status)}</td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

async function viewWarehouseStock() {
  const main = renderShell("#/warehouse/stock");
  main.innerHTML = `<div class="card"><h2>Warehouse Stock Control</h2>
    <div class="tag-search"><input id="q" placeholder="Search by code, family or color..."></div>
    <div id="wrap"><p class="muted">Loading...</p></div></div>`;
  async function load() {
    const q = qs("#q").value;
    const items = await api("GET", `/warehouse/stock${q ? "?q=" + encodeURIComponent(q) : ""}`);
    const wrap = qs("#wrap");
    if (items.length === 0) { wrap.innerHTML = `<div class="empty-state">Nothing in stock matches.</div>`; return; }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Code</th><th>Color / Family</th><th>Held for (Distributor / Showroom)</th><th>Request</th><th>Qty in warehouse</th><th>Type</th>
    </tr></thead><tbody>
      ${items.map((it) => `<tr>
        <td>${esc(it.product_code)}</td>
        <td>${esc(it.product_color)} / ${esc(it.product_family)}</td>
        <td dir-auto>${esc(it.distributor_name)} / ${esc(it.showroom_name)}</td>
        <td><a href="#/requests/${it.request_id}">${esc(it.request_number)}</a></td>
        <td><b>${it.qty_in_warehouse}</b></td>
        <td>${it.is_dummy ? '<span class="pill-dummy">Dummy</span>' : '<span class="pill-sellable">Sellable</span>'}</td>
      </tr>`).join("")}
    </tbody></table></div>`;
  }
  qs("#q").addEventListener("input", () => { clearTimeout(window.__stockTimer); window.__stockTimer = setTimeout(load, 250); });
  load();
}

/* ---------------------------------------------------------------------- */
/* Dismissal approvals + assembly assignment                              */
/* ---------------------------------------------------------------------- */

async function viewDismissals() {
  const main = renderShell("#/dismissals");
  const role = CURRENT_USER.role;
  const canRequest = role === "warehouse" || role === "assembly";
  const canDecide = role === "admin";
  const canAssign = role === "assembly" || role === "warehouse";

  main.innerHTML = `
    ${canRequest ? `<div class="card">
      <h2>Request a dismissal (move samples out of the warehouse)</h2>
      <p class="small muted">Nothing leaves the downtown warehouse - new placement or reassignment between traders -
        without the admin's approval.</p>
      <div class="grid cols-2">
        <div>
          <label>Warehouse item</label>
          <select id="stockItemSel"><option value="">Loading stock...</option></select>
        </div>
        <div>
          <label>Destination showroom</label>
          <select id="destShowroomSel"><option value="">Select distributor first</option></select>
        </div>
      </div>
      <div class="grid cols-2">
        <div><label>Distributor (for showroom list)</label>
          <select id="destDistSel"><option value="">Select...</option></select>
        </div>
        <div><label>Qty</label><input id="dismissQty" type="number" min="1" value="1"></div>
      </div>
      <label>Reason</label><input id="dismissReason" placeholder="e.g. initial stand fit-out, top-up, replacement">
      <div class="right mt"><button id="requestDismissBtn">Request dismissal</button></div>
    </div>` : ""}

    <div class="card">
      <h2>Dismissal requests</h2>
      <div class="row" style="max-width:300px;"><select id="statusFilter">
        <option value="pending">Pending</option><option value="approved">Approved</option>
        <option value="rejected">Rejected</option><option value="">All</option>
      </select></div>
      <div id="wrap" class="mt"><p class="muted">Loading...</p></div>
    </div>
  `;

  if (canRequest) {
    await ensureCaches();
    const stock = await api("GET", "/warehouse/stock");
    qs("#stockItemSel").innerHTML = stock.length
      ? `<option value="">Select...</option>` + stock.map((it) => `<option value="${it.id}">${esc(it.product_code)} / ${esc(it.product_color)} - in stock ${it.qty_in_warehouse} (${esc(it.request_number)})</option>`).join("")
      : `<option value="">No stock available</option>`;
    qs("#destDistSel").innerHTML = `<option value="">Select...</option>` + DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
    qs("#destDistSel").addEventListener("change", async (e) => {
      const rooms = await showroomsFor(e.target.value);
      qs("#destShowroomSel").innerHTML = rooms.map((r) => `<option value="${r.id}">${esc(r.name)} - ${esc(r.address || "")}</option>`).join("");
    });
    qs("#requestDismissBtn").addEventListener("click", async () => {
      const item_id = Number(qs("#stockItemSel").value);
      const showroom_id = Number(qs("#destShowroomSel").value);
      const qty = Number(qs("#dismissQty").value);
      if (!item_id || !showroom_id || !qty) { toast("Fill in item, showroom and quantity", "error"); return; }
      try {
        await api("POST", "/warehouse/dismissal-requests", { item_id, showroom_id, qty, reason: qs("#dismissReason").value || null });
        toast("Dismissal requested - awaiting admin approval", "success");
        loadList();
      } catch (e) { /* toast shown */ }
    });
  }

  async function loadList() {
    const status = qs("#statusFilter").value;
    const list = await api("GET", `/warehouse/dismissal-requests${status ? "?status=" + status : "?status="}`);
    const wrap = qs("#wrap");
    if (list.length === 0) { wrap.innerHTML = `<div class="empty-state">No dismissal requests here.</div>`; return; }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Requested</th><th>Product</th><th>Destination</th><th>Qty</th><th>Reason</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${list.map((d) => `<tr>
        <td>${fmtDate(d.date_requested)}</td>
        <td>${esc(d.product_code)}</td>
        <td dir-auto>${esc(d.distributor_name)} / ${esc(d.showroom_name)}</td>
        <td>${d.qty}</td>
        <td>${esc(d.reason || "-")}${d.reassign_from_assignment_id ? ' <span class="badge">reassignment</span>' : ""}</td>
        <td>${badge(d.status)}</td>
        <td>
          ${canDecide && d.status === "pending" ? `<button type="button" class="success decide-btn" data-id="${d.id}" data-decision="approve">Approve</button>
            <button type="button" class="danger decide-btn" data-id="${d.id}" data-decision="reject">Reject</button>` : ""}
          ${canAssign && d.status === "approved" ? `<button type="button" class="assign-btn" data-id="${d.id}" data-qty="${d.qty}">Place at showroom</button>` : ""}
        </td>
      </tr>`).join("")}
    </tbody></table></div>`;

    qsa(".decide-btn", wrap).forEach((btn) => btn.addEventListener("click", async () => {
      try {
        await api("POST", `/warehouse/dismissal-requests/${btn.dataset.id}/decide`, { decision: btn.dataset.decision });
        toast(`Dismissal ${btn.dataset.decision}d`, "success");
        loadList();
      } catch (e) { /* toast shown */ }
    }));

    qsa(".assign-btn", wrap).forEach((btn) => btn.addEventListener("click", () => doAssign(Number(btn.dataset.id))));
  }

  async function doAssign(dismissalId, confirmDuplicate = false) {
    try {
      await api("POST", `/warehouse/assignments?dismissal_id=${dismissalId}${confirmDuplicate ? "&confirm_duplicate=true" : ""}`);
      toast("Sample placed at showroom", "success");
      loadList();
    } catch (e) {
      if (e.message && e.message.includes("already displayed")) {
        if (confirm(e.message + "\n\nPlace it anyway?")) {
          doAssign(dismissalId, true);
        }
      }
    }
  }

  qs("#statusFilter").addEventListener("change", loadList);
  loadList();
}

/* ---------------------------------------------------------------------- */
/* Returns                                                                */
/* ---------------------------------------------------------------------- */

async function viewReturns() {
  const main = renderShell("#/returns");
  await ensureCaches();
  main.innerHTML = `
    <div class="card">
      <h2>Record a return from a showroom</h2>
      <div class="grid cols-2">
        <div><label>Distributor</label><select id="distSel"><option value="">Select...</option>
          ${DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div>
        <div><label>Showroom</label><select id="showroomSel"><option value="">Select distributor first</option></select></div>
      </div>
      <div id="displayedWrap" class="mt"></div>
    </div>
  `;
  qs("#distSel").addEventListener("change", async (e) => {
    const rooms = await showroomsFor(e.target.value);
    qs("#showroomSel").innerHTML = `<option value="">Select...</option>` + rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
  });
  qs("#showroomSel").addEventListener("change", async (e) => {
    const showroomId = e.target.value;
    const wrap = qs("#displayedWrap");
    if (!showroomId) { wrap.innerHTML = ""; return; }
    const current = await api("GET", `/warehouse/showroom/${showroomId}/current`);
    if (current.length === 0) { wrap.innerHTML = `<div class="empty-state">Nothing currently displayed at this showroom.</div>`; return; }
    wrap.innerHTML = current.map((a) => `
      <div class="line-item-row">
        <b>${esc(a.product_code)}</b> / ${esc(a.product_color)} - qty ${a.qty}, placed ${fmtDateShort(a.date_assigned)}
        <div class="grid cols-4 mt">
          <div><label>Qty returned</label><input class="ret-qty" type="number" min="1" max="${a.qty}" value="1"></div>
          <div><label>Reason</label><select class="ret-reason">
            ${RETURN_REASONS.map((rr) => `<option value="${rr}">${rr.replace(/_/g, " ")}</option>`).join("")}
          </select></div>
          <div><label>Restocked?</label><select class="ret-restock"><option value="true">Yes - back to warehouse stock</option><option value="false">No - scrapped / sent for repair</option></select></div>
          <div><label>Notes</label><input class="ret-notes" placeholder="optional"></div>
        </div>
        <div class="right mt"><button type="button" class="ret-btn" data-id="${a.id}">Record return</button></div>
      </div>
    `).join("");
    qsa(".ret-btn", wrap).forEach((btn) => btn.addEventListener("click", async () => {
      const row = btn.closest(".line-item-row");
      const payload = {
        assignment_id: Number(btn.dataset.id),
        qty_returned: Number(qs(".ret-qty", row).value),
        reason: qs(".ret-reason", row).value,
        restocked: qs(".ret-restock", row).value === "true",
        notes: qs(".ret-notes", row).value || null,
      };
      try {
        await api("POST", "/warehouse/returns", payload);
        toast("Return recorded", "success");
        qs("#showroomSel").dispatchEvent(new Event("change"));
      } catch (e) { /* toast shown */ }
    }));
  });
}

/* ---------------------------------------------------------------------- */
/* History archive                                                        */
/* ---------------------------------------------------------------------- */

async function viewHistory() {
  const main = renderShell("#/history");
  await ensureCaches();
  main.innerHTML = `
    <div class="card">
      <h2>Historical Archive</h2>
      <div class="grid cols-2">
        <div><label>Distributor / Trader</label><select id="distSel"><option value="">Select...</option>
          ${DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div>
        <div><label>Showroom (optional - narrows to one showroom)</label><select id="showroomSel"><option value="">All showrooms</option></select></div>
      </div>
      <div id="resultWrap" class="mt"></div>
    </div>
  `;
  qs("#distSel").addEventListener("change", async (e) => {
    const distId = e.target.value;
    if (!distId) { qs("#showroomSel").innerHTML = `<option value="">All showrooms</option>`; return; }
    const rooms = await showroomsFor(distId);
    qs("#showroomSel").innerHTML = `<option value="">All showrooms</option>` + rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
    loadDistHistory(distId);
  });
  qs("#showroomSel").addEventListener("change", async (e) => {
    if (e.target.value) loadShowroomHistory(e.target.value);
    else loadDistHistory(qs("#distSel").value);
  });

  async function loadDistHistory(distId) {
    const data = await api("GET", `/warehouse/history/distributor/${distId}`);
    renderHistory(data.distributor.name, data.timeline, data.showrooms);
  }
  async function loadShowroomHistory(showroomId) {
    const data = await api("GET", `/warehouse/history/showroom/${showroomId}`);
    const timeline = data.all_assignments.map((a) => ({
      date: a.date_assigned, type: "showroom_assignment",
      detail: `${a.product_code} / ${a.product_color}: qty ${a.qty} [${a.status}]`,
    })).concat(data.returns.map((r) => ({ date: r.date_returned, type: "return", detail: `qty ${r.qty_returned} returned - ${r.reason}` })));
    timeline.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    renderHistory(data.showroom.name, timeline, null, data.currently_displayed);
  }

  function renderHistory(title, timeline, showrooms, currentlyDisplayed) {
    const wrap = qs("#resultWrap");
    let html = `<h3 dir-auto>${esc(title)}</h3>`;
    if (showrooms) {
      html += `<p class="small muted">${showrooms.length} showroom(s): ${showrooms.map((s) => esc(s.name)).join(", ")}</p>`;
    }
    if (currentlyDisplayed) {
      html += `<h4>Currently displayed here</h4>`;
      html += currentlyDisplayed.length
        ? `<ul>${currentlyDisplayed.map((a) => `<li>${esc(a.product_code)} / ${esc(a.product_color)} - qty ${a.qty} (since ${fmtDateShort(a.date_assigned)})</li>`).join("")}</ul>`
        : `<p class="muted small">Nothing currently displayed.</p>`;
    }
    html += `<h4>Timeline</h4>`;
    html += timeline.length
      ? `<ul class="timeline">${timeline.map((t) => `<li><span class="date">${fmtDate(t.date)}</span> <span class="type">${esc(t.type.replace(/_/g, " "))}</span><br>${esc(t.detail)}</li>`).join("")}</ul>`
      : `<div class="empty-state">No history yet.</div>`;
    wrap.innerHTML = html;
  }
}

/* ---------------------------------------------------------------------- */
/* Products (admin / commercial director)                                */
/* ---------------------------------------------------------------------- */

async function viewProducts() {
  const main = renderShell("#/products");
  main.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <h2 style="margin:0;">Product Master</h2>
        <form id="importForm" class="row" style="max-width:360px;">
          <input type="file" id="importFile" accept=".xlsx">
          <button type="submit" class="secondary">Import / refresh from Excel</button>
        </form>
      </div>
      <div class="tag-search mt"><input id="q" placeholder="Search by code, family, application, color..."></div>
      <button id="addProductBtn" class="secondary">+ Add product</button>
      <div id="wrap" class="mt"><p class="muted">Loading...</p></div>
    </div>
  `;
  qs("#importForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = qs("#importFile").files[0];
    if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try {
      const res = await api("POST", "/products/import", fd, true);
      toast(`Imported: ${res.created} new, ${res.updated} updated`, "success");
      PRODUCTS = [];
      load();
    } catch (err) { /* toast shown */ }
  });
  qs("#addProductBtn").addEventListener("click", () => openProductModal());

  async function load() {
    const q = qs("#q").value;
    const items = await api("GET", `/products?include_inactive=true${q ? "&q=" + encodeURIComponent(q) : ""}`);
    const wrap = qs("#wrap");
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Code</th><th>Color</th><th>Family</th><th>Kind</th><th>Application</th><th>Price</th><th>Active</th><th></th>
    </tr></thead><tbody>
      ${items.map((p) => `<tr style="${p.active ? "" : "opacity:0.5;"}">
        <td>${esc(p.code)}</td><td>${esc(p.color)}</td><td>${esc(p.family)}</td><td>${esc(p.kind)}</td>
        <td>${esc(p.application)}</td><td>${p.price ?? "-"}</td><td>${p.active ? "Yes" : "No"}</td>
        <td><button type="button" class="ghost edit-btn" data-id="${p.id}">Edit</button>
          ${p.active ? `<button type="button" class="ghost delist-btn" data-id="${p.id}">Delist</button>` : ""}</td>
      </tr>`).join("")}
    </tbody></table></div>`;
    qsa(".edit-btn", wrap).forEach((b) => b.addEventListener("click", () => openProductModal(items.find((p) => p.id === Number(b.dataset.id)))));
    qsa(".delist-btn", wrap).forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delist this product? It stays visible in history but won't be selectable for new requests.")) return;
      await api("DELETE", `/products/${b.dataset.id}`);
      toast("Delisted", "success");
      load();
    }));
  }
  qs("#q").addEventListener("input", () => { clearTimeout(window.__prodTimer); window.__prodTimer = setTimeout(load, 250); });

  function openProductModal(p) {
    const isNew = !p;
    const backdrop = el(`<div class="modal-backdrop"><div class="modal">
      <h3>${isNew ? "Add product" : "Edit product"}</h3>
      <label>Code (SKU)</label><input id="m_code" value="${esc(p?.code || "")}" ${isNew ? "" : "readonly"}>
      <div class="grid cols-2">
        <div><label>Color</label><input id="m_color" value="${esc(p?.color || "")}"></div>
        <div><label>Family</label><input id="m_family" value="${esc(p?.family || "")}"></div>
      </div>
      <div class="grid cols-2">
        <div><label>Kind</label><input id="m_kind" value="${esc(p?.kind || "")}"></div>
        <div><label>Application</label><input id="m_application" value="${esc(p?.application || "")}"></div>
      </div>
      <label>Description (EN)</label><textarea id="m_desc_en">${esc(p?.description_en || "")}</textarea>
      <label>Description (AR)</label><textarea id="m_desc_ar" dir-auto>${esc(p?.description_ar || "")}</textarea>
      <div class="grid cols-2">
        <div><label>Price</label><input id="m_price" type="number" step="0.01" value="${p?.price ?? ""}"></div>
        <div><label style="display:flex;align-items:center;gap:6px;margin-top:22px;"><input type="checkbox" id="m_dummy" ${p?.default_dummy !== false ? "checked" : ""} style="width:auto;"> Dummy by default</label></div>
      </div>
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">Cancel</button><button type="button" id="saveBtn">Save</button></div>
    </div></div>`);
    document.body.appendChild(backdrop);
    qs("#cancelBtn", backdrop).addEventListener("click", () => backdrop.remove());
    qs("#saveBtn", backdrop).addEventListener("click", async () => {
      const payload = {
        color: qs("#m_color", backdrop).value, family: qs("#m_family", backdrop).value,
        kind: qs("#m_kind", backdrop).value, application: qs("#m_application", backdrop).value,
        description_en: qs("#m_desc_en", backdrop).value, description_ar: qs("#m_desc_ar", backdrop).value,
        price: qs("#m_price", backdrop).value ? Number(qs("#m_price", backdrop).value) : null,
        default_dummy: qs("#m_dummy", backdrop).checked,
      };
      try {
        if (isNew) {
          payload.code = qs("#m_code", backdrop).value.trim();
          if (!payload.code) { toast("Code is required", "error"); return; }
          await api("POST", "/products", payload);
        } else {
          await api("PATCH", `/products/${p.id}`, payload);
        }
        toast("Saved", "success");
        backdrop.remove();
        PRODUCTS = [];
        load();
      } catch (e) { /* toast shown */ }
    });
  }

  load();
}

/* ---------------------------------------------------------------------- */
/* Distributors / Showrooms                                               */
/* ---------------------------------------------------------------------- */

async function viewDistributors() {
  const main = renderShell("#/distributors");
  main.innerHTML = `
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Distributors &amp; Traders</h2>
        <button id="addDistBtn" class="secondary">+ Add distributor / trader</button></div>
      <div id="wrap" class="mt"><p class="muted">Loading...</p></div>
    </div>
  `;
  qs("#addDistBtn").addEventListener("click", () => openDistModal());

  async function load() {
    const dists = await api("GET", "/distributors");
    const wrap = qs("#wrap");
    wrap.innerHTML = dists.map((d) => `
      <div class="line-item-row">
        <div class="flex-between">
          <div><b dir-auto>${esc(d.name)}</b> <span class="badge">${esc(d.type)}</span> <span class="small muted" dir-auto>${esc(d.governorate || "")}</span></div>
          <div>
            <button type="button" class="ghost edit-dist-btn" data-id="${d.id}">Edit</button>
            <button type="button" class="ghost add-room-btn" data-id="${d.id}">+ Showroom</button>
          </div>
        </div>
        <div class="rooms-wrap mt" data-dist="${d.id}"><span class="small muted">Loading showrooms...</span></div>
      </div>
    `).join("");

    for (const d of dists) {
      const rooms = await showroomsFor2(d.id);
      const box = qs(`.rooms-wrap[data-dist="${d.id}"]`, wrap);
      box.innerHTML = rooms.length
        ? `<table><thead><tr><th>Showroom</th><th>Address</th><th>Governorate</th><th>Phone</th><th>Min order</th><th></th></tr></thead><tbody>
            ${rooms.map((r) => `<tr>
              <td dir-auto>${esc(r.name)}</td><td dir-auto>${esc(r.address || "")}</td><td dir-auto>${esc(r.governorate || "")}</td>
              <td>${esc(r.phone || "")}</td><td>${r.min_order_qty}</td>
              <td><button type="button" class="ghost edit-room-btn" data-id="${r.id}" data-dist="${d.id}">Edit</button></td>
            </tr>`).join("")}
          </tbody></table>`
        : `<span class="small muted">No showrooms yet.</span>`;
      qsa(".edit-room-btn", box).forEach((b) => b.addEventListener("click", () => openRoomModal(d.id, rooms.find((r) => r.id === Number(b.dataset.id)))));
    }

    qsa(".edit-dist-btn", wrap).forEach((b) => b.addEventListener("click", () => openDistModal(dists.find((d) => d.id === Number(b.dataset.id)))));
    qsa(".add-room-btn", wrap).forEach((b) => b.addEventListener("click", () => openRoomModal(Number(b.dataset.id))));
  }

  async function showroomsFor2(distId) {
    // fresh fetch (bypass stale cache) for this admin screen
    return api("GET", `/showrooms?distributor_id=${distId}`);
  }

  function openDistModal(d) {
    const isNew = !d;
    const backdrop = el(`<div class="modal-backdrop"><div class="modal">
      <h3>${isNew ? "Add distributor / trader" : "Edit"}</h3>
      <label>Name</label><input id="m_name" value="${esc(d?.name || "")}" dir-auto>
      <div class="grid cols-2">
        <div><label>Type</label><select id="m_type">
          <option value="distributor" ${d?.type === "distributor" ? "selected" : ""}>Distributor</option>
          <option value="trader" ${d?.type === "trader" ? "selected" : ""}>Small trader</option>
        </select></div>
        <div><label>Governorate</label><input id="m_gov" value="${esc(d?.governorate || "")}" dir-auto></div>
      </div>
      <label>Phone</label><input id="m_phone" value="${esc(d?.phone || "")}">
      <label>Notes</label><textarea id="m_notes">${esc(d?.notes || "")}</textarea>
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">Cancel</button><button type="button" id="saveBtn">Save</button></div>
    </div></div>`);
    document.body.appendChild(backdrop);
    qs("#cancelBtn", backdrop).addEventListener("click", () => backdrop.remove());
    qs("#saveBtn", backdrop).addEventListener("click", async () => {
      const payload = {
        name: qs("#m_name", backdrop).value.trim(), type: qs("#m_type", backdrop).value,
        governorate: qs("#m_gov", backdrop).value, phone: qs("#m_phone", backdrop).value,
        notes: qs("#m_notes", backdrop).value,
      };
      if (!payload.name) { toast("Name required", "error"); return; }
      try {
        if (isNew) await api("POST", "/distributors", payload);
        else await api("PATCH", `/distributors/${d.id}`, payload);
        toast("Saved", "success");
        backdrop.remove();
        DISTRIBUTORS = [];
        SHOWROOMS_BY_DIST = {};
        load();
      } catch (e) { /* toast shown */ }
    });
  }

  function openRoomModal(distId, r) {
    const isNew = !r;
    const backdrop = el(`<div class="modal-backdrop"><div class="modal">
      <h3>${isNew ? "Add showroom / booth" : "Edit showroom"}</h3>
      <label>Name</label><input id="m_name" value="${esc(r?.name || "")}" dir-auto>
      <label>Address</label><input id="m_address" value="${esc(r?.address || "")}" dir-auto>
      <div class="grid cols-2">
        <div><label>Governorate</label><input id="m_gov" value="${esc(r?.governorate || "")}" dir-auto></div>
        <div><label>Area</label><input id="m_area" value="${esc(r?.area || "")}" dir-auto></div>
      </div>
      <div class="grid cols-2">
        <div><label>Phone</label><input id="m_phone" value="${esc(r?.phone || "")}"></div>
        <div><label>Min order qty (5-10)</label><input id="m_moq" type="number" min="1" value="${r?.min_order_qty ?? 5}"></div>
      </div>
      <label>Contact person</label><input id="m_contact" value="${esc(r?.contact_person || "")}" dir-auto>
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">Cancel</button><button type="button" id="saveBtn">Save</button></div>
    </div></div>`);
    document.body.appendChild(backdrop);
    qs("#cancelBtn", backdrop).addEventListener("click", () => backdrop.remove());
    qs("#saveBtn", backdrop).addEventListener("click", async () => {
      const payload = {
        distributor_id: distId, name: qs("#m_name", backdrop).value.trim(),
        address: qs("#m_address", backdrop).value, governorate: qs("#m_gov", backdrop).value,
        area: qs("#m_area", backdrop).value, phone: qs("#m_phone", backdrop).value,
        contact_person: qs("#m_contact", backdrop).value, min_order_qty: Number(qs("#m_moq", backdrop).value) || 5,
      };
      if (!payload.name) { toast("Name required", "error"); return; }
      try {
        if (isNew) await api("POST", "/showrooms", payload);
        else await api("PATCH", `/showrooms/${r.id}`, payload);
        toast("Saved", "success");
        backdrop.remove();
        SHOWROOMS_BY_DIST = {};
        load();
      } catch (e) { /* toast shown */ }
    });
  }

  load();
}

/* ---------------------------------------------------------------------- */
/* Users (admin)                                                          */
/* ---------------------------------------------------------------------- */

async function viewUsers() {
  const main = renderShell("#/users");
  main.innerHTML = `
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Users</h2><button id="addUserBtn" class="secondary">+ Add user</button></div>
      <div id="wrap" class="mt"><p class="muted">Loading...</p></div>
    </div>
  `;
  qs("#addUserBtn").addEventListener("click", () => openUserModal());

  async function load() {
    const users = await api("GET", "/users");
    const wrap = qs("#wrap");
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Name</th><th>Email</th><th>Role</th><th>Area</th><th>Active</th><th></th>
    </tr></thead><tbody>
      ${users.map((u) => `<tr style="${u.active ? "" : "opacity:0.5;"}">
        <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(ROLE_LABEL[u.role] || u.role)}</td>
        <td>${esc(u.area || "-")}</td><td>${u.active ? "Yes" : "No"}</td>
        <td><button type="button" class="ghost edit-user-btn" data-id="${u.id}">Edit</button></td>
      </tr>`).join("")}
    </tbody></table></div>`;
    qsa(".edit-user-btn", wrap).forEach((b) => b.addEventListener("click", () => openUserModal(users.find((u) => u.id === Number(b.dataset.id)))));
  }

  function openUserModal(u) {
    const isNew = !u;
    const roles = ["admin", "sales_manager", "commercial_director", "factory", "warehouse", "assembly"];
    const backdrop = el(`<div class="modal-backdrop"><div class="modal">
      <h3>${isNew ? "Add user" : "Edit user"}</h3>
      <label>Name</label><input id="m_name" value="${esc(u?.name || "")}">
      <label>Email</label><input id="m_email" type="email" value="${esc(u?.email || "")}" ${isNew ? "" : "readonly"}>
      <label>Role</label><select id="m_role">${roles.map((r) => `<option value="${r}" ${u?.role === r ? "selected" : ""}>${ROLE_LABEL[r]}</option>`).join("")}</select>
      <label>Area (for sales managers)</label><input id="m_area" value="${esc(u?.area || "")}">
      <label>Phone</label><input id="m_phone" value="${esc(u?.phone || "")}">
      <label>${isNew ? "Password" : "New password (leave blank to keep)"}</label><input id="m_pw" type="password">
      ${!isNew ? `<label style="display:flex;align-items:center;gap:6px;margin-top:10px;"><input type="checkbox" id="m_active" ${u.active ? "checked" : ""} style="width:auto;"> Active</label>` : ""}
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">Cancel</button><button type="button" id="saveBtn">Save</button></div>
    </div></div>`);
    document.body.appendChild(backdrop);
    qs("#cancelBtn", backdrop).addEventListener("click", () => backdrop.remove());
    qs("#saveBtn", backdrop).addEventListener("click", async () => {
      try {
        if (isNew) {
          const payload = {
            name: qs("#m_name", backdrop).value.trim(), email: qs("#m_email", backdrop).value.trim(),
            password: qs("#m_pw", backdrop).value, role: qs("#m_role", backdrop).value,
            area: qs("#m_area", backdrop).value || null, phone: qs("#m_phone", backdrop).value || null,
          };
          if (!payload.name || !payload.email || !payload.password) { toast("Name, email and password required", "error"); return; }
          await api("POST", "/users", payload);
        } else {
          const payload = {
            name: qs("#m_name", backdrop).value.trim(), role: qs("#m_role", backdrop).value,
            area: qs("#m_area", backdrop).value || null, phone: qs("#m_phone", backdrop).value || null,
            active: qs("#m_active", backdrop).checked,
          };
          const pw = qs("#m_pw", backdrop).value;
          if (pw) payload.password = pw;
          await api("PATCH", `/users/${u.id}`, payload);
        }
        toast("Saved", "success");
        backdrop.remove();
        load();
      } catch (e) { /* toast shown */ }
    });
  }

  load();
}

/* ---------------------------------------------------------------------- */
/* Router                                                                 */
/* ---------------------------------------------------------------------- */

async function route() {
  const hash = location.hash || "#/login";
  const parts = hash.replace(/^#\//, "").split("/");

  if (!CURRENT_USER) {
    try {
      const data = await api("GET", "/auth/me");
      CURRENT_USER = data.user;
    } catch (e) {
      viewLogin();
      return;
    }
  }

  if (parts[0] === "login" || hash === "#/") { location.hash = "#/dashboard"; return; }

  try {
    if (parts[0] === "dashboard") return viewDashboard();
    if (parts[0] === "requests" && parts[1] === "new") return viewNewRequest();
    if (parts[0] === "requests" && parts[1]) return viewRequestDetail(Number(parts[1]));
    if (parts[0] === "requests") return viewRequestsList();
    if (parts[0] === "factory") return viewFactoryQueue();
    if (parts[0] === "warehouse" && parts[1] === "incoming") return viewWarehouseIncoming();
    if (parts[0] === "warehouse" && parts[1] === "stock") return viewWarehouseStock();
    if (parts[0] === "dismissals") return viewDismissals();
    if (parts[0] === "returns") return viewReturns();
    if (parts[0] === "history") return viewHistory();
    if (parts[0] === "products") return viewProducts();
    if (parts[0] === "distributors") return viewDistributors();
    if (parts[0] === "users") return viewUsers();
    location.hash = "#/dashboard";
  } catch (e) {
    console.error(e);
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
