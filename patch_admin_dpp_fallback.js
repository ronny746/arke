const fs = require('fs');
let file = 'src/app/admin/dpp/[id]/analysis/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(`router.push('/student/dpp');`, `router.back();`);
fs.writeFileSync(file, content);

file = 'src/app/teacher/dpp/[id]/analysis/page.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(`router.push('/student/dpp');`, `router.back();`);
fs.writeFileSync(file, content);
