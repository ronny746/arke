const fs = require('fs');
const file = 'server/modules/exams/category.routes.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "router.delete('/:id', requireRole(allowedRoles), categoryController.deleteCategory);",
  "router.delete('/:id', requireRole(allowedRoles), categoryController.deleteCategory);\nrouter.delete('/chapter/:id', requireRole(allowedRoles), categoryController.deleteChapter);\nrouter.delete('/topic/:id', requireRole(allowedRoles), categoryController.deleteTopic);\nrouter.put('/toggle/:type/:id', requireRole(allowedRoles), categoryController.togglePublish);"
);

fs.writeFileSync(file, content);
