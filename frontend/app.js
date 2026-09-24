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
  return `<span class="badge status-${esc(status)}">${esc(statusLabel(status))}</span>`;
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
    toast(LANG === "ar" ? "خطأ في الشبكة - هل الخادم متاح؟" : "Network error - is the server reachable?", "error");
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
  { href: "#/dashboard", key: "nav_dashboard", roles: "*" },
  { href: "#/requests/new", key: "nav_new_request", roles: ["sales_manager"] },
  { href: "#/requests", key: "nav_requests", roles: ["sales_manager", "commercial_director", "factory", "admin"] },
  { href: "#/factory", key: "nav_factory", roles: ["factory", "commercial_director", "admin"] },
  { href: "#/warehouse/incoming", key: "nav_incoming", roles: ["warehouse", "commercial_director", "factory", "admin"] },
  { href: "#/warehouse/stock", key: "nav_stock", roles: ["warehouse", "admin", "commercial_director", "assembly"] },
  { href: "#/issues", key: "nav_issues", roles: ["admin", "warehouse", "factory", "commercial_director"] },
  { href: "#/dismissals", key: "nav_dismissals", roles: ["warehouse", "assembly", "admin"] },
  { href: "#/returns", key: "nav_returns", roles: ["warehouse", "assembly", "admin"] },
  { href: "#/history", key: "nav_history", roles: "*" },
  { href: "#/products", key: "nav_products", roles: ["admin", "commercial_director"] },
  { href: "#/distributors", key: "nav_distributors", roles: ["admin", "commercial_director", "sales_manager"] },
  { href: "#/users", key: "nav_users", roles: ["admin"] },
];

function navFor(role) {
  return NAV.filter((n) => n.roles === "*" || n.roles.includes(role));
}

const ROLE_LABEL_KEY = {
  admin: "role_admin", sales_manager: "role_sales_manager", commercial_director: "role_commercial_director",
  factory: "role_factory", warehouse: "role_warehouse", assembly: "role_assembly",
};
function roleLabel(role) {
  return ROLE_LABEL_KEY[role] ? t(ROLE_LABEL_KEY[role]) : role;
}

/* ---------------------------------------------------------------------- */
/* Shell / layout                                                         */
/* ---------------------------------------------------------------------- */

