#!/usr/bin/env python3
"""
Costruisce src/growers.js dal JSON dei registri associativi.
- Input: uno o più file JSON {source, growers:[{name, comune, provincia, region, website}]}
- Geocodifica i comuni via Nominatim (1 req/s, cache su data/geocache.json)
- Dedup per (nome normalizzato) e per (comune+nome simile)
Uso: python3 scripts/build_growers.py file1.json file2.json
"""
import json, sys, time, os, re, unicodedata, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(ROOT, "data", "geocache.json")
OUT = os.path.join(ROOT, "src", "growers.js")

os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
cache = {}
if os.path.exists(CACHE_PATH):
    cache = json.load(open(CACHE_PATH))

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def geocode(comune, region):
    key = f"{norm(comune)}|{norm(region)}"
    if key in cache:
        return cache[key]
    q = urllib.parse.urlencode({
        "q": f"{comune}, {region}, Italia", "format": "json", "limit": 1,
        "countrycodes": "it",
    })
    url = f"https://nominatim.openstreetmap.org/search?{q}"
    req = urllib.request.Request(url, headers={"User-Agent": "grapes-prototype/0.1 (frassiyuri@gmail.com)"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
        if data:
            cache[key] = [round(float(data[0]["lat"]), 4), round(float(data[0]["lon"]), 4)]
        else:
            cache[key] = None
    except Exception as e:
        print("  geocode fail:", comune, e)
        cache[key] = None
    json.dump(cache, open(CACHE_PATH, "w"))
    time.sleep(1.1)  # rispetto del rate limit Nominatim
    return cache[key]

growers, seen = [], set()
for path in sys.argv[1:]:
    data = json.load(open(path))
    src = data.get("source", "registro pubblico")
    for g in data.get("growers", []):
        if not g.get("name") or not g.get("comune"):
            continue
        k = norm(g["name"])
        if k in seen:
            # già presente da altra associazione → aggiungi la fonte
            for x in growers:
                if norm(x["name"]) == k and src not in x["sources"]:
                    x["sources"].append(src)
            continue
        seen.add(k)
        growers.append({
            "name": g["name"].strip(),
            "comune": g["comune"].strip(),
            "provincia": (g.get("provincia") or "").strip(),
            "region": (g.get("region") or "").strip(),
            "website": (g.get("website") or "").strip(),
            "sources": [src],
        })

print(f"{len(growers)} vignaioli unici; geocodifica…")
ok = 0
for i, g in enumerate(growers):
    c = geocode(g["comune"], g["region"])
    if c:
        g["lat"], g["lng"] = c
        ok += 1
    if (i + 1) % 25 == 0:
        print(f"  {i+1}/{len(growers)} ({ok} geocodificati)")

growers = [g for g in growers if g.get("lat")]
growers.sort(key=lambda g: (g["region"], g["comune"], g["name"]))
print(f"finale: {len(growers)} con coordinate")

js = "// Registro indipendente dei vignaioli naturali italiani.\n"
js += "// Fonti: elenchi soci pubblici delle associazioni (VinNatur, ViniVeri).\n"
js += "// Dati fattuali: nome, comune, regione, sito. Generato da scripts/build_growers.py\n"
js += "export const GROWERS = " + json.dumps(growers, ensure_ascii=False, indent=1) + ";\n"
open(OUT, "w").write(js)
print("scritto", OUT)
