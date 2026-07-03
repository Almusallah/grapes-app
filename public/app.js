// ============================================================================
//  Grapes — frontend SPA (bilingue IT/EN)
// ============================================================================
const $ = (s, r = document) => r.querySelector(s);
const api = (u, opts) => fetch(u, opts).then((r) => r.json());
const eur = (n) => "€ " + Number(n).toFixed(2).replace(".", ",");

let WINERIES = [];
let WINES = [];
let CART = JSON.parse(localStorage.getItem("grapes_cart") || "{}"); // {wineId: qty}
let LANG = localStorage.getItem("grapes_lang") || "it";
let filterWinery = null;
let filterType = null;
let lastShip = null;

// ---- i18n -------------------------------------------------------------------
const I18N = {
  announce: {
    it: "Vendita diretta dalle cantine · Spedizione gratuita sopra €89 · Solo maggiorenni 18+",
    en: "Direct from the wineries · Free shipping over €89 · Adults 18+ only",
  },
  brand_sub: { it: "dalla cantina alla tavola", en: "from cellar door to table" },
  search_ph: { it: "Cerca vini, cantine, denominazioni…", en: "Search wines, wineries, appellations…" },
  join_btn: { it: "Sei una cantina?", en: "Are you a winery?" },
  cart: { it: "Carrello", en: "Cart" },
  hero_eyebrow: { it: "Vendita diretta · cantine italiane vere", en: "Direct sales · real Italian wineries" },
  hero_h1: { it: "Dalla cantina <em>alla tua tavola.</em>", en: "From the cellar door <em>to your table.</em>" },
  hero_p: {
    it: "Le piccole e medie cantine italiane fanno troppi passaggi per arrivare a te — e tu troppi viaggi per scoprirle. Su Grapes leggi la storia di ogni cantina in un minuto e compri i suoi vini <b>direttamente</b>, al prezzo di cantina.",
    en: "Italy's small and mid-sized wineries go through too many middlemen to reach you — and you travel too far to discover them. On Grapes you read each winery's story in a minute and buy its wines <b>directly</b>, at cellar-door prices.",
  },
  hero_cta1: { it: "Scopri le cantine", en: "Meet the wineries" },
  hero_cta2: { it: "Tutti i vini", en: "All wines" },
  badge1: { it: "🍷 Prezzo di cantina", en: "🍷 Cellar-door price" },
  badge2: { it: "📦 Cartoni anti-urto", en: "📦 Shock-proof boxes" },
  badge3: { it: "🚚 Gratis sopra €89", en: "🚚 Free over €89" },
  float1_s: { it: "la più antica di Sardegna", en: "Sardinia's oldest winery" },
  float2_s: { it: "nove secoli di Chianti", en: "nine centuries of Chianti" },
  stat1: { it: "cantine fondatrici", en: "founding wineries" },
  stat2: { it: "etichette a catalogo", en: "labels listed" },
  stat3: { it: "passaggi intermedi", en: "middlemen" },
  stat4: { it: "l'anno della cantina più antica", en: "the oldest winery's founding year" },
  win_kicker: { it: "Le cantine", en: "The wineries" },
  win_h2: { it: "Ogni bottiglia ha una storia", en: "Every bottle has a story" },
  win_p: { it: "Famiglie, cooperative, castelli: leggi chi c'è dietro, poi assaggia.", en: "Families, co-operatives, castles: read who's behind it, then taste." },
  wine_kicker: { it: "La carta dei vini", en: "The wine list" },
  wine_h2: { it: "Compra diretto, paga il giusto", en: "Buy direct, pay what's fair" },
  wine_p: { it: "Prezzi di vendita diretta, come al banco della cantina.", en: "Direct-sale prices, just like at the cellar door." },
  how_kicker: { it: "Come funziona", en: "How it works" },
  how_h2: { it: "Meno passaggi, più valore a chi produce", en: "Fewer middlemen, more value to the maker" },
  how_p: { it: "La filiera classica del vino ha 3–4 intermediari. Grapes ne ha zero.", en: "The classic wine supply chain has 3–4 intermediaries. Grapes has zero." },
  how1_t: { it: "Leggi la storia", en: "Read the story" },
  how1_p: { it: "Un minuto per capire chi produce: la famiglia, il territorio, i vitigni. Niente schede anonime da scaffale.", en: "One minute to know the maker: the family, the land, the grapes. No anonymous shelf tags." },
  how2_t: { it: "Compra diretto", en: "Buy direct" },
  how2_p: { it: "Il prezzo è quello della vendita in cantina. Alla cantina va molto di più di quanto le lascerebbe la distribuzione.", en: "The price is the cellar-door price. The winery keeps far more than distribution would leave it." },
  how3_t: { it: "Ricevi a casa", en: "Delivered home" },
  how3_p: { it: "Cartoni anti-urto da 6, corriere convenzionato, gratis sopra €89. In 2 giorni (4 per le isole).", en: "Shock-proof 6-bottle boxes, partner courier, free over €89. In 2 days (4 for the islands)." },
  jb_kicker: { it: "Per le cantine", en: "For wineries" },
  jb_h2: { it: "Porta la tua cantina su Grapes", en: "Bring your winery to Grapes" },
  jb_p: {
    it: "Racconta la tua storia, carica le etichette, decidi tu il prezzo. Noi portiamo il cliente alla tua porta — senza che tu debba costruire un e-commerce, gestire la logistica o cedere margine alla distribuzione.",
    en: "Tell your story, list your labels, set your own price. We bring the customer to your door — without you building an e-commerce site, managing logistics, or giving margin away to distribution.",
  },
  jb_btn: { it: "Candida la tua cantina →", en: "Apply with your winery →" },
  foot_p: { it: "Il marketplace della vendita diretta: storie vere, prezzi di cantina, zero passaggi intermedi.", en: "The direct-sale marketplace: true stories, cellar-door prices, zero middlemen." },
  foot_buy: { it: "Comprare", en: "Buy" },
  foot_buy1: { it: "Le cantine", en: "The wineries" }, foot_buy2: { it: "I vini", en: "The wines" }, foot_buy3: { it: "Spedizioni", en: "Shipping" },
  foot_sell: { it: "Per le cantine", en: "For wineries" },
  foot_sell1: { it: "Candidati", en: "Apply" }, foot_sell2: { it: "Commissioni", en: "Fees" }, foot_sell3: { it: "Logistica", en: "Logistics" },
  foot_co1: { it: "Chi siamo", en: "About us" }, foot_co2: { it: "Contatti", en: "Contact" }, foot_co3: { it: "Investitori", en: "Investors" },
  foot_base: {
    it: "© 2026 Grapes — prototipo dimostrativo. Cantine, storie e prezzi reali dai siti ufficiali; ordini simulati. Bevi responsabilmente. 18+",
    en: "© 2026 Grapes — demo prototype. Real wineries, stories and prices from official sites; simulated orders. Drink responsibly. 18+",
  },
  drawer_h2: { it: "La tua cassa", en: "Your case" },
  // dynamic
  all: { it: "Tutte", en: "All" },
  all_types: { it: "Tutti i tipi", en: "All types" },
  founded: { it: "dal", en: "since" },
  see_wines: { it: "Vedi i vini", en: "See the wines" },
  website: { it: "Sito ufficiale ↗", en: "Official site ↗" },
  labels: { it: "etichette", en: "labels" },
  add: { it: "+ Aggiungi", en: "+ Add" },
  est: { it: "prezzo di cantina indicativo", en: "indicative cellar-door price" },
  none_found: { it: "Nessun vino trovato.", en: "No wines found." },
  empty_cart: { it: "La cassa è vuota 🍇", en: "Your case is empty 🍇" },
  bottles: { it: "bottiglie", en: "bottles" },
  cap_label: { it: "📍 CAP DI CONSEGNA", en: "📍 DELIVERY POSTCODE" },
  cap_ph: { it: "es. 09025 (Sanluri), 20121 (Milano)…", en: "e.g. 09025 (Sanluri), 20121 (Milan)…" },
  subtotal_row: { it: "Vini", en: "Wines" },
  shipping_row: { it: "Spedizione", en: "Shipping" },
  free: { it: "GRATIS", en: "FREE" },
  total_row: { it: "Totale", en: "Total" },
  ship_note: {
    it: "📦 Cartoni anti-urto da 6 · consegna in {d} giorni{free}",
    en: "📦 Shock-proof 6-bottle boxes · delivery in {d} days{free}",
  },
  ship_free_part: { it: " · spedizione gratuita!", en: " · free shipping!" },
  ship_missing: {
    it: "Aggiungi {n} per la spedizione gratuita",
    en: "Add {n} more for free shipping",
  },
  checkout_btn: { it: "Vai al checkout", en: "Go to checkout" },
  checkout: { it: "Checkout", en: "Checkout" },
  name_label: { it: "NOME E COGNOME", en: "FULL NAME" },
  addr_label: { it: "INDIRIZZO", en: "ADDRESS" },
  cap_short: { it: "CAP", en: "POSTCODE" },
  adult_label: {
    it: "Dichiaro di avere almeno 18 anni. La vendita di alcolici ai minori è vietata.",
    en: "I confirm I am at least 18 years old. Selling alcohol to minors is prohibited.",
  },
  confirm_order: { it: "Conferma ordine", en: "Confirm order" },
  fill_fields: { it: "Compila nome e CAP.", en: "Fill in your name and postcode." },
  need_adult: { it: "Devi confermare di essere maggiorenne.", en: "You must confirm you are of legal age." },
  order_error: { it: "Errore nell'ordine", en: "Order error" },
  order_ok: { it: "🍷 Ordine confermato", en: "🍷 Order confirmed" },
  thanks: { it: "Grazie", en: "Thank you" },
  order_confirmed: { it: "Ordine <b>{id}</b> confermato.", en: "Order <b>{id}</b> confirmed." },
  will_arrive: { it: "Le tue <b>{n} bottiglie</b> arriveranno in <b>{d} giorni</b>, in cartoni anti-urto.", en: "Your <b>{n} bottles</b> will arrive in <b>{d} days</b>, in shock-proof boxes." },
  keep_shopping: { it: "Continua la degustazione", en: "Keep tasting" },
  join_title: { it: "🍇 Candida la tua cantina", en: "🍇 Apply with your winery" },
  join_p: {
    it: "Raccontaci chi siete. Vi ricontattiamo per storia, foto, etichette e prezzi — decisi da voi.",
    en: "Tell us who you are. We'll get back to you about your story, photos, labels and prices — set by you.",
  },
  join_name: { it: "NOME DELLA CANTINA", en: "WINERY NAME" },
  join_loc: { it: "COMUNE E REGIONE", en: "TOWN AND REGION" },
  join_email: { it: "EMAIL", en: "EMAIL" },
  join_send: { it: "Invia candidatura", en: "Send application" },
  welcome: { it: "Benvenuti su Grapes", en: "Welcome to Grapes" },
  req_ok: { it: "Candidatura ricevuta!", en: "Application received!" },
  req_p: { it: "Vi contatteremo per l'onboarding: storia, foto, etichette e listino.", en: "We'll contact you for onboarding: story, photos, labels and price list." },
  close: { it: "Chiudi", en: "Close" },
  type_rosso: { it: "Rosso", en: "Red" },
  type_bianco: { it: "Bianco", en: "White" },
  type_bollicine: { it: "Bollicine", en: "Sparkling" },
  type_meditazione: { it: "Da meditazione", en: "Meditation wine" },
  type_rosato: { it: "Rosato", en: "Rosé" },
};
const T = (k, vars) => {
  let s = (I18N[k] || {})[LANG] || (I18N[k] || {}).it || k;
  if (vars) for (const [key, v] of Object.entries(vars)) s = s.replace(`{${key}}`, v);
  return s;
};
const loc = (obj, field) => (LANG === "en" && obj[field + "_en"]) ? obj[field + "_en"] : (obj[field + "_it"] ?? obj[field]);
const typeLabel = (t) => T("type_" + t);

