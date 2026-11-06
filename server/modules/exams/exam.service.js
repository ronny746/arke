const mammoth = require('mammoth-math');
const wordMath = require('word-math');
const cheerio = require('cheerio');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName } = require('../../config/s3');
const crypto = require('crypto');
const JSZip = require('jszip');

class ExamService {

  /**
   * Parse a .docx file buffer into structured questions.
   * Uploads any embedded images to S3 and replaces them with S3 URLs.
   */
  static async parseWordTemplate(fileBuffer) {
    // Pre-process docx to fix subscript/superscript created via w:position (e.g. Mac/Google Docs shortcuts)
    try {
      const zip = await JSZip.loadAsync(fileBuffer);
      if (zip.file("word/document.xml")) {
        let xml = await zip.file("word/document.xml").async("string");
        
        // Convert <w:position w:val="-X"/> to <w:vertAlign w:val="subscript"/>
        xml = xml.replace(/<w:position w:val="-([0-9]+)"\s*\/?>(?:<\/w:position>)?/g, '<w:vertAlign w:val="subscript"/>');
        
        // Convert <w:position w:val="X"/> (positive) to <w:vertAlign w:val="superscript"/>
        xml = xml.replace(/<w:position w:val="([0-9]+)"\s*\/?>(?:<\/w:position>)?/g, '<w:vertAlign w:val="superscript"/>');
        
        zip.file("word/document.xml", xml);
        fileBuffer = await zip.generateAsync({type: "nodebuffer"});
      }
    } catch (err) {
      console.error("Error pre-processing docx buffer for sub/sup scripts:", err);
    }

    // Custom image converter to upload directly to S3
    const imageConverter = mammoth.images.inline(element => {
      return element.read("base64").then(async base64Str => {
        try {
          const imageBuffer = Buffer.from(base64Str, 'base64');
          const ext = element.contentType.split('/')[1] || 'png';
          const fileName = `exams/questions/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: imageBuffer,
            ContentType: element.contentType,
            // ACL: 'public-read' // Uncomment if bucket is not fully public by policy
          }));

          const region = process.env.AWS_REGION || 'ap-south-1';
          const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

          return { src: fileUrl };
        } catch (err) {
          console.error("Image upload failed:", err);
          return { src: '' };
        }
      });
    });

    // Convert docx to HTML
    const result = await mammoth.convertToHtml({ buffer: fileBuffer }, { convertImage: imageConverter });
    let html = result.value; // The generated HTML

    try {
      const rawMathData = wordMath.read(fileBuffer).maths || [];
      // Modern browsers (Chrome, Edge, Safari) use MathML Core which deprecated and removed <mfenced>.
      // Convert <mfenced open="[" close="]"> to <mrow><mo stretchy="true">[</mo>...<mo stretchy="true">]</mo></mrow>
      const mathData = rawMathData.map(m => {
        if (!m || !m.includes('<mfenced')) return m;
        try {
          const $m = cheerio.load(m, { xmlMode: true, decodeEntities: false });
          let safety = 20;
          while ($m('mfenced').length > 0 && safety > 0) {
            safety--;
            $m('mfenced').each((_, el) => {
              if ($m(el).find('mfenced').length > 0) return;
              const open = el.attribs.open !== undefined ? el.attribs.open : '(';
              const close = el.attribs.close !== undefined ? el.attribs.close : ')';
              const separators = el.attribs.separators !== undefined ? el.attribs.separators.split('') : [','];

              let inner = '';
              $m(el).contents().each((cIdx, child) => {
                if (cIdx > 0 && separators.length > 0) {
                  const sep = separators[Math.min(cIdx - 1, separators.length - 1)].trim();
                  if (sep) inner += `<mo>${sep}</mo>`;
                }
                inner += $m.html(child);
              });

              let replacement = '<mrow>';
              if (open && open.trim()) replacement += `<mo stretchy="true">${open}</mo>`;
              replacement += inner;
              if (close && close.trim()) replacement += `<mo stretchy="true">${close}</mo>`;
              replacement += '</mrow>';

              $m(el).replaceWith(replacement);
            });
          }
          return $m.xml();
        } catch (mErr) {
          console.error('Error converting mfenced in math element:', mErr);
          return m;
        }
      });

      // Use global regex and a function to avoid $ substitution bugs, and handle missing math elements gracefully
      html = html.replace(/&lt;\/thisismath&gt;/g, () => {
        const mathElement = mathData.shift();
        if (mathElement) {
          return `<span class="math-equation" contenteditable="false">${mathElement}</span>`;
        }
        return `<span class="math-equation text-red-500" contenteditable="false">[Math Parse Error]</span>`;
      });
    } catch (err) {
      console.error("Math parse error:", err);
    }

    // Now parse the HTML with Cheerio
    const $ = cheerio.load(html);

    const questions = [];
    let currentQuestion = null;
    let currentClass = '';
    let currentSubject = 'General';
    let currentChapter = 'General';
    let currentTopic = 'General';
    let currentDifficulty = 'Medium';
    let currentParagraph = '';
    let currentAppendTarget = 'QUESTION'; // 'PARAGRAPH', 'QUESTION', 'OPTION', 'EXPLANATION'

    // A comprehensive state machine by iterating over all root elements in the generated HTML
    $('body').children().each((i, el) => {
      const text = $(el).text().trim();
      const preserveTags = ['table', 'ul', 'ol', 'img', 'pre', 'blockquote'];
      const htmlContent = preserveTags.includes(el.name) ? $.html(el) : ($(el).html() || '').trim();

      // Look for tags like [CLASS: name], [SUBJECT: name], CHAPTER: name, TOPIC: name, [Para], [Q], [A], [Ans], [Sol]
      if (text.match(/^\[?CLASS\s*:\s*([^\]]+)/i)) {
        currentClass = text.match(/^\[?CLASS\s*:\s*([^\]]+)/i)[1].trim();
        if (currentQuestion && currentQuestion.options.length === 0 && !currentQuestion.explanation) {
          currentQuestion.className = currentClass;
        }
      } else if (text.match(/^\[?SUBJECT\s*:\s*([^\]]+)/i)) {
        currentSubject = text.match(/^\[?SUBJECT\s*:\s*([^\]]+)/i)[1].trim();
        currentParagraph = ''; // Reset comprehension passage on subject change
        if (currentQuestion && currentQuestion.options.length === 0 && !currentQuestion.explanation) {
          currentQuestion.subjectName = currentSubject;
        }
      } else if (text.match(/^\[?CHAPTER\s*:\s*([^\]]+)/i)) {
        currentChapter = text.match(/^\[?CHAPTER\s*:\s*([^\]]+)/i)[1].trim();
        currentParagraph = ''; // Reset comprehension passage on chapter change
        if (currentQuestion && currentQuestion.options.length === 0 && !currentQuestion.explanation) {
          currentQuestion.chapterName = currentChapter;
        }
      } else if (text.match(/^\[?TOPIC\s*:\s*([^\]]+)/i)) {
        currentTopic = text.match(/^\[?TOPIC\s*:\s*([^\]]+)/i)[1].trim();
        if (currentQuestion && currentQuestion.options.length === 0 && !currentQuestion.explanation) {
          currentQuestion.topicName = currentTopic;
        }
      } else if (text.match(/^-{3,}$/)) {
        // Horizontal divider ends any active comprehension paragraph block
        currentParagraph = '';
      } else if (text.match(/^\[?DIFFICULTY\s*:\s*(Easy|Medium|Hard)\]?/i)) {
        const matched = text.match(/^\[?DIFFICULTY\s*:\s*(Easy|Medium|Hard)\]?/i)[1];
        currentDifficulty = matched.charAt(0).toUpperCase() + matched.slice(1).toLowerCase();
        if (currentQuestion && currentQuestion.options.length === 0 && !currentQuestion.explanation) {
          currentQuestion.difficulty = currentDifficulty;
        }
      } else if (text.match(/^\[?(?:Para|Paragraph|Comprehension)[.\s]*\]/i)) {
        // Start of a comprehension / paragraph block
        currentParagraph = htmlContent.replace(/^(?:\s*<[^>]+>)*\s*\[?(?:Para|Paragraph|Comprehension)[.\s]*\]\s*(?:<\/[^>]+>\s*)*\s*/i, '');
        currentAppendTarget = 'PARAGRAPH';
      } else if (text.startsWith('[Q]') || text.startsWith('Q ') || text.match(/^Q\d+[.:\s]*/i) || text.match(/^\[Question\]/i)) {
        if (currentQuestion) questions.push(currentQuestion);

        let qText = htmlContent.replace(/^(?:\s*<[^>]+>)*\s*(?:\[Q\]|\[Question\]|Q\s*|Q\d+[.:\s]*)\s*(?:<\/[^>]+>\s*)*\s*/i, '');
        if (currentParagraph) {
          const passageBox = `<div class="passage-box mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800"><strong class="text-xs font-bold uppercase tracking-wider text-primary-700 block mb-1">Comprehension Passage:</strong>${currentParagraph}</div>`;
          qText = passageBox + qText;
        }

        currentQuestion = {
          type: currentParagraph ? 'PARAGRAPH' : 'MCQ',
          className: currentClass,
          subjectName: currentSubject,
          chapterName: currentChapter,
          topicName: currentTopic,
          difficulty: currentDifficulty,
          paragraphText: currentParagraph || '',
          questionText: qText,
          options: [],
          correctAnswerText: '',
          explanation: '',
          marks: 4,
          negativeMarks: 1,
          order: questions.length + 1
        };
        currentAppendTarget = 'QUESTION';
      } else if (currentQuestion && text.match(/^(?:\[([A-F])\]|\(([A-F])\)|([A-F])[.)]\s+)/i)) {
        const optMatch = text.match(/^(?:\[([A-F])\]|\(([A-F])\)|([A-F])[.)]\s+)/i);
        const optionLabel = (optMatch[1] || optMatch[2] || optMatch[3]).toUpperCase();
        currentQuestion.options.push({
          label: optionLabel,
          text: htmlContent.replace(/^(?:\s*<[^>]+>)*\s*(?:\[[A-F]\]|\([A-F]\)|[A-F][.)]\s*)\s*(?:<\/[^>]+>\s*)*\s*/i, ''),
          isCorrect: false
        });
        currentAppendTarget = 'OPTION';
      } else if (currentQuestion && text.match(/^\[?Ans(?:wer)?\.?\s*\]?\s*[:\-]?/i)) {
        const rawAns = text.replace(/^\[?Ans(?:wer)?\.?\s*\]?\s*[:\-]?\s*/i, '').trim();
        currentQuestion.correctAnswerText = rawAns;

        // If options were given, match option letters (e.g. A, or multiple: A, C, D)
        const letters = rawAns.toUpperCase().match(/[A-F]/g);
        if (currentQuestion.options.length > 0 && letters && letters.length > 0) {
          letters.forEach(letter => {
            const opt = currentQuestion.options.find(o => o.label === letter);
            if (opt) opt.isCorrect = true;
          });

          if (letters.length > 1) {
            currentQuestion.type = 'MULTIPLE_CORRECT';
          }
        } else if (currentQuestion.options.length === 0) {
          // No options given: classify into Integer, Numerical, Fill in Blanks, or Subjective
          if (/^-?\d+$/.test(rawAns)) {
            currentQuestion.type = 'INTEGER';
          } else if (/^-?\d*\.?\d+$/.test(rawAns)) {
            currentQuestion.type = 'NUMERICAL';
          } else if (currentQuestion.questionText.includes('____') || /fill\s+in/i.test(currentQuestion.questionText)) {
            currentQuestion.type = 'FILL_BLANKS';
          } else {
            currentQuestion.type = 'SUBJECTIVE';
          }
        }
        currentAppendTarget = 'QUESTION'; // Reset back to question after Ans
      } else if (currentQuestion && text.match(/^\[?Sol(?:ution)?[.\s]*\]?\s*[:\-]?/i)) {
        currentQuestion.explanation = htmlContent.replace(/^(?:\s*<[^>]+>)*\s*\[?Sol(?:ution)?[.\s]*\]?\s*[:\-]?\s*(?:<\/[^>]+>\s*)*\s*/i, '');
        currentAppendTarget = 'EXPLANATION';
      } else if (htmlContent) {
        // Append content to current target
        if (currentAppendTarget === 'PARAGRAPH') {
          currentParagraph += `<br/>${htmlContent}`;
        } else if (currentAppendTarget === 'QUESTION' && currentQuestion) {
          currentQuestion.questionText += `<br/>${htmlContent}`;
        } else if (currentAppendTarget === 'OPTION' && currentQuestion && currentQuestion.options.length > 0) {
          currentQuestion.options[currentQuestion.options.length - 1].text += `<br/>${htmlContent}`;
        } else if (currentAppendTarget === 'EXPLANATION' && currentQuestion) {
          currentQuestion.explanation += `<br/>${htmlContent}`;
        }
      }
    });

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    // Refine question types based on content and structure
    for (const q of questions) {
      if (q.options.length === 2 && q.options.some(o => /^\s*true\s*$/i.test(o.text)) && q.options.some(o => /^\s*false\s*$/i.test(o.text))) {
        q.type = 'TRUE_FALSE';
      } else if (q.options.length > 0 && q.options.filter(o => o.isCorrect).length > 1) {
        q.type = 'MULTIPLE_CORRECT';
      } else if (/assertion/i.test(q.questionText) && /reason/i.test(q.questionText)) {
        q.type = 'ASSERTION_REASON';
      } else if (/match\s+column/i.test(q.questionText) || (/column\s+i/i.test(q.questionText) && /column\s+ii/i.test(q.questionText))) {
        q.type = 'MATCH_THE_COLUMN';
      } else if (/statement-i/i.test(q.questionText) || /statement\s+i/i.test(q.questionText)) {
        q.type = 'STATEMENT_BASED';
      } else if (q.options.length === 0) {
        if (/^-?\d+$/.test(q.correctAnswerText)) {
          q.type = 'INTEGER';
        } else if (/^-?\d*\.?\d+$/.test(q.correctAnswerText)) {
          q.type = 'NUMERICAL';
        } else if (q.questionText.includes('____') || /fill\s+in/i.test(q.questionText)) {
          q.type = 'FILL_BLANKS';
        } else {
          q.type = 'SUBJECTIVE';
        }
      }
    }

    // Clean up temporary labels from options before returning
    const cleanedQuestions = questions.map(q => {
      let defaultAns = q.correctAnswerText;
      if (!defaultAns && q.options && q.options.length > 0) {
        const correctLabels = q.options.filter(o => o.isCorrect).map(o => o.label);
        defaultAns = correctLabels.join(', ');
      }

      return {
        ...q,
        correctAnswerText: defaultAns || '',
        options: (q.options || []).map(o => ({
          text: o.text,
          isCorrect: o.isCorrect
        }))
      };
    });

    // Group by subject to ensure contiguous numbering when applicable
    const grouped = {};
    const subjectOrder = [];
    cleanedQuestions.forEach(q => {
      const sub = q.subjectName || 'General';
      if (!grouped[sub]) {
        grouped[sub] = [];
        subjectOrder.push(sub);
      }
      grouped[sub].push(q);
    });

    const finalQuestions = [];
    subjectOrder.forEach(sub => {
      finalQuestions.push(...grouped[sub]);
    });

    // Reassign order
    return finalQuestions.map((q, idx) => ({ ...q, order: idx + 1 }));
  }
}

module.exports = ExamService;
