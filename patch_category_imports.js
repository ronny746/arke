const fs = require('fs');
const file = 'server/modules/exams/category.controller.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const { QuestionCategory } = require('./category.model');",
  "const { QuestionCategory, QuestionChapter, QuestionTopic } = require('./category.model');"
);

fs.writeFileSync(file, content);