function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (I18N[k]) el.innerHTML = T(k);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const k = el.dataset.i18nPh;
    if (I18N[k]) el.placeholder = T(k);
  });
  $("#langBtn").textContent = LANG === "it" ? "EN" : "IT";
}

function setLang(l) {
  LANG = l;
  localStorage.setItem("grapes_lang", l);
  applyI18n();
  renderWineries();
  renderFilters();
  renderWines();
  if ($("#drawer").classList.contains("open")) renderCart();
}

// ---- Init ---------------------------------------------------------------
async function init() {
  applyI18n();
  [WINERIES, WINES] = await Promise.all([api("/api/wineries"), api("/api/wines")]);
  $("#statWineries").textContent = WINERIES.length;
  $("#statWines").textContent = WINES.length;
  renderWineries();
  renderFilters();
  renderWines();
  renderCartBadge();
  wireUI();
}

// ---- Cantine --------------------------------------------------------------
function renderWineries() {
  $("#wineries").innerHTML = WINERIES.map(
    (w) => `
    <div class="winery-card">
      <div class="w-photo">
        <img src="${w.image}" alt="${w.name}" loading="lazy" />
        <span class="w-founded">${T("founded")} ${w.founded}</span>
        <span class="w-region">${w.region}</span>
      </div>
      <div class="w-body">
        <h3>${w.name}</h3>
        <div class="w-town">${w.town}</div>
        <p class="w-story">${loc(w, "story")}</p>
        <div class="w-actions">
          <button class="btn" data-winery="${w.id}">${T("see_wines")}</button>
          <a class="btn ghost" href="${w.website}" target="_blank" rel="noopener">${T("website")}</a>
          <span class="count">${w.wines.length} ${T("labels")}</span>
        </div>
      </div>
    </div>`
  ).join("");
  $("#wineries").querySelectorAll("[data-winery]").forEach((b) =>
    b.addEventListener("click", () => {
      filterWinery = b.dataset.winery;
      filterType = null;
      renderFilters();
      renderWines();
      document.querySelector("#vini").scrollIntoView({ behavior: "smooth" });
    })
  );
}

