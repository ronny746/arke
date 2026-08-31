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
      const mathData = wordMath.read(fileBuffer).maths || [];
      // Use global regex and a function to avoid $ substitution bugs, and handle missing math elements gracefully
      html = html.replace(/&lt;\/thisismath&gt;/g, () => {
        const mathElement = mathData.shift();
        if (mathElement) {
          return `<span class="math-equation">${mathElement}</span>`;
        }
        return `<span class="math-equation text-red-500">[Math Parse Error]</span>`;
      });
    } catch (err) {
      console.error("Math parse error:", err);
    }

    // Now parse the HTML with Cheerio
    const $ = cheerio.load(html);

    const questions = [];
    let currentQuestion = null;
    let currentSubject = 'General';
    let currentChapter = 'General';
    let currentTopic = 'General';
    let currentDifficulty = 'Medium';
    let currentAppendTarget = 'QUESTION'; // 'QUESTION' or 'OPTION'

    // A simple state machine by iterating over all root elements in the generated HTML
    // Mammoth usually wraps paragraphs in <p> tags.
    $('body').children().each((i, el) => {
      const text = $(el).text().trim();
      const preserveTags = ['table', 'ul', 'ol', 'img', 'pre', 'blockquote'];
      const htmlContent = preserveTags.includes(el.name) ? $.html(el) : ($(el).html() || '').trim();

      // Look for tags like [SUBJECT: name], CHAPTER: name, TOPIC: name, [Q], [A], [B], [C], [D], [Ans]
      if (text.match(/^\[?SUBJECT\s*:\s*([^\]]+)/i)) {
        currentSubject = text.match(/^\[?SUBJECT\s*:\s*([^\]]+)/i)[1].trim();
        if (currentQuestion) currentQuestion.subjectName = currentSubject;
      } else if (text.match(/^\[?CHAPTER\s*:\s*([^\]]+)/i)) {
        currentChapter = text.match(/^\[?CHAPTER\s*:\s*([^\]]+)/i)[1].trim();
        if (currentQuestion) currentQuestion.chapterName = currentChapter;
      } else if (text.match(/^\[?TOPIC\s*:\s*([^\]]+)/i)) {
        currentTopic = text.match(/^\[?TOPIC\s*:\s*([^\]]+)/i)[1].trim();
        if (currentQuestion) currentQuestion.topicName = currentTopic;
      } else if (text.match(/^\[?DIFFICULTY\s*:\s*(Easy|Medium|Hard)\]?/i)) {
        // e.g. [DIFFICULTY: Easy] or DIFFICULTY: Hard
        const matched = text.match(/^\[?DIFFICULTY\s*:\s*(Easy|Medium|Hard)\]?/i)[1];
        currentDifficulty = matched.charAt(0).toUpperCase() + matched.slice(1).toLowerCase();
        if (currentQuestion) currentQuestion.difficulty = currentDifficulty;
      } else if (text.startsWith('[Q]') || text.startsWith('Q ') || text.match(/^Q\d+/i)) {
        if (currentQuestion) questions.push(currentQuestion);

        currentQuestion = {
          type: 'MCQ',
          subjectName: currentSubject,
          chapterName: currentChapter,
          topicName: currentTopic,
          difficulty: currentDifficulty,
          questionText: htmlContent.replace(/^(?:\[Q\]|Q\s*|Q\d+\.?\s*)/i, ''),
          options: [],
          correctAnswerText: '',
          explanation: '',
          marks: 4,
          negativeMarks: 1,
          order: questions.length + 1
        };
        currentAppendTarget = 'QUESTION';
      } else if (currentQuestion && text.match(/^\[([A-D])\]/i)) {
        const optionLabel = text.match(/^\[([A-D])\]/i)[1].toUpperCase();
        currentQuestion.options.push({
          label: optionLabel,
          text: htmlContent.replace(/^\[[A-D]\]\s*/i, ''),
          isCorrect: false
        });
        currentAppendTarget = 'OPTION';
      } else if (currentQuestion && text.match(/^\[Ans\.?\]/i)) {
        const ans = text.replace(/^\[Ans\.?\]\s*/i, '').trim().toUpperCase(); // Expecting A, B, C, or D
        const optIndex = currentQuestion.options.findIndex(o => o.label === ans);
        if (optIndex !== -1) {
          currentQuestion.options[optIndex].isCorrect = true;
        }
        currentAppendTarget = 'QUESTION'; // reset back to question after Ans
      } else if (currentQuestion && text.match(/^\[Sol\.?\]/i)) {
        currentQuestion.explanation = htmlContent.replace(/^\[Sol\.?\]\s*/i, '');
        currentAppendTarget = 'EXPLANATION';
      } else if (currentQuestion && htmlContent) {
        // If it doesn't match any tag, append it to the current target
        if (currentAppendTarget === 'QUESTION') {
          currentQuestion.questionText += `<br/>${htmlContent}`;
        } else if (currentAppendTarget === 'OPTION' && currentQuestion.options.length > 0) {
          currentQuestion.options[currentQuestion.options.length - 1].text += `<br/>${htmlContent}`;
        } else if (currentAppendTarget === 'EXPLANATION') {
          currentQuestion.explanation += `<br/>${htmlContent}`;
        }
      }
    });

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    // Clean up temporary labels from options before returning
    const cleanedQuestions = questions.map(q => {
      return {
        ...q,
        options: q.options.map(o => ({
          text: o.text,
          isCorrect: o.isCorrect
        }))
      };
    });

    // Group by subject to ensure contiguous numbering when ap
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
