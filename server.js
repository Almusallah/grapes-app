// ============================================================================
//  Grapes — dal produttore alla tavola. Server.
// ============================================================================
import express from "express";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WINERIES } from "./src/wineries.js";
import { GROWERS } from "./src/growers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3300;

const DATA_DIR = join(__dirname, "data");
const ORDERS_FILE = join(DATA_DIR, "orders.json");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
let orders = [];
if (existsSync(ORDERS_FILE)) {
  try { orders = JSON.parse(readFileSync(ORDERS_FILE, "utf8")); } catch { orders = []; }
}

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// Vini "flat" con riferimento alla cantina.
function allWines() {
  return WINERIES.flatMap((w) =>
    w.wines.map((v) => ({
      ...v,
      winery: {
        id: w.id, name: w.name, town: w.town, region: w.region,
        localita: w.localita, practices: w.practices || [], founded: w.founded,
      },
    }))
  );
}

// ---- API --------------------------------------------------------------------
app.get("/api/wineries", (_req, res) => res.json(WINERIES));

app.get("/api/wines", (req, res) => {
  let out = allWines();
  const { region, localita, practice, type, winery, q } = req.query;
  if (region) out = out.filter((w) => w.winery.region === region);
  if (localita) out = out.filter((w) => w.winery.localita === localita);
  if (practice) out = out.filter((w) => (w.winery.practices || []).includes(practice));
  if (type) out = out.filter((w) => w.type === type);
  if (winery) out = out.filter((w) => w.winery.id === winery);
  if (q) {
    const s = String(q).toLowerCase();
    out = out.filter(
      (w) =>
        w.name.toLowerCase().includes(s) ||
        w.denom.toLowerCase().includes(s) ||
        w.winery.name.toLowerCase().includes(s) ||
        w.winery.region.toLowerCase().includes(s) ||
        (w.winery.localita || "").toLowerCase().includes(s)
    );
  }
  res.json(out);
});

app.get("/api/regions", (_req, res) =>
  res.json([...new Set(WINERIES.map((w) => w.region))].sort())
);

// Luoghi per la mappa: cantine con coordinate + riepilogo vini.
app.get("/api/places", (_req, res) =>
  res.json(
    WINERIES.filter((w) => w.lat && w.lng).map((w) => ({
      id: w.id, name: w.name, town: w.town, region: w.region,
      localita: w.localita, practices: w.practices || [], founded: w.founded,
      lat: w.lat, lng: w.lng, image: w.image, website: w.website,
      story_it: w.story_it, story_en: w.story_en,
      wines: w.wines.length,
      priceFrom: Math.min(...w.wines.map((v) => v.price)),
    }))
  )
);

// Registro indipendente dei vignaioli naturali (fonti associative pubbliche).
app.get("/api/growers", (_req, res) => res.json(GROWERS));

// Facce filtro: regioni, località e pratiche con conteggi.
app.get("/api/facets", (_req, res) => {
  const count = (arr) =>
    arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});
  res.json({
    regions: count(WINERIES.map((w) => w.region)),
    localitas: WINERIES.map((w) => ({ localita: w.localita, region: w.region })),
    practices: count(WINERIES.flatMap((w) => w.practices || [])),
  });
});

// Spedizione vino: cartoni anti-urto da 6, corriere convenzionato.
// Gratuita sopra €89; +2 giorni per le isole (se il cliente non è sull'isola
// della cantina — semplificazione da prototipo).
export function shippingFor(subtotal, bottles, capDest) {
  const island = /^0[789]|^9[0-8]/.test(String(capDest || ""));
  const base = subtotal >= 89 ? 0 : 9.9;
  const extraBoxes = Math.max(0, Math.ceil(bottles / 6) - 1) * 4.5;
  return {
    cost: +(base + extraBoxes).toFixed(2),
    freeThreshold: 89,
    days: island ? 4 : 2,
    packaging: "anti-shock 6-bottle boxes",
  };
}

app.post("/api/shipping/quote", (req, res) => {
  const { cap, items = [] } = req.body || {};
  const wines = allWines();
  let subtotal = 0, bottles = 0;
  for (const it of items) {
    const w = wines.find((x) => x.id === it.wineId);
    if (!w) continue;
    const qty = Math.max(1, Number(it.qty) || 1);
    subtotal += w.price * qty;
    bottles += qty;
  }
  res.json({ ok: true, ...shippingFor(subtotal, bottles, cap), subtotal: +subtotal.toFixed(2), bottles });
});

app.post("/api/orders", (req, res) => {
  const { cliente, indirizzo, cap, items = [], adult } = req.body || {};
  if (!cliente || !cap || items.length === 0)
    return res.status(400).json({ error: "Dati ordine incompleti / Incomplete order" });
  if (!adult)
    return res.status(422).json({ error: "Vendita riservata ai maggiorenni / 18+ only" });

  const wines = allWines();
  let subtotal = 0, bottles = 0;
  const righe = [];
  for (const it of items) {
    const w = wines.find((x) => x.id === it.wineId);
    if (!w) continue;
    const qty = Math.max(1, Number(it.qty) || 1);
    subtotal += w.price * qty;
    bottles += qty;
    righe.push({ wineId: w.id, name: w.name, winery: w.winery.name, price: w.price, qty });
  }
  if (!righe.length) return res.status(400).json({ error: "Nessun vino valido / No valid wine" });

  const ship = shippingFor(subtotal, bottles, cap);
  const order = {
    id: "GRP-" + (1000 + orders.length + 1),
    creatoIl: new Date().toISOString(),
    cliente, indirizzo, cap, righe, bottles,
    subtotal: +subtotal.toFixed(2),
    shipping: ship.cost,
    days: ship.days,
    total: +(subtotal + ship.cost).toFixed(2),
    stato: "confermato",
  };
  orders.push(order);
  writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  res.json({ ok: true, order });
});

app.get("/api/orders", (_req, res) => res.json(orders));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🍇 Grapes in ascolto su http://localhost:${PORT}`);
});
