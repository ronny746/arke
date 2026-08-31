const Lead = require('./leads.model');
const { ROLES } = require('../../config/constants');

// Create a new Lead (Manual)
exports.createLead = async (req, res, next) => {
  try {
    const { studentName, mobileNumber, studentClass, parentName, parentMobile, city, inquiryFor, remarks, assignedTo } = req.body;
    const instituteId = req.user.instituteId;

    const lead = new Lead({
      instituteId,
      studentName,
      mobileNumber,
      studentClass,
      parentName,
      parentMobile,
      city,
      inquiryFor,
      remarks,
      assignedTo: assignedTo || null,
      createdBy: req.user.userId
    });

    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

// Get all leads for an institute (Admin view)
exports.getAllLeads = async (req, res, next) => {
  try {
    const leads = await Lead.find({ instituteId: req.user.instituteId })
      .populate('assignedTo', 'firstName lastName email role metadata')
      .populate('createdBy', 'firstName lastName')
      .populate('followUps.updatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    next(error);
  }
};

// Get leads in the unassigned pool
exports.getLeadPool = async (req, res, next) => {
  try {
    const poolLeads = await Lead.find({ 
      instituteId: req.user.instituteId, 
      assignedTo: null 
    })
    .populate('followUps.updatedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: poolLeads });
  } catch (error) {
    next(error);
  }
};

// Get leads assigned to the logged-in staff
exports.getMyLeads = async (req, res, next) => {
  try {
    const myLeads = await Lead.find({ 
      instituteId: req.user.instituteId, 
      assignedTo: req.user.userId 
    })
    .populate('followUps.updatedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: myLeads });
  } catch (error) {
    next(error);
  }
};

// Staff claims a lead from the pool
exports.claimLead = async (req, res, next) => {
  try {
    const leadId = req.params.id;
    const lead = await Lead.findOne({ _id: leadId, instituteId: req.user.instituteId });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.assignedTo) {
      return res.status(400).json({ success: false, message: 'Lead has already been claimed or assigned' });
    }

    lead.assignedTo = req.user.userId;
    lead.claimedAt = new Date();
    lead.followUps.push({
      status: lead.status,
      remark: 'Lead claimed by staff',
      updatedBy: req.user.userId
    });
    await lead.save();

    res.status(200).json({ success: true, data: lead, message: 'Lead claimed successfully' });
  } catch (error) {
    next(error);
  }
};

// Admin forcefully assigns a lead
exports.assignLead = async (req, res, next) => {
  try {
    const { assignedTo } = req.body; // user ID of staff
    const lead = await Lead.findOne({ _id: req.params.id, instituteId: req.user.instituteId });

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    lead.assignedTo = assignedTo;
    lead.claimedAt = new Date();
    lead.followUps.push({
      status: lead.status,
      remark: 'Lead manually assigned by Admin',
      updatedBy: req.user.userId
    });
    await lead.save();

    res.status(200).json({ success: true, data: lead, message: 'Lead assigned successfully' });
  } catch (error) {
    next(error);
  }
};

// Update lead status
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const { status, remark } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, instituteId: req.user.instituteId });

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Only allow admin or the assigned staff to update
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN_ACADOPS, ROLES.ADMIN_OPERATIONS].includes(req.user.role);
    if (!isAdmin && lead.assignedTo?.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
    }

    if (status) lead.status = status;
    
    // Always log to timeline if a status change or remark occurs
    if (status || remark) {
      lead.followUps.push({
        status: lead.status, // records the newly updated status
        remark: remark || (status ? `Status updated to ${status}` : 'Updated lead details'),
        updatedBy: req.user.userId
      });
    }

    await lead.save();
    res.status(200).json({ success: true, data: lead, message: 'Lead updated' });
  } catch (error) {
    next(error);
  }
};
