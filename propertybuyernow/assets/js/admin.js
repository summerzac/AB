/* ==========================================================================
   Property Buyer Now — admin panel logic
   --------------------------------------------------------------------------
   SECURITY NOTE: the login below is a front-end demo gate only. Anyone can
   bypass client-side JavaScript. Before launch, replace it with real
   server-side authentication (see README "Going to production").
   ========================================================================== */

(function () {
  "use strict";

  var Store = window.LeadStore;

  /* ---- demo auth ---------------------------------------------------------- */
  var DEMO_USER = "admin";
  var DEMO_PASS = "buyer2026";
  var SESSION_KEY = "pbn_admin_session";

  var loginView = document.getElementById("login-view");
  var adminView = document.getElementById("admin-view");

  function isAuthed() { return sessionStorage.getItem(SESSION_KEY) === "1"; }

  function renderAuth() {
    if (isAuthed()) {
      loginView.style.display = "none";
      adminView.classList.add("authed");
      refresh();
    } else {
      loginView.style.display = "flex";
      adminView.classList.remove("authed");
    }
  }

  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var u = document.getElementById("login-user").value.trim();
    var p = document.getElementById("login-pass").value;
    if (u === DEMO_USER && p === DEMO_PASS) {
      sessionStorage.setItem(SESSION_KEY, "1");
      document.getElementById("login-error").classList.remove("show");
      renderAuth();
    } else {
      document.getElementById("login-error").classList.add("show");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", function (e) {
    e.preventDefault();
    sessionStorage.removeItem(SESSION_KEY);
    renderAuth();
  });

  /* ---- state -------------------------------------------------------------- */
  var currentFilter = "all";
  var currentSearch = "";
  var currentSort = "newest";
  var leadsCache = [];
  var openLeadId = null;

  var gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ---- rendering ----------------------------------------------------------- */
  function refresh() {
    Store.list().then(function (leads) {
      leadsCache = leads;
      renderKpis(leads);
      renderTable();
      if (openLeadId) {
        var lead = leads.find(function (l) { return l.id === openLeadId; });
        if (lead) renderDrawer(lead);
      }
    });
  }

  function renderKpis(leads) {
    var offerLeads = leads.filter(function (l) { return l.type === "offer_request"; });
    var weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    var thisWeek = leads.filter(function (l) { return new Date(l.createdAt).getTime() > weekAgo; }).length;
    var newCount = leads.filter(function (l) { return l.status === "new"; }).length;
    var offers = leads.filter(function (l) { return l.status === "offer_made" || l.status === "offer_accepted"; }).length;
    var pipeline = offerLeads
      .filter(function (l) { return l.status !== "completed" && l.status !== "declined"; })
      .reduce(function (sum, l) { return sum + (Number(l.data.estimatedValue) || 0); }, 0);

    document.getElementById("kpi-total").textContent = String(leads.length);
    document.getElementById("kpi-total-sub").textContent = thisWeek + " in the last 7 days";
    document.getElementById("kpi-new").textContent = String(newCount);
    document.getElementById("kpi-offers").textContent = String(offers);
    document.getElementById("kpi-value").textContent = gbp.format(pipeline);
  }

  function visibleLeads() {
    var list = leadsCache.slice();
    if (currentFilter === "enquiry") {
      list = list.filter(function (l) { return l.type === "enquiry"; });
    } else if (currentFilter !== "all") {
      list = list.filter(function (l) { return l.status === currentFilter; });
    }
    if (currentSearch) {
      var q = currentSearch.toLowerCase();
      list = list.filter(function (l) {
        return [l.ref, l.data.name, l.data.postcode, l.data.email, l.data.phone, l.data.address]
          .some(function (v) { return v && String(v).toLowerCase().indexOf(q) !== -1; });
      });
    }
    list.sort(function (a, b) {
      if (currentSort === "oldest") return a.createdAt < b.createdAt ? -1 : 1;
      if (currentSort === "value") return (Number(b.data.estimatedValue) || 0) - (Number(a.data.estimatedValue) || 0);
      return a.createdAt > b.createdAt ? -1 : 1;
    });
    return list;
  }

  function renderTable() {
    var body = document.getElementById("leads-body");
    var list = visibleLeads();
    body.innerHTML = "";

    if (!list.length) {
      var tr = document.createElement("tr");
      tr.className = "empty";
      tr.innerHTML = '<td colspan="8">No leads here yet. Submit the offer form on the site, or click &ldquo;Seed demo data&rdquo; to explore.</td>';
      body.appendChild(tr);
      return;
    }

    list.forEach(function (l) {
      var tr = document.createElement("tr");
      tr.tabIndex = 0;
      var isEnquiry = l.type === "enquiry";
      var badge = isEnquiry
        ? '<span class="badge enquiry">Enquiry</span> '
        : "";
      tr.innerHTML =
        "<td>" + esc(l.ref) + "</td>" +
        "<td>" + fmtDate(l.createdAt) + "</td>" +
        "<td>" + badge + esc(l.data.name || "—") + "</td>" +
        "<td>" + esc(l.data.postcode || "—") + "</td>" +
        "<td>" + esc(isEnquiry ? "—" : ((l.data.bedrooms || "?") + "-bed " + (l.data.propertyType || ""))) + "</td>" +
        "<td>" + esc(l.data.timeframe || "—") + "</td>" +
        "<td>" + (l.data.estimatedValue ? gbp.format(l.data.estimatedValue) : "—") + "</td>" +
        '<td><span class="badge ' + l.status + '">' + esc(Store.STATUS_LABELS[l.status] || l.status) + "</span></td>";
      tr.addEventListener("click", function () { openDrawer(l.id); });
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") openDrawer(l.id); });
      body.appendChild(tr);
    });
  }

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---- drawer --------------------------------------------------------------- */
  var drawer = document.getElementById("drawer");
  var mask = document.getElementById("drawer-mask");

  function openDrawer(id) {
    openLeadId = id;
    var lead = leadsCache.find(function (l) { return l.id === id; });
    if (!lead) return;
    renderDrawer(lead);
    drawer.classList.add("open");
    mask.classList.add("open");
  }

  function closeDrawer() {
    openLeadId = null;
    drawer.classList.remove("open");
    mask.classList.remove("open");
  }

  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  mask.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  function kv(dl, pairs) {
    dl.innerHTML = "";
    pairs.forEach(function (p) {
      if (p[1] === undefined || p[1] === null || p[1] === "") return;
      var dt = document.createElement("dt"); dt.textContent = p[0];
      var dd = document.createElement("dd"); dd.textContent = String(p[1]);
      dl.appendChild(dt); dl.appendChild(dd);
    });
  }

  function renderDrawer(lead) {
    var d = lead.data;
    document.getElementById("d-name").textContent = d.name || "(no name)";
    document.getElementById("d-ref").textContent = lead.ref + " · received " + fmtDate(lead.createdAt);

    var statusSel = document.getElementById("d-status");
    statusSel.innerHTML = "";
    Store.STATUSES.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = Store.STATUS_LABELS[s];
      if (s === lead.status) opt.selected = true;
      statusSel.appendChild(opt);
    });

    kv(document.getElementById("d-contact"), [
      ["Phone", d.phone], ["Email", d.email], ["Best time", d.contactTime],
      ["Consent given", d.consent === undefined ? undefined : (d.consent ? "Yes" : "No")]
    ]);

    kv(document.getElementById("d-property"), lead.type === "enquiry"
      ? [["Type", "General enquiry"], ["Message", d.message]]
      : [
        ["Address", d.address], ["Postcode", d.postcode], ["Property", d.propertyType],
        ["Bedrooms", d.bedrooms], ["Condition", d.condition], ["Reason", d.reason],
        ["Timeframe", d.timeframe],
        ["Seller's estimate", d.estimatedValue ? gbp.format(d.estimatedValue) : undefined]
      ]);

    var band = Store.estimateOffer(d.estimatedValue);
    document.getElementById("d-offer").textContent = band
      ? gbp.format(band.low) + " – " + gbp.format(band.high) + " (80–85% of seller's estimate)"
      : "No value estimate provided — obtain comparables before offering.";

    var notes = document.getElementById("d-notes");
    notes.innerHTML = lead.notes.length ? "" : '<p style="color:var(--muted);font-size:0.86rem;">No notes yet.</p>';
    lead.notes.slice().reverse().forEach(function (n) {
      var div = document.createElement("div");
      div.className = "note";
      div.textContent = n.text;
      var at = document.createElement("span");
      at.className = "at";
      at.textContent = fmtDate(n.at);
      div.appendChild(at);
      notes.appendChild(div);
    });

    var act = document.getElementById("d-activity");
    act.innerHTML = "";
    lead.activity.slice().reverse().forEach(function (a) {
      var li = document.createElement("li");
      li.textContent = fmtDate(a.at) + " — " + a.text;
      act.appendChild(li);
    });

    document.getElementById("d-call").href = d.phone ? "tel:" + String(d.phone).replace(/\s+/g, "") : "#";
    document.getElementById("d-email").href = d.email ? "mailto:" + d.email : "#";
  }

  document.getElementById("d-status").addEventListener("change", function () {
    if (!openLeadId) return;
    Store.setStatus(openLeadId, this.value).then(function () {
      toast("Status updated");
      refresh();
    });
  });

  document.getElementById("note-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("note-input");
    var text = input.value.trim();
    if (!text || !openLeadId) return;
    Store.addNote(openLeadId, text).then(function () {
      input.value = "";
      refresh();
    });
  });

  document.getElementById("d-delete").addEventListener("click", function () {
    if (!openLeadId) return;
    if (!confirm("Delete this lead permanently?")) return;
    Store.remove(openLeadId).then(function () {
      closeDrawer();
      toast("Lead deleted");
      refresh();
    });
  });

  /* ---- toolbar ---------------------------------------------------------------- */
  document.querySelectorAll(".admin-side nav button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".admin-side nav button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      document.getElementById("view-title").textContent = btn.textContent.replace(/^\S+\s/, "").trim() === "All leads"
        ? "All leads" : btn.textContent.trim();
      renderTable();
    });
  });

  document.getElementById("search").addEventListener("input", function () {
    currentSearch = this.value.trim();
    renderTable();
  });

  document.getElementById("sort").addEventListener("change", function () {
    currentSort = this.value;
    renderTable();
  });

  document.getElementById("btn-export").addEventListener("click", function () {
    Store.list().then(function (leads) {
      var csv = Store.toCsv(leads);
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pbn-leads-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("CSV exported");
    });
  });

  document.getElementById("btn-seed").addEventListener("click", function () {
    Store.seedDemo().then(function () {
      toast("Demo leads added");
      refresh();
    });
  });

  document.getElementById("btn-clear").addEventListener("click", function () {
    if (!confirm("Delete ALL leads? This cannot be undone.")) return;
    Store.clearAll().then(function () {
      toast("All leads cleared");
      refresh();
    });
  });

  renderAuth();
})();
