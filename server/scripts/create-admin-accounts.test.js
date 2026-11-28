const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAdminList } = require('./create-admin-accounts');

test('admin list: emails, optional names, duplicates and bad lines', () => {
  const { rows, invalid } = parseAdminList([
    '# team',
    'Ravi.Kumar@Example.com',
    'neha@example.com, Neha, Sharma',
    'ravi.kumar@example.com',
    'not-an-email',
    '',
  ].join('\n'));
  assert.deepEqual(rows, [
    { email: 'ravi.kumar@example.com', firstName: 'Ravi Kumar', lastName: '' },
    { email: 'neha@example.com', firstName: 'Neha', lastName: 'Sharma' },
  ]);
  assert.deepEqual(invalid, [{ line: 5, value: 'not-an-email' }]);
});
