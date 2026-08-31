const fs = require('fs');
const file = 'src/app/admin/question-banks/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Modify renderTopics
content = content.replace(
  `className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-purple-400"
            onClick={() => navigateTo({ type: 'TOPIC', id: t._id, name: t.name, ref: t })}
          >`,
  `className={\`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group \${t.isUnpublished ? 'border-l-gray-300 opacity-60' : 'border-l-purple-400'}\`}
            onClick={() => navigateTo({ type: 'TOPIC', id: t._id, name: t.name, ref: t })}
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
  `<Folder className="w-8 h-8 text-purple-400 mb-2" />
            <h3 className="font-bold text-gray-800 line-clamp-1">{t.name}</h3>`,
  `<Folder className={\`w-8 h-8 mb-2 \${t.isUnpublished ? 'text-gray-400' : 'text-purple-400'}\`} />
            <h3 className="font-bold text-gray-800 line-clamp-1">{t.name} {t.isUnpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>`
);

fs.writeFileSync(file, content);
