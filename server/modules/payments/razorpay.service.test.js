const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Razorpay service does not ship fallback payment credentials', () => {
  const serviceSource = fs.readFileSync(path.join(__dirname, 'razorpay.service.js'), 'utf8');

  assert.doesNotMatch(serviceSource, /rzp_test_/);
  assert.match(serviceSource, /process\.env\.RAZORPAY_KEY_ID/);
  assert.match(serviceSource, /process\.env\.RAZORPAY_KEY_SECRET/);
});
