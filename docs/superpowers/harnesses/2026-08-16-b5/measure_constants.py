#!/usr/bin/env python3
"""
Plan 5, task 1 harness: measure every source/config constant that
.superpowers/sdd/2026-08-16-phase-b5-revalidate-and-docs/task-1-brief.md
asks for, and print the raw values with their file:line provenance.

This script covers everything that can be measured WITHOUT a browser
(grepping tour/*.js source constants, reading the shipped apartment JSON).
The runtime numbers -- draw calls through the post chain, and bake time --
cannot be produced by this script; they need a live page and
window.__app / window.__bakeMs. Those were measured by hand in a browser
session per the recipes in CLAUDE.md's "Debug recipes" section and in
task-1-brief.md step 3, and are recorded directly in
docs/superpowers/metrics/constants-b5-audit.json alongside everything
this script prints. Re-run those recipes yourself to reproduce them --
this script intentionally does not shell out to a browser.

Run from the repo root:
    python docs/superpowers/harnesses/2026-08-16-b5/measure_constants.py

Changes nothing. Reads only.
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
TOUR = os.path.join(ROOT, 'tour')


def grep_first(path, pattern, flags=0):
    """Return (lineno, line_text) for the first line in `path` matching
    `pattern`, or None if there is no match. 1-indexed like the editor."""
    rx = re.compile(pattern, flags)
    with open(path, encoding='utf-8') as f:
        for i, line in enumerate(f, start=1):
            if rx.search(line):
                return i, line.rstrip('\n')
    return None


def section(title):
    print()
    print('=== %s ===' % title)


def main():
    section('builder.js: wall/opening constants')
    p = os.path.join(TOUR, 'builder.js')
    for name in ('WALL_TH', 'DOOR_H', 'PASS_H', 'WIN_SILL', 'WIN_HEAD'):
        hit = grep_first(p, r'\b%s\s*=' % re.escape(name))
        print('%-10s tour/builder.js:%s  %s' % (name, hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('controls.js: eye height, player radius, walk/run speed')
    p = os.path.join(TOUR, 'controls.js')
    for label, pattern in (
        ('eye',    r'this\.eye\s*='),
        ('radius', r'this\.radius\s*='),
        ('speed',  r'const speed\s*='),
    ):
        hit = grep_first(p, pattern)
        print('%-10s tour/controls.js:%s  %s' % (label, hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('validate.js: reachability grid/step, mirrored player radius')
    p = os.path.join(TOUR, 'validate.js')
    for label, pattern in (
        ('STEP',     r'const STEP\s*='),
        ('RADIUS',   r'const RADIUS\s*='),
        ('STEP_UP',  r'const STEP_UP\s*='),
    ):
        hit = grep_first(p, pattern)
        print('%-10s tour/validate.js:%s  %s' % (label, hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('bake.js: EXP, lightMapIntensity, AMB_DIST, AMB_RAYS, SEG, WEXP, quality.aoRays default')
    p = os.path.join(TOUR, 'bake.js')
    for label, pattern in (
        ('EXP',              r'const EXP\s*='),
        ('lightMapIntensity',r'material\.lightMapIntensity\s*='),
        ('AMB_DIST',         r'const AMB_DIST\s*='),
        ('AMB_RAYS',         r'const AMB_RAYS\s*='),
        ('SEG',              r'const SEG\s*='),
        ('WEXP',             r'const WEXP\s*='),
        ('aoRays default',   r'quality\.aoRays\)\s*\|\|'),
    ):
        hit = grep_first(p, pattern)
        print('%-20s tour/bake.js:%s  %s' % (label, hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('builder.js: dynamic PointLight construction')
    p = os.path.join(TOUR, 'builder.js')
    hit = grep_first(p, r'new T\.PointLight\(')
    print('PointLight   tour/builder.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('post.js: bloom threshold/strength')
    p = os.path.join(TOUR, 'post.js')
    hit = grep_first(p, r'new UnrealBloomPass\(')
    print('UnrealBloomPass tour/post.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('app.js: default camera fov (the gate lens under ?fov=legacy)')
    p = os.path.join(TOUR, 'app.js')
    hit = grep_first(p, r'new THREE\.PerspectiveCamera\(')
    print('camera fov   tour/app.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('app.js: exposure fallback constant (1.05) and sky fallback constant (SKY_FALLBACK)')
    p = os.path.join(TOUR, 'app.js')
    hit = grep_first(p, r'let exposure = 1\.05;')
    print('exposure fb  tour/app.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))
    hit = grep_first(p, r'const SKY_FALLBACK\s*=')
    print('SKY_FALLBACK tour/app.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('bake.js: EXP mirror check -- does line 498 read EXP, or hardcode its own copy?')
    p = os.path.join(TOUR, 'bake.js')
    hit = grep_first(p, r'material\.lightMapIntensity\s*=')
    print('lightMapIntensity assignment tour/bake.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))
    print('  -> compare against the `const EXP` line above by eye: if this does not literally')
    print('     say "EXP * Math.PI" (or similar), it is an unlinked copy, not a reference.')

    section('main.js: __spotFov (the divider lens), pitch sign negation')
    p = os.path.join(TOUR, 'main.js')
    hit = grep_first(p, r'window\.__spotFov\s*=')
    print('__spotFov    tour/main.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))
    hit = grep_first(p, r'p\.pitch = -rad\(p\.pitch\)')
    print('pitch negate tour/main.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('measure.js: ?fov=legacy gate bypass')
    p = os.path.join(TOUR, 'measure.js')
    hit = grep_first(p, r"get\('fov'\) === 'legacy'")
    print('legacyFov    tour/measure.js:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('index.html: cache-busting module tag')
    p = os.path.join(TOUR, 'index.html')
    hit = grep_first(p, r'main\.js\?v=')
    print('?v=          tour/index.html:%s  %s' % (hit[0] if hit else '?', hit[1].strip() if hit else 'NOT FOUND'))

    section('Shipped apartment config: exposure, photoSpots, mainCeilH, meta.photoFovLong')
    for apt in ('serenity', 'kings-court', 'horkyone-10'):
        d = json.load(open(os.path.join(TOUR, 'apartments', '%s.json' % apt), encoding='utf-8'))
        print('%-14s exposure=%-6s photoSpots=%-3s mainCeilH=%-6s photoFovLong=%s' % (
            apt, d.get('exposure'), len(d.get('photoSpots', [])),
            d.get('mainCeilH', '-'), (d.get('meta') or {}).get('photoFovLong', '-')))

    section('Shipped apartment config: sky, palette, env.capture, lightmaps (coverage gap in the prior audit)')
    for apt in ('serenity', 'kings-court', 'horkyone-10'):
        d = json.load(open(os.path.join(TOUR, 'apartments', '%s.json' % apt), encoding='utf-8'))
        sky = d.get('sky')
        palette_keys = list((d.get('palette') or {}).keys())
        env_capture = (d.get('env') or {}).get('capture')
        lightmaps = d.get('lightmaps')
        print('%-14s sky=%-45s palette_keys=%-40s env.capture=%-6s lightmaps=%s' % (
            apt, sky, palette_keys, env_capture, lightmaps))
    lm_path = os.path.join(TOUR, 'lightmaps.js')
    print('tour/lightmaps.js present:', os.path.exists(lm_path))

    section('Pose verification (compare-flagged spots only)')
    for apt in ('serenity', 'kings-court', 'horkyone-10'):
        d = json.load(open(os.path.join(TOUR, 'apartments', '%s.json' % apt), encoding='utf-8'))
        sp = [p for p in d.get('photoSpots', []) if p.get('compare')]
        passed = sum(1 for p in sp if p.get('poseVerified'))
        failed = [p.get('file') for p in sp if p.get('compare') and not p.get('poseVerified')]
        print('%-14s %d of %d pass  (fail: %s)' % (apt, passed, len(sp), ', '.join(failed) or 'none'))

    section('pitch keys shipped')
    for apt in ('serenity', 'kings-court'):
        d = json.load(open(os.path.join(TOUR, 'apartments', '%s.json' % apt), encoding='utf-8'))
        pitches = [(p.get('file'), p.get('pitch')) for p in d.get('photoSpots', []) if p.get('pitch') is not None]
        print('%-14s %s' % (apt, pitches or 'none'))

    section('Dynamic PointLights per apartment (config, budget is <=8)')
    for apt in ('serenity', 'kings-court', 'horkyone-10'):
        d = json.load(open(os.path.join(TOUR, 'apartments', '%s.json' % apt), encoding='utf-8'))
        lights = d.get('lights', [])
        dyn = [l for l in lights if l.get('dyn')]
        flag = '  <-- EXCEEDS <=8' if len(dyn) > 8 else ''
        print('%-14s dyn=%d of %d total lights%s' % (apt, len(dyn), len(lights), flag))

    section('Not measurable by this script (need a live browser)')
    print('Draw calls through the post chain (per apartment, at APT.start) -- see')
    print('  CLAUDE.md "Draw calls in a spot" recipe / task-1-brief.md step 3.')
    print('Bake time (window.__bakeMs, 3 runs per apartment) -- see')
    print('  CLAUDE.md rule 4a recipe / task-1-brief.md step 3.')
    print('Both were run by hand this session against a local `python tools/serve.py`')
    print('and are recorded in docs/superpowers/metrics/constants-b5-audit.json, not here.')


if __name__ == '__main__':
    sys.exit(main())
