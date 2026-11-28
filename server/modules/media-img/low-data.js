// Low-data mode: question figures are served through /api/v1/media/img as a
// smaller WebP, so tests open quickly on slow (3G) internet. Only images on
// our own S3 bucket are rewritten (and only those can be fetched by the proxy).

const DEFAULT_WIDTH = 640;
const MAX_WIDTH = 1280;
const MIN_WIDTH = 160;

const allowedHosts = (env = process.env) => {
  const hosts = new Set(['lms-media-storage-2026.s3.ap-south-1.amazonaws.com']);
  if (env.AWS_S3_BUCKET) {
    hosts.add(`${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION || 'ap-south-1'}.amazonaws.com`);
    hosts.add(`${env.AWS_S3_BUCKET}.s3.amazonaws.com`);
  }
  String(env.MEDIA_IMG_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
    .forEach((h) => hosts.add(h));
  return hosts;
};

const RESIZABLE = /\.(png|jpe?g|webp|gif)$/i;

// The original URL when it is one the proxy may fetch and shrink, else null.
const resizableUrl = (raw, hosts = allowedHosts()) => {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !hosts.has(url.hostname.toLowerCase())) return null;
  if (!RESIZABLE.test(decodeURIComponent(url.pathname))) return null; // SVGs are already small
  return url.toString();
};

const clampWidth = (w) => {
  const n = Math.round(Number(w));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
};

const proxyUrl = (origin, src, width = DEFAULT_WIDTH) =>
  `${String(origin || '').replace(/\/+$/, '')}/api/v1/media/img?src=${encodeURIComponent(src)}&w=${clampWidth(width)}`;

const rewriteHtml = (html, origin, hosts) => {
  if (typeof html !== 'string' || !html.includes('<img')) return html;
  return html.replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi, (match, pre, quote, src) => {
    const decoded = src.replace(/&amp;/g, '&');
    const ok = resizableUrl(decoded, hosts);
    return ok ? `${pre}${quote}${proxyUrl(origin, ok).replace(/&/g, '&amp;')}${quote}` : match;
  });
};

const rewriteField = (value, origin, hosts) => {
  const ok = resizableUrl(value, hosts);
  return ok ? proxyUrl(origin, ok) : value;
};

// Rewrites one question object (plain object, already inlined) in place.
const lowDataQuestion = (qObj, origin, hosts = allowedHosts()) => {
  if (!qObj || !origin) return qObj;
  qObj.questionText = rewriteHtml(qObj.questionText, origin, hosts);
  if (typeof qObj.explanation === 'string') qObj.explanation = rewriteHtml(qObj.explanation, origin, hosts);
  if (qObj.questionImageUrl) qObj.questionImageUrl = rewriteField(qObj.questionImageUrl, origin, hosts);
  if (Array.isArray(qObj.options)) {
    qObj.options.forEach((o) => {
      if (!o) return;
      o.text = rewriteHtml(o.text, origin, hosts);
      if (o.imageUrl) o.imageUrl = rewriteField(o.imageUrl, origin, hosts);
    });
  }
  return qObj;
};

const wantsLowData = (req) => ['1', 'true', 'yes'].includes(String(req?.query?.lowData || '').toLowerCase());

const requestOrigin = (req) => `${req.protocol}://${req.get('host')}`;

module.exports = {
  DEFAULT_WIDTH,
  allowedHosts,
  resizableUrl,
  clampWidth,
  proxyUrl,
  lowDataQuestion,
  wantsLowData,
  requestOrigin,
};
