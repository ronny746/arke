const UserModel = require('./users.model');
const { ROLES } = require('../../config/constants');

exports.createUser = async (reqUser, payload) => {
  // Associate the account with the creator's institute. Only the initial
  // setup admin (which has no institute yet) may explicitly choose one.
  let instituteId = reqUser.instituteId;
  if (!instituteId && payload.instituteId) {
    instituteId = payload.instituteId;
  }
  
  if (!payload.metadata) {
    payload.metadata = {};
  }

  // DOB & Password logic
  const dob = payload.dob || payload.metadata.dob;
  if (dob) {
    payload.metadata.dob = dob;
    if (!payload.password || payload.password.trim() === '') {
      payload.password = dob;
    }
  }

  // Auto Roll No & Class/Section handling for Students
  const isStudent = payload.role === ROLES.STUDENT || payload.role === 'student';
  if (isStudent) {
    const existingRollNo = payload.rollNo || payload.metadata.rollNo;
    if (!existingRollNo || existingRollNo.trim() === '' || existingRollNo.toLowerCase() === 'auto') {
      const studentCount = await UserModel.countDocuments({ 
        role: ROLES.STUDENT, 
        instituteId 
      });
      const nextRollNo = `ARKE${String(studentCount + 1).padStart(4, '0')}`;
      payload.metadata.rollNo = nextRollNo;
    } else {
      payload.metadata.rollNo = existingRollNo;
    }

    if (payload.class) payload.metadata.class = payload.class;
    if (payload.section) payload.metadata.section = payload.section;
  }

  const selectedCourses = payload.courses;
  delete payload.courses;

  const user = new UserModel({
    ...payload,
    instituteId
  });
  
  const savedUser = await user.save();

  if (selectedCourses && Array.isArray(selectedCourses) && selectedCourses.length > 0) {
    const CourseModel = require('../courses/courses.model');
    await CourseModel.updateMany(
      { _id: { $in: selectedCourses } },
      { $addToSet: { faculties: savedUser._id } }
    );
  }

  return savedUser;
};

exports.getDistinctClasses = async (reqUser) => {
  const query = { role: ROLES.STUDENT };
  if (reqUser.instituteId) query.instituteId = reqUser.instituteId;
  const dbClasses = await UserModel.distinct('metadata.class', query);
  const defaultClasses = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper', 'Foundation'];
  const merged = Array.from(new Set([...defaultClasses, ...(dbClasses.filter(Boolean))]));
  return merged;
};

exports.getDistinctSections = async (reqUser, className) => {
  const query = { role: ROLES.STUDENT };
  if (className) query['metadata.class'] = className;
  if (reqUser.instituteId) query.instituteId = reqUser.instituteId;
  const dbSections = await UserModel.distinct('metadata.section', query);
  const defaultSections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const merged = Array.from(new Set([...defaultSections, ...(dbSections.filter(Boolean))]));
  return merged;
};