// ---- Filtri + vini ----------------------------------------------------------
function renderFilters() {
  const types = [...new Set(WINES.map((w) => w.type))];
  $("#filters").innerHTML =
    `<button class="chip ${!filterWinery && !filterType ? "active" : ""}" data-f="all">${T("all")}</button>` +
    WINERIES.map(
      (w) => `<button class="chip ${filterWinery === w.id ? "active" : ""}" data-f="w:${w.id}">${w.name.split("—")[0].trim()}</button>`
    ).join("") +
    types.map(
      (t) => `<button class="chip ${filterType === t ? "active" : ""}" data-f="t:${t}">${typeLabel(t)}</button>`
    ).join("");
  $("#filters").querySelectorAll(".chip").forEach((b) =>
    b.addEventListener("click", () => {
      const f = b.dataset.f;
      if (f === "all") { filterWinery = null; filterType = null; }
      else if (f.startsWith("w:")) { filterWinery = filterWinery === f.slice(2) ? null : f.slice(2); }
      else if (f.startsWith("t:")) { filterType = filterType === t2(f) ? null : t2(f); }
      renderFilters();
      renderWines();
    })
  );
  const t2 = (f) => f.slice(2);
}

function visibleWines() {
  let out = WINES;
  if (filterWinery) out = out.filter((w) => w.winery.id === filterWinery);
  if (filterType) out = out.filter((w) => w.type === filterType);
  const q = $("#searchInput").value.trim().toLowerCase();
  if (q)
    out = out.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.denom.toLowerCase().includes(q) ||
        w.winery.name.toLowerCase().includes(q) ||
        w.winery.region.toLowerCase().includes(q)
    );
  return out;
}

