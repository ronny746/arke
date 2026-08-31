const fs = require('fs');

function addTime(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    `<span className="text-sm font-medium text-gray-500 whitespace-nowrap">Marks: {q.marks || 4} | -{q.negativeMarks || 1}</span>`,
    `<span className="text-sm font-medium text-gray-500 whitespace-nowrap">Marks: {q.marks || 4} | -{q.negativeMarks || 1}</span>\n                    {userAnswer && <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 justify-end"><Clock className="w-3 h-3"/> {formatTime(userAnswer.timeSpentSeconds || 0)}</span>}`
  );
  
  fs.writeFileSync(file, content);
}

addTime('src/app/admin/dpp/[id]/analysis/page.tsx');
addTime('src/app/teacher/dpp/[id]/analysis/page.tsx');
