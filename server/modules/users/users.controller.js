const UserService = require('./users.service');
const { successResponse } = require('../../common/responses');

const { ROLES } = require('../../config/constants');

exports.create = async (req, res, next) => {
  try {
    const data = await UserService.createUser(req.user, req.body);
    const user = data.toObject();
    delete user.password;
    return successResponse(res, 'User created successfully', user, null, 201);
  } catch (error) {
    next(error);
  }
};

exports.getRoles = (req, res) => {
  // Return the roles as an array of objects or strings, based on constants
  const rolesList = Object.entries(ROLES).map(([key, value]) => ({
    id: value,
    name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) // e.g. 'ADMIN_ACADOPS' -> 'Admin Acadops'
  }));
  return successResponse(res, 'Roles retrieved successfully', rolesList);
};

exports.getDistinctClasses = async (req, res, next) => {
  try {
    const classes = await UserService.getDistinctClasses(req.user);
    return successResponse(res, 'Classes retrieved successfully', classes);
  } catch (error) {
    next(error);
  }
};

exports.getDistinctSections = async (req, res, next) => {
  try {
    const { className } = req.query;
    if (!className) return res.status(400).json({ success: false, message: 'Class name is required' });
    const sections = await UserService.getDistinctSections(req.user, className);
    return successResponse(res, 'Sections retrieved successfully', sections);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const data = await UserService.getUserById(req.user.userId, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'User not found' });
    return successResponse(res, 'Profile retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const payload = req.body;
    // Don't allow changing role or instituteId via this endpoint
    delete payload.role;
    delete payload.instituteId;
    delete payload.password;
    if (!payload.metadata) payload.metadata = {};
    payload.metadata.isProfileIncomplete = false;
    
    const User = require('./users.model');
    const updated = await User.findByIdAndUpdate(req.user.userId, payload, { new: true });
    
    return successResponse(res, 'Profile updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const data = await UserService.getAllUsers(req.user, req.query);
    return successResponse(res, 'Users retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await UserService.getUserById(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'User not found' });
    return successResponse(res, 'User retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await UserService.updateUser(req.params.id, req.body, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'User not found' });
    return successResponse(res, 'User updated successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const data = await UserService.deleteUser(req.params.id, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'User not found' });
    return successResponse(res, 'User deleted successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.linkParentStudent = async (req, res, next) => {
  try {
    const data = await UserService.linkParentStudent(req.body.parentId, req.body.studentId, req.user);
    return successResponse(res, 'Parent and student linked successfully', data);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.setupParentProfile = async (req, res, next) => {
  try {
    // req.user will be the student calling this API
    const data = await UserService.setupParentProfile(req.user.userId, req.body);
    return successResponse(res, 'Parent profile successfully created and linked', data, null, 201);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.importStudents = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }
    const result = await UserService.importStudentsFromExcel(req.file.buffer, req.user);
    return successResponse(res, 'Students imported successfully', result);
  } catch (error) {
    next(error);
  }
};

exports.downloadStudentSampleCSV = (req, res) => {
  const headers = "roll_no,name,class,section,mobile_no,email,dob,rfid,qr_id,face_id\n";
  const sampleData = "101,John Doe,10,A,9876543210,johndoe@example.com,15082005,RF123,QR123,FC123\n";
  const csvContent = headers + sampleData;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.csv"');
  return res.send(csvContent);
};
