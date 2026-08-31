const fs = require('fs');
const file = 'src/app/admin/question-banks/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace handleFullPaperClick(fullPaperData); with setFullPaperData
content = content.replace(
  'toast.success(currentlyUnpublished ? "Subject Published!" : "Subject Unpublished!");\n      handleFullPaperClick(fullPaperData); // refresh',
  'toast.success(currentlyUnpublished ? "Subject Published!" : "Subject Unpublished!");\n      setFullPaperData({ ...fullPaperData, questions: newQuestions });'
);

content = content.replace(
  'toast.success("Subject deleted from paper!");\n      handleFullPaperClick(fullPaperData); // refresh',
  'toast.success("Subject deleted from paper!");\n      setFullPaperData({ ...fullPaperData, questions: newQuestions });'
);

// Also add a toast message if the questions are empty
fs.writeFileSync(file, content);
