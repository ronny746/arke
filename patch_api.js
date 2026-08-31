const fs = require('fs');
const file = 'src/api/admin.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "deleteQuestionCategory: (id) => axiosInstance.delete(`/question-categories/${id}`),",
  "deleteQuestionCategory: (id) => axiosInstance.delete(`/question-categories/${id}`),\n  deleteQuestionChapter: (id) => axiosInstance.delete(`/question-categories/chapter/${id}`),\n  deleteQuestionTopic: (id) => axiosInstance.delete(`/question-categories/topic/${id}`),\n  togglePublishCategory: (type, id, isUnpublished) => axiosInstance.put(`/question-categories/toggle/${type}/${id}`, { isUnpublished }),"
);

fs.writeFileSync(file, content);
