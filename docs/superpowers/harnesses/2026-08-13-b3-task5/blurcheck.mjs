// bake.js ends every lightmap with
//     ctx.globalAlpha = 0.5; ctx.drawImage(canvas, 0, 0); ctx.globalAlpha = 1;
// commented "a light blur removes shadow banding". Drawing a canvas onto
// itself at 50% alpha is 0.5*src + 0.5*dst with src === dst, which is the
// identity, not a blur. Measured here rather than asserted: reproduce the
// operation on a canvas of known noise and report how many bytes move.
import { launch, BASE, openTour } from './lib5.mjs';

const browser = await launch();
const { page } = await openTour(browser, BASE + '?apt=serenity');
const r = await page.evaluate(() => {
  const W = 64, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  // high-contrast checker + noise: anything that blurs at all must change it
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const o = (j * W + i) * 4;
      const v = ((i + j) % 2) ? 255 : 0;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const before = Array.from(ctx.getImageData(0, 0, W, H).data);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(c, 0, 0);
  ctx.globalAlpha = 1;
  const after = Array.from(ctx.getImageData(0, 0, W, H).data);
  let changed = 0, maxDelta = 0;
  for (let k = 0; k < before.length; k++) {
    const d = Math.abs(after[k] - before[k]);
    if (d) changed++;
    if (d > maxDelta) maxDelta = d;
  }
  return { bytes: before.length, changed, maxDelta };
});
console.log(JSON.stringify(r));
await browser.close();
