/* nilam — PNG reading, writing and pixel comparison for the visual harness.
 *
 * ── why this is hand-rolled ───────────────────────────────────────────────────
 *
 * The package has zero dependencies and zero devDependencies, and CI asserts it. The
 * escape hatch elsewhere in this repo is `npx --yes <pkg>`, which is what
 * `css-is-valid` does with lightningcss. That works when the tool is a CLI you invoke
 * once per file. It works badly here: pixelmatch and pngjs are LIBRARIES, so every
 * comparison would either spawn a fresh `npx` process or need a shim that resolves a
 * module out of npx's cache. Thirty-one images per run, one process each, over the
 * network on a cold cache, to do arithmetic Node can already do.
 *
 * A PNG written by Chrome is the easy case of the format: 8 bits per channel, no
 * interlacing, colour type 2 (RGB) or 6 (RGBA), and `zlib` — which Node has built in —
 * does the only hard part. So the decoder below is ~60 lines and the encoder ~40, and
 * the suite runs offline with nothing installed.
 *
 * What is NOT reimplemented: pixelmatch's anti-aliasing DETECTION, which inspects the
 * neighbourhood of a differing pixel to decide whether it is an edge artefact. The
 * colour-delta maths below is pixelmatch's (YIQ, from Yee 2004) and that is what buys
 * the tolerance; AA detection would only matter if baselines were shared across
 * platforms, and they deliberately are not. See docs/visual.md.
 */

import { inflateSync, deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* ── CRC32 ────────────────────────────────────────────────────────────────────
 * `zlib.crc32` exists from Node 20.15, and package.json declares `node: >=18`. Ten
 * lines here rather than a floor the rest of the package does not need. */
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

/* ── decode ──────────────────────────────────────────────────────────────────── */

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Decode a PNG to `{ width, height, data }` where `data` is RGBA, 4 bytes per pixel. */
export function readPng(file) {
  const buf = readFileSync(file);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error(`${file} is not a PNG`);

  let width = 0, height = 0, channels = 0;
  const idat = [];
  for (let o = 8; o + 8 <= buf.length; ) {
    const len = buf.readUInt32BE(o);
    const type = buf.subarray(o + 4, o + 8).toString('latin1');
    const body = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colour, compression, filter, interlace] = [body[8], body[9], body[10], body[11], body[12]];
      // Everything Chrome emits satisfies this. Anything else is a file we did not write,
      // and silently mis-decoding it would produce a baseline nobody can trust.
      if (depth !== 8) throw new Error(`${file}: ${depth}-bit PNG, only 8-bit is supported`);
      if (interlace !== 0) throw new Error(`${file}: interlaced PNG is not supported`);
      if (compression !== 0 || filter !== 0) throw new Error(`${file}: unknown compression/filter method`);
      channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colour];
      if (!channels) throw new Error(`${file}: colour type ${colour} (palette) is not supported`);
    } else if (type === 'IDAT') {
      idat.push(body);          // Chrome splits the pixel data across several IDAT chunks.
    } else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (!width || !height) throw new Error(`${file}: no IHDR`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length < (stride + 1) * height) {
    throw new Error(`${file}: ${raw.length} bytes of pixel data, expected ${(stride + 1) * height}`);
  }

  // Un-filter in place, row by row. Each scanline is prefixed with its filter type.
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= channels ? px[dst + i - channels] : 0;
      const b = y > 0 ? px[up + i] : 0;
      const c = y > 0 && i >= channels ? px[up + i - channels] : 0;
      px[dst + i] =
        filter === 0 ? x
        : filter === 1 ? x + a
        : filter === 2 ? x + b
        : filter === 3 ? x + ((a + b) >> 1)
        : filter === 4 ? x + paeth(a, b, c)
        : (() => { throw new Error(`${file}: unknown scanline filter ${filter} on row ${y}`); })();
    }
  }

  // Normalise to RGBA so the comparison never branches on colour type.
  if (channels === 4) return { width, height, data: px };
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0, n = width * height; i < n; i++) {
    const s = i * channels, d = i * 4;
    if (channels === 3) { data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = 255; }
    else if (channels === 1) { data.fill(px[s], d, d + 3); data[d + 3] = 255; }
    else { data.fill(px[s], d, d + 3); data[d + 3] = px[s + 1]; }
  }
  return { width, height, data };
}

/* ── encode ──────────────────────────────────────────────────────────────────── */

const chunk = (type, body) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
};

