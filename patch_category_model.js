const fs = require('fs');
const file = 'server/modules/exams/category.model.js';
let content = fs.readFileSync(file, 'utf8');

// Add isUnpublished to subjectSchema
content = content.replace(
  "ref: 'User'\n  }",
  "ref: 'User'\n  },\n  isUnpublished: { type: Boolean, default: false }"
);

// Add isUnpublished to chapterSchema
content = content.replace(
  "ref: 'User'\n  }\n}, { timestamps: true });\n\nconst topicSchema",
  "ref: 'User'\n  },\n  isUnpublished: { type: Boolean, default: false }\n}, { timestamps: true });\n\nconst topicSchema"
);

// Add isUnpublished to topicSchema
content = content.replace(
  "ref: 'User'\n  }\n}, { timestamps: true });\n\nconst QuestionCategory",
  "ref: 'User'\n  },\n  isUnpublished: { type: Boolean, default: false }\n}, { timestamps: true });\n\nconst QuestionCategory"
);

fs.writeFileSync(file, content);
