const fs = require('fs');
const file = 'server/modules/practice/practice.controller.js';
let content = fs.readFileSync(file, 'utf8');

// Inside buildFacetPipeline
content = content.replace(
  'const pipeline = [\n            { $match: { "questions.subjectName": pair.subject, "questions.topicName": pair.topic } }\n          ];',
  'const pipeline = [\n            { $match: { "questions.subjectName": pair.subject, "questions.topicName": pair.topic, "questions.isUnpublished": { $ne: true } } }\n          ];'
);

fs.writeFileSync(file, content);
console.log("Patched subjectTopicPairs");
