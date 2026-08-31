const fs = require('fs');
const file = 'server/modules/exams/question-bank.model.js';
let content = fs.readFileSync(file, 'utf8');

// add isUnpublished to the questions array
content = content.replace(
  "type: { type: String, enum: ['MCQ', 'TRUE_FALSE', 'SUBJECTIVE'], default: 'MCQ' },",
  "type: { type: String, enum: ['MCQ', 'TRUE_FALSE', 'SUBJECTIVE'], default: 'MCQ' },\n    isUnpublished: { type: Boolean, default: false },"
);

fs.writeFileSync(file, content);