exports.getAllUsers = async (reqUser, query = {}) => {
  // Admin, teacher, student and parent accounts are tenant-isolated.
  if (reqUser.instituteId) query.instituteId = reqUser.instituteId;
  
  // If a teacher is requesting the list of students, only return students from their assigned batches
  if (reqUser.role === 'teacher' && (query.role === 'student' || !query.role)) {
    const BatchModel = require('../batches/batches.model');
    const CourseModel = require('../courses/courses.model');
    const teacherCourseIds = (await CourseModel.find({
      instituteId: reqUser.instituteId,
      $or: [{ faculties: reqUser.userId }, { 'subjects.teacherId': reqUser.userId }]
    }).select('_id')).map(course => course._id);
    const teacherBatches = await BatchModel.find({
      instituteId: reqUser.instituteId,
      $or: [
        { batchTeacherId: reqUser.userId },
        { teachers: reqUser.userId },
        { courseId: { $in: teacherCourseIds } }
      ]
    });
    
    const studentIds = new Set();
    teacherBatches.forEach(batch => {
      batch.students.forEach(studentId => studentIds.add(studentId.toString()));
    });
    
    // Only return students that are in the teacher's batches
    query._id = { $in: Array.from(studentIds) };
  }

  // If a student is requesting the list of teachers, only return teachers from their enrolled batches
  if (reqUser.role === 'student' && query.role === 'teacher') {
    const BatchModel = require('../batches/batches.model');
    const studentBatches = await BatchModel.find({
      instituteId: reqUser.instituteId,
      students: reqUser.userId
    });
    
    const teacherIds = new Set();
    studentBatches.forEach(batch => {
      if (batch.batchTeacherId) teacherIds.add(batch.batchTeacherId.toString());
      if (batch.teachers) {
        batch.teachers.forEach(tid => teacherIds.add(tid.toString()));
      }
    });
    
    // Only return teachers that are in the student's batches
    query._id = { $in: Array.from(teacherIds) };
  }

  // Teachers may identify learners in their own batches, but must never receive
  // student or parent contact details (ARKE portal permission matrix).
  const teacherSafeProjection = 'firstName lastName role metadata profilePictureUrl instituteId isActive';
  let queryBuilder = UserModel.find(query).select(
    reqUser.role === ROLES.TEACHER || reqUser.role === 'teacher'
      ? teacherSafeProjection
      : '-password'
  );
  
  if (query.role === ROLES.PARENT || query.role === 'parent') {
    queryBuilder = queryBuilder.populate('childrenIds', 'firstName lastName metadata profilePictureUrl');
  }

  const users = await queryBuilder.exec();

  if (query.role === 'teacher' || (!query.role && users.some(u => u.role === 'teacher'))) {
    const CourseModel = require('../courses/courses.model');
    const BatchModel = require('../batches/batches.model');
    const teacherIds = users.filter(u => u.role === 'teacher').map(u => u._id);
    
    const [courses, batches] = await Promise.all([
      CourseModel.find({
        faculties: { $in: teacherIds }
      }).select('_id name tag targetExam color faculties'),
      BatchModel.find({
        $or: [
          { batchTeacherId: { $in: teacherIds } },
          { teachers: { $in: teacherIds } }
        ],
        courseId: { $exists: true, $ne: null }
      }).populate('courseId', '_id name tag targetExam color')
    ]);
    
    return users.map(user => {
      const userObj = user.toObject();
      if (user.role === 'teacher') {
        const uIdStr = user._id.toString();
        const directCourses = courses.filter(c => c.faculties && c.faculties.some(fId => fId.toString() === uIdStr));
        const batchCourses = batches
          .filter(b => (b.batchTeacherId?.toString() === uIdStr || (b.teachers && b.teachers.some(t => t.toString() === uIdStr))) && b.courseId)
          .map(b => b.courseId);

        const courseMap = new Map();
        [...directCourses, ...batchCourses].forEach(c => {
          if (c && c._id) {
            courseMap.set(c._id.toString(), {
              _id: c._id,
              name: c.name,
              tag: c.tag,
              targetExam: c.targetExam,
              color: c.color
            });
          }
        });

        userObj.assignedCourses = Array.from(courseMap.values());
      }
      return userObj;
    });
  }
  
  return users;
};

exports.getUserById = async (id, reqUser) => {
  const query = { _id: id };
  if (reqUser?.instituteId) query.instituteId = reqUser.instituteId;
  
  let queryBuilder = UserModel.findOne(query).select(
    reqUser && (reqUser.role === ROLES.TEACHER || reqUser.role === 'teacher')
      ? 'firstName lastName role metadata profilePictureUrl instituteId isActive'
      : '-password'
  );
  
  // If we are fetching a parent profile, populate their children to show on the dashboard
  if (reqUser && reqUser.role === ROLES.PARENT) {
    queryBuilder = queryBuilder.populate('childrenIds', 'firstName lastName email phone metadata profilePictureUrl');
  }
  
  const user = await queryBuilder.exec();
  if (user && user.role === 'teacher') {
    const CourseModel = require('../courses/courses.model');
    const assigned = await CourseModel.find({ faculties: user._id }).select('_id name tag targetExam color');
    const userObj = user.toObject();
    userObj.assignedCourses = assigned;
    return userObj;
  }
  return user;
};

