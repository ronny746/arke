const fs = require('fs');
const file = 'src/app/admin/exams/[id]/edit/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const imports = `import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { Edit2, Trash2 } from 'lucide-react';

let globalBlotFormatterOptions = {};

const ReactQuill = dynamic(async () => {
  const ReactQuillMod = await import('react-quill-new');
  const Quill = ReactQuillMod.Quill;
  if (typeof window !== 'undefined') {
    try {
      const { registerCustomBlotFormatter } = await import('@/components/ui/QuillBlotFormatterWithDelete');
      globalBlotFormatterOptions = await registerCustomBlotFormatter(Quill);
    } catch (e) {
      console.error("Failed to load quill-blot-formatter", e);
    }
  }
  return function Forwarded(props: any) {
    const mergedModules = {
      ...props.modules,
      blotFormatter: globalBlotFormatterOptions
    };
    return <ReactQuillMod.default {...props} modules={mergedModules} />;
  }
}, { ssr: false });

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'script': 'sub'}, {'script': 'super'}],
    ['link', 'image', 'formula'],
    ['clean']
  ]
};`;

content = content.replace("import toast from 'react-hot-toast';", "import toast from 'react-hot-toast';\n" + imports);

// Add edit state
const stateToAdd = `
  // For editing inline
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editQuestionState, setEditQuestionState] = useState<any>(null);

  const startEdit = (idx) => {
    setEditingIndex(idx);
    setEditQuestionState(JSON.parse(JSON.stringify(questions[idx]))); // deep copy
  };

  const saveEdit = () => {
    const updated = [...questions];
    updated[editingIndex] = editQuestionState;
    setQuestions(updated);
    setEditingIndex(-1);
    setEditQuestionState(null);
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditQuestionState(null);
  };
`;

content = content.replace("const [expandedChapter, setExpandedChapter] = useState(null);", stateToAdd + "\n  const [expandedChapter, setExpandedChapter] = useState(null);");

// modify the display block to use edit
const replaceBlock = `<div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative group">
                              <button 
                                onClick={() => removeQuestion(idx)}
                                className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 p-1 rounded"
                                title="Remove question"
                              >
                                Remove
                              </button>
                              <div className="flex items-start gap-3">
                                <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                                <div className="flex-1 space-y-2">
                                  <div className="text-gray-900 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                                      Topic: {q.topic?.name || q.topicName || 'General'}
                                    </span>
                                    <span className={\`px-2.5 py-0.5 rounded-full border font-medium \${
                                      (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-100' :
                                      (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                      'bg-rose-50 text-rose-700 border-rose-100'
                                    }\`}>
                                      Difficulty: {q.difficulty || 'Medium'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                                {q.options?.map((opt, oIdx) => (
                                  <div key={oIdx} className={\`p-3 rounded-lg border \${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}\`}>
                                    <div className="flex items-center">
                                      <span className={\`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 \${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {(!q.options || q.options.filter(o => o.isCorrect).length === 0) && (
                                <p className="text-sm text-error-500 pl-11">⚠️ Warning: No correct answer ([Ans]) specified for this question.</p>
                              )}
                            </div>`;

const newBlock = `<div key={idx} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative group">
                              {editingIndex === idx ? (
                                <div className="space-y-4">
                                  <p className="font-bold text-gray-700">Editing Q{idx + 1}</p>
                                  <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">Question Text</label>
                                    <ReactQuill 
                                      theme="snow"
                                      value={editQuestionState.questionText}
                                      onChange={(content) => setEditQuestionState({...editQuestionState, questionText: content})}
                                      modules={quillModules}
                                      className="bg-white rounded"
                                    />
                                  </div>
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b pb-1">
                                      <label className="text-xs font-semibold text-gray-500 block">Options</label>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="py-1 px-2 text-xs"
                                        onClick={() => {
                                          const newOpts = [...(editQuestionState.options || [])];
                                          newOpts.push({ label: String.fromCharCode(65 + newOpts.length), text: '', isCorrect: false });
                                          setEditQuestionState({...editQuestionState, options: newOpts});
                                        }}
                                      >
                                        + Add Option
                                      </Button>
                                    </div>
                                    {editQuestionState.options?.map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-start gap-3">
                                        <span className="font-bold w-6 text-center mt-2">{String.fromCharCode(65 + oIdx)}</span>
                                        <div className="flex-1">
                                          <ReactQuill 
                                            theme="snow"
                                            value={opt.text}
                                            onChange={(content) => {
                                              const newOpts = [...editQuestionState.options];
                                              newOpts[oIdx].text = content;
                                              setEditQuestionState({...editQuestionState, options: newOpts});
                                            }}
                                            modules={quillModules}
                                            className="bg-white rounded"
                                          />
                                        </div>
                                        <div className="mt-2 flex flex-col items-center gap-2">
                                          <button 
                                            className="text-red-500 hover:text-red-700 p-1"
                                            onClick={() => {
                                              const newOpts = editQuestionState.options.filter((_, i) => i !== oIdx);
                                              setEditQuestionState({...editQuestionState, options: newOpts});
                                            }}
                                            title="Remove Option"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                          <input 
                                            type="radio"
                                            name={\`correct-\${idx}\`}
                                            checked={opt.isCorrect}
                                            className="w-4 h-4 text-primary-600"
                                            onChange={() => {
                                              const newOpts = editQuestionState.options.map((o, i) => ({...o, isCorrect: i === oIdx}));
                                              setEditQuestionState({...editQuestionState, options: newOpts});
                                            }}
                                          />
                                          <span className="text-[10px] text-gray-500">Correct</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="pt-4 border-t mt-4">
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">Explanation / Solution (Optional)</label>
                                    <ReactQuill 
                                      theme="snow"
                                      value={editQuestionState.explanation}
                                      onChange={(content) => setEditQuestionState({...editQuestionState, explanation: content})}
                                      modules={quillModules}
                                      className="bg-white rounded"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={saveEdit}>Save Question</Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Button variant="ghost" size="sm" icon={Edit2} onClick={() => startEdit(idx)} />
                                    <button 
                                      onClick={() => removeQuestion(idx)}
                                      className="text-red-500 bg-red-50 hover:bg-red-100 p-1 rounded"
                                      title="Remove question"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                                    <div className="flex-1 space-y-2">
                                      <div className="text-gray-900 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                                          Topic: {q.topic?.name || q.topicName || 'General'}
                                        </span>
                                        <span className={\`px-2.5 py-0.5 rounded-full border font-medium \${
                                          (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-100' :
                                          (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                          'bg-rose-50 text-rose-700 border-rose-100'
                                        }\`}>
                                          Difficulty: {q.difficulty || 'Medium'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                                    {q.options?.map((opt, oIdx) => (
                                      <div key={oIdx} className={\`p-3 rounded-lg border \${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}\`}>
                                        <div className="flex items-center">
                                          <span className={\`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 \${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}\`}>
                                            {String.fromCharCode(65 + oIdx)}
                                          </span>
                                          <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {(!q.options || q.options.filter(o => o.isCorrect).length === 0) && (
                                    <p className="text-sm text-error-500 pl-11">⚠️ Warning: No correct answer ([Ans]) specified for this question.</p>
                                  )}
                                </>
                              )}
                            </div>`;

content = content.replace(replaceBlock, newBlock);

fs.writeFileSync(file, content);
