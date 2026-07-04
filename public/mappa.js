// ============================================================================
//  Grapes — La Mappa del vino vero. Scoperta sul territorio (stile guida
//  natural-wine) + il nostro differenziante: compra diretto dalla cantina.
// ============================================================================
const $ = (s, r = document) => r.querySelector(s);
const api = (u) => fetch(u).then((r) => r.json());
const eur = (n) => "€ " + Number(n).toFixed(2).replace(".", ",");
let LANG = localStorage.getItem("grapes_lang") || "it";

const I18N = {
  brand_sub: { it: "dalla cantina alla tavola", en: "from cellar door to table" },
  nav_wineries: { it: "Le cantine", en: "The wineries" },
  nav_wines: { it: "I vini", en: "The wines" },
  map_h1: { it: "La Mappa del vino vero", en: "The Real Wine Map" },
  map_p: {
    it: "Scopri le cantine sul territorio — poi compra diretto, senza muoverti.",
    en: "Discover wineries on the land — then buy direct, without moving.",
  },
  all: { it: "Tutte", en: "All" },
  count: { it: "{n} cantine sulla mappa · {r} regioni", en: "{n} wineries on the map · {r} regions" },
  founded: { it: "dal", en: "since" },
  labels: { it: "etichette", en: "labels" },
  from: { it: "da", en: "from" },
  buy: { it: "🍷 Compra diretto", en: "🍷 Buy direct" },
  site: { it: "Sito ↗", en: "Site ↗" },
  prac_naturale: { it: "Naturale", en: "Natural" },
  prac_biodinamica: { it: "Biodinamica", en: "Biodynamic" },
  prac_biologica: { it: "Biologica", en: "Organic" },
  prac_eroica: { it: "Eroica", en: "Heroic" },
  growers_chip: { it: "🍇 Registro vignaioli", en: "🍇 Growers registry" },
  count_g: { it: "{n} cantine in vendita · {g} vignaioli censiti · {r} regioni", en: "{n} wineries on sale · {g} growers indexed · {r} regions" },
  g_note: { it: "Profilo completo e vendita diretta in arrivo.", en: "Full profile and direct sales coming soon." },
  g_source: { it: "Fonte", en: "Source" },
  g_claim: { it: "Sei questa cantina? Candidati →", en: "Is this your winery? Apply →" },
  sources_note: { it: "Registro indipendente · fonti: elenchi soci pubblici VinNatur e ViniVeri", en: "Independent registry · sources: public member rosters of VinNatur and ViniVeri" },
};
const T = (k, vars) => {
  let s = (I18N[k] || {})[LANG] || (I18N[k] || {}).it || k;
  if (vars) for (const [key, v] of Object.entries(vars)) s = s.replace(`{${key}}`, v);
  return s;
};
const PRACTICES = [
  { key: "naturale", emoji: "🍃" }, { key: "biodinamica", emoji: "☀️" },
  { key: "biologica", emoji: "🌱" }, { key: "eroica", emoji: "⛰️" },
];
const pracEmoji = (p) => (PRACTICES.find((x) => x.key === p) || {}).emoji || "";

let PLACES = [];
let GROWERS = [];
let markers = {};
let growerLayer = null;
let F = { region: null, practice: null, growers: true };

// ---- Mappa -------------------------------------------------------------------
const map = L.map("map", { zoomControl: true, attributionControl: true })
  .setView([42.6, 11.5], 6);
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 18,
}).addTo(map);

function markerClass(p) {
  const ps = p.practices || [];
  if (ps.includes("eroica")) return "mk-eroica";
  if (ps.includes("biodinamica")) return "mk-biodinamica";
  if (ps.includes("naturale") || ps.includes("biologica")) return "mk-naturale";
  return "mk-default";
}
function markerIcon(p) {
  const ps = p.practices || [];
  const emo = ps.includes("eroica") ? "⛰️" : ps.includes("biodinamica") ? "☀️"
    : ps.includes("naturale") ? "🍃" : ps.includes("biologica") ? "🌱" : "🍷";
  return L.divIcon({
    className: "",
    html: `<div class="wmark ${markerClass(p)}"><span>${emo}</span></div>`,
    iconSize: [34, 34], iconAnchor: [17, 30], popupAnchor: [0, -28],
  });
}

function story(p) { return LANG === "en" ? p.story_en : p.story_it; }

function popupHtml(p) {
  const badges = (p.practices || [])
    .map((x) => `<span class="prac-badge pb-${x}">${pracEmoji(x)} ${T("prac_" + x)}</span>`)
    .join(" ");
  return `<div class="pp">
    <img class="pp-photo" src="${p.image}" alt="${p.name}" />
    <div class="pp-body">
      <h3>${p.name}</h3>
      <div class="pp-meta">${p.town} · ${T("founded")} ${p.founded}</div>
      <div class="prac-badges" style="margin:0 0 2px">${badges}</div>
      <div class="pp-story">${story(p)}</div>
      <div class="pp-cta">
        <a class="btn" style="background:var(--bordeaux);color:#fff" href="/?winery=${p.id}#vini">${T("buy")}</a>
        <a class="btn ghost" href="${p.website}" target="_blank" rel="noopener">${T("site")}</a>
      </div>
    </div>
  </div>`;
}

// ---- Filtri + lista -------------------------------------------------------------
function visible() {
  return PLACES.filter(
    (p) =>
      (!F.region || p.region === F.region) &&
      (!F.practice || (p.practices || []).includes(F.practice))
  );
}