exports.updateUser = async (id, payload, reqUser) => {
  const query = { _id: id };
  if (reqUser.instituteId) query.instituteId = reqUser.instituteId;

  const bcrypt = require('bcryptjs');
  if (payload.password && payload.password.trim()) {
    const salt = await bcrypt.genSalt(10);
    payload.password = await bcrypt.hash(payload.password, salt);
  } else {
    delete payload.password;
  }

  const selectedCourses = payload.courses;
  delete payload.courses;

  const updatedUser = await UserModel.findOneAndUpdate(query, payload, { new: true }).select('-password');

  if (selectedCourses !== undefined && Array.isArray(selectedCourses)) {
    const CourseModel = require('../courses/courses.model');
    // Remove teacher from courses not in selectedCourses
    await CourseModel.updateMany(
      { faculties: id, _id: { $nin: selectedCourses } },
      { $pull: { faculties: id } }
    );
    // Add teacher to selected courses
    if (selectedCourses.length > 0) {
      await CourseModel.updateMany(
        { _id: { $in: selectedCourses } },
        { $addToSet: { faculties: id } }
      );
    }
  }

  if (updatedUser && updatedUser.role === 'teacher') {
    const CourseModel = require('../courses/courses.model');
    const assigned = await CourseModel.find({ faculties: updatedUser._id }).select('_id name tag targetExam color');
    const userObj = updatedUser.toObject();
    userObj.assignedCourses = assigned;
    return userObj;
  }

  return updatedUser;
};

exports.deleteUser = async (id, reqUser) => {
  const query = { _id: id };
  if (reqUser.instituteId) query.instituteId = reqUser.instituteId;
  return await UserModel.findOneAndDelete(query);
};

exports.suspendStudent = async (id, endDate, reqUser) => {
  const suspensionEndsAt = new Date(endDate);
  if (Number.isNaN(suspensionEndsAt.getTime()) || suspensionEndsAt <= new Date()) {
    throw new Error('Suspension end date must be in the future.');
  }
  const query = { _id: id, role: ROLES.STUDENT };
  if (reqUser.instituteId) query.instituteId = reqUser.instituteId;
  const student = await UserModel.findOneAndUpdate(query, { $set: { suspensionEndsAt } }, { new: true }).select('-password');
  if (!student) throw new Error('Student not found.');
  return student;
};

exports.linkParentStudent = async (parentId, studentId, reqUser) => {
  const queryBase = reqUser.instituteId ? { instituteId: reqUser.instituteId } : {};
  
  const parent = await UserModel.findOne({ _id: parentId, role: 'parent', ...queryBase });
  const student = await UserModel.findOne({ _id: studentId, role: 'student', ...queryBase });

  if (!parent || !student) {
    throw new Error('Parent or Student not found, or roles mismatch');
  }

  // Bidirectional link
  await UserModel.findByIdAndUpdate(studentId, { $set: { parentId: parent._id } });
  return await UserModel.findByIdAndUpdate(parentId, { $addToSet: { childrenIds: student._id } }, { new: true })
    .populate('childrenIds', 'firstName lastName email');
};

exports.setupParentProfile = async (studentId, payload) => {
  const student = await UserModel.findById(studentId).select('+password');
  if (!student) throw new Error('Student not found');
  if (student.parentId) throw new Error('A parent is already linked to this student');

  // Check if email is already taken
  const existingUser = await UserModel.findOne({ email: payload.email });
  if (existingUser) throw new Error('Email is already registered');

  // Create parent with temporary password to pass validation
  const parent = await UserModel.create({
    ...payload,
    role: 'parent',
    password: 'TemporaryPassword@123',
    instituteId: student.instituteId,
    childrenIds: [student._id]
  });

  // Overwrite the password hash directly bypassing the pre-save hook
  await UserModel.updateOne({ _id: parent._id }, { $set: { password: student.password } });

  // Update student with parentId
  await UserModel.updateOne({ _id: student._id }, { $set: { parentId: parent._id } });

  return parent;
};

const xlsx = require('xlsx');

