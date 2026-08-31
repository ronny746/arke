const fs = require('fs');
const file = 'src/app/admin/question-banks/[id]/edit/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// We need to find the options mapping in the edit mode:
// editQuestionState.options?.map((opt, oIdx) => ( ... ))
// and add buttons to add/remove options.

content = content.replace(
  /<div className="space-y-4">\s*<label className="text-xs font-semibold text-gray-500 block border-b pb-1">Options<\/label>/,
  `<div className="space-y-4">
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
                            </div>`
);

content = content.replace(
  /<div className="mt-2 flex flex-col items-center gap-1">\s*<input/,
  `<div className="mt-2 flex flex-col items-center gap-2">
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
                                  <input`
);

fs.writeFileSync(file, content);
