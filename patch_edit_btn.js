const fs = require('fs');
const file = 'src/app/admin/question-banks/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// We need to add the Edit button inside the Card of the question list in full paper view.
const target = `<Card key={idx} className="p-4 flex flex-col space-y-3 relative group">
                <div className="flex justify-between items-start">`;

const replacement = `<Card key={idx} className="p-4 flex flex-col space-y-3 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => router.push(\`/admin/question-banks/\${fullPaperPath[0]._id}/edit?tab=FULL_PAPERS\`)}>
                    <Edit2 className="w-3 h-3" /> Edit Question
                  </Button>
                </div>
                <div className="flex justify-between items-start">`;

// make sure Edit2 is imported
if (!content.includes('Edit2')) {
  content = content.replace('Trash2, ArrowLeft', 'Trash2, ArrowLeft, Edit2');
}

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