function renderFilters() {
  const regions = [...new Set([...PLACES.map((p) => p.region), ...GROWERS.map((g) => g.region)])].sort();
  const chips = [
    `<button class="chip ${!F.region && !F.practice ? "active" : ""}" data-f="all">${T("all")}</button>`,
    ...regions.map((r) =>
      `<button class="chip ${F.region === r ? "active" : ""}" data-f="r:${r}">${r}</button>`),
    `<button class="chip ${F.growers ? "active" : ""}" data-f="g" style="${F.growers ? "background:#5a4a6b;border-color:#5a4a6b;color:#fff" : ""}">${T("growers_chip")} <span class="n">${GROWERS.length}</span></button>`,
    ...PRACTICES.filter((p) => PLACES.some((x) => (x.practices || []).includes(p.key))).map((p) =>
      `<button class="chip prac ${F.practice === p.key ? "active" : ""}" data-f="p:${p.key}" style="${F.practice === p.key ? "background:var(--bordeaux);border-color:var(--bordeaux);color:#fff" : ""}">${p.emoji} ${T("prac_" + p.key)}</button>`),
  ];
  $("#msFilters").innerHTML = chips.join("");
  $("#msFilters").querySelectorAll(".chip").forEach((b) =>
    b.addEventListener("click", () => {
      const f = b.dataset.f;
      if (f === "all") { F.region = null; F.practice = null; }
      else if (f === "g") F.growers = !F.growers;
      else if (f.startsWith("r:")) F.region = F.region === f.slice(2) ? null : f.slice(2);
      else F.practice = F.practice === f.slice(2) ? null : f.slice(2);
      renderAll();
    })
  );
}

function renderList() {
  const list = visible();
  const gs = visibleGrowers();
  $("#msCount").textContent = T("count_g", { n: list.length, g: gs.length, r: new Set([...list.map((p) => p.region), ...gs.map((g) => g.region)]).size });
  $("#msList").innerHTML = list
    .map(
      (p) => `
    <div class="pl-card" data-id="${p.id}">
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      <div class="pl-main">
        <h3>${p.name}</h3>
        <div class="pl-meta">${p.localita} <span>· ${p.region} · ${T("founded")} ${p.founded}</span></div>
        <div class="pl-badges">${(p.practices || []).map((x) => `<span class="prac-badge pb-${x}">${pracEmoji(x)} ${T("prac_" + x)}</span>`).join("")}</div>
        <div class="pl-from">${p.wines} ${T("labels")} · ${T("from")} <b>${eur(p.priceFrom)}</b></div>
      </div>
    </div>`
    )
    .join("");
  $("#msList").querySelectorAll(".pl-card").forEach((c) =>
    c.addEventListener("click", () => focusPlace(c.dataset.id))
  );
}

function visibleGrowers() {
  if (!F.growers) return [];
  if (F.practice && F.practice !== "naturale") return [];
  return GROWERS.filter((g) => !F.region || g.region === F.region);
}

function growerPopup(g) {
  const site = g.website ? `<a class="btn ghost" href="${g.website}" target="_blank" rel="noopener">${T("site")}</a>` : "";
  return `<div class="pp"><div class="pp-body">
    <h3>${g.name}</h3>
    <div class="pp-meta">${g.comune}${g.provincia ? " (" + g.provincia + ")" : ""} · ${g.region}</div>
    <div class="pp-story">${T("g_note")}<br/><small>${T("g_source")}: ${g.sources.join(", ")}</small></div>
    <div class="pp-cta">
      <a class="btn" style="background:#5a4a6b;color:#fff" href="/#cantine">${T("g_claim")}</a>
      ${site}
    </div>
  </div></div>`;
}

function renderMarkers() {
  Object.values(markers).forEach((m) => map.removeLayer(m));
  markers = {};
  visible().forEach((p) => {
    const m = L.marker([p.lat, p.lng], { icon: markerIcon(p) })
      .addTo(map)
      .bindPopup(popupHtml(p), { closeButton: true });
    m.on("click", () => highlight(p.id));
    markers[p.id] = m;
  });
  if (growerLayer) { map.removeLayer(growerLayer); growerLayer = null; }
  const gs = visibleGrowers();
  if (gs.length) {
    growerLayer = L.layerGroup(
      gs.map((g) =>
        L.circleMarker([g.lat, g.lng], {
          radius: 5.5, color: "#5a4a6b", weight: 1.5,
          fillColor: "#8a76a8", fillOpacity: 0.75,
        }).bindPopup(growerPopup(g))
      )
    ).addTo(map);
  }
  const list = visible();
  const pts = [...list.map((p) => [p.lat, p.lng]), ...gs.map((g) => [g.lat, g.lng])];
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.1));
}

function highlight(id) {
  document.querySelectorAll(".pl-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.id === id)
  );
  const card = document.querySelector(`.pl-card[data-id="${id}"]`);
  if (card) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function focusPlace(id) {
  const p = PLACES.find((x) => x.id === id);
  if (!p) return;
  map.flyTo([p.lat, p.lng], 10, { duration: 0.7 });
  setTimeout(() => markers[id] && markers[id].openPopup(), 750);
  highlight(id);
}

function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (I18N[k]) el.innerHTML = T(k);
  });
  $("#langBtn").textContent = LANG === "it" ? "EN" : "IT";
}

function renderAll() {
  applyI18n();
  renderFilters();
  renderList();
  renderMarkers();
}

$("#langBtn").addEventListener("click", () => {
  LANG = LANG === "it" ? "en" : "it";
  localStorage.setItem("grapes_lang", LANG);
  renderAll();
});

Promise.all([api("/api/places"), api("/api/growers")]).then(([d, g]) => {
  PLACES = d;
  GROWERS = g;
  renderAll();
  // deep-link: /mappa.html?focus=<id>
  const focus = new URLSearchParams(location.search).get("focus");
  if (focus) setTimeout(() => focusPlace(focus), 400);
});
