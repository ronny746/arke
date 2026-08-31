const AuthService = require('./auth.service');
const { successResponse, errorResponse } = require('../../common/responses');
const { sendMobileOTP } = require('../../services/sms.service');
const OtpModel = require('../../models/otp.model');
const User = require('../users/users.model');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const data = await AuthService.login(email, password, role);
    return successResponse(res, `Login successful for portal: ${data.user.role}`, data);
  } catch (error) {
    if (error.message.includes('Invalid email') || error.message.includes('password') || error.message.includes('portal')) {
      return errorResponse(res, error.message, null, 401);
    }
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    // req.user contains the decoded JWT
    return successResponse(res, 'Current user retrieved successfully', req.user);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.userId, oldPassword, newPassword);
    return successResponse(res, 'Password changed successfully');
  } catch (error) {
    if (error.message.includes('Invalid old password')) {
      return errorResponse(res, error.message, null, 400);
    }
    next(error);
  }
};

exports.requestOtp = async (req, res, next) => {
    try {
        const { mobileNumber, isSignup } = req.body;
        
        if (!mobileNumber) {
            return errorResponse(res, "Mobile number is required", null, 400);
        }

        const cleanPhone = mobileNumber.replace(/\D/g, '').slice(-10);
        const user = await User.findOne({ phone: cleanPhone });

        // No longer checking isSignup vs existing user. Just send the OTP.


        const result = await sendMobileOTP(mobileNumber);

        if (result.success) {
            // Save generated OTP to database
            await OtpModel.create({ phone: cleanPhone, otp: result.otp });
            
            return successResponse(res, "OTP sent successfully to mobile number");
        } else {
            return errorResponse(res, "Failed to send OTP", null, 500);
        }
    } catch (err) {
        next(err);
    }
};

