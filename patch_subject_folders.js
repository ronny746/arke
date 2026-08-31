const fs = require('fs');
const file = 'src/app/admin/question-banks/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('EyeOff')) {
  content = content.replace('Trash2, ArrowLeft, Edit2', 'Trash2, ArrowLeft, Edit2, Eye, EyeOff');
}

// Add state methods for toggling and deleting
const methods = `
  const togglePublishSubject = async (subjectName, currentlyUnpublished) => {
    if (!fullPaperData) return;
    try {
      const newQuestions = fullPaperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Subject Published!" : "Subject Unpublished!");
      handleFullPaperClick(fullPaperData); // refresh
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const deleteSubjectFromPaper = async (subjectName) => {
    if (!fullPaperData) return;
    if (!window.confirm(\`Are you sure you want to delete all questions for \${subjectName} from this paper?\`)) return;
    try {
      const newQuestions = fullPaperData.questions.filter(q => (q.subjectName || 'General') !== subjectName);
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success("Subject deleted from paper!");
      handleFullPaperClick(fullPaperData); // refresh
    } catch (err) {
      toast.error("Failed to delete subject");
    }
  };
`;

if (!content.includes('togglePublishSubject')) {
  content = content.replace('const renderFullPapersTab = () => {', methods + '\n  const renderFullPapersTab = () => {');
}

// Update the mapping to determine if a subject is unpublished
const mapReplace = `const subjectsMap = {};
      questions.forEach(q => {
        const sName = q.subjectName || 'General';
        if (!subjectsMap[sName]) subjectsMap[sName] = { name: sName, count: 0, marks: 0, unpublished: true };
        subjectsMap[sName].count += 1;
        subjectsMap[sName].marks += Number(q.marks) || 0;
        if (!q.isUnpublished) subjectsMap[sName].unpublished = false;
      });`;
content = content.replace(/const subjectsMap = \{\};\s*questions\.forEach\(q => \{\s*const sName = q\.subjectName \|\| 'General';\s*if \(\!subjectsMap\[sName\]\) subjectsMap\[sName\] = \{ name: sName, count: 0, marks: 0 \};\s*subjectsMap\[sName\]\.count \+\= 1;\s*subjectsMap\[sName\]\.marks \+\= Number\(q\.marks\) \|\| 0;\s*\}\);/m, mapReplace);

// Update the Card to include buttons
const cardReplaceTarget = `<Card 
                key={sub.name} 
                className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-400"
                onClick={() => setFullPaperPath([fullPaperPath[0], sub.name])}
              >
                <Folder className="w-8 h-8 text-blue-400 mb-2" />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{sub.name}</h3>`;
const cardReplacement = `<Card 
                key={sub.name} 
                className={\`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group \${sub.unpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}\`}
                onClick={() => setFullPaperPath([fullPaperPath[0], sub.name])}
              >
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 text-gray-500 hover:text-primary-600"
                    onClick={(e) => { e.stopPropagation(); togglePublishSubject(sub.name, sub.unpublished); }}
                    title={sub.unpublished ? "Publish Subject" : "Unpublish Subject"}
                  >
                    {sub.unpublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => { e.stopPropagation(); deleteSubjectFromPaper(sub.name); }}
                    title="Delete Subject from Paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Folder className={\`w-8 h-8 mb-2 \${sub.unpublished ? 'text-gray-400' : 'text-blue-400'}\`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{sub.name} {sub.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>`;
content = content.replace(cardReplaceTarget, cardReplacement);

fs.writeFileSync(file, content);
