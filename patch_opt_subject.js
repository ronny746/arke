const fs = require('fs');
const file = 'src/app/admin/question-banks/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const newToggleLogic = `  const handleTogglePublish = async (e, type, id, currentlyUnpublished) => {
    e.stopPropagation();
    const targetVal = !currentlyUnpublished;
    try {
      // Optimistic update helper (mutating safely for local visual feedback)
      const updateRef = (item) => {
         if (!item) return;
         if (type === 'subject' && item._id === id) item.isUnpublished = targetVal;
         else if (type === 'chapter' && item._id === id) item.isUnpublished = targetVal;
         else if (type === 'topic' && item._id === id) item.isUnpublished = targetVal;
         
         if (item.chapters) item.chapters.forEach(updateRef);
         if (item.topics) item.topics.forEach(updateRef);
      };

      setHierarchy(prev => {
        const newH = [...prev];
        newH.forEach(updateRef);
        return newH;
      });
      
      setPath(prev => {
        const newP = [...prev];
        newP.forEach(p => {
           if (p.ref) updateRef(p.ref);
        });
        return newP;
      });

      await adminAPI.togglePublishCategory(type, id, targetVal);
      toast.success(currentlyUnpublished ? "Published!" : "Unpublished!");
    } catch (err) {
      toast.error("Failed to update status");
      fetchData(); // revert
    }
  };`;

// replace old handleTogglePublish
content = content.replace(/const handleTogglePublish = async \(e, type, id, currentlyUnpublished\) => \{[\s\S]*?fetchData\(\); \/\/ re-fetch hierarchy\n    \} catch \(err\) \{\n      toast\.error\("Failed to update status"\);\n    \}\n  \};/, newToggleLogic);

// replace handleDeleteSubFolder to also do optimistic update
const newDeleteLogic = `  const handleDeleteSubFolder = async (e, type, id) => {
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
  };`;

content = content.replace(/const handleDeleteSubFolder = async \(e, type, id\) => \{[\s\S]*?fetchData\(\); \/\/ re-fetch hierarchy\n    \} catch \(err\) \{\n      toast\.error\("Failed to delete"\);\n    \}\n  \};/, newDeleteLogic);

fs.writeFileSync(file, content);