function renderWines() {
  const list = visibleWines();
  if (!list.length) {
    $("#wines").innerHTML = `<div class="empty">${T("none_found")}</div>`;
    return;
  }
  $("#wines").innerHTML = list.map(
    (w) => `
    <div class="wine-card">
      <div class="bottle">
        <span class="type-pill type-${w.type}">${typeLabel(w.type)}</span>
        <img src="${w.image}" alt="${w.name}" loading="lazy" />
      </div>
      <div class="v-body">
        <div class="v-winery">${w.winery.name} · ${w.winery.region}</div>
        <h3>${w.name}</h3>
        <div class="v-denom">${w.denom} · ${w.format}</div>
        <div class="price-row">
          <span class="price">${eur(w.price)}</span>
          <button class="add" data-add="${w.id}">${T("add")}</button>
        </div>
        ${w.price_estimated ? `<div class="est-note">* ${T("est")}</div>` : ""}
      </div>
    </div>`
  ).join("");
  $("#wines").querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", () => addToCart(b.dataset.add))
  );
}

// ---- Carrello ----------------------------------------------------------------
function saveCart() {
  localStorage.setItem("grapes_cart", JSON.stringify(CART));
  renderCartBadge();
}
function addToCart(id) {
  CART[id] = (CART[id] || 0) + 1;
  saveCart();
  openDrawer();
  renderCart();
}
function setQty(id, q) {
  if (q <= 0) delete CART[id];
  else CART[id] = q;
  saveCart();
  renderCart();
}
function renderCartBadge() {
  const n = Object.values(CART).reduce((a, b) => a + b, 0);
  const badge = $("#cartBadge");
  badge.textContent = n;
  badge.style.display = n ? "grid" : "none";
}
function cartLines() {
  return Object.entries(CART)
    .map(([id, qty]) => {
      const w = WINES.find((x) => x.id === id);
      return w ? { w, qty } : null;
    })
    .filter(Boolean);
}

