const fs = require('fs');
const file = 'src/app/admin/dpp/[id]/analysis/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `        import axiosInstance from '@/api/axiosInstance.js';\n        const res = await axiosInstance.get(\`/practice/\${id}\`);`,
  `        const res = await axiosInstance.get(\`/practice/\${id}\`);`
);

if (!content.includes(`import axiosInstance`)) {
  content = content.replace(
    `import { adminAPI } from '@/api/index.js';`,
    `import { adminAPI } from '@/api/index.js';\nimport axiosInstance from '@/api/axiosInstance.js';`
  );
}

fs.writeFileSync(file, content);
