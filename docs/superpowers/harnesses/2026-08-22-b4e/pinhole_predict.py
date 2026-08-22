"""Closed-form pinhole tilt predictor, committed per plan 4e task 3's fix
round (IMPORTANT finding 3 in the review: the model was used to aim the
empirical sweep on serenity but had no committed artefact of its own).

Model: both cameras (photograph and the fov=72 legacy render) sit at the
same position; only pitch differs. For a single named landmark, the world
angle subtended at the render's optical axis (assumed pitch 0) is

    alpha = atan((2*renderRowAtZero - 1) * tan(fov/2))

and the SAME landmark, seen by a camera tilted `theta` degrees, appears at
photograph row v_p where

    alpha = atan((2*v_p - 1) * tan(fov/2)) + theta

Solving for theta (the predicted config-pitch value, positive = looking
down, matching main.js's convention):

    theta = alpha - atan((2*photoRow - 1) * tan(fov/2))

This is NOT used to choose any shipped value -- every tilt this plan ships
rests on a real capture at that degree (see serenity-b4e-derivation.json).
It is reported here only as a cross-check against the real, swept minimum,
using CORRECTED (post-fix-round) photoRow/renderRowAtZero pairs -- the
pre-fix-round pairs for 1.webp, 2.webp, 5.webp and 10.webp were wrong (see
the derivation file's own per-spot notes) and would have produced
predictions the fix round now knows are meaningless.
"""
import json
import math
import os

FOV_DEG = 72.0
HALF = math.tan(math.radians(FOV_DEG) / 2.0)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


def predict_deg(photo_row, render_row_at_zero):
    alpha = math.atan((2.0 * render_row_at_zero - 1.0) * HALF)
    target = math.atan((2.0 * photo_row - 1.0) * HALF)
    return math.degrees(alpha - target)


def main():
    deriv_path = os.path.join(ROOT, 'docs', 'superpowers', 'metrics',
                               'serenity-b4e-derivation.json')
    deriv = json.load(open(deriv_path, encoding='utf-8'))
    out = []
    for s in deriv['spots']:
        if s.get('photoRow') is None or s.get('renderRowAtZero') is None:
            out.append({'file': s['file'], 'skipped': 'no valid landmark row'})
            continue
        pred = predict_deg(s['photoRow'], s['renderRowAtZero'])
        chosen = s.get('chosen')
        out.append({
            'file': s['file'],
            'photoRow': s['photoRow'],
            'renderRowAtZero': s['renderRowAtZero'],
            'predictedDeg': round(pred, 3),
            'chosenDeg': chosen,
            'diffFromChosen': round(pred - chosen, 3) if chosen is not None else None,
            'outcome': s['outcome'],
        })
        print('%-10s predicted %8.3f  chosen %6s  diff %8s  (%s)' % (
            s['file'], pred, chosen,
            round(pred - chosen, 3) if chosen is not None else '-',
            s['outcome']))
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             'pinhole-predictions.json')
    json.dump({
        'fovDeg': FOV_DEG,
        'model': 'single-point pinhole closed form, both cameras at the same position, pitch-only',
        'note': ('NOT used to select any shipped tilt -- cross-check only, computed AFTER '
                  'this fix round corrected the landmark rows for 1.webp/2.webp/5.webp/10.webp. '
                  '1.webp and 3.webp have no valid landmark and are skipped.'),
        'predictions': out,
    }, open(out_path, 'w', encoding='utf-8'), indent=2)
    print('wrote', out_path)


if __name__ == '__main__':
    main()
