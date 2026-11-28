const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resizableUrl, clampWidth } = require('./low-data');

const router = express.Router();

const CACHE_DIR = process.env.MEDIA_IMG_CACHE_DIR || path.join(os.tmpdir(), 'arke-img-cache');
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10 * 1000;
const inFlight = new Map();

const cacheFile = (src, width) =>
  path.join(CACHE_DIR, `${crypto.createHash('sha1').update(`${width}|${src}`).digest('hex')}.webp`);

const shrink = async (src, width, file) => {
  const sharp = require('sharp');
  const res = await fetch(src, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: 'error' });
  if (!res.ok) throw new Error(`source ${res.status}`);
  const length = Number(res.headers.get('content-length') || 0);
  if (length > MAX_SOURCE_BYTES) throw new Error('source too large');
  const input = Buffer.from(await res.arrayBuffer());
  if (input.length > MAX_SOURCE_BYTES) throw new Error('source too large');
  const output = await sharp(input, { limitInputPixels: 40e6 })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 60 })
    .toBuffer();
  await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmp, output);
  await fs.promises.rename(tmp, file);
  return file;
};

// GET /api/v1/media/img?src=<our S3 image>&w=640 -> smaller WebP (public, cached).
router.get('/img', async (req, res) => {
  const src = resizableUrl(req.query.src);
  if (!src) return res.status(400).json({ success: false, message: 'Unsupported image' });
  const width = clampWidth(req.query.w);
  const file = cacheFile(src, width);
  try {
    if (!fs.existsSync(file)) {
      if (!inFlight.has(file)) {
        inFlight.set(file, shrink(src, width, file).finally(() => inFlight.delete(file)));
      }
      await inFlight.get(file);
    }
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    res.type('image/webp');
    return res.sendFile(file);
  } catch (error) {
    // Never leave a broken figure: fall back to the original image.
    console.warn('[media/img] resize failed, using original:', error.message);
    return res.redirect(302, src);
  }
});

module.exports = router;
