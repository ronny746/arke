const fs = require('fs');

function fixAdminTime(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    `const questions = session.questions || [];`,
    `const questions = session.questions || [];\n  \n  // Calculate real total time if backend returned 0 due to previous bug\n  const computedTotalTime = session.answers?.reduce((acc, curr) => acc + (curr.timeSpentSeconds || 0), 0) || 0;\n  const displayTotalTime = session.totalTimeSpentSeconds > 0 ? session.totalTimeSpentSeconds : computedTotalTime;`
  );

  content = content.replace(
    /formatTime\(session\.totalTimeSpentSeconds \|\| 0\)/g,
    `formatTime(displayTotalTime)`
  );
  
  fs.writeFileSync(file, content);
}

fixAdminTime('src/app/admin/dpp/[id]/analysis/page.tsx');
fixAdminTime('src/app/teacher/dpp/[id]/analysis/page.tsx');
