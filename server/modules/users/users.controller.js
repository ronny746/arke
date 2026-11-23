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

// Self-service profile update. Only these top-level fields may be changed;
// role, isActive, childrenIds, parentId, permissions, etc. are ignored.
const SELF_EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'profilePictureUrl'];
// Set by the institute; a user cannot change them on their own profile.
const ADMIN_ONLY_METADATA_KEYS = new Set(['rollNo', 'section', 'session']);

const buildSelfProfileUpdate = (body = {}) => {
  const $set = {};
  for (const field of SELF_EDITABLE_FIELDS) {
    let value = body[field];
    if (value === undefined || value === null || typeof value === 'object') continue;
    value = String(value).trim();
    if (field === 'email') {
      if (!value) continue; // never store an empty email
    }
    $set[field] = value;
  }
  // Merge metadata key by key so fields the client did not send (rollNo,
  // section, targetExam...) are kept instead of being wiped.
  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!/^[A-Za-z0-9_]+$/.test(key) || ADMIN_ONLY_METADATA_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (key === 'email' && !String(value).trim()) continue;
    $set[`metadata.${key}`] = value;
  }
  $set['metadata.isProfileIncomplete'] = false;
  return { $set };
};
exports.buildSelfProfileUpdate = buildSelfProfileUpdate;

exports.updateMe = async (req, res, next) => {
  try {
    const User = require('./users.model');
    const update = buildSelfProfileUpdate(req.body);
    // Legacy users may have metadata stored as null; dotted $set cannot write into null.
    await User.updateOne({ _id: req.user.userId, metadata: null }, { $set: { metadata: {} } });
    const updated = await User.findByIdAndUpdate(req.user.userId, update, { new: true });
    
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

exports.suspendStudent = async (req, res, next) => {
  try {
    const data = await UserService.suspendStudent(req.params.id, req.body.endDate, req.user);
    return successResponse(res, 'Student suspended until the selected end date', data);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
