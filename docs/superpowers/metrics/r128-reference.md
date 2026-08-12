# r128 reference set — phase B migration regression net

Fixed-camera frames captured from the current Three.js r128 build, one per
`spawns` entry plus two dollhouse shells (`doll-1` = ground floor cutaway,
`doll-all` = whole apartment from above), at 640x400, pixel ratio 1, through
the full render pipeline (light bake + post-processing). Captured with
`tour/refshots.js` (`?refshots=1`) via `window.__refshots(dir)`, compared with
`tools/compare_shots.py`. This is the regression net every later task in the
r185 migration plan is judged against — nothing after task 1 is verified
without it.

**The frames themselves are not committed** (`.gitignore` excludes
`tools/shots/` and `*.jpg`). What's committed is this file: the proof that
the comparer actually detects a real change, and the reference it will be
compared against once r185 frames exist.

## Threshold

**`--max-mad 2.0`, the script's own default — not raised.** A same-session
repeat (see "Repeat run" below) landed at **MAD 0.00 on every frame**, so
there was no noise floor to accommodate. This took two fixes to reach (see
"Bugs found while proving the net works" below); before them, a same-session
repeat produced worst-case MAD in the 50s (camera-roll corruption) and then,
after fixing that, ~2.4-2.6 (unpinned film-grain noise) — both of which would
have forced a much looser threshold had they gone unnoticed. `--max-mad 2.0`
is therefore the number every later task's r128-vs-r185 comparison should
start from.

## Frames captured, per apartment

| Apartment | Spawns | Frame names | Total |
|---|---:|---|---:|
| `serenity` | 5 | entrance, living-room, bedroom, bathroom, pool-terrace, doll-1, doll-all | 7 |
| `kings-court` | 14 | entry-hall, kitchen, dining-room, living-room, bedroom-1, bedroom-2, bedroom-3, hallway, bathroom-2, stairs, upper-hall, upper-living-room, upper-bedroom, terrace, doll-1, doll-all | 16 |
| `horkyone-10` | 5 | living-room, bedroom, bathroom, hall, terrace, doll-1, doll-all | 7 |

30 frames total, filed as `ref_<apt>_<slug>.jpg` under `tools/shots/r128/`.
`?check=1`'s `window.__issues` was `[]` for all three before capture.

## Proof the comparer actually works (steps 5 and 6)

Both runs below are the **final** runs, captured on `serenity` at
`tour/index.html?v=68`, after both bugs described below were fixed. `r128`
and `perturbed`/`r128-repeat` were captured in the same page session without
reloading, per the brief (keeps `builder.js`'s `Math.random()` procedural
textures identical between sets).

**Perturbed run — must fail.** `renderer.toneMappingExposure` multiplied by
1.10 (0.33 -> 0.363), full set re-captured, exposure restored, compared
against the unperturbed set:

```
python tools/compare_shots.py --a r128 --b perturbed
```

```
ref_serenity_bathroom.jpg                    MAD   6.37  FAIL
ref_serenity_bedroom.jpg                     MAD   6.42  FAIL
ref_serenity_doll-1.jpg                      MAD   0.25  ok
ref_serenity_doll-all.jpg                    MAD   0.25  ok
ref_serenity_entrance.jpg                    MAD   5.84  FAIL
ref_serenity_living-room.jpg                 MAD   5.05  FAIL
ref_serenity_pool-terrace.jpg                MAD   4.15  FAIL

7 frames, worst MAD 6.42, threshold 2.00, 5 failing
```

**Exit code 1. Worst MAD 6.42.** 5 of 7 frames fail, all comfortably above
the 2.0 threshold. The two dollhouse frames (0.25) don't cross it — a
genuine, worth-stating finding, not a tool defect: a top-down cutaway is
dominated by baked, matte lightmap colour, where a 10% tone-mapping shift
moves the pixel value much less than it does in an eye-level shot with
direct light sources, glazing and glossy surfaces in frame. The run still
fails overall, which is what step 5 requires.

**Repeat run — must pass.** Same exposure, same page session, captured
again with no change at all:

```
python tools/compare_shots.py --a r128 --b r128-repeat
```

