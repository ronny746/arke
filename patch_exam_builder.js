const fs = require('fs');
const file = 'src/app/admin/exams/[id]/edit/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The original filter logic:
// const newQuestions = paperQuestions.filter(q => !existingIds.has(q._id || q.questionText));
const originalFilter = "const newQuestions = paperQuestions.filter(q => !existingIds.has(q._id || q.questionText));";
const newFilter = "const newQuestions = paperQuestions.filter(q => !existingIds.has(q._id || q.questionText) && !q.isUnpublished);";

if (content.includes(originalFilter)) {
  content = content.replace(originalFilter, newFilter);
}

fs.writeFileSync(file, content);
