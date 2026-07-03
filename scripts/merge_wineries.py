#!/usr/bin/env python3
"""Merge winery JSON (from research agents) into src/wineries.js."""
import json, re, sys, unicodedata

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s

def js_str(s):
    return json.dumps(s, ensure_ascii=False)

def wine_js(wid, v):
    lines = [
        f'        id: {js_str(wid)},',
        f'        name: {js_str(v["name"])},',
        f'        denom: {js_str(v["denom"])},',
        f'        type: {js_str(v.get("type", "rosso"))},',
        f'        price: {v["price"]},',
    ]
    if v.get("price_estimated"):
        lines.append("        price_estimated: true,")
    lines.append(f'        format: {js_str(v.get("format", "0.75L").replace(" ", ""))},')
    if v.get("image"):
        lines.append(f'        image: {js_str(v["image"])},')
    return "      {\n" + "\n".join(lines) + "\n      },"

def winery_js(w):
    wines = "\n".join(wine_js(f'{w["id"]}-{slug(v["name"])}', v) for v in w["wines"])
    prac = json.dumps(w.get("practices", []), ensure_ascii=False)
    return f'''  {{
    id: {js_str(w["id"])},
    name: {js_str(w["name"])},
    town: {js_str(w["town"])},
    region: {js_str(w["region"])},
    localita: {js_str(w["localita"])},
    practices: {prac},
    founded: {w["founded"]},
    story_it:
      {js_str(w["story_it"])},
    story_en:
      {js_str(w["story_en"])},
    website: {js_str(w["website"])},
    image: {js_str(w["image"])},
    wines: [
{wines}
    ],
  }},'''

path = "src/wineries.js"
src = open(path).read()
data = json.load(open(sys.argv[1]))
wineries = data["wineries"] if isinstance(data, dict) else data
existing = set(re.findall(r'^\s{4}id: "([^"]+)"', src, re.M))
blocks = []
for w in wineries:
    if w["id"] in existing:
        print("skip (exists):", w["id"]); continue
    blocks.append(winery_js(w))
    print("added:", w["id"], f'({len(w["wines"])} wines)')
if blocks:
    src = src.replace("\n];", "\n" + "\n".join(blocks) + "\n];")
    open(path, "w").write(src)
