const fs = require('fs');
const file = 'server/modules/practice/practice.controller.js';
let content = fs.readFileSync(file, 'utf8');

// For getFilters
content = content.replace(
  '{ $match: { institute: new mongoose.Types.ObjectId(instituteId) } },\n      { $match: { "questions.isUnpublished": { $ne: true } } },\n      { $unwind: "$questions" },',
  '{ $match: { institute: new mongoose.Types.ObjectId(instituteId) } },\n      { $unwind: "$questions" },\n      { $match: { "questions.isUnpublished": { $ne: true } } },'
);

fs.writeFileSync(file, content);
console.log("Patched getFilters");