/** Write RGBA pixels as an 8-bit RGBA PNG. Only used for diff images. */
export function writePng(file, { width, height, data }) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;                              // filter: none
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);                                // 8-bit, RGBA, no interlace
  writeFileSync(file, Buffer.concat([
    SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]));
}

/* ── compare ─────────────────────────────────────────────────────────────────── */

/* pixelmatch's colour metric, which is Yee (2004) "Perceptual metric for production
 * testing": convert both pixels to YIQ and weight the three axes by how much the eye
 * cares. A pure hue shift at equal luminance still scores, and the greyscale wobble
 * along a glyph edge scores far less than it does in plain RGB — which is exactly the
 * discrimination a font-rendering diff needs.
 *
 * 35215 is the largest possible weighted delta (black against white), so `threshold` is
 * a fraction of "as different as two colours can be". */
const MAX_DELTA = 35215;

const blend = (c, a) => 255 + (c - 255) * a;                   // over white

function delta(a, b, i, j) {
  let r1 = a[i], g1 = a[i + 1], b1 = a[i + 2];
  let r2 = b[j], g2 = b[j + 1], b2 = b[j + 2];
  const a1 = a[i + 3] / 255, a2 = b[j + 3] / 255;
  if (a1 < 1) { r1 = blend(r1, a1); g1 = blend(g1, a1); b1 = blend(b1, a1); }
  if (a2 < 1) { r2 = blend(r2, a2); g2 = blend(g2, a2); b2 = blend(b2, a2); }
  const y = (r1 - r2) * 0.29889531 + (g1 - g2) * 0.58662247 + (b1 - b2) * 0.11448223;
  const i2 = (r1 - r2) * 0.59597799 - (g1 - g2) * 0.27417610 - (b1 - b2) * 0.32180189;
  const q = (r1 - r2) * 0.21147017 - (g1 - g2) * 0.52261711 + (b1 - b2) * 0.31114694;
  return 0.5053 * y * y + 0.299 * i2 * i2 + 0.1957 * q * q;
}

/**
 * Compare two decoded PNGs.
 *
 * Differing DIMENSIONS are not an error to bail on: the most useful thing a harness can
 * say about "the page got 40px taller" is to show you where. So the intersection is
 * compared pixel by pixel, every pixel outside it counts as changed, and the diff image
 * is written at the union size with the missing region marked in a different colour.
 *
 * @returns { changed, total, ratio, width, height, sizeChanged, diff }
 */
export function compare(baseline, current, { threshold = 0.06 } = {}) {
  const width = Math.max(baseline.width, current.width);
  const height = Math.max(baseline.height, current.height);
  const cut = MAX_DELTA * threshold * threshold;
  const diff = Buffer.alloc(width * height * 4);
  let changed = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = (y * width + x) * 4;
      const inA = x < baseline.width && y < baseline.height;
      const inB = x < current.width && y < current.height;

      if (!inA || !inB) {
        // Only one image covers this pixel. Magenta, so a size change never reads as a
        // content change.
        diff.set([255, 0, 255, 255], d);
        changed++;
        continue;
      }
      const i = (y * baseline.width + x) * 4;
      const j = (y * current.width + x) * 4;
      if (delta(baseline.data, current.data, i, j) > cut) {
        diff.set([255, 40, 40, 255], d);                       // red: this pixel moved
        changed++;
      } else {
        // Faded baseline underneath, so the red marks have context. 12% keeps the layout
        // readable without competing with the marks.
        const v = (baseline.data[i] * 0.299 + baseline.data[i + 1] * 0.587 + baseline.data[i + 2] * 0.114);
        const g = Math.round(255 - (255 - v) * 0.12);
        diff.set([g, g, g, 255], d);
      }
    }
  }

  return {
    changed,
    total: width * height,
    ratio: changed / (width * height),
    width,
    height,
    sizeChanged: baseline.width !== current.width || baseline.height !== current.height,
    diff: { width, height, data: diff },
  };
}

/** Compare two files. Returns the same shape as `compare`, plus the paths. */
export function compareFiles(baselineFile, currentFile, opts) {
  return compare(readPng(baselineFile), readPng(currentFile), opts);
}

/** The failure gate. A fixed floor as well as a ratio, so a small crop cannot hide a
 *  handful of moved pixels inside a percentage that rounds to nothing. */
export function isRegression({ changed, total }, { maxPixels = 40, maxRatio = 0.0001 } = {}) {
  return changed > Math.max(maxPixels, Math.round(total * maxRatio));
}