function renderShell(activeHref) {
  const app = document.getElementById("app");
  const links = navFor(CURRENT_USER.role).map((n) =>
    `<a href="${n.href}" class="${n.href === activeHref ? "active" : ""}" data-link>${esc(t(n.key))}</a>`
  ).join("");
  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="dot"></span> ${esc(t("brand"))} &middot; ${esc(t("brandSub"))}</div>
      <div class="who">${esc(CURRENT_USER.name)} &middot; <b>${esc(roleLabel(CURRENT_USER.role))}</b>
        <button class="lang-switch" id="langSwitchBtn" type="button" style="margin-inline-start:12px;">${esc(t("lang_switch"))}</button>
        <button class="logout" id="logoutBtn" style="margin-inline-start:8px;">${esc(t("logout"))}</button>
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
  qs("#langSwitchBtn").addEventListener("click", async () => {
    const next = LANG === "ar" ? "en" : "ar";
    setLang(next);
    try { await api("PATCH", "/auth/me/language", { language: next }); } catch (e) { /* non-fatal */ }
    if (CURRENT_USER) CURRENT_USER.language = next;
    route();
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
        <button type="button" id="loginLangBtn" class="lang-switch login-lang">${esc(t("lang_switch"))}</button>
        <h1>${esc(t("brand"))}</h1>
        <p class="sub">${esc(t("login_tagline"))}</p>
        <form id="loginForm">
          <label>${esc(t("login_email"))}</label>
          <input type="email" id="email" required autocomplete="username">
          <label>${esc(t("login_password"))}</label>
          <input type="password" id="password" required autocomplete="current-password">
          <button type="submit" style="width:100%;margin-top:16px;">${esc(t("login_signin"))}</button>
        </form>
        <div class="demo-hint">
          ${t("login_demo_hint")}<br>
          sales@sarrdesign.demo &middot; director@sarrdesign.demo &middot; factory@sarrdesign.demo<br>
          warehouse@sarrdesign.demo &middot; assembly@sarrdesign.demo
        </div>
      </div>
    </div>
  `;
  qs("#loginLangBtn").addEventListener("click", () => { setLang(LANG === "ar" ? "en" : "ar"); viewLogin(); });
  qs("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = qs("#email").value.trim();
    const password = qs("#password").value;
    try {
      const data = await api("POST", "/auth/login", { email, password });
      CURRENT_USER = data.user;
      if (CURRENT_USER.language && CURRENT_USER.language !== LANG) setLang(CURRENT_USER.language);
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
  main.innerHTML = `<div class="card"><p class="muted">${esc(t("loading"))}</p></div>`;
  const role = CURRENT_USER.role;
  let cards = [];
  try {
    if (role === "sales_manager") {
      const mine = await api("GET", "/requests?mine=true");
      const submitted = mine.filter((r) => r.status === "submitted").length;
      const rejected = mine.filter((r) => r.status === "director_rejected").length;
      cards = [
        ["dash_your_requests", mine.length], ["dash_awaiting_director", submitted], ["dash_rejected", rejected],
      ];
    } else if (role === "commercial_director") {
      const pending = await api("GET", "/requests?status=submitted");
      const approved = await api("GET", "/requests?status=director_approved");
      cards = [["dash_pending_review", pending.length], ["dash_approved_awaiting_factory", approved.length]];
    } else if (role === "factory") {
      const queue = await api("GET", "/factory/queue");
      cards = [["dash_production_queue", queue.length]];
    } else if (role === "warehouse") {
      const incoming = await api("GET", "/warehouse/incoming");
      const stock = await api("GET", "/warehouse/stock");
      const dismissals = await api("GET", "/warehouse/dismissal-requests?status=pending");
      cards = [["dash_incoming", incoming.length], ["dash_skus_in_warehouse", stock.length], ["dash_pending_dismissals", dismissals.length]];
    } else if (role === "assembly") {
      const approved = await api("GET", "/warehouse/dismissal-requests?status=approved");
      cards = [["dash_ready_to_display", approved.length]];
    } else if (role === "admin") {
      const pendingDismissals = await api("GET", "/warehouse/dismissal-requests?status=pending");
      const incoming = await api("GET", "/warehouse/incoming");
      const stock = await api("GET", "/warehouse/stock");
      const openIssues = await api("GET", "/warehouse/shipment-flags?resolved=false");
      cards = [["dash_dismissals_awaiting_you", pendingDismissals.length], ["dash_in_transit", incoming.length],
        ["dash_skus_short", stock.length], ["dash_open_issues", openIssues.length]];
    }
  } catch (e) { /* ignore, toast shown */ }

  main.innerHTML = `
    <div class="stat-row">${cards.map(([key, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${esc(t(key))}</div></div>`).join("")}</div>
    <div class="card">
      <h2>${esc(t("dash_workflow_title"))}</h2>
      <p class="small muted">${esc(t("dash_workflow_text"))}</p>
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
      <h2>${esc(t("newreq_title"))}</h2>
      <div class="grid cols-2">
        <div>
          <label>${esc(t("newreq_distributor"))}</label>
          <select id="distSel"><option value="">${esc(t("select"))}</option>
            ${DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)} (${esc(d.governorate || "")})</option>`).join("")}
          </select>
        </div>
        <div>
          <label>${esc(t("newreq_showroom"))}</label>
          <select id="showroomSel"><option value="">${esc(t("newreq_select_distributor_first"))}</option></select>
        </div>
      </div>
      <div class="grid cols-2">
        <div>
          <label>${esc(t("newreq_purpose"))}</label>
          <select id="purposeSel">
            <option value="new_stand">${esc(t("purpose_new_stand"))}</option>
            <option value="addition">${esc(t("purpose_addition"))}</option>
            <option value="replacement">${esc(t("purpose_replacement"))}</option>
            <option value="live_show">${esc(t("purpose_live_show"))}</option>
          </select>
        </div>
        <div>
          <label>${esc(t("newreq_order_ref"))}</label>
          <input id="orderRef" placeholder="${esc(t("newreq_order_ref_ph"))}">
        </div>
      </div>
      <label>${esc(t("notesLabel"))}</label>
      <textarea id="notes" placeholder="${esc(t("newreq_notes_ph"))}"></textarea>
    </div>

    <div class="card">
      <h2>${esc(t("newreq_lines_title"))}</h2>
      <p class="small muted">${esc(t("newreq_lines_help"))}</p>
      <div class="grid cols-4">
        <div style="grid-column: span 2;">
          <label>${esc(t("newreq_product"))}</label>
          <input id="productSearch" list="productOptions" placeholder="${esc(t("newreq_product_ph"))}">
          <datalist id="productOptions">
            ${PRODUCTS.map((p) => `<option value="${esc(p.code)} - ${esc(p.family || "")} - ${esc(p.color || "")}" data-id="${p.id}">`).join("")}
          </datalist>
        </div>
        <div>
          <label>${esc(t("newreq_qty_req"))}</label>
          <input id="qtyReq" type="number" min="1" value="1">
        </div>
        <div>
          <label>${esc(t("newreq_qty_order"))}</label>
          <input id="qtyOrder" type="number" min="0" placeholder="${esc(t("newreq_qty_order_ph"))}">
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <input type="checkbox" id="isDummy" checked style="width:auto;"> ${esc(t("newreq_dummy_label"))}
        <span class="muted small" style="margin-inline-start:6px;">${esc(t("newreq_dummy_hint"))}</span>
      </label>
      <button type="button" id="addLineBtn" class="secondary mt">${esc(t("newreq_add_line"))}</button>

      <div id="linesTable" class="mt"></div>

      <div class="right mt">
        <button type="button" id="submitReqBtn">${esc(t("newreq_submit"))}</button>
      </div>
    </div>
  `;

  qs("#distSel").addEventListener("change", async (e) => {
    const distId = e.target.value;
    const sel = qs("#showroomSel");
    if (!distId) { sel.innerHTML = `<option value="">${esc(t("newreq_select_distributor_first"))}</option>`; return; }
    sel.innerHTML = `<option value="">${esc(t("loading"))}</option>`;
    const rooms = await showroomsFor(distId);
    sel.innerHTML = rooms.length
      ? rooms.map((r) => `<option value="${r.id}">${esc(r.name)} - ${esc(r.address || "")} (min ${r.min_order_qty})</option>`).join("")
      : `<option value="">${esc(t("newreq_no_showrooms"))}</option>`;
  });

  function renderLines() {
    const box = qs("#linesTable");
    if (draftItems.length === 0) { box.innerHTML = `<p class="muted small">${esc(t("newreq_no_lines"))}</p>`; return; }
    box.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>${esc(t("col_code"))}</th><th>${esc(t("col_family_color"))}</th><th>${esc(t("col_qty"))}</th><th>${esc(t("col_order_qty"))}</th><th>${esc(t("col_type"))}</th><th></th>
    </tr></thead><tbody>
      ${draftItems.map((it, idx) => `<tr>
        <td>${esc(it.code)}</td>
        <td>${esc(it.family)} / ${esc(it.color)}</td>
        <td>${it.qty_requested}</td>
        <td>${it.distributor_order_qty ?? "-"}</td>
        <td>${it.is_dummy ? `<span class="pill-dummy">${esc(t("type_dummy"))}</span>` : `<span class="pill-sellable">${esc(t("type_sellable"))}</span>`}</td>
        <td><button type="button" class="ghost" data-remove="${idx}">${esc(t("col_remove"))}</button></td>
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
    if (!match) { toast(t("msg_pick_product"), "error"); return; }
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
    if (!distributor_id || !showroom_id) { toast(t("msg_choose_dist_showroom"), "error"); return; }
    if (draftItems.length === 0) { toast(t("msg_add_one_line"), "error"); return; }
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
      toast(t("msg_request_submitted", { n: req.request_number }), "success");
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
        <h2 style="margin:0;">${esc(t("reqlist_title"))}</h2>
        <div class="row" style="max-width:420px;">
          <select id="statusFilter">
            <option value="">${esc(t("reqlist_all_statuses"))}</option>
            ${["submitted", "director_approved", "director_rejected", "sent_to_factory", "in_production",
              "partially_received", "fully_received", "partially_assigned", "completed", "cancelled"]
              .map((s) => `<option value="${s}">${esc(statusLabel(s))}</option>`).join("")}
          </select>
          ${role === "sales_manager" ? `<label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="mineOnly" checked style="width:auto;"> ${esc(t("reqlist_mine_only"))}</label>` : ""}
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
    if (reqs.length === 0) { wrap.innerHTML = `<div class="empty-state">${esc(t("reqlist_none"))}</div>`; return; }
    wrap.innerHTML = `<table><thead><tr>
      <th>${esc(t("col_hash"))}</th><th>${esc(t("col_date"))}</th><th>${esc(t("col_distributor"))}</th><th>${esc(t("col_showroom"))}</th><th>${esc(t("col_sales_manager"))}</th><th>${esc(t("col_status"))}</th><th></th>
    </tr></thead><tbody>
      ${reqs.map((r) => `<tr>
        <td>${esc(r.request_number)}</td>
        <td>${fmtDateShort(r.date_created)}</td>
        <td dir-auto>${esc(r.distributor_name)}</td>
        <td dir-auto>${esc(r.showroom_name)}</td>
        <td>${esc(r.sales_manager_name)}</td>
        <td>${badge(r.status)}</td>
        <td><a href="#/requests/${r.id}">${esc(t("col_open"))}</a></td>
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
  main.innerHTML = `<div class="card"><p class="muted">${esc(t("loading"))}</p></div>`;
  const r = await api("GET", `/requests/${id}`);
  const role = CURRENT_USER.role;

  // any pending line still needs the director's eyes, whatever stage the request as a
  // whole has reached (e.g. after a re-request on one line while others already shipped)
  const canReview = role === "commercial_director" && r.items.some((it) => it.status === "pending_review");
  const canSendToFactory = (role === "commercial_director" || role === "admin") && r.status === "director_approved";
  const canExport = (role === "factory" || role === "commercial_director" || role === "admin");
  const canShip = role === "factory";
  const canReceive = role === "warehouse";
  const canReRequest = role === "admin" || (role === "sales_manager" && r.sales_manager_id === CURRENT_USER.id);
  const canDeleteItems = role === "admin";
  const requestDeletable = role === "admin" && r.items.length > 0 && r.items.every((it) => it.qty_shipped_from_factory === 0);

  main.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <div>
          <h2 style="margin:0;">${esc(r.request_number)} ${badge(r.status)}</h2>
          <p class="small muted">${esc(t("reqdet_created_by", { date: fmtDate(r.date_created), name: r.sales_manager_name }))}</p>
        </div>
        <div>
          ${canExport ? `<a href="/api/requests/${r.id}/export.xlsx"><button class="secondary" type="button">${esc(t("reqdet_export"))}</button></a>` : ""}
          ${canSendToFactory ? `<button id="sendFactoryBtn" class="success">${esc(t("reqdet_send_factory"))}</button>` : ""}
          ${requestDeletable ? `<button id="deleteReqBtn" class="danger">${esc(t("reqdet_delete_request"))}</button>` : ""}
        </div>
      </div>
      <div class="grid cols-3 mt">
        <div><label style="margin:0;">${esc(t("newreq_distributor"))}</label><div dir-auto>${esc(r.distributor_name)}</div></div>
        <div><label style="margin:0;">${esc(t("newreq_showroom"))}</label><div dir-auto>${esc(r.showroom_name)}</div></div>
        <div><label style="margin:0;">${esc(t("reqdet_purpose"))}</label><div>${esc(purposeLabel(r.purpose))}</div></div>
      </div>
      ${r.distributor_order_ref ? `<div class="mt"><label style="margin:0;">${esc(t("reqdet_order_ref"))}</label><div>${esc(r.distributor_order_ref)}</div></div>` : ""}
      ${r.notes ? `<div class="mt"><label style="margin:0;">${esc(t("notesLabel"))}</label><div>${esc(r.notes)}</div></div>` : ""}
    </div>

    <div class="card">
      <h2>${esc(t("reqdet_lines_title"))}</h2>
      <div id="itemsWrap"></div>
    </div>

    <div class="card">
      <h2>${esc(t("reqdet_attachments"))}</h2>
      <div id="attachWrap"></div>
      <form id="attachForm" class="row mt">
        <input type="file" id="attachFile" required>
        <select id="attachKind">
          <option value="distributor_order">${esc(t("attach_distributor_order"))}</option>
          <option value="scanned_form">${esc(t("attach_scanned_form"))}</option>
          <option value="other">${esc(t("attach_other"))}</option>
        </select>
        <button type="submit">${esc(t("attach_upload"))}</button>
      </form>
    </div>

    <div class="card">
      <h2>${esc(t("reqdet_approval_history"))}</h2>
      <ul class="timeline">
        ${r.approvals.map((a) => `<li><span class="date">${fmtDate(a.created_at)}</span> - <b>${esc(a.actor_name || "?")}</b> ${esc(a.action)} ${a.notes ? "- " + esc(a.notes) : ""}</li>`).join("") || `<p class="muted small">${esc(t("reqdet_no_actions"))}</p>`}
      </ul>
    </div>
  `;

  renderItems(r, { canReview, canShip, canReceive, canReRequest, canDeleteItems });

  const attachWrap = qs("#attachWrap");
  attachWrap.innerHTML = r.attachments.length
    ? `<ul>${r.attachments.map((a) => `<li>${esc(a.file_name)} <span class="muted small">(${esc(a.kind)}, ${fmtDateShort(a.created_at)})</span></li>`).join("")}</ul>`
    : `<p class="muted small">${esc(t("attach_none"))}</p>`;

  qs("#attachForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("file", qs("#attachFile").files[0]);
    fd.append("kind", qs("#attachKind").value);
    try {
      await api("POST", `/requests/${id}/attachments`, fd, true);
      toast(t("attach_uploaded"), "success");
      viewRequestDetail(id);
    } catch (err) { /* toast shown */ }
  });

  const sendBtn = qs("#sendFactoryBtn");
  if (sendBtn) sendBtn.addEventListener("click", async () => {
    try {
      await api("POST", `/requests/${id}/send-to-factory`);
      toast(t("sent_to_factory_msg"), "success");
      viewRequestDetail(id);
    } catch (err) { /* toast shown */ }
  });

  const deleteReqBtn = qs("#deleteReqBtn");
  if (deleteReqBtn) deleteReqBtn.addEventListener("click", async () => {
    if (!confirm(t("reqdet_delete_request_confirm", { n: r.request_number }))) return;
    const reason = prompt(t("delete_reason_prompt")) || "";
    try {
      await api("DELETE", `/requests/${id}${reason ? "?reason=" + encodeURIComponent(reason) : ""}`);
      toast(t("msg_request_deleted"), "success");
      location.hash = "#/requests";
    } catch (err) { /* toast shown */ }
  });
}

function openReRequestModal(r, item) {
  const backdrop = el(`<div class="modal-backdrop"><div class="modal">
    <h3>${esc(t("modal_rerequest_title"))}</h3>
    <p class="small muted">${esc(t("rerequest_help"))}</p>
    <p><b>${esc(item.product_code)}</b> - ${esc(item.product_color)} / ${esc(item.product_family)}</p>
    ${item.director_notes ? `<p class="small muted">${esc(t("notesLabel"))}: ${esc(item.director_notes)}</p>` : ""}
    <div class="grid cols-2">
      <div><label>${esc(t("rerequest_qty"))}</label><input id="rr_qty" type="number" min="1" value="${item.qty_requested}"></div>
      <div><label>${esc(t("rerequest_order_qty"))}</label><input id="rr_order_qty" type="number" min="0" value="${item.distributor_order_qty ?? ""}"></div>
    </div>
    <label style="display:flex;align-items:center;gap:6px;margin-top:10px;">
      <input type="checkbox" id="rr_dummy" ${item.is_dummy ? "checked" : ""} style="width:auto;"> ${esc(t("rerequest_dummy"))}
    </label>
    <label>${esc(t("rerequest_notes"))}</label><input id="rr_notes" placeholder="${esc(t("optional"))}">
    <div class="right mt"><button type="button" class="secondary" id="cancelBtn">${esc(t("cancel"))}</button><button type="button" id="saveBtn">${esc(t("rerequest_submit"))}</button></div>
  </div></div>`);
  document.body.appendChild(backdrop);
  qs("#cancelBtn", backdrop).addEventListener("click", () => backdrop.remove());
  qs("#saveBtn", backdrop).addEventListener("click", async () => {
    const payload = {
      qty_requested: Number(qs("#rr_qty", backdrop).value) || item.qty_requested,
      is_dummy: qs("#rr_dummy", backdrop).checked,
      distributor_order_qty: qs("#rr_order_qty", backdrop).value === "" ? null : Number(qs("#rr_order_qty", backdrop).value),
      notes: qs("#rr_notes", backdrop).value || null,
    };
    try {
      await api("POST", `/requests/items/${item.id}/re-request`, payload);
      toast(t("msg_rerequested"), "success");
      backdrop.remove();
      viewRequestDetail(r.id);
    } catch (e) { /* toast shown */ }
  });
}

function renderItems(r, perms) {
  const wrap = qs("#itemsWrap");
  wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
    <th>${esc(t("col_code"))}</th><th>${esc(t("col_color_family"))}</th><th>${esc(t("col_requested"))}</th><th>${esc(t("col_approved"))}</th><th>${esc(t("col_type"))}</th>
    <th>${esc(t("col_moq_check"))}</th><th>${esc(t("col_status"))}</th><th>${esc(t("col_shipped"))}</th><th>${esc(t("col_received"))}</th><th>${esc(t("col_assigned"))}</th><th></th><th></th>
  </tr></thead><tbody>
    ${r.items.map((it) => `<tr>
      <td>${esc(it.product_code)}${flagBadge(it.open_flags)}</td>
      <td>${esc(it.product_color)} / ${esc(it.product_family)}</td>
      <td>${it.qty_requested}</td>
      <td>${it.qty_approved}</td>
      <td>${it.is_dummy ? `<span class="pill-dummy">${esc(t("type_dummy"))}</span>` : `<span class="pill-sellable">${esc(t("type_sellable"))}</span>`}</td>
      <td>${it.distributor_order_qty !== null ? `order:${it.distributor_order_qty} ${it.min_order_met === true ? "✓" : it.min_order_met === false ? "✗" : ""}` : "-"}</td>
      <td>${badge(it.status)}</td>
      <td>${it.qty_shipped_from_factory}</td>
      <td>${it.qty_received_warehouse}</td>
      <td>${it.qty_assigned_showroom}</td>
      <td>${it.director_notes ? `<span class="small muted" title="${esc(it.director_notes)}">note</span>` : ""}</td>
      <td>
        ${perms.canReRequest && it.status === "rejected" ? `<button type="button" class="ghost rerequest-btn" data-id="${it.id}">${esc(t("reqdet_rerequest_btn"))}</button>` : ""}
        ${perms.canDeleteItems && it.qty_shipped_from_factory === 0 ? `<button type="button" class="ghost delete-item-btn" data-id="${it.id}">${esc(t("reqdet_delete_item_btn"))}</button>` : ""}
      </td>
    </tr>`).join("")}
  </tbody></table></div>`;

  qsa(".rerequest-btn", wrap).forEach((btn) => btn.addEventListener("click", () => {
    const item = r.items.find((it) => it.id === Number(btn.dataset.id));
    openReRequestModal(r, item);
  }));
  qsa(".delete-item-btn", wrap).forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm(t("reqdet_delete_item_confirm"))) return;
    const reason = prompt(t("delete_reason_prompt")) || "";
    try {
      const res = await api("DELETE", `/requests/${r.id}/items/${btn.dataset.id}${reason ? "?reason=" + encodeURIComponent(reason) : ""}`);
      toast(t("msg_item_deleted"), "success");
      if (res && res.request_deleted) location.hash = "#/requests";
      else viewRequestDetail(r.id);
    } catch (e) { /* toast shown */ }
  }));

  if (perms.canReview) {
    const pending = r.items.filter((it) => it.status === "pending_review");
    if (pending.length) {
      const box = el(`<div class="card" style="margin-top:14px;"><h3>${esc(t("review_title"))}</h3><div id="reviewLines"></div>
        <div class="right mt"><button id="submitReviewBtn">${esc(t("review_submit"))}</button></div></div>`);
      wrap.after(box);
      const reviewBox = qs("#reviewLines", box);
      reviewBox.innerHTML = pending.map((it) => `
        <div class="line-item-row" data-item="${it.id}">
          <b>${esc(it.product_code)}</b> - ${esc(it.product_color)} / ${esc(it.product_family)}
          <span class="small muted">${esc(t("review_requested_order", { req: it.qty_requested, ord: it.distributor_order_qty ?? "n/a" }))}</span>
          <div class="grid cols-4 mt">
            <div><label>${esc(t("review_decision"))}</label>
              <select class="dec-decision"><option value="approve">${esc(t("review_approve"))}</option><option value="reject">${esc(t("review_reject"))}</option></select>
            </div>
            <div><label>${esc(t("review_qty_approved"))}</label><input class="dec-qty" type="number" min="0" value="${it.qty_requested}"></div>
            <div><label>${esc(t("review_sku_match"))}</label>
              <select class="dec-sku"><option value="true">${esc(t("yes"))}</option><option value="false">${esc(t("no"))}</option></select>
            </div>
            <div><label>${esc(t("review_moq_met"))}</label>
              <select class="dec-moq"><option value="true" ${it.min_order_met ? "selected" : ""}>${esc(t("yes"))}</option><option value="false" ${it.min_order_met === false ? "selected" : ""}>${esc(t("no"))}</option></select>
            </div>
          </div>
          <label>${esc(t("notesLabel"))}</label><input class="dec-notes" placeholder="${esc(t("optional"))}">
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
          toast(t("review_submitted"), "success");
          viewRequestDetail(r.id);
        } catch (e) { /* toast shown */ }
      });
    }
  }

  if (perms.canShip) {
    const shippable = r.items.filter((it) => ["sent_to_factory", "in_production", "partially_shipped"].includes(it.status));
    if (shippable.length) {
      const box = el(`<div class="card" style="margin-top:14px;"><h3>${esc(t("ship_title"))}</h3><div id="shipLines"></div></div>`);
      wrap.after(box);
      const shipBox = qs("#shipLines", box);
      shipBox.innerHTML = shippable.map((it) => {
        const remaining = it.qty_approved - it.qty_shipped_from_factory;
        return `<div class="line-item-row">
          <b>${esc(it.product_code)}</b> - ${esc(t("ship_summary", { a: it.qty_approved, s: it.qty_shipped_from_factory, r: remaining }))}
          <div class="row mt">
            <input type="number" min="1" max="${remaining}" value="${remaining}" class="ship-qty" placeholder="${esc(t("ship_qty_ph"))}">
            <input class="ship-batch" placeholder="${esc(t("ship_batch_ph"))}">
            <button type="button" class="ship-btn" data-item="${it.id}">${esc(t("ship_btn"))}</button>
          </div>
        </div>`;
      }).join("");
      qsa(".ship-btn", shipBox).forEach((btn) => btn.addEventListener("click", async () => {
        const row = btn.closest(".line-item-row");
        const qty_sent = Number(qs(".ship-qty", row).value);
        const batch_ref = qs(".ship-batch", row).value || null;
        try {
          await api("POST", "/factory/shipments", { item_id: Number(btn.dataset.item), qty_sent, batch_ref });
          toast(t("ship_logged"), "success");
          viewRequestDetail(r.id);
        } catch (e) { /* toast shown */ }
      }));
    }
  }

  if (perms.canReceive) {
    const receivable = r.items.filter((it) => it.qty_shipped_from_factory > it.qty_received_warehouse);
    if (receivable.length) {
      const box = el(`<div class="card" style="margin-top:14px;"><h3>${esc(t("recv_title"))}</h3><div id="recLines"></div></div>`);
      wrap.after(box);
      const recBox = qs("#recLines", box);
      recBox.innerHTML = receivable.map((it) => {
        const remaining = it.qty_shipped_from_factory - it.qty_received_warehouse;
        return `<div class="line-item-row">
          <b>${esc(it.product_code)}</b> - ${esc(t("recv_summary", { s: it.qty_shipped_from_factory, r: it.qty_received_warehouse, t: remaining }))}
          <div class="row mt">
            <input type="number" min="1" max="${remaining}" value="${remaining}" class="rec-qty">
            <button type="button" class="rec-btn" data-item="${it.id}">${esc(t("recv_btn"))}</button>
            <button type="button" class="ghost flag-issue-btn" data-item="${it.id}">${esc(t("recv_flag_btn"))}</button>
          </div>
        </div>`;
      }).join("");
      qsa(".rec-btn", recBox).forEach((btn) => btn.addEventListener("click", async () => {
        const row = btn.closest(".line-item-row");
        const qty_received = Number(qs(".rec-qty", row).value);
        try {
          await api("POST", "/warehouse/receipts", { item_id: Number(btn.dataset.item), qty_received });
          toast(t("recv_logged"), "success");
          viewRequestDetail(r.id);
        } catch (e) { /* toast shown */ }
      }));
      qsa(".flag-issue-btn", recBox).forEach((btn) => btn.addEventListener("click", () => {
        raiseShipmentFlag(Number(btn.dataset.item), () => viewRequestDetail(r.id));
      }));
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Factory queue                                                          */
/* ---------------------------------------------------------------------- */

async function viewFactoryQueue() {
  const main = renderShell("#/factory");
  main.innerHTML = `<div class="card"><h2>${esc(t("factory_title"))}</h2><div id="wrap"><p class="muted">${esc(t("loading"))}</p></div></div>`;
  const items = await api("GET", "/factory/queue");
  const wrap = qs("#wrap");
  if (items.length === 0) { wrap.innerHTML = `<div class="empty-state">${esc(t("factory_empty"))}</div>`; return; }
  wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
    <th>${esc(t("col_request"))}</th><th>${esc(t("col_dist_showroom"))}</th><th>${esc(t("col_code"))}</th><th>${esc(t("col_color"))}</th><th>${esc(t("col_approved"))}</th><th>${esc(t("col_shipped"))}</th><th>${esc(t("col_remaining"))}</th><th>${esc(t("col_status"))}</th><th></th>
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
      <td><a href="#/requests/${it.request_id}">${esc(t("col_ship_arrow"))}</a></td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

/* ---------------------------------------------------------------------- */
/* Warehouse: incoming / stock                                            */
/* ---------------------------------------------------------------------- */

async function viewWarehouseIncoming() {
  const main = renderShell("#/warehouse/incoming");
  main.innerHTML = `<div class="card"><h2>${esc(t("incoming_title"))}</h2>
    <p class="small muted">${esc(t("incoming_help"))}</p>
    <div id="wrap"><p class="muted">${esc(t("loading"))}</p></div></div>`;
  const items = await api("GET", "/warehouse/incoming");
  const wrap = qs("#wrap");
  if (items.length === 0) { wrap.innerHTML = `<div class="empty-state">${esc(t("incoming_empty"))}</div>`; return; }
  const canFlag = CURRENT_USER.role === "warehouse" || CURRENT_USER.role === "admin";
  wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
    <th>${esc(t("col_request"))}</th><th>${esc(t("col_dist_showroom"))}</th><th>${esc(t("col_code"))}</th><th>${esc(t("col_approved"))}</th><th>${esc(t("col_shipped"))}</th><th>${esc(t("col_received"))}</th>
    <th>${esc(t("col_outstanding"))}</th><th>${esc(t("col_pending_receive"))}</th><th>${esc(t("col_status"))}</th><th></th>
  </tr></thead><tbody>
    ${items.map((it) => `<tr>
      <td><a href="#/requests/${it.request_id}">${esc(it.request_number)}</a></td>
      <td dir-auto>${esc(it.distributor_name)} / ${esc(it.showroom_name)}</td>
      <td>${esc(it.product_code)}${flagBadge(it.open_flags)}</td>
      <td>${it.qty_approved}</td>
      <td>${it.qty_shipped_from_factory}</td>
      <td>${it.qty_received_warehouse}</td>
      <td>${it.outstanding_from_factory > 0 ? `<b style="color:var(--red)">${it.outstanding_from_factory}</b>` : 0}</td>
      <td>${it.pending_receive}</td>
      <td>${badge(it.status)}</td>
      <td>${canFlag ? `<button type="button" class="ghost flag-btn" data-id="${it.id}">${esc(t("recv_flag_btn"))}</button>` : ""}</td>
    </tr>`).join("")}
  </tbody></table></div>`;
  qsa(".flag-btn", wrap).forEach((btn) => btn.addEventListener("click", () => raiseShipmentFlag(Number(btn.dataset.id), () => viewWarehouseIncoming())));
}

async function viewWarehouseStock() {
  const main = renderShell("#/warehouse/stock");
  main.innerHTML = `<div class="card"><h2>${esc(t("stock_title"))}</h2>
    <div class="tag-search"><input id="q" placeholder="${esc(t("stock_search_ph"))}"></div>
    <div id="wrap"><p class="muted">${esc(t("loading"))}</p></div></div>`;
  async function load() {
    const q = qs("#q").value;
    const items = await api("GET", `/warehouse/stock${q ? "?q=" + encodeURIComponent(q) : ""}`);
    const wrap = qs("#wrap");
    if (items.length === 0) { wrap.innerHTML = `<div class="empty-state">${esc(t("stock_empty"))}</div>`; return; }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>${esc(t("col_code"))}</th><th>${esc(t("col_color_family"))}</th><th>${esc(t("col_held_for"))}</th><th>${esc(t("col_request"))}</th><th>${esc(t("col_qty_in_warehouse"))}</th><th>${esc(t("col_type"))}</th>
    </tr></thead><tbody>
      ${items.map((it) => `<tr>
        <td>${esc(it.product_code)}${flagBadge(it.open_flags)}</td>
        <td>${esc(it.product_color)} / ${esc(it.product_family)}</td>
        <td dir-auto>${esc(it.distributor_name)} / ${esc(it.showroom_name)}</td>
        <td><a href="#/requests/${it.request_id}">${esc(it.request_number)}</a></td>
        <td><b>${it.qty_in_warehouse}</b></td>
        <td>${it.is_dummy ? `<span class="pill-dummy">${esc(t("type_dummy"))}</span>` : `<span class="pill-sellable">${esc(t("type_sellable"))}</span>`}</td>
      </tr>`).join("")}
    </tbody></table></div>`;
  }
  qs("#q").addEventListener("input", () => { clearTimeout(window.__stockTimer); window.__stockTimer = setTimeout(load, 250); });
  load();
}

/* ---------------------------------------------------------------------- */
/* Shipment issues (warehouse-raised flags)                               */
/* ---------------------------------------------------------------------- */

async function raiseShipmentFlag(itemId, onDone) {
  const reason = prompt(t("flag_prompt"));
  if (reason === null) return;
  if (!reason.trim()) { toast(t("msg_flag_required"), "error"); return; }
  try {
    await api("POST", "/warehouse/shipment-flags", { item_id: itemId, reason: reason.trim() });
    toast(t("msg_flag_raised"), "success");
    if (onDone) onDone();
  } catch (e) { /* toast shown */ }
}

function flagBadge(openFlags) {
  if (!openFlags) return "";
  return ` <span class="badge status-director_rejected" title="${esc(t("flag_badge"))}">🚩 ${openFlags}</span>`;
}

async function viewShipmentIssues() {
  const main = renderShell("#/issues");
  const canResolve = CURRENT_USER.role === "admin";
  main.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <h2 style="margin:0;">${esc(t("issues_title"))}</h2>
        <div class="row" style="max-width:260px;">
          <select id="statusFilter">
            <option value="false">${esc(t("issues_filter_open"))}</option>
            <option value="true">${esc(t("issues_filter_resolved"))}</option>
            <option value="">${esc(t("filter_all"))}</option>
          </select>
        </div>
      </div>
      <p class="small muted">${esc(t("issues_help"))}</p>
      <div id="wrap" class="mt"><p class="muted">${esc(t("loading"))}</p></div>
    </div>
  `;

  async function load() {
    const val = qs("#statusFilter").value;
    const flags = await api("GET", `/warehouse/shipment-flags${val ? "?resolved=" + val : ""}`);
    const wrap = qs("#wrap");
    if (flags.length === 0) { wrap.innerHTML = `<div class="empty-state">${esc(t("issues_none"))}</div>`; return; }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>${esc(t("col_raised_on"))}</th><th>${esc(t("col_request"))}</th><th>${esc(t("col_dist_showroom"))}</th>
      <th>${esc(t("col_code"))}</th><th>${esc(t("col_reason"))}</th><th>${esc(t("col_raised_by"))}</th><th>${esc(t("col_status"))}</th><th></th>
    </tr></thead><tbody>
      ${flags.map((f) => `<tr>
        <td>${fmtDate(f.created_at)}</td>
        <td><a href="#/requests/${f.request_id}">${esc(f.request_number || "-")}</a></td>
        <td dir-auto>${esc(f.distributor_name)} / ${esc(f.showroom_name)}</td>
        <td>${esc(f.product_code)}</td>
        <td>${esc(f.reason)}${f.resolved && f.resolution_notes ? `<br><span class="small muted">${esc(f.resolution_notes)}</span>` : ""}</td>
        <td>${esc(f.raised_by_name || "-")}</td>
        <td><span class="badge status-${f.resolved ? "completed" : "director_rejected"}">${esc(f.resolved ? t("issues_status_resolved") : t("issues_status_open"))}</span></td>
        <td>${canResolve && !f.resolved ? `<button type="button" class="secondary resolve-btn" data-id="${f.id}">${esc(t("issues_resolve_btn"))}</button>` : ""}</td>
      </tr>`).join("")}
    </tbody></table></div>`;

    qsa(".resolve-btn", wrap).forEach((btn) => btn.addEventListener("click", async () => {
      const notes = prompt(t("issues_resolve_prompt")) || null;
      try {
        await api("POST", `/warehouse/shipment-flags/${btn.dataset.id}/resolve`, { resolution_notes: notes });
        toast(t("msg_flag_resolved"), "success");
        load();
      } catch (e) { /* toast shown */ }
    }));
  }

  qs("#statusFilter").addEventListener("change", load);
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
      <h2>${esc(t("dismiss_request_title"))}</h2>
      <p class="small muted">${esc(t("dismiss_request_help"))}</p>
      <div class="grid cols-2">
        <div>
          <label>${esc(t("dismiss_item"))}</label>
          <select id="stockItemSel"><option value="">${esc(t("dismiss_loading_stock"))}</option></select>
        </div>
        <div>
          <label>${esc(t("dismiss_dest_showroom"))}</label>
          <select id="destShowroomSel"><option value="">${esc(t("newreq_select_distributor_first"))}</option></select>
        </div>
      </div>
      <div class="grid cols-2">
        <div><label>${esc(t("dismiss_dest_dist"))}</label>
          <select id="destDistSel"><option value="">${esc(t("select"))}</option></select>
        </div>
        <div><label>${esc(t("dismiss_qty"))}</label><input id="dismissQty" type="number" min="1" value="1"></div>
      </div>
      <label>${esc(t("dismiss_reason"))}</label><input id="dismissReason" placeholder="${esc(t("dismiss_reason_ph"))}">
      <div class="right mt"><button id="requestDismissBtn">${esc(t("dismiss_submit"))}</button></div>
    </div>` : ""}

    <div class="card">
      <h2>${esc(t("dismiss_list_title"))}</h2>
      <div class="row" style="max-width:300px;"><select id="statusFilter">
        <option value="pending">${esc(t("status_pending"))}</option><option value="approved">${esc(t("status_approved"))}</option>
        <option value="rejected">${esc(t("status_rejected"))}</option><option value="">${esc(t("filter_all"))}</option>
      </select></div>
      <div id="wrap" class="mt"><p class="muted">${esc(t("loading"))}</p></div>
    </div>
  `;

  if (canRequest) {
    await ensureCaches();
    const stock = await api("GET", "/warehouse/stock");
    qs("#stockItemSel").innerHTML = stock.length
      ? `<option value="">${esc(t("select"))}</option>` + stock.map((it) => `<option value="${it.id}">${esc(it.product_code)} / ${esc(it.product_color)} - in stock ${it.qty_in_warehouse} (${esc(it.request_number)})</option>`).join("")
      : `<option value="">${esc(t("dismiss_no_stock"))}</option>`;
    qs("#destDistSel").innerHTML = `<option value="">${esc(t("select"))}</option>` + DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
    qs("#destDistSel").addEventListener("change", async (e) => {
      const rooms = await showroomsFor(e.target.value);
      qs("#destShowroomSel").innerHTML = rooms.map((r) => `<option value="${r.id}">${esc(r.name)} - ${esc(r.address || "")}</option>`).join("");
    });
    qs("#requestDismissBtn").addEventListener("click", async () => {
      const item_id = Number(qs("#stockItemSel").value);
      const showroom_id = Number(qs("#destShowroomSel").value);
      const qty = Number(qs("#dismissQty").value);
      if (!item_id || !showroom_id || !qty) { toast(t("dismiss_fill_all"), "error"); return; }
      try {
        await api("POST", "/warehouse/dismissal-requests", { item_id, showroom_id, qty, reason: qs("#dismissReason").value || null });
        toast(t("dismiss_requested_msg"), "success");
        loadList();
      } catch (e) { /* toast shown */ }
    });
  }

  async function loadList() {
    const status = qs("#statusFilter").value;
    const list = await api("GET", `/warehouse/dismissal-requests${status ? "?status=" + status : "?status="}`);
    const wrap = qs("#wrap");
    if (list.length === 0) { wrap.innerHTML = `<div class="empty-state">${esc(t("dismiss_none"))}</div>`; return; }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>${esc(t("col_date"))}</th><th>${esc(t("newreq_product"))}</th><th>${esc(t("col_dest"))}</th><th>${esc(t("col_qty"))}</th><th>${esc(t("col_reason"))}</th><th>${esc(t("col_status"))}</th><th></th>
    </tr></thead><tbody>
      ${list.map((d) => `<tr>
        <td>${fmtDate(d.date_requested)}</td>
        <td>${esc(d.product_code)}</td>
        <td dir-auto>${esc(d.distributor_name)} / ${esc(d.showroom_name)}</td>
        <td>${d.qty}</td>
        <td>${esc(d.reason || "-")}${d.reassign_from_assignment_id ? ` <span class="badge">${esc(t("tag_reassignment"))}</span>` : ""}</td>
        <td>${badge(d.status)}</td>
        <td>
          ${canDecide && d.status === "pending" ? `<button type="button" class="success decide-btn" data-id="${d.id}" data-decision="approve">${esc(t("review_approve"))}</button>
            <button type="button" class="danger decide-btn" data-id="${d.id}" data-decision="reject">${esc(t("review_reject"))}</button>` : ""}
          ${canAssign && d.status === "approved" ? `<button type="button" class="assign-btn" data-id="${d.id}" data-qty="${d.qty}">${esc(t("dismiss_place_btn"))}</button>` : ""}
        </td>
      </tr>`).join("")}
    </tbody></table></div>`;

    qsa(".decide-btn", wrap).forEach((btn) => btn.addEventListener("click", async () => {
      try {
        await api("POST", `/warehouse/dismissal-requests/${btn.dataset.id}/decide`, { decision: btn.dataset.decision });
        toast(btn.dataset.decision === "approve" ? t("dismiss_approved_msg") : t("dismiss_rejected_msg"), "success");
        loadList();
      } catch (e) { /* toast shown */ }
    }));

    qsa(".assign-btn", wrap).forEach((btn) => btn.addEventListener("click", () => doAssign(Number(btn.dataset.id))));
  }

  async function doAssign(dismissalId, confirmDuplicate = false) {
    try {
      await api("POST", `/warehouse/assignments?dismissal_id=${dismissalId}${confirmDuplicate ? "&confirm_duplicate=true" : ""}`);
      toast(t("dismiss_placed_msg"), "success");
      loadList();
    } catch (e) {
      if (e.message && e.message.includes("already displayed")) {
        if (confirm(e.message + t("dismiss_dup_confirm"))) {
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
      <h2>${esc(t("returns_title"))}</h2>
      <div class="grid cols-2">
        <div><label>${esc(t("newreq_distributor"))}</label><select id="distSel"><option value="">${esc(t("select"))}</option>
          ${DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div>
        <div><label>${esc(t("newreq_showroom"))}</label><select id="showroomSel"><option value="">${esc(t("newreq_select_distributor_first"))}</option></select></div>
      </div>
      <div id="displayedWrap" class="mt"></div>
    </div>
  `;
  qs("#distSel").addEventListener("change", async (e) => {
    const rooms = await showroomsFor(e.target.value);
    qs("#showroomSel").innerHTML = `<option value="">${esc(t("select"))}</option>` + rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
  });
  qs("#showroomSel").addEventListener("change", async (e) => {
    const showroomId = e.target.value;
    const wrap = qs("#displayedWrap");
    if (!showroomId) { wrap.innerHTML = ""; return; }
    const current = await api("GET", `/warehouse/showroom/${showroomId}/current`);
    if (current.length === 0) { wrap.innerHTML = `<div class="empty-state">${esc(t("returns_empty"))}</div>`; return; }
    wrap.innerHTML = current.map((a) => `
      <div class="line-item-row">
        <b>${esc(a.product_code)}</b> / ${esc(a.product_color)} - ${esc(t("returns_summary", { q: a.qty, d: fmtDateShort(a.date_assigned) }))}
        <div class="grid cols-4 mt">
          <div><label>${esc(t("returns_qty"))}</label><input class="ret-qty" type="number" min="1" max="${a.qty}" value="1"></div>
          <div><label>${esc(t("dismiss_reason"))}</label><select class="ret-reason">
            ${RETURN_REASONS.map((rr) => `<option value="${rr}">${esc(returnReasonLabel(rr))}</option>`).join("")}
          </select></div>
          <div><label>${esc(t("returns_restocked"))}</label><select class="ret-restock"><option value="true">${esc(t("returns_restock_yes"))}</option><option value="false">${esc(t("returns_restock_no"))}</option></select></div>
          <div><label>${esc(t("notesLabel"))}</label><input class="ret-notes" placeholder="${esc(t("optional"))}"></div>
        </div>
        <div class="right mt"><button type="button" class="ret-btn" data-id="${a.id}">${esc(t("returns_btn"))}</button></div>
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
        toast(t("returns_recorded"), "success");
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
      <h2>${esc(t("history_title"))}</h2>
      <div class="grid cols-2">
        <div><label>${esc(t("newreq_distributor"))}</label><select id="distSel"><option value="">${esc(t("select"))}</option>
          ${DISTRIBUTORS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div>
        <div><label>${esc(t("history_showroom_optional"))}</label><select id="showroomSel"><option value="">${esc(t("history_all_showrooms"))}</option></select></div>
      </div>
      <div id="resultWrap" class="mt"></div>
    </div>
  `;
  qs("#distSel").addEventListener("change", async (e) => {
    const distId = e.target.value;
    if (!distId) { qs("#showroomSel").innerHTML = `<option value="">${esc(t("history_all_showrooms"))}</option>`; return; }
    const rooms = await showroomsFor(distId);
    qs("#showroomSel").innerHTML = `<option value="">${esc(t("history_all_showrooms"))}</option>` + rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
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
      detail: `${a.product_code} / ${a.product_color}: qty ${a.qty} [${statusLabel(a.status)}]`,
    })).concat(data.returns.map((r) => ({ date: r.date_returned, type: "return", detail: `qty ${r.qty_returned} returned - ${returnReasonLabel(r.reason)}` })));
    timeline.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    renderHistory(data.showroom.name, timeline, null, data.currently_displayed);
  }

  function renderHistory(title, timeline, showrooms, currentlyDisplayed) {
    const wrap = qs("#resultWrap");
    let html = `<h3 dir-auto>${esc(title)}</h3>`;
    if (showrooms) {
      html += `<p class="small muted">${showrooms.length} ${esc(t("history_showrooms_count"))} ${showrooms.map((s) => esc(s.name)).join(", ")}</p>`;
    }
    if (currentlyDisplayed) {
      html += `<h4>${esc(t("history_currently_displayed"))}</h4>`;
      html += currentlyDisplayed.length
        ? `<ul>${currentlyDisplayed.map((a) => `<li>${esc(a.product_code)} / ${esc(a.product_color)} - ${esc(t("history_since", { d: fmtDateShort(a.date_assigned) }))}, qty ${a.qty}</li>`).join("")}</ul>`
        : `<p class="muted small">${esc(t("history_none_displayed"))}</p>`;
    }
    html += `<h4>${esc(t("history_timeline"))}</h4>`;
    html += timeline.length
      ? `<ul class="timeline">${timeline.map((tl) => `<li><span class="date">${fmtDate(tl.date)}</span> <span class="type">${esc(tl.type.replace(/_/g, " "))}</span><br>${esc(tl.detail)}</li>`).join("")}</ul>`
      : `<div class="empty-state">${esc(t("history_none"))}</div>`;
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
        <h2 style="margin:0;">${esc(t("products_title"))}</h2>
        <form id="importForm" class="row" style="max-width:360px;">
          <input type="file" id="importFile" accept=".xlsx">
          <button type="submit" class="secondary">${esc(t("products_import"))}</button>
        </form>
      </div>
      <div class="tag-search mt"><input id="q" placeholder="${esc(t("products_search_ph"))}"></div>
      <button id="addProductBtn" class="secondary">${esc(t("products_add"))}</button>
      <div id="wrap" class="mt"><p class="muted">${esc(t("loading"))}</p></div>
    </div>
  `;
  qs("#importForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = qs("#importFile").files[0];
    if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try {
      const res = await api("POST", "/products/import", fd, true);
      toast(t("products_import_result", { c: res.created, u: res.updated }), "success");
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
      <th>${esc(t("col_code"))}</th><th>${esc(t("m_color"))}</th><th>${esc(t("m_family"))}</th><th>${esc(t("col_kind"))}</th><th>${esc(t("col_application"))}</th><th>${esc(t("col_price"))}</th><th>${esc(t("active"))}</th><th></th>
    </tr></thead><tbody>
      ${items.map((p) => `<tr style="${p.active ? "" : "opacity:0.5;"}">
        <td>${esc(p.code)}</td><td>${esc(p.color)}</td><td>${esc(p.family)}</td><td>${esc(p.kind)}</td>
        <td>${esc(p.application)}</td><td>${p.price ?? "-"}</td><td>${p.active ? esc(t("yes")) : esc(t("no"))}</td>
        <td><button type="button" class="ghost edit-btn" data-id="${p.id}">${esc(t("edit"))}</button>
          ${p.active ? `<button type="button" class="ghost delist-btn" data-id="${p.id}">${esc(t("products_delist"))}</button>` : ""}</td>
      </tr>`).join("")}
    </tbody></table></div>`;
    qsa(".edit-btn", wrap).forEach((b) => b.addEventListener("click", () => openProductModal(items.find((p) => p.id === Number(b.dataset.id)))));
    qsa(".delist-btn", wrap).forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(t("products_delist_confirm"))) return;
      await api("DELETE", `/products/${b.dataset.id}`);
      toast(t("products_delisted"), "success");
      load();
    }));
  }
  qs("#q").addEventListener("input", () => { clearTimeout(window.__prodTimer); window.__prodTimer = setTimeout(load, 250); });

  function openProductModal(p) {
    const isNew = !p;
    const backdrop = el(`<div class="modal-backdrop"><div class="modal">
      <h3>${isNew ? esc(t("modal_add_product")) : esc(t("modal_edit_product"))}</h3>
      <label>${esc(t("m_code"))}</label><input id="m_code" value="${esc(p?.code || "")}" ${isNew ? "" : "readonly"}>
      <div class="grid cols-2">
        <div><label>${esc(t("m_color"))}</label><input id="m_color" value="${esc(p?.color || "")}"></div>
        <div><label>${esc(t("m_family"))}</label><input id="m_family" value="${esc(p?.family || "")}"></div>
      </div>
      <div class="grid cols-2">
        <div><label>${esc(t("m_kind"))}</label><input id="m_kind" value="${esc(p?.kind || "")}"></div>
        <div><label>${esc(t("m_application"))}</label><input id="m_application" value="${esc(p?.application || "")}"></div>
      </div>
      <label>${esc(t("m_desc_en"))}</label><textarea id="m_desc_en">${esc(p?.description_en || "")}</textarea>
      <label>${esc(t("m_desc_ar"))}</label><textarea id="m_desc_ar" dir-auto>${esc(p?.description_ar || "")}</textarea>
      <div class="grid cols-2">
        <div><label>${esc(t("m_price"))}</label><input id="m_price" type="number" step="0.01" value="${p?.price ?? ""}"></div>
        <div><label style="display:flex;align-items:center;gap:6px;margin-top:22px;"><input type="checkbox" id="m_dummy" ${p?.default_dummy !== false ? "checked" : ""} style="width:auto;"> ${esc(t("m_dummy_default"))}</label></div>
      </div>
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">${esc(t("cancel"))}</button><button type="button" id="saveBtn">${esc(t("save"))}</button></div>
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
          if (!payload.code) { toast(t("msg_code_required"), "error"); return; }
          await api("POST", "/products", payload);
        } else {
          await api("PATCH", `/products/${p.id}`, payload);
        }
        toast(t("saved"), "success");
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
      <div class="flex-between"><h2 style="margin:0;">${esc(t("dist_title"))}</h2>
        <button id="addDistBtn" class="secondary">${esc(t("dist_add"))}</button></div>
      <div id="wrap" class="mt"><p class="muted">${esc(t("loading"))}</p></div>
    </div>
  `;
  qs("#addDistBtn").addEventListener("click", () => openDistModal());

  async function load() {
    const dists = await api("GET", "/distributors");
    const wrap = qs("#wrap");
    wrap.innerHTML = dists.map((d) => `
      <div class="line-item-row">
        <div class="flex-between">
          <div><b dir-auto>${esc(d.name)}</b> <span class="badge">${esc(d.type === "trader" ? t("type_trader") : t("type_distributor"))}</span> <span class="small muted" dir-auto>${esc(d.governorate || "")}</span></div>
          <div>
            <button type="button" class="ghost edit-dist-btn" data-id="${d.id}">${esc(t("edit"))}</button>
            <button type="button" class="ghost add-room-btn" data-id="${d.id}">${esc(t("dist_add_showroom"))}</button>
          </div>
        </div>
        <div class="rooms-wrap mt" data-dist="${d.id}"><span class="small muted">${esc(t("dist_loading_showrooms"))}</span></div>
      </div>
    `).join("");

    for (const d of dists) {
      const rooms = await showroomsFor2(d.id);
      const box = qs(`.rooms-wrap[data-dist="${d.id}"]`, wrap);
      box.innerHTML = rooms.length
        ? `<table><thead><tr><th>${esc(t("col_showroom_th"))}</th><th>${esc(t("col_address"))}</th><th>${esc(t("col_governorate"))}</th><th>${esc(t("col_phone"))}</th><th>${esc(t("col_min_order"))}</th><th></th></tr></thead><tbody>
            ${rooms.map((r) => `<tr>
              <td dir-auto>${esc(r.name)}</td><td dir-auto>${esc(r.address || "")}</td><td dir-auto>${esc(r.governorate || "")}</td>
              <td>${esc(r.phone || "")}</td><td>${r.min_order_qty}</td>
              <td><button type="button" class="ghost edit-room-btn" data-id="${r.id}" data-dist="${d.id}">${esc(t("edit"))}</button></td>
            </tr>`).join("")}
          </tbody></table>`
        : `<span class="small muted">${esc(t("dist_no_showrooms"))}</span>`;
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
      <h3>${isNew ? esc(t("modal_add_dist")) : esc(t("modal_edit_dist"))}</h3>
      <label>${esc(t("m_name"))}</label><input id="m_name" value="${esc(d?.name || "")}" dir-auto>
      <div class="grid cols-2">
        <div><label>${esc(t("m_type"))}</label><select id="m_type">
          <option value="distributor" ${d?.type === "distributor" ? "selected" : ""}>${esc(t("type_distributor"))}</option>
          <option value="trader" ${d?.type === "trader" ? "selected" : ""}>${esc(t("type_trader"))}</option>
        </select></div>
        <div><label>${esc(t("col_governorate"))}</label><input id="m_gov" value="${esc(d?.governorate || "")}" dir-auto></div>
      </div>
      <label>${esc(t("col_phone"))}</label><input id="m_phone" value="${esc(d?.phone || "")}">
      <label>${esc(t("notesLabel"))}</label><textarea id="m_notes">${esc(d?.notes || "")}</textarea>
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">${esc(t("cancel"))}</button><button type="button" id="saveBtn">${esc(t("save"))}</button></div>
    </div></div>`);
    document.body.appendChild(backdrop);
    qs("#cancelBtn", backdrop).addEventListener("click", () => backdrop.remove());
    qs("#saveBtn", backdrop).addEventListener("click", async () => {
      const payload = {
        name: qs("#m_name", backdrop).value.trim(), type: qs("#m_type", backdrop).value,
        governorate: qs("#m_gov", backdrop).value, phone: qs("#m_phone", backdrop).value,
        notes: qs("#m_notes", backdrop).value,
      };
      if (!payload.name) { toast(t("msg_name_required"), "error"); return; }
      try {
        if (isNew) await api("POST", "/distributors", payload);
        else await api("PATCH", `/distributors/${d.id}`, payload);
        toast(t("saved"), "success");
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
      <h3>${isNew ? esc(t("modal_add_room")) : esc(t("modal_edit_room"))}</h3>
      <label>${esc(t("m_name"))}</label><input id="m_name" value="${esc(r?.name || "")}" dir-auto>
      <label>${esc(t("m_address"))}</label><input id="m_address" value="${esc(r?.address || "")}" dir-auto>
      <div class="grid cols-2">
        <div><label>${esc(t("col_governorate"))}</label><input id="m_gov" value="${esc(r?.governorate || "")}" dir-auto></div>
        <div><label>${esc(t("m_area"))}</label><input id="m_area" value="${esc(r?.area || "")}" dir-auto></div>
      </div>
      <div class="grid cols-2">
        <div><label>${esc(t("col_phone"))}</label><input id="m_phone" value="${esc(r?.phone || "")}"></div>
        <div><label>${esc(t("m_moq"))}</label><input id="m_moq" type="number" min="1" value="${r?.min_order_qty ?? 5}"></div>
      </div>
      <label>${esc(t("m_contact"))}</label><input id="m_contact" value="${esc(r?.contact_person || "")}" dir-auto>
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">${esc(t("cancel"))}</button><button type="button" id="saveBtn">${esc(t("save"))}</button></div>
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
      if (!payload.name) { toast(t("msg_name_required"), "error"); return; }
      try {
        if (isNew) await api("POST", "/showrooms", payload);
        else await api("PATCH", `/showrooms/${r.id}`, payload);
        toast(t("saved"), "success");
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
      <div class="flex-between"><h2 style="margin:0;">${esc(t("users_title"))}</h2><button id="addUserBtn" class="secondary">${esc(t("users_add"))}</button></div>
      <div id="wrap" class="mt"><p class="muted">${esc(t("loading"))}</p></div>
    </div>
  `;
  qs("#addUserBtn").addEventListener("click", () => openUserModal());

  async function load() {
    const users = await api("GET", "/users");
    const wrap = qs("#wrap");
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>${esc(t("col_name"))}</th><th>${esc(t("col_email"))}</th><th>${esc(t("col_role"))}</th><th>${esc(t("col_area"))}</th><th>${esc(t("active"))}</th><th></th>
    </tr></thead><tbody>
      ${users.map((u) => `<tr style="${u.active ? "" : "opacity:0.5;"}">
        <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(roleLabel(u.role))}</td>
        <td>${esc(u.area || "-")}</td><td>${u.active ? esc(t("yes")) : esc(t("no"))}</td>
        <td><button type="button" class="ghost edit-user-btn" data-id="${u.id}">${esc(t("edit"))}</button></td>
      </tr>`).join("")}
    </tbody></table></div>`;
    qsa(".edit-user-btn", wrap).forEach((b) => b.addEventListener("click", () => openUserModal(users.find((u) => u.id === Number(b.dataset.id)))));
  }

  function openUserModal(u) {
    const isNew = !u;
    const roles = ["admin", "sales_manager", "commercial_director", "factory", "warehouse", "assembly"];
    const backdrop = el(`<div class="modal-backdrop"><div class="modal">
      <h3>${isNew ? esc(t("modal_add_user")) : esc(t("modal_edit_user"))}</h3>
      <label>${esc(t("m_name"))}</label><input id="m_name" value="${esc(u?.name || "")}">
      <label>${esc(t("m_email"))}</label><input id="m_email" type="email" value="${esc(u?.email || "")}" ${isNew ? "" : "readonly"}>
      <label>${esc(t("m_role"))}</label><select id="m_role">${roles.map((r) => `<option value="${r}" ${u?.role === r ? "selected" : ""}>${esc(roleLabel(r))}</option>`).join("")}</select>
      <label>${esc(t("m_area_sales"))}</label><input id="m_area" value="${esc(u?.area || "")}">
      <label>${esc(t("m_phone"))}</label><input id="m_phone" value="${esc(u?.phone || "")}">
      <label>${isNew ? esc(t("m_password")) : esc(t("m_password_edit"))}</label><input id="m_pw" type="password">
      ${!isNew ? `<label style="display:flex;align-items:center;gap:6px;margin-top:10px;"><input type="checkbox" id="m_active" ${u.active ? "checked" : ""} style="width:auto;"> ${esc(t("active"))}</label>` : ""}
      <div class="right mt"><button type="button" class="secondary" id="cancelBtn">${esc(t("cancel"))}</button><button type="button" id="saveBtn">${esc(t("save"))}</button></div>
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
          if (!payload.name || !payload.email || !payload.password) { toast(t("msg_user_required"), "error"); return; }
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
        toast(t("saved"), "success");
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
      if (CURRENT_USER.language && CURRENT_USER.language !== LANG) setLang(CURRENT_USER.language);
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
    if (parts[0] === "issues") return viewShipmentIssues();
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
