const fs = require('fs');
const file = 'src/app/admin/question-banks/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const actions = `
  const handleTogglePublish = async (e, type, id, currentlyUnpublished) => {
    e.stopPropagation();
    try {
      await adminAPI.togglePublishCategory(type, id, !currentlyUnpublished);
      toast.success(currentlyUnpublished ? "Published!" : "Unpublished!");
      fetchData(); // re-fetch hierarchy
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteSubFolder = async (e, type, id) => {
    e.stopPropagation();
    if (!window.confirm(\`Are you sure you want to delete this \${type}? This might leave orphaned questions.\`)) return;
    try {
      if (type === 'chapter') await adminAPI.deleteQuestionChapter(id);
      else if (type === 'topic') await adminAPI.deleteQuestionTopic(id);
      toast.success(\`\${type} deleted!\`);
      fetchData(); // re-fetch hierarchy
    } catch (err) {
      toast.error("Failed to delete");
    }
  };
`;

if (!content.includes('handleTogglePublish')) {
  content = content.replace('const handleFullPaperClick = async (paper) => {', actions + '\n  const handleFullPaperClick = async (paper) => {');
}

// Modify renderRoot
content = content.replace(
  `onClick={() => navigateTo({ type: 'SUBJECT', id: sub._id, name: sub.name, ref: sub })}
          >`,
  `onClick={() => navigateTo({ type: 'SUBJECT', id: sub._id, name: sub.name, ref: sub })}
          >
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <Button 
                variant="ghost" size="sm" className="p-1 text-gray-500 hover:text-primary-600"
                onClick={(e) => handleTogglePublish(e, 'subject', sub._id, sub.isUnpublished)}
                title={sub.isUnpublished ? "Publish Subject" : "Unpublish Subject"}
              >
                {sub.isUnpublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" size="sm" className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => handleDeleteSubject(e, sub._id)}
                title="Delete Subject"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>`
);
content = content.replace(
  `<Folder className="w-8 h-8 text-blue-400 mb-2" />
            <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDeleteSubject(e, sub._id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="font-bold text-gray-800 line-clamp-1">{sub.name}</h3>`,
  `<Folder className={\`w-8 h-8 mb-2 \${sub.isUnpublished ? 'text-gray-400' : 'text-blue-400'}\`} />
            <h3 className="font-bold text-gray-800 line-clamp-1">{sub.name} {sub.isUnpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>`
);
// replace Card styling
content = content.replace(
  `className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-400 relative group"`,
  `className={\`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group \${sub.isUnpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}\`}`
);


// Modify renderChapters
content = content.replace(
  `className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-400"
            onClick={() => navigateTo({ type: 'CHAPTER', id: ch._id, name: ch.name, ref: ch })}
          >`,
  `className={\`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group \${ch.isUnpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}\`}
            onClick={() => navigateTo({ type: 'CHAPTER', id: ch._id, name: ch.name, ref: ch })}
          >
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <Button 
                variant="ghost" size="sm" className="p-1 text-gray-500 hover:text-primary-600"
                onClick={(e) => handleTogglePublish(e, 'chapter', ch._id, ch.isUnpublished)}
                title={ch.isUnpublished ? "Publish Chapter" : "Unpublish Chapter"}
              >
                {ch.isUnpublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" size="sm" className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => handleDeleteSubFolder(e, 'chapter', ch._id)}
                title="Delete Chapter"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>`
);
content = content.replace(
  `<Folder className="w-8 h-8 text-blue-400 mb-2" />
            <h3 className="font-bold text-gray-800 line-clamp-1">{ch.name}</h3>`,
  `<Folder className={\`w-8 h-8 mb-2 \${ch.isUnpublished ? 'text-gray-400' : 'text-blue-400'}\`} />
            <h3 className="font-bold text-gray-800 line-clamp-1">{ch.name} {ch.isUnpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>`
);

// Modify renderTopics
content = content.replace(
  `className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-400"
            onClick={() => navigateTo({ type: 'TOPIC', id: t._id, name: t.name })}
          >`,
  `className={\`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group \${t.isUnpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}\`}
            onClick={() => navigateTo({ type: 'TOPIC', id: t._id, name: t.name })}
          >
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <Button 
                variant="ghost" size="sm" className="p-1 text-gray-500 hover:text-primary-600"
                onClick={(e) => handleTogglePublish(e, 'topic', t._id, t.isUnpublished)}
                title={t.isUnpublished ? "Publish Topic" : "Unpublish Topic"}
              >
                {t.isUnpublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" size="sm" className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => handleDeleteSubFolder(e, 'topic', t._id)}
                title="Delete Topic"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>`
);
content = content.replace(
  `<Folder className="w-8 h-8 text-blue-400 mb-2" />
            <h3 className="font-bold text-gray-800 line-clamp-1">{t.name}</h3>`,
  `<Folder className={\`w-8 h-8 mb-2 \${t.isUnpublished ? 'text-gray-400' : 'text-blue-400'}\`} />
            <h3 className="font-bold text-gray-800 line-clamp-1">{t.name} {t.isUnpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>`
);


fs.writeFileSync(file, content);
