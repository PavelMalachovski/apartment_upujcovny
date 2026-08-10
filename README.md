# 🏠 Apartment 3D Tour Platform

Interactive real-estate tours right in the browser: a first-person
walkthrough, a dollhouse mode, real photographs at their shooting spots,
room areas and a measuring tape. Pure Three.js with no bundler; a new
property is a JSON config plus a photo folder — no code changes.

**Property catalog:** `catalog.html` · **Tour:** `index.html?apt=<id>`

## Features

- **First-person walkthrough** — WASD + drag-look with the mouse; on
  phones a virtual joystick + swipe, multitouch
- **Dollhouse mode (⌂ / M key)** — orbit view without the roof, a
  "Ground floor / Whole home" cutaway, room-area labels, clicking the
  floor teleports you to that spot
- **📏 Measuring tape** — two clicks on the floor, distance in metres
- **📷 Real photos** — markers at the shooting spots; the button or the
  F key opens the photograph on top of the 3D view
- **☰ Rooms menu** — instant teleport to any of the rooms
- **Baked lighting** — a custom CPU lightmapper at load (~2 s): soft
  shadows, daylight from the windows, sun on the terrace
- **Performance** — merged statics: ~50–130 draw calls, runs on phones

## Quick start

```bash
python -m http.server 8000 --directory tour
```

Open `http://localhost:8000/catalog.html` (catalog) or
`http://localhost:8000/?apt=kings-court` (tour directly).
A web server is required: the config is fetched, `file://` won't work.

## Controls

| Input | Action |
|---|---|
| **Mouse (hold & drag)** | look around |
| **WASD / arrows** | walk (Shift — faster) |
| **M** | dollhouse mode |
| **F** | nearby photo |
| Phone | joystick left — walk, swipe right — look |

## Add a new apartment

1. Copy `tour/apartments/kings-court.json` → `tour/apartments/<id>.json`
   and rewrite the geometry from the floor plan (metres; angles in
   degrees)
2. Photos → `tour/photos/<id>/*.webp` (≤1200px), set `meta.photoBase`
   and the `photoSpots`
3. Add a card to `tour/apartments/index.json` — the property appears in
   the catalog
4. Open `?apt=<id>` and run the checklist from `CLAUDE.md`

## Deploy (Vercel)

Static, no build: `vercel.json` serves the `tour/` folder from the
root. Import the repository at [vercel.com/new](https://vercel.com/new)
(preset **Other**, empty build) — every push to `main` updates
production. Or `npx vercel --prod`.

## Structure

```
tour/
├── catalog.html          — property catalog
├── index.html            — tour page
├── apartments/
│   ├── index.json        — catalog list
│   └── kings-court.json  — apartment config (data, not code)
├── photos/kings-court/   — real photos (webp)
├── main.js               — loader (?apt=, degrees→radians)
├── builder.js            — config → scene, static merging
├── bake.js               — CPU lightmapper (lightmaps + wall vertex light)
├── controls.js           — walking, touch, collisions, floor levels
├── doll.js               — dollhouse, cutaway, areas, measuring tape
├── app.js                — init, minimap, menu, photos
├── validate.js           — automatic layout check
└── three.min.js          — Three.js r128 (local)
```

Architecture rules and checklists for changes live in
[CLAUDE.md](CLAUDE.md). Original photos in the repository root are
gitignored; only compressed webp inside `tour/photos/` are published.
