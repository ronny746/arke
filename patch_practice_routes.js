const fs = require('fs');
const file = 'server/modules/practice/practice.routes.js';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `router.use(requireRole([ROLES.STUDENT]));

router.get('/filters', practiceController.getFilters);
router.get('/history', practiceController.getHistory);
router.post('/generate', practiceController.generateSession);
router.get('/:id', practiceController.getSession);
router.put('/:id/progress', practiceController.saveProgress);
router.post('/:id/submit', practiceController.submitSession);`;

const newCode = `// router.use(requireRole([ROLES.STUDENT]));

router.get('/filters', requireRole([ROLES.STUDENT]), practiceController.getFilters);
router.get('/history', requireRole([ROLES.STUDENT]), practiceController.getHistory);
router.post('/generate', requireRole([ROLES.STUDENT]), practiceController.generateSession);
router.get('/:id', requireRole([ROLES.STUDENT, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER]), practiceController.getSession);
router.put('/:id/progress', requireRole([ROLES.STUDENT]), practiceController.saveProgress);
router.post('/:id/submit', requireRole([ROLES.STUDENT]), practiceController.submitSession);`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(file, content);
