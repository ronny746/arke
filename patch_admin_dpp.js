const fs = require('fs');
const file = 'src/app/admin/dpp/[id]/analysis/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Rename Component and update imports
content = content.replace('export default function DPPPlayer() {', 'export default function AdminDPPAnalysis() {');
content = content.replace(`import { studentAPI } from '@/api/index.js';`, `import { adminAPI } from '@/api/index.js';`);

// 2. Remove states we don't need
content = content.replace(`const [submitting, setSubmitting] = useState(false);`, '');
content = content.replace(`const [showSubmitModal, setShowSubmitModal] = useState(false);`, '');
content = content.replace(`const [timeSpent, setTimeSpent] = useState(0);`, '');
content = content.replace(`const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState({});`, '');

// 3. Change API call to adminAPI.getPracticeSession (if it exists, wait, we don't have adminAPI.getPracticeSession. 
// We should add it to src/api/admin.js or just use axiosInstance directly)
content = content.replace(
  `const res = await studentAPI.getPracticeSession(id);`,
  `import axiosInstance from '@/api/axiosInstance.js';\n        const res = await axiosInstance.get(\`/practice/\${id}\`);`
);

// 4. Force submitted to true, remove interval
const oldEffect2 = `  // Stopwatch
  useEffect(() => {
    if (loading || submitted) return;
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
      
      // Also increment for current question
      if (session && session.questions && session.questions.length > 0) {
        const qId = session.questions[currentQIdx]?.questionId;
        if (qId) {
          setTimeSpentPerQuestion(prevMap => ({
            ...prevMap,
            [qId]: (prevMap[qId] || 0) + 1
          }));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, submitted, session, currentQIdx]);`;
content = content.replace(oldEffect2, `  // Force submitted for admin view\n  useEffect(() => { setSubmitted(true); }, []);`);

// 5. Remove handleOptionSelect, clearAnswer, handleSubmit contents
content = content.replace(/const handleOptionSelect = async [\s\S]*?const clearAnswer/m, 'const clearAnswer');
content = content.replace(/const clearAnswer = async [\s\S]*?const handleSubmit/m, 'const handleSubmit');
content = content.replace(/const handleSubmit = async [\s\S]*?if \(loading\)/m, 'if (loading)');

// 6. Header
const oldHeader = `<header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">`;
content = content.replace(oldHeader, `<header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm z-10 flex-shrink-0">\n          <div className="font-bold text-xl text-gray-900 truncate pr-4">{session.title || 'DPP Session'} (Admin Analysis)</div>`);

content = content.replace(
  `<Button variant="outline" onClick={() => router.push('/student/dpp')}>Exit</Button>`,
  `<Button variant="outline" onClick={() => router.back()}>Close</Button>`
);

content = content.replace(
  `{formatTime(session.totalTimeSpentSeconds || timeSpent)}`,
  `{formatTime(session.totalTimeSpentSeconds || 0)}`
);

// 7. Remove Submit Modal
content = content.replace(/{showSubmitModal && \([\s\S]*?\)}/m, '');

// Clean up unused imports manually if needed, but TS won't complain much since it's JS under the hood or any.

fs.writeFileSync(file, content);
