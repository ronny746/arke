const test = require('node:test');
const assert = require('node:assert/strict');
const { resizableUrl, clampWidth, proxyUrl, lowDataQuestion, allowedHosts } = require('./low-data');

const S3 = 'https://lms-media-storage-2026.s3.ap-south-1.amazonaws.com';
const hosts = allowedHosts({});

test('only https images on our bucket, not SVGs', () => {
  assert.equal(resizableUrl(`${S3}/exams/q/1.png`, hosts), `${S3}/exams/q/1.png`);
  assert.equal(resizableUrl(`${S3}/exams/q/1.JPG`, hosts), `${S3}/exams/q/1.JPG`);
  assert.equal(resizableUrl(`${S3}/arkebank/op_images/svg/811.svg`, hosts), null);
  assert.equal(resizableUrl('https://evil.example.com/a.png', hosts), null);
  assert.equal(resizableUrl(`http://lms-media-storage-2026.s3.ap-south-1.amazonaws.com/a.png`, hosts), null);
  assert.equal(resizableUrl('not a url', hosts), null);
  assert.equal(resizableUrl(`${S3}.evil.com/a.png`, hosts), null);
});

test('bucket from env and extra hosts are allowed', () => {
  const h = allowedHosts({ AWS_S3_BUCKET: 'other', AWS_REGION: 'us-east-1', MEDIA_IMG_ALLOWED_HOSTS: 'cdn.arke.pro' });
  assert.ok(h.has('other.s3.us-east-1.amazonaws.com'));
  assert.ok(h.has('cdn.arke.pro'));
});

test('width is clamped', () => {
  assert.equal(clampWidth(undefined), 640);
  assert.equal(clampWidth(5000), 1280);
  assert.equal(clampWidth(10), 160);
  assert.equal(clampWidth('480'), 480);
});

test('question text, options and image fields are rewritten', () => {
  const q = {
    questionText: `<p>Find x <img alt="f" src="${S3}/q/1.png?a=1&amp;b=2"></p><img src='${S3}/q/2.svg'>`,
    explanation: `<img src="${S3}/q/sol.jpg">`,
    questionImageUrl: `${S3}/q/3.jpeg`,
    options: [{ text: `<img src="${S3}/o/1.png">`, imageUrl: `${S3}/o/2.png` }, { text: 'plain' }, null],
  };
  lowDataQuestion(q, 'https://staging.arkescholars.com/');
  const proxied = (u) => proxyUrl('https://staging.arkescholars.com', u);
  assert.ok(q.questionText.includes(`src="${proxied(`${S3}/q/1.png?a=1&b=2`).replace(/&/g, '&amp;')}"`));
  assert.ok(q.questionText.includes(`src='${S3}/q/2.svg'`), 'svg untouched');
  assert.ok(q.explanation.includes('/api/v1/media/img?src='));
  assert.equal(q.questionImageUrl, proxied(`${S3}/q/3.jpeg`));
  assert.equal(q.options[0].imageUrl, proxied(`${S3}/o/2.png`));
  assert.ok(q.options[0].text.includes('/api/v1/media/img?src='));
  assert.equal(q.options[1].text, 'plain');
});
