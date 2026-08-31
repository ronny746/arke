const fs = require('fs');

function fixUrl(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    `await axiosInstance.get(\`/practice/\${id}\`);`,
    `await axiosInstance.get(\`/student/practice/\${id}\`);`
  );
  fs.writeFileSync(file, content);
}

fixUrl('src/app/admin/dpp/[id]/analysis/page.tsx');
fixUrl('src/app/teacher/dpp/[id]/analysis/page.tsx');