async function renderCart() {
  const lines = cartLines();
  const body = $("#cartBody");
  const foot = $("#cartFoot");
  if (!lines.length) {
    body.innerHTML = `<div class="empty">${T("empty_cart")}</div>`;
    foot.innerHTML = "";
    return;
  }
  body.innerHTML = lines.map(
    ({ w, qty }) => `
    <div class="cart-item">
      <div class="ci-img"><img src="${w.image}" alt="" /></div>
      <div class="ci-main">
        <h4>${w.name}</h4>
        <small>${w.winery.name} · ${w.denom}</small>
        <div class="qty">
          <button data-dec="${w.id}">−</button>
          <span>${qty}</span>
          <button data-inc="${w.id}">+</button>
          <span class="ci-price" style="margin-left:auto">${eur(w.price * qty)}</span>
        </div>
      </div>
    </div>`
  ).join("");
  body.querySelectorAll("[data-inc]").forEach((b) =>
    b.addEventListener("click", () => setQty(b.dataset.inc, CART[b.dataset.inc] + 1))
  );
  body.querySelectorAll("[data-dec]").forEach((b) =>
    b.addEventListener("click", () => setQty(b.dataset.dec, CART[b.dataset.dec] - 1))
  );

  const subtot = lines.reduce((a, { w, qty }) => a + w.price * qty, 0);
  const bottles = lines.reduce((a, { qty }) => a + qty, 0);
  foot.innerHTML = `
    <div class="ship-box">
      <label>${T("cap_label")}</label>
      <input type="text" id="capInput" maxlength="5" inputmode="numeric" placeholder="${T("cap_ph")}" />
      <div id="shipArea"></div>
    </div>
    <div class="totals">
      <div class="row"><span>${T("subtotal_row")} (${bottles} ${T("bottles")})</span><span>${eur(subtot)}</span></div>
      <div class="row" id="shipRow"><span>${T("shipping_row")}</span><span>—</span></div>
      <div class="row grand"><span>${T("total_row")}</span><span id="grandTot">${eur(subtot)}</span></div>
    </div>
    <button class="btn block gold" id="checkoutBtn" style="margin-top:12px">${T("checkout_btn")}</button>
  `;
  $("#capInput").value = localStorage.getItem("grapes_cap") || "";
  $("#capInput").addEventListener("input", (e) => {
    const cap = e.target.value.replace(/\D/g, "").slice(0, 5);
    e.target.value = cap;
    localStorage.setItem("grapes_cap", cap);
    if (cap.length === 5) quoteShip(cap, subtot);
    else { $("#shipArea").innerHTML = ""; }
  });
  $("#checkoutBtn").addEventListener("click", () => openCheckout(subtot));
  if ($("#capInput").value.length === 5) quoteShip($("#capInput").value, subtot);
}

async function quoteShip(cap, subtot) {
  const items = Object.entries(CART).map(([wineId, qty]) => ({ wineId, qty }));
  const r = await api("/api/shipping/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cap, items }),
  });
  lastShip = r;
  const freePart = r.cost === 0 ? T("ship_free_part") : "";
  const missing = r.cost > 0 && r.subtotal < r.freeThreshold
    ? `<div class="ship-note" style="background:#f9efdd;color:#8a6a1f">🎯 ${T("ship_missing", { n: eur(r.freeThreshold - r.subtotal) })}</div>`
    : "";
  $("#shipArea").innerHTML = `
    <div class="ship-note">${T("ship_note", { d: r.days, free: freePart })}</div>${missing}`;
  $("#shipRow").innerHTML = `<span>${T("shipping_row")}</span><span>${r.cost === 0 ? T("free") : eur(r.cost)}</span>`;
  $("#grandTot").textContent = eur(subtot + r.cost);
}

// ---- Drawer / modal -----------------------------------------------------------
function openDrawer() {
  $("#drawer").classList.add("open");
  $("#overlay").classList.add("open");
  renderCart();
}
function closeDrawer() {
  $("#drawer").classList.remove("open");
  $("#overlay").classList.remove("open");
}
function showModal(html) {
  $("#modal").innerHTML = html;
  $("#modalBg").classList.add("open");
}
function closeModal() { $("#modalBg").classList.remove("open"); }

