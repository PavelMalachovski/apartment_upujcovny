# Apartment 3D Tour

An interactive first-person walkthrough of a two-level apartment,
reconstructed from 20 photographs and the floor plan (`../1.jpeg`).

## How to open

Run a tiny web server from this folder (the config is fetched, so
`file://` does not work):

```bash
python -m http.server 8000
```

then open `http://localhost:8000/` (tour) or
`http://localhost:8000/catalog.html` (property catalog).

## Controls

Desktop:

- **WASD** or arrow keys — walk
- **mouse (hold and drag)** — look around (the cursor stays visible,
  buttons stay clickable — no pointer lock)
- **Shift** — walk faster
- **Esc** — close panels

Phone / tablet:

- **joystick, bottom left** — walk (put your finger anywhere on the left
  half of the screen and the joystick docks under it)
- **right half of the screen** — swipe to look
- both fingers work at the same time

The **"☰ Rooms"** button (top left) teleports to any room — the fastest
way to show the apartment to a client.

The **"⌂ Dollhouse"** button (or the **M** key) switches to dollhouse
mode: the whole apartment under an orbit camera (mouse/finger — rotate,
wheel/pinch — zoom), a "Ground floor / Whole home" cutaway with **room
areas**, and **clicking the floor drops you into that exact spot**. The
**"📏 Measure"** button takes two clicks on the floor and shows the
distance. Esc or "✕ Walk" returns to walking.

The **📷** markers in rooms are real photographs of the apartment: walk
close and press the button at the bottom (or the **F** key). Photos live
in `photos/*.webp`.

The staircase is in the middle of the apartment: the hallway beside the
bedrooms runs along it, the flight climbs west and exits into the upper
hall. From the upper floor, the west door leads to the roof terrace.

Top right — a minimap with the current floor plan and camera position;
bottom left — the current room name.

## Baked lighting

On load (~1–2 seconds, progress on the start screen) the built-in
lightmapper traces lighting and bakes it into textures for floors,
ceilings and attic slopes: soft shadows under furniture, lamp pools,
cool daylight from the windows, sun and building shadows on the terrace.
Baked surfaces render without dynamic light (MeshBasic + lightMap),
which unloads the GPU.

## Pipeline: add a new apartment

Apartment data is a JSON config; the code is shared by all properties:

1. Copy `apartments/kings-court.json` → `apartments/my-flat.json`
2. Edit the geometry: walls/openings, floors, furniture, lights,
   teleport points. All coordinates in metres, all angles (`rot`,
   `yaw`) in degrees
3. Put photos in `photos/my-flat/` and set `meta.photoBase` and
   `photoSpots`
4. Open `?apt=my-flat` — a separate tour on the same code

## Structure

| File | Contents |
|---|---|
| `apartments/*.json` | Apartment configs: walls, openings, floors, furniture, lights, spots (angles in degrees) |
| `main.js` | Loader: picks the apartment via `?apt=`, converts degrees to radians, starts |
| `builder.js` | Scene builder: procedural textures, materials, geometry, furniture |
| `bake.js` | Lightmapper: AABB visibility tracing, baking into CanvasTexture |
| `doll.js` | Dollhouse mode: orbit camera, floor cutaway, click-teleport |
| `controls.js` | First-person controls: collisions, level transitions |
| `app.js` | Init, render loop, minimap, room labels |
| `validate.js` | Automatic layout check: blocked/void openings, room reachability |
| `three.min.js` | Three.js r128 (local copy) |

## Accuracy

The geometry was measured off the floor plan. The plan has no dimension
lines, so the scale was calibrated against standard furniture (180 cm
bed, 60 cm kitchen counter depth, ~20 cm stair riser). Expected error is
±5–10% — invisible for visualisation, but the model must not be used
for measured surveys.

Detail level is "medium+": all large furniture and built-ins sit in
their real places with real colours and materials; small decor is
stylised rather than exact.