exports.verifyOtp = async (req, res, next) => {
    try {
        const { phone, otp, isSignup, name, email, studentClass, state, city, role } = req.body;
        const requestedRole = role || 'student';

        if (!phone || !otp) {
            return errorResponse(res, "Phone and OTP are required", null, 400);
        }

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);

        let user = await User.findOne({ phone: cleanPhone, role: requestedRole });
        let isRollNoBypass = false;

        // Check if user is in-house and provided their roll number instead of OTP
        if (user && user.metadata && user.metadata.rollNo && requestedRole === 'student') {
            const SystemConfig = require('../system-config/system-config.model');
            const config = await SystemConfig.findOne();
            const enableRollNumberLogin = config?.authSettings?.enableRollNumberLogin ?? true;

            if (enableRollNumberLogin) {
                const rollNoStr = String(user.metadata.rollNo).trim();
                // In-house students don't have "SKD" in their roll number
                if (!/SKD/i.test(rollNoStr)) {
                    if (String(otp).trim() === rollNoStr) {
                        isRollNoBypass = true;
                    }
                }
            }
        }

        if (!isRollNoBypass) {
            // Find the OTP in DB
            const otpRecord = await OtpModel.findOne({ phone: cleanPhone, otp: otp });

            if (!otpRecord) {
                return errorResponse(res, "Invalid or expired OTP", null, 400);
            }

            if (!user) {
                // Create new barebones student if they don't exist
                const Institute = require('../institutes/institutes.model');
                const defaultInstitute = await Institute.findOne();
                
                const userFields = {
                    firstName: requestedRole === 'parent' ? 'Parent' : 'Student',
                    lastName: '.',
                    phone: cleanPhone,
                    role: requestedRole,
                    instituteId: defaultInstitute ? defaultInstitute._id : null,
                    password: Math.random().toString(36).slice(-8), // random secure password
                    metadata: {
                        isProfileIncomplete: true
                    }
                };
                if (requestedRole !== 'parent') {
                    userFields.email = `${requestedRole}_${cleanPhone}@skd.com`;
                }
                user = await User.create(userFields);
            }

            // OTP verified successfully, remove it from DB
            await OtpModel.deleteOne({ _id: otpRecord._id });
        }

        // Generate JWT Token (matching AuthService behavior)
        const token = jwt.sign(
            { userId: user._id, role: user.role, instituteId: user.instituteId }, 
            process.env.JWT_SECRET || 'your_jwt_secret', 
            { expiresIn: process.env.JWT_ACCESS_EXPIRATION_MINUTES ? `${process.env.JWT_ACCESS_EXPIRATION_MINUTES}m` : '1d' }
        );

        return successResponse(res, isSignup ? "Registration successful" : "Login successful", {
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (err) {
        // Handle MongoDB duplicate key errors gracefully
        if (err.code === 11000) {
            if (err.keyPattern?.email) {
                return errorResponse(res, "An account with this email already exists. Please log in instead.", null, 400);
            }
            if (err.keyPattern?.phone) {
                return errorResponse(res, "An account with this mobile number already exists. Please log in instead.", null, 400);
            }
            return errorResponse(res, "Account already exists. Please try logging in.", null, 400);
        }
        next(err);
    }
};

exports.verifyDevice = async (req, res, next) => {
    try {
        const { sessionId } = req.body;
        const user = req.user; // From verifyToken middleware

        if (user.activeSessionId !== sessionId) {
            return errorResponse(res, 'Session expired. Logged in from another device.', null, 401);
        }

        return successResponse(res, 'Session valid');
    } catch (err) {
        next(err);
    }
};

const { sendEmailOTP } = require('../../services/email.service');

exports.requestEmailOtp = async (req, res, next) => {
    try {
        const { email, role } = req.body;

        if (!email) {
            return errorResponse(res, "Email is required", null, 400);
        }
        
        let roleQuery = role;
        if (role === 'admin') {
            roleQuery = { $in: ['admin', 'super_admin', 'institute_admin', 'admin_acadops', 'admin_operations'] };
        }

        const user = await User.findOne({ email: email.toLowerCase(), role: roleQuery });
        if (!user) {
            return errorResponse(res, `No ${role || 'user'} found with this email`, null, 404);
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to database first so user can login via terminal even if email fails
        await OtpModel.create({ email: email.toLowerCase(), otp });
 
                // Always log the OTP to server console to aid testing (regardless of email delivery)
                console.log('\n\n=========================================\n🔥 EMAIL OTP FOR %s IS: %s 🔥\n=========================================\n\n', email.toLowerCase(), otp);
        const result = await sendEmailOTP(email, otp);

        if (result.success) {
            return successResponse(res, "OTP sent successfully to email");
        } else {
            // Send 200 OK anyway for testing, but include a warning message
            return successResponse(res, "OTP generated (Check terminal). Email failed to send due to App Password issue.");
        }
    } catch (err) {
        next(err);
    }
};

exports.verifyEmailOtp = async (req, res, next) => {
    try {
        const { email, otp, role } = req.body;

        if (!email || !otp) {
            return errorResponse(res, "Email and OTP are required", null, 400);
        }

        let roleQuery = role;
        if (role === 'admin') {
            roleQuery = { $in: ['admin', 'super_admin', 'institute_admin', 'admin_acadops', 'admin_operations'] };
        }

        const user = await User.findOne({ email: email.toLowerCase(), role: roleQuery });
        if (!user) {
            return errorResponse(res, "Invalid user credentials", null, 401);
        }

        const validOtp = await OtpModel.findOne({ email: email.toLowerCase(), otp });
        
        if (!validOtp) {
            return errorResponse(res, "Invalid or expired OTP", null, 401);
        }

        // Delete OTP after successful verification
        await OtpModel.deleteOne({ _id: validOtp._id });

        // Generate JWT
        const sessionId = Math.random().toString(36).substring(2, 15);
        user.activeSessionId = sessionId;
        
        if (!user.instituteId) {
            const Institute = require('../institute/institute.model');
            const defaultInst = await Institute.findOne();
            if (defaultInst) user.instituteId = defaultInst._id;
        }

        await User.updateOne({ _id: user._id }, { 
            $set: { 
                activeSessionId: sessionId, 
                ...(user.instituteId ? { instituteId: user.instituteId } : {}) 
            } 
        });

        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role, 
                instituteId: user.instituteId,
                branchId: user.branchId,
                sessionId 
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        const userData = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            profilePictureUrl: user.profilePictureUrl
        };

        return successResponse(res, "Login successful", { user: userData, token });
    } catch (err) {
        next(err);
    }
};

exports.developerMode = async (req, res, next) => {
    try {
        const { pin } = req.body;
        // Verify PIN
        if (pin !== '9999') {
            return errorResponse(res, "Invalid Developer PIN", null, 401);
        }
        
        // Ensure user is the developer
        const user = await User.findById(req.user.userId);
        if (!user || user.email !== 'developer.abhishek.0929@gmail.com') {
            return errorResponse(res, "Access Denied. You are not authorized for Developer Mode.", null, 403);
        }

        // Generate Developer Token
        const developerToken = jwt.sign(
            { userId: user._id, isDeveloper: true },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1h' }
        );

        return successResponse(res, "Developer Mode Activated", { developerToken });
    } catch (err) {
        next(err);
    }
};
