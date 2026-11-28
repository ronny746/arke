const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeExpectedPercentile,
  resolveLevel,
  resolveConfig,
  DEFAULT_TABLE,
} = require('./jee-percentile');

const pct = (score, totalMarks, level) => computeExpectedPercentile({ score, totalMarks, level });

test('PDF checks: 162/300 at level 3 and 4, 72/100 at level 2', () => {
  assert.equal(pct(162, 300, 3), 99.14);
  assert.equal(pct(162, 300, 4), 99.45);
  assert.equal(pct(72, 100, 2), 99.74);
});

// "Ready table: score vs expected percentile" from the PDF, levels 1..5.
const READY_TABLE = {
  100: [100, 100, 100, 100, 100],
  90: [99.98, 99.98, 99.99, 99.99, 99.99],
  80: [99.85, 99.90, 99.94, 99.96, 99.98],
  70: [99.41, 99.65, 99.81, 99.88, 99.92],
  60: [98.36, 99.06, 99.50, 99.68, 99.81],
  50: [95.53, 97.43, 98.85, 99.23, 99.56],
  40: [89.97, 93.98, 97.00, 98.24, 99.05],
  30: [79.44, 87.31, 93.00, 95.74, 97.64],
  25: [69.25, 81.52, 89.75, 93.42, 96.37],
  20: [55.93, 72.10, 85.00, 90.10, 94.30],
  15: [39.86, 57.81, 76.00, 84.91, 90.88],
  10: [24.13, 38.74, 61.00, 73.90, 84.93],
  5: [13.70, 20.06, 35.00, 50.62, 68.53],
  0: [8, 8, 8, 8, 8],
  '-5': [2.75, 2.75, 2.75, 2.75, 2.75],
};

for (const [scorePct, row] of Object.entries(READY_TABLE)) {
  test(`ready table: ${scorePct}% at every level`, () => {
    row.forEach((expected, i) => {
      assert.equal(pct(Number(scorePct), 100, i + 1), expected, `level ${i + 1}`);
    });
  });
}

test('chapter test of 100 and mock of 300 are treated the same way', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    assert.equal(pct(45, 100, level), pct(135, 300, level));
  }
});

test('only full marks shows 100; any lower score is at most 99.99', () => {
  assert.equal(pct(300, 300, 3), 100);
  assert.equal(pct(299, 300, 5), 99.99);
  assert.equal(pct(299.9, 300, 1), 99.99);
  assert.equal(pct(310, 300, 3), 100); // bonus marks above full
});

test('negative marking uses J = 300 * p, floors at 0', () => {
  assert.equal(pct(-60, 300, 3), 0.27); // J = -60, between -75 (0) and -20 (1)
  assert.equal(pct(-20, 300, 1), 1);
  assert.equal(pct(-75, 300, 5), 0);
  assert.equal(pct(-200, 300, 3), 0);
});

test('same marks on the same paper always give the same percentile', () => {
  const a = pct(123, 300, 4);
  for (let i = 0; i < 5; i++) assert.equal(pct(123, 300, 4), a);
});

test('result has at most 2 decimals', () => {
  for (let s = -30; s <= 300; s += 7) {
    const v = pct(s, 300, 4);
    assert.equal(Math.round(v * 100) / 100, v);
  }
});

test('invalid inputs give null', () => {
  assert.equal(pct(10, 0, 3), null);
  assert.equal(pct(NaN, 100, 3), null);
  assert.equal(pct(10, undefined, 3), null);
});

test('unknown level falls back to 3', () => {
  assert.equal(pct(162, 300, 9), 99.14);
  assert.equal(pct(162, 300, undefined), 99.14);
});

test('resolveLevel: stored level wins, else chapter tests 2, others 3', () => {
  assert.equal(resolveLevel({ jeeLevel: 5, title: 'Chapter Test' }), 5);
  assert.equal(resolveLevel({ title: 'Kinematics Chapter Test 1' }), 2);
  assert.equal(resolveLevel({ title: 'Full Mock 3' }), 3);
  assert.equal(resolveLevel(null), 3);
});

test('custom table and g values from System Settings are used', () => {
  const table = [{ marks: 0, percentile: 0 }, { marks: 300, percentile: 100 }];
  assert.equal(computeExpectedPercentile({ score: 150, totalMarks: 300, level: 3, table }), 50);
  assert.equal(
    computeExpectedPercentile({ score: 150, totalMarks: 300, level: 3, table, gValues: { 3: 2 } }),
    25,
  );
});

test('a broken table or g value falls back to the defaults', () => {
  const cfg = resolveConfig({ table: [{ marks: 'x', percentile: 5 }], gValues: { 2: -1, 4: 'abc' } });
  assert.deepEqual(cfg.table, DEFAULT_TABLE);
  assert.equal(cfg.gValues[2], 1.25);
  assert.equal(cfg.gValues[4], 0.85);
  assert.equal(
    computeExpectedPercentile({ score: 162, totalMarks: 300, level: 3, ...cfg }),
    99.14,
  );
});

test('result API: saved percentile wins; older attempts are worked out the same way', async (t) => {
  const controller = require('./exam.controller');
  const SystemConfig = require('../system-config/system-config.model');
  t.mock.method(SystemConfig, 'findOne', () => ({
    select: () => ({ lean: async () => null }),
  }));

  const saved = await controller._expectedPercentileForResult(
    { expectedJeePercentile: 97.43, expectedJeeLevel: 2 },
    { title: 'Mock', jeeLevel: 3 },
    1, 300,
  );
  assert.deepEqual(saved, { expectedJeePercentile: 97.43, jeeLevel: 2 });

  const old = await controller._expectedPercentileForResult(
    { score: 162 },
    { title: 'Full Mock', jeeLevel: 4, institute: 'inst1' },
    162, 300,
  );
  assert.deepEqual(old, { expectedJeePercentile: 99.45, jeeLevel: 4 });
});
