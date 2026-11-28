// Expected JEE Main percentile (see "Expected JEE Main Percentile: How It
// Works", Nov 2026). It is NOT a rank among our students: the score is mapped
// onto the real JEE Main marks-vs-percentile curve, adjusted for how tough the
// paper is (its "level vs JEE Main", 1 = much easier .. 5 = much tougher).
//
//   p = scored / full marks
//   J = 300 * p^g   (p > 0)      J = 300 * p   (p <= 0, negative marking)
//   percentile = straight line between the two nearest table rows around J
//
// Shown with 2 decimals; only full marks shows 100, anything lower at most 99.99.

// Approximate average of recent JEE Main shifts (2025-26), marks out of 300.
const DEFAULT_TABLE = Object.freeze([
  { marks: 300, percentile: 100 },
  { marks: 280, percentile: 99.995 },
  { marks: 250, percentile: 99.97 },
  { marks: 220, percentile: 99.88 },
  { marks: 200, percentile: 99.75 },
  { marks: 180, percentile: 99.5 },
  { marks: 160, percentile: 99.1 },
  { marks: 150, percentile: 98.85 },
  { marks: 140, percentile: 98.4 },
  { marks: 120, percentile: 97 },
  { marks: 110, percentile: 96 },
  { marks: 100, percentile: 94.8 },
  { marks: 90, percentile: 93 },
  { marks: 80, percentile: 91 },
  { marks: 70, percentile: 88.5 },
  { marks: 60, percentile: 85 },
  { marks: 50, percentile: 80 },
  { marks: 40, percentile: 72 },
  { marks: 30, percentile: 61 },
  { marks: 20, percentile: 45 },
  { marks: 10, percentile: 25 },
  { marks: 0, percentile: 8 },
  { marks: -20, percentile: 1 },
  { marks: -75, percentile: 0 },
].map(Object.freeze));

// g for each level: 1 much easier .. 5 much tougher (near JEE Advanced).
const DEFAULT_G_VALUES = Object.freeze({ 1: 1.5, 2: 1.25, 3: 1.0, 4: 0.85, 5: 0.7 });

const LEVELS = [1, 2, 3, 4, 5];
const JEE_FULL_MARKS = 300;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// A usable table: at least two rows of finite numbers with distinct marks.
// Anything else falls back to the default so a bad setting never breaks results.
const normalizeTable = (table) => {
  if (!Array.isArray(table)) return DEFAULT_TABLE;
  const rows = table
    .map((r) => ({ marks: Number(r?.marks), percentile: Number(r?.percentile) }))
    .filter((r) => isNum(r.marks) && isNum(r.percentile) && r.percentile >= 0 && r.percentile <= 100)
    .sort((a, b) => a.marks - b.marks);
  const distinct = rows.filter((r, i) => i === 0 || r.marks !== rows[i - 1].marks);
  return distinct.length >= 2 ? distinct : DEFAULT_TABLE;
};

const normalizeGValues = (gValues) => {
  const out = { ...DEFAULT_G_VALUES };
  if (gValues && typeof gValues === 'object') {
    LEVELS.forEach((lvl) => {
      const g = Number(gValues[lvl] ?? gValues[String(lvl)]);
      if (isNum(g) && g > 0) out[lvl] = g;
    });
  }
  return out;
};

// Level stored on the exam, else the PDF's starting values: chapter tests = 2,
// everything else = 3.
const resolveLevel = (exam) => {
  const lvl = Number(exam?.jeeLevel);
  if (LEVELS.includes(lvl)) return lvl;
  return /chapter/i.test(String(exam?.title || '')) ? 2 : 3;
};

const interpolate = (rows, j) => {
  const asc = rows[0].marks <= rows[rows.length - 1].marks ? rows : [...rows].sort((a, b) => a.marks - b.marks);
  if (j <= asc[0].marks) return asc[0].percentile;
  const last = asc[asc.length - 1];
  if (j >= last.marks) return last.percentile;
  for (let i = 1; i < asc.length; i++) {
    const hi = asc[i];
    if (j <= hi.marks) {
      const lo = asc[i - 1];
      return lo.percentile + ((j - lo.marks) / (hi.marks - lo.marks)) * (hi.percentile - lo.percentile);
    }
  }
  return last.percentile;
};

// Round to 2 decimals on the exact value of the number (toFixed), the way the
// PDF's ready table was made: 70% at level 3 is 99.815, held as 99.81499...,
// so it shows 99.81. Math.round(x * 100) would give 99.82.
const round2 = (x) => Number(x.toFixed(2));

/**
 * @param {object} args
 * @param {number} args.score       marks scored (may be negative)
 * @param {number} args.totalMarks  full marks of the paper
 * @param {number} [args.level]     1..5, default 3
 * @param {Array}  [args.table]     [{ marks, percentile }] out of 300
 * @param {object} [args.gValues]   { 1: 1.5, ..., 5: 0.7 }
 * @returns {number|null} percentile with 2 decimals, or null when it can't be worked out
 */
const computeExpectedPercentile = ({ score, totalMarks, level = 3, table, gValues } = {}) => {
  const s = Number(score);
  const full = Number(totalMarks);
  if (!isNum(s) || !isNum(full) || full <= 0) return null;

  const p = s / full;
  if (p >= 1) return 100;

  const lvl = LEVELS.includes(Number(level)) ? Number(level) : 3;
  const g = normalizeGValues(gValues)[lvl];
  const j = p > 0 ? JEE_FULL_MARKS * Math.pow(p, g) : JEE_FULL_MARKS * p;

  const pct = round2(interpolate(normalizeTable(table), j));
  return Math.max(0, Math.min(99.99, pct));
};

// Settings saved by the admin (SystemConfig.jeePercentileConfig), with defaults.
const resolveConfig = (config) => ({
  table: normalizeTable(config?.table),
  gValues: normalizeGValues(config?.gValues),
});

module.exports = {
  DEFAULT_TABLE,
  DEFAULT_G_VALUES,
  computeExpectedPercentile,
  resolveLevel,
  resolveConfig,
  normalizeTable,
  normalizeGValues,
};
