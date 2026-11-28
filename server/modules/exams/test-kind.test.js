const test = require('node:test');
const assert = require('node:assert/strict');
const { testKind } = require('./test-kind');

test('test kind from title', () => {
  assert.equal(testKind('JEE Main Chapter Test: Limits'), 'CHAPTER');
  assert.equal(testKind('Shakti Part Test 2'), 'PART');
  assert.equal(testKind('Shakti PT3 Physics'), 'PART');
  assert.equal(testKind('All India Mock 1'), 'FULL');
  assert.equal(testKind('Full Syllabus Test'), 'FULL');
  assert.equal(testKind('Weekly quiz'), 'TEST');
  assert.equal(testKind(undefined), 'TEST');
});