```
ref_serenity_bathroom.jpg                    MAD   0.00  ok
ref_serenity_bedroom.jpg                     MAD   0.00  ok
ref_serenity_doll-1.jpg                      MAD   0.00  ok
ref_serenity_doll-all.jpg                    MAD   0.00  ok
ref_serenity_entrance.jpg                    MAD   0.00  ok
ref_serenity_living-room.jpg                 MAD   0.00  ok
ref_serenity_pool-terrace.jpg                MAD   0.00  ok

7 frames, worst MAD 0.00, threshold 2.00, 0 failing
```

**Exit code 0. Worst MAD 0.00** — every one of the 7 frames bit-for-bit
identical under MAD. Better than the brief's own "should land near 0"
expectation, and only true because of the second fix below.

## Bugs found while proving the net works

Both were invisible until steps 5/6 actually exercised the tool across
multiple captures in one page session — exactly the class of bug this task
exists to catch, just found in the harness itself before it ever got to
judge r185.

**1. Dollhouse capture rolls every later walk-view frame ~180 degrees
(`tour/refshots.js`).** `WalkControls.update()` (`tour/controls.js`) sets
`camera.rotation.order/.y/.x` from yaw/pitch but has never needed to touch
`.z` — safe throughout the live app because the real dollhouse orbit camera
(`doll.js`) clamps its pitch to `[0.3, 1.45]` rad and so never points exactly
straight down. `refshots.js`'s own top-down shell shot does exactly that
(camera at `y=40` looking straight down, `up=(0,0,-1)` for a north-up plan
view), a gimbal-lock-adjacent case whose `camera.lookAt()` leaves a large,
persistent roll baked into `rotation.z` (~3.09 rad, measured) that nothing
downstream ever clears. A single `__refshots()` call is unaffected (its own
walk views render before its own doll views), but any second call in the
same session inherits the previous call's leftover roll on every walk frame
— which is exactly the multi-capture-per-session shape steps 5/6 require.
First measured indirectly (an `r128` vs `r128-repeat` same-session comparison
that should have passed came back at worst MAD 59.39, exit 1, i.e. the
"must-pass" proof failing), then confirmed directly by reading back the
`entrance` frame from each set: `r128` shows the dining/living room
right-side up, `perturbed`/`r128-repeat` show an unrelated-looking,
point-symmetric view of the same space. Fixed by setting
`camera.rotation.z = 0` right after `WalkControls.update()` in the walk
branch, and again in the `finally` restore (the sequence always ends on a
doll-kind view, so without the second reset the live game loop would resume
rolled too). `tour/controls.js` itself is untouched — the fix stays inside
the one file that puts the camera into this state, since nothing else in the
app ever does.

**2. Unpinned film-grain time makes even a true repeat noisy
(`tour/refshots.js`).** `post.js`'s grain/vignette pass reads a `time`
uniform that only ever advances via app.js's own `requestAnimationFrame`
loop (`post.render(now * 0.001)`), which keeps running in the background
across the `await fetch(...)` calls between captures. Calling
`a.composer.render()` directly (as the brief's original code did) renders
with whatever `time` the live loop last set — effectively "now" — so two
captures of an unchanged scene taken moments apart differ by a few MAD
purely from the grain dice roll. After fixing bug 1, the repeat run's worst
MAD was ~2.4-2.6 (just over the 2.0 default) instead of nowhere near 0.
Fixed by rendering through `a.post.render(0)` instead of
`a.composer.render()` directly — same pass chain, same bloom/grain/vignette
a real visitor sees, just with the grain seed pinned so two captures of the
same content are actually comparable. `a.post` is part of the real
`window.__app` (see `tour/app.js`'s `window.__app = {...}` assignment) even
though the brief's interface summary only named `composer`; falls back to
`a.composer.render()` then a bare `renderer.render()`, matching the existing
null-composer fallback for weak-GPU/missing-vendor-file sessions where
`post.create()` returns `null`.

Both fixes live entirely in `tour/refshots.js` (new in this task, gated
behind `?refshots=1`, never loaded for a real visitor) — no production file
was changed to reach these results.