// ---- Checkout ------------------------------------------------------------------
function openCheckout(subtot) {
  const ship = lastShip && lastShip.ok ? lastShip.cost : null;
  showModal(`
    <div class="modal-head"><h2>${T("checkout")}</h2></div>
    <div class="modal-body">
      <div class="field"><label>${T("name_label")}</label><input id="ckNome" placeholder="Mario Rossi" /></div>
      <div class="field"><label>${T("addr_label")}</label><input id="ckInd" placeholder="Via Roma 1" /></div>
      <div class="field"><label>${T("cap_short")}</label><input id="ckCap" value="${localStorage.getItem("grapes_cap")||""}" maxlength="5" /></div>
      <label class="check"><input type="checkbox" id="ckAdult" /> ${T("adult_label")}</label>
      <div class="totals">
        <div class="row"><span>${T("subtotal_row")}</span><span>${eur(subtot)}</span></div>
        <div class="row"><span>${T("shipping_row")}</span><span>${ship === null ? "—" : ship === 0 ? T("free") : eur(ship)}</span></div>
        <div class="row grand"><span>${T("total_row")}</span><span>${eur(subtot + (ship || 0))}</span></div>
      </div>
      <button class="btn block gold" id="confirmOrder" style="margin-top:14px">${T("confirm_order")}</button>
    </div>`);
  $("#confirmOrder").addEventListener("click", confirmOrder);
}

async function confirmOrder() {
  const cliente = $("#ckNome").value.trim();
  const indirizzo = $("#ckInd").value.trim();
  const cap = $("#ckCap").value.trim();
  const adult = $("#ckAdult").checked;
  if (!cliente || !cap) { alert(T("fill_fields")); return; }
  if (!adult) { alert(T("need_adult")); return; }
  const items = Object.entries(CART).map(([wineId, qty]) => ({ wineId, qty }));
  const r = await api("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cliente, indirizzo, cap, items, adult }),
  });
  if (!r.ok) { alert(r.error || T("order_error")); return; }
  CART = {}; saveCart();
  closeDrawer();
  const o = r.order;
  showModal(`
    <div class="modal-head"><h2>${T("order_ok")}</h2></div>
    <div class="modal-body success-box">
      <div class="big">🍾</div>
      <h3>${T("thanks")}, ${o.cliente.split(" ")[0]}!</h3>
      <p>${T("order_confirmed", { id: o.id })}</p>
      <p>${T("will_arrive", { n: o.bottles, d: o.days })}</p>
      <p style="font-family:var(--serif);font-size:24px;font-weight:700;color:var(--bordeaux-ink)">${eur(o.total)}</p>
      <button class="btn gold" id="doneBtn">${T("keep_shopping")}</button>
    </div>`);
  $("#doneBtn").addEventListener("click", closeModal);
}

// ---- Candidatura cantine ---------------------------------------------------------
function openJoin() {
  showModal(`
    <div class="modal-head"><h2>${T("join_title")}</h2></div>
    <div class="modal-body">
      <p style="color:var(--grigio)">${T("join_p")}</p>
      <div class="field"><label>${T("join_name")}</label><input placeholder="Cantina…" /></div>
      <div class="field"><label>${T("join_loc")}</label><input placeholder="Sanluri · Sardegna" /></div>
      <div class="field"><label>${T("join_email")}</label><input placeholder="info@cantina.it" /></div>
      <button class="btn block gold" id="joinSend">${T("join_send")}</button>
    </div>`);
  $("#joinSend").addEventListener("click", () => {
    showModal(`
      <div class="modal-head"><h2>${T("welcome")}</h2></div>
      <div class="modal-body success-box">
        <div class="big">🤝</div>
        <h3>${T("req_ok")}</h3>
        <p>${T("req_p")}</p>
        <button class="btn gold" id="doneBtn2">${T("close")}</button>
      </div>`);
    $("#doneBtn2").addEventListener("click", closeModal);
  });
}

// ---- Wiring -----------------------------------------------------------------------
function wireUI() {
  $("#cartBtn").addEventListener("click", openDrawer);
  $("#closeDrawer").addEventListener("click", closeDrawer);
  $("#overlay").addEventListener("click", closeDrawer);
  $("#modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg") closeModal(); });
  $("#joinBtn").addEventListener("click", openJoin);
  $("#joinBtn2").addEventListener("click", openJoin);
  $("#langBtn").addEventListener("click", () => setLang(LANG === "it" ? "en" : "it"));
  let t;
  $("#searchInput").addEventListener("input", () => { clearTimeout(t); t = setTimeout(renderWines, 250); });
}

init();
