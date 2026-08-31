const fs = require('fs');
const file = 'src/app/admin/question-banks/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const newFunctions = `  const togglePublishChapter = async (subjectName, chapterName, currentlyUnpublished) => {
    if (!fullPaperData) return;
    try {
      const newQuestions = fullPaperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Chapter Published!" : "Chapter Unpublished!");
      setFullPaperData({ ...fullPaperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const deleteChapterFromPaper = async (subjectName, chapterName) => {
    if (!fullPaperData) return;
    if (!window.confirm(\`Are you sure you want to delete all questions for \${chapterName} from this paper?\`)) return;
    try {
      const newQuestions = fullPaperData.questions.filter(q => !((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName));
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success("Chapter deleted from paper!");
      setFullPaperData({ ...fullPaperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to delete chapter");
    }
  };

  const togglePublishTopic = async (subjectName, chapterName, topicName, currentlyUnpublished) => {
    if (!fullPaperData) return;
    try {
      const newQuestions = fullPaperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName && (q.topicName || 'General') === topicName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Topic Published!" : "Topic Unpublished!");
      setFullPaperData({ ...fullPaperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const deleteTopicFromPaper = async (subjectName, chapterName, topicName) => {
    if (!fullPaperData) return;
    if (!window.confirm(\`Are you sure you want to delete all questions for \${topicName} from this paper?\`)) return;
    try {
      const newQuestions = fullPaperData.questions.filter(q => !((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName && (q.topicName || 'General') === topicName));
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success("Topic deleted from paper!");
      setFullPaperData({ ...fullPaperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to delete topic");
    }
  };

  const renderFullPapersTab = () => {`;

content = content.replace("  const renderFullPapersTab = () => {", newFunctions);

// Replace Level 2 handling
const oldLevel2 = `    if (fullPaperPath.length === 2 && fullPaperData) {
      // Level 2: List questions for the subject
      const subjectName = fullPaperPath[1];
      const questions = (fullPaperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName);

      return (
        <div className="space-y-4">
          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <Card key={idx} className="p-4 flex flex-col space-y-3 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => router.push(\`/admin/question-banks/\${fullPaperPath[0]._id}/edit?tab=FULL_PAPERS\`)}>
                    <Edit2 className="w-3 h-3" /> Edit Question
                  </Button>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                    <div className="text-gray-900 font-medium overflow-x-auto" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs pl-10">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                    Topic: {q.topic?.name || q.topicName || 'General'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                    Marks: {q.marks || 0} | Neg: {q.negativeMarks || 0}
                  </span>
                  <span className={\`px-2.5 py-0.5 rounded-full border font-medium \${
                    (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-100' :
                    (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-rose-50 text-rose-700 border-rose-100'
                  }\`}>
                    Difficulty: {q.difficulty || 'Medium'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10 mt-3">
                  {q.options?.map((opt, oIdx) => (
                    <div key={oIdx} className={\`p-3 rounded-lg border \${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}\`}>
                      <div className="flex items-center">
                        <span className={\`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 \${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                {q.explanation && (
                  <div className="ml-10 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                    <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      );
    }`;

const newLevel234 = `    if (fullPaperPath.length === 2 && fullPaperData) {
      // Level 2: List chapters in the subject
      const subjectName = fullPaperPath[1];
      const questions = (fullPaperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName);
      const chaptersMap = {};
      questions.forEach(q => {
        const cName = q.chapterName || 'General';
        if (!chaptersMap[cName]) chaptersMap[cName] = { name: cName, count: 0, marks: 0, unpublished: true };
        chaptersMap[cName].count += 1;
        chaptersMap[cName].marks += Number(q.marks) || 0;
        if (!q.isUnpublished) chaptersMap[cName].unpublished = false;
      });
      const subjectChapters = Object.values(chaptersMap);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjectChapters.map((ch: any) => (
              <Card 
                key={ch.name} 
                className={\`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group \${ch.unpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}\`}
                onClick={() => setFullPaperPath([...fullPaperPath, ch.name])}
              >
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 text-gray-500 hover:text-primary-600"
                    onClick={(e) => { e.stopPropagation(); togglePublishChapter(subjectName, ch.name, ch.unpublished); }}
                    title={ch.unpublished ? "Publish Chapter" : "Unpublish Chapter"}
                  >
                    {ch.unpublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => { e.stopPropagation(); deleteChapterFromPaper(subjectName, ch.name); }}
                    title="Delete Chapter from Paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Folder className={\`w-8 h-8 mb-2 \${ch.unpublished ? 'text-gray-400' : 'text-blue-400'}\`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{ch.name} {ch.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
                <p className="text-sm text-gray-500 mt-1">{ch.count} Questions</p>
                <p className="text-sm text-gray-500">{ch.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (fullPaperPath.length === 3 && fullPaperData) {
      // Level 3: List topics in the chapter
      const subjectName = fullPaperPath[1];
      const chapterName = fullPaperPath[2];
      const questions = (fullPaperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName);
      const topicsMap = {};
      questions.forEach(q => {
        const tName = q.topicName || 'General';
        if (!topicsMap[tName]) topicsMap[tName] = { name: tName, count: 0, marks: 0, unpublished: true };
        topicsMap[tName].count += 1;
        topicsMap[tName].marks += Number(q.marks) || 0;
        if (!q.isUnpublished) topicsMap[tName].unpublished = false;
      });
      const chapterTopics = Object.values(topicsMap);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {chapterTopics.map((t: any) => (
              <Card 
                key={t.name} 
                className={\`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group \${t.unpublished ? 'border-l-gray-300 opacity-60' : 'border-l-purple-400'}\`}
                onClick={() => setFullPaperPath([...fullPaperPath, t.name])}
              >
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 text-gray-500 hover:text-primary-600"
                    onClick={(e) => { e.stopPropagation(); togglePublishTopic(subjectName, chapterName, t.name, t.unpublished); }}
                    title={t.unpublished ? "Publish Topic" : "Unpublish Topic"}
                  >
                    {t.unpublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => { e.stopPropagation(); deleteTopicFromPaper(subjectName, chapterName, t.name); }}
                    title="Delete Topic from Paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Folder className={\`w-8 h-8 mb-2 \${t.unpublished ? 'text-gray-400' : 'text-purple-400'}\`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{t.name} {t.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
                <p className="text-sm text-gray-500 mt-1">{t.count} Questions</p>
                <p className="text-sm text-gray-500">{t.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (fullPaperPath.length === 4 && fullPaperData) {
      // Level 4: List questions
      const subjectName = fullPaperPath[1];
      const chapterName = fullPaperPath[2];
      const topicName = fullPaperPath[3];
      const questions = (fullPaperData.questions || []).filter(q => 
         (q.subjectName || 'General') === subjectName && 
         (q.chapterName || 'General') === chapterName &&
         (q.topicName || 'General') === topicName
      );

      return (
        <div className="space-y-4">
          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <Card key={idx} className="p-4 flex flex-col space-y-3 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => router.push(\`/admin/question-banks/\${fullPaperPath[0]._id}/edit?tab=FULL_PAPERS\`)}>
                    <Edit2 className="w-3 h-3" /> Edit Question
                  </Button>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                    <div className="text-gray-900 font-medium overflow-x-auto" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs pl-10">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                    Topic: {q.topic?.name || q.topicName || 'General'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                    Marks: {q.marks || 0} | Neg: {q.negativeMarks || 0}
                  </span>
                  <span className={\`px-2.5 py-0.5 rounded-full border font-medium \${
                    (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-100' :
                    (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-rose-50 text-rose-700 border-rose-100'
                  }\`}>
                    Difficulty: {q.difficulty || 'Medium'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10 mt-3">
                  {q.options?.map((opt, oIdx) => (
                    <div key={oIdx} className={\`p-3 rounded-lg border \${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}\`}>
                      <div className="flex items-center">
                        <span className={\`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 \${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                {q.explanation && (
                  <div className="ml-10 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                    <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      );
    }`;

content = content.replace(oldLevel2, newLevel234);

// Wait! breadcrumb needs updating for the Full Papers view.
// In breadcrumb render: 
// `fullPaperPath.map((item, index) => ...)`
// item is an object for index 0, and a string for index > 0.
// Breadcrumb map should be correct because it just reads `item.name || item`. Let's verify.
// `item.name || item` works for strings!

fs.writeFileSync(file, content);
