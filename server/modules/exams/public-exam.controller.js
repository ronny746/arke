const Exam = require('./exam.model');
const ExamQuestion = require('./exam-question.model');
const ExamSubmission = require('./exam-submission.model');
const jwt = require('jsonwebtoken');

exports.getPublicExamDetails = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('institute', 'name logo');

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.examType !== 'PUBLIC') return res.status(403).json({ success: false, message: 'This exam is not public.' });
    if (exam.status !== 'PUBLISHED') return res.status(400).json({ success: false, message: 'This exam is not currently active.' });

    // Fetch questions without correct answers
    const questions = await ExamQuestion.find({ exam: exam._id })
      .select('-options.isCorrect -correctAnswerText')
      .populate('subject', 'name')
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: {
        exam,
        questions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.startPublicExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, and phone are required.' });
    }

    const exam = await Exam.findById(id);
    if (!exam || exam.examType !== 'PUBLIC' || exam.status !== 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Invalid or inactive exam.' });
    }

    // Create a new submission
    const submission = new ExamSubmission({
      exam: exam._id,
      publicUser: { name, email, phone },
      startTime: new Date(),
      status: 'IN_PROGRESS'
    });

    await submission.save();

    // Generate a temporary JWT for this submission session
    const token = jwt.sign(
      { submissionId: submission._id, examId: exam._id, public: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        submissionId: submission._id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitPublicExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, violations } = req.body;

    // We assume there's a middleware or manual verification of the JWT in headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized session.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.examId !== id || !decoded.public) {
      return res.status(403).json({ success: false, message: 'Invalid token for this exam.' });
    }

    const submission = await ExamSubmission.findById(decoded.submissionId);
    if (!submission || submission.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Submission already processed or invalid.' });
    }

    // Evaluate answers
    const questions = await ExamQuestion.find({ exam: id });
    let score = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;

    const evaluatedAnswers = questions.map(q => {
      const studentAns = answers.find(a => a.questionId === q._id.toString());
      if (!studentAns || studentAns.status === 'NOT_ANSWERED') {
        totalUnattempted++;
        return {
          questionId: q._id,
          status: 'NOT_ANSWERED',
          isCorrect: false,
          marksObtained: 0
        };
      }

      if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
        const correctOpt = q.options.find(o => o.isCorrect);
        const isCorrect = correctOpt && correctOpt._id.toString() === studentAns.selectedOptionId;
        
        if (isCorrect) {
          totalCorrect++;
          score += q.marks || 4;
        } else {
          totalWrong++;
          score -= q.negativeMarks || 1;
        }

        return {
          questionId: q._id,
          selectedOptionId: studentAns.selectedOptionId,
          status: studentAns.status,
          isCorrect,
          marksObtained: isCorrect ? (q.marks || 4) : -(q.negativeMarks || 1)
        };
      } else {
        // Subjective
        return {
          questionId: q._id,
          subjectiveAnswerText: studentAns.subjectiveAnswerText,
          status: studentAns.status,
          isCorrect: false,
          marksObtained: 0
        };
      }
    });

    submission.answers = evaluatedAnswers;
    submission.score = score;
    submission.totalCorrect = totalCorrect;
    submission.totalWrong = totalWrong;
    submission.totalUnattempted = totalUnattempted;
    submission.violations = violations || {};
    submission.endTime = new Date();
    submission.status = 'SUBMITTED';

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Exam submitted successfully.',
      data: { score, totalCorrect, totalWrong, totalUnattempted }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Session expired or invalid.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized session.' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.examId !== id || !decoded.public) {
      return res.status(403).json({ success: false, message: 'Invalid token for this exam.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No snapshot file found' });
    }

    const { s3Client, bucketName } = require('../../config/s3');
    const { Upload } = require('@aws-sdk/lib-storage');

    const fileName = `snapshots/public_${id}_${decoded.submissionId}_${Date.now()}.jpg`;

    const s3Upload = new Upload({
        client: s3Client,
        params: {
            Bucket: bucketName,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype || 'image/jpeg',
        },
    });

    await s3Upload.done();

    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    const ProctoringLog = require('./proctoring-log.model');
    const log = new ProctoringLog({
      exam: id,
      submission: decoded.submissionId,
      snapshotUrl: s3Url,
      type: req.body.type || 'PERIODIC_SNAPSHOT',
      timestamp: new Date()
    });

    await log.save();
    res.status(200).json({ success: true, message: 'Snapshot uploaded' });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Session expired or invalid.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
