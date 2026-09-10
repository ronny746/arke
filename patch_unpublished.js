const fs = require('fs');
const file = 'server/modules/practice/practice.controller.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '{ $match: { institute: new mongoose.Types.ObjectId(instituteId) } },',
  '{ $match: { institute: new mongoose.Types.ObjectId(instituteId) } },\n      { $match: { "questions.isUnpublished": { $ne: true } } },'
);

content = content.replace(
  'const matchQuery = { institute: new mongoose.Types.ObjectId(instituteId) };',
  'const matchQuery = { institute: new mongoose.Types.ObjectId(instituteId) };\n      const qMatch = { "questions.isUnpublished": { $ne: true } };'
);

// We need to make sure we don't duplicate if we run it twice, but since I just ran it once, it's fine.
// Wait, qMatch is currently const qMatch = {}; so we can just replace that.
content = content.replace(
  'const qMatch = {};\n      const qMatch = { "questions.isUnpublished": { $ne: true } };', // if I accidentally duplicate
  'const qMatch = { "questions.isUnpublished": { $ne: true } };'
);

content = content.replace(
  'const qMatch = {};',
  'const qMatch = { "questions.isUnpublished": { $ne: true } };'
);

fs.writeFileSync(file, content);
console.log("Patched unpublished");
