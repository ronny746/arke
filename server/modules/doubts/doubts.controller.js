const mongoose = require('mongoose');
const Doubt = require('./doubts.model');

// Student: Create a new doubt
exports.createDoubt = async (req, res) => {
  try {
    const { batchId, teacherId, question, attachments } = req.body;
    
    const doubt = new Doubt({
      instituteId: req.user.instituteId,
      batchId,
      studentId: req.user.userId,
      teacherId,
      question,
      attachments: attachments || []
    });

    await doubt.save();
    res.status(201).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Student & Teacher: Get all doubts for a specific batch (Public to the batch)
exports.getDoubtsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    
      const doubts = await Doubt.find({ batchId, instituteId: req.user.instituteId })
      .populate('studentId', 'firstName lastName name email profilePicture')
      .populate('teacherId', 'firstName lastName name email profilePicture')
      .sort({ createdAt: -1 });
      
    if (doubts.length > 0) {
      console.log('--- DEBUG DOUBT ---');
      console.log('Doubt studentId:', doubts[0].studentId);
      console.log('User accessing:', req.user);
    }
    res.status(200).json({ success: true, data: doubts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Teacher: Get all doubts assigned to this teacher
exports.getDoubtsForTeacher = async (req, res) => {
  try {
    const doubts = await Doubt.find({ teacherId: req.user.userId })
      .populate('studentId', 'firstName lastName email profilePicture batchId')
      .populate('batchId', 'name')
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: doubts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Teacher: Resolve a doubt
exports.resolveDoubt = async (req, res) => {
  try {
    const { id } = req.params;
    const { solution, solutionAttachments } = req.body;
    
    const doubt = await Doubt.findOne({ _id: id, teacherId: req.user.userId });
    if (!doubt) {
      return res.status(404).json({ success: false, message: 'Doubt not found or unauthorized' });
    }
    
    doubt.solution = solution;
    if (solutionAttachments) {
      doubt.solutionAttachments = solutionAttachments;
    }
    doubt.status = 'RESOLVED';
    await doubt.save();
    
    res.status(200).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get overall doubt stats and list
exports.getAdminDoubtsStats = async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    
    const totalDoubts = await Doubt.countDocuments({ instituteId });
    const pendingDoubts = await Doubt.countDocuments({ instituteId, status: 'PENDING' });
    const resolvedDoubts = await Doubt.countDocuments({ instituteId, status: 'RESOLVED' });
    
    // Aggregate by batch
    const batchStats = await Doubt.aggregate([
      { $match: { instituteId: new mongoose.Types.ObjectId(instituteId) } },
      { $group: {
          _id: '$batchId',
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'batches',
          localField: '_id',
          foreignField: '_id',
          as: 'batch'
        }
      },
      { $unwind: '$batch' },
      { $project: {
          batchName: '$batch.name',
          batchSection: '$batch.section',
          total: 1,
          pending: 1,
          resolved: 1
        }
      }
    ]);
    
    // Fetch all doubts for admin table
    const allDoubts = await Doubt.find({ instituteId })
      .populate('studentId', 'firstName lastName email')
      .populate('teacherId', 'firstName lastName email')
      .populate('batchId', 'name section')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: {
        stats: {
          total: totalDoubts,
          pending: pendingDoubts,
          resolved: resolvedDoubts,
          byBatch: batchStats
        },
        doubts: allDoubts
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