exports.importStudentsFromExcel = async (buffer, reqUser) => {
  return new Promise(async (resolve, reject) => {
    const errors = [];
    let successful = 0;
    let failed = 0;

    try {
      // Parse the Excel file from buffer
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Convert to JSON (skipping the first row if it's the title, headers are usually on row 2)
      // xlsx.utils.sheet_to_json handles header finding. If row 1 is title and row 2 is headers:
      // A safe way is to get as array of arrays, find the header row, then map.
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      // Find the row that contains 'Roll number' or 'Name' to identify headers
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (row && row.some(cell => cell && typeof cell === 'string' && (cell.toLowerCase().includes('roll number') || cell.toLowerCase().includes('name')))) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = rawData[headerRowIdx].map(h => h ? h.toString().trim().toLowerCase() : '');
      const results = [];

      for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const rowData = rawData[i];
        // Skip empty rows
        if (!rowData || rowData.length === 0 || !rowData.some(Boolean)) continue;
        
        const row = {};
        headers.forEach((header, index) => {
          if (header) {
            row[header] = rowData[index] ? rowData[index].toString().trim() : '';
          }
        });
        results.push({ rowNumber: i + 1, data: row });
      }

      for (const item of results) {
        try {
          const { rowNumber, data } = item;
          
          // Map headers to standard keys based on the provided screenshot
          // Headers: Roll number, Name, Mobile Number, Class, Section, State, City, Email, Parent Name, Parent Mobile Number, Center
          const rollNo = data['roll number'] || data['roll_no'] || data['roll no'] || data['roll no.'];
          const name = data['name'];
          const mobile = data['mobile number'] || data['mobile_no'];
          const studentClass = data['class'];
          const section = data['section'];
          const state = data['state'];
          const city = data['city'];
          const rawEmail = data['email'];
          const parentName = data['parent name'];
          const parentMobile = data['parent mobile number'];
          const center = data['center'];
          
          // Required fields check based on the sheet
          if (!rollNo || !name) {
            errors.push({ row: rowNumber, error: 'Missing required fields (Roll number, Name)' });
            failed++;
            continue;
          }

          const email = rawEmail ? rawEmail : undefined;

          const nameParts = name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || ' ';
          let instituteId = reqUser.instituteId;

          const newMetadata = {
            rollNo: rollNo,
            class: studentClass,
            section: section,
            state: state,
            city: city,
            parentName: parentName,
            parentPhone: parentMobile,
            center: center,
            status: 'active'
          };

          let user;
          const queryOr = [{ 'metadata.rollNo': rollNo }];
          if (email) queryOr.push({ email: email });
          
          const existingUser = await UserModel.findOne({ $or: queryOr });

          if (existingUser) {
            // Update existing user
            if (firstName) existingUser.firstName = firstName;
            if (lastName) existingUser.lastName = lastName;
            if (mobile) existingUser.phone = mobile;
            
            // Merge metadata
            existingUser.metadata = {
              ...(existingUser.metadata || {}),
              ...newMetadata
            };
            
            user = existingUser;
            await user.save();
          } else {
            // Create new user
            const payload = {
              firstName,
              lastName,
              email: email,
              password: 'password123', // Default password
              role: ROLES.STUDENT,
              phone: mobile,
              instituteId,
              metadata: newMetadata
            };

            user = new UserModel(payload);
            await user.save();
          }


          // Create and Link Parent Account
          if (parentMobile) {
            let parentUser = await UserModel.findOne({ phone: parentMobile, role: ROLES.PARENT });
            
            if (!parentUser) {
              const pNameParts = parentName ? parentName.split(' ') : ['Parent'];
              const pFirstName = pNameParts[0];
              const pLastName = pNameParts.slice(1).join(' ') || ' ';
              const pEmail = undefined;
              
              parentUser = new UserModel({
                firstName: pFirstName,
                lastName: pLastName,
                email: pEmail,
                password: 'password123',
                role: ROLES.PARENT,
                phone: parentMobile,
                instituteId,
                childrenIds: [user._id]
              });
              await parentUser.save();
            } else {
              if (!parentUser.childrenIds.includes(user._id)) {
                parentUser.childrenIds.push(user._id);
                await parentUser.save();
              }
            }
            
            // Link parent back to student
            user.parentId = parentUser._id;
            await user.save();
          }

          successful++;

        } catch (err) {
          errors.push({ row: item.rowNumber, error: err.message });
          failed++;
        }
      }

      resolve({
        total: results.length,
        successful,
        failed,
        errors
      });
    } catch (err) {
      reject(err);
    }
  });
};
