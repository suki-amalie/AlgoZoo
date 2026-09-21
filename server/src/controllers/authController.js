const { JWT_ACCESS_TOKEN_EXPIRES,JWT_REFRESH_TOKEN_EXPIRES } = require('../config/env');
const { loginResponse } = require('../utils/response');
const { getDateAfterDuration } = require('../utils/date');
const {generateAccessToken, generateRefreshToken} = require('../utils/jwt');
const User = require('../models/user');
const Class = require('../models/class');
const ClassMember = require('../models/classMember');
const validateEmail = require('../validators/emailFormat');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { baseCookieOptions } = require('../utils/cookieOptions');
const { notifyMany } = require('../utils/notify');

/** Register User via Admin Invitation Link (Token-based)
 *  POST /routes/auth/register
 */ 
exports.register = async (req, res) => {
    //Start a Mongoose Session for Atomic Operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try { 
        const {token, fullname, email, password} = req.body; 
            
        // 1. Validate required fields 
        if (!token || !fullname || !email || !password) {
            await session.endSession();
            return res.status(400).json({ 
                status: 'error',
                message: 'Token, fullname, email and password are required' }); 
            }

        // 2. Validate email format 
        if (email && !validateEmail(email)) { 
            await session.endSession();
            return res.status(400).json({ 
                status: 'error',
                message: 'Please provide a valid email address' }); 
            }

        // 3. Validate password length
        if (password.length < 6) {
            await session.endSession();
            return res.status(400).json({ 
                status: 'error',
                message: 'Password must be at least 6 characters' }); 
            }

        // 4. Find Class matching the token & verify 2-day expiration date limit
        const classDoc = await Class.findOne({
            $or: [
                {
                    studentJoinToken: token,
                    studentJoinTokenExpiresAt: { $gt: new Date() },
                },
                {
                    trainerInviteToken: token,
                    trainerInviteTokenExpiresAt: { $gt: new Date() },
                },
            ],
            isActive: true,
        }).session(session);

        if (!classDoc) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                status: 'error',
                message: 'Invitation link is invalid, expired, or class is inactive',
            });
        }
        
        // 5. Automatically get role from token match
        const role = token === classDoc.studentJoinToken ? 'student' : 'trainer';

        // 6. Check if user already exists by email
        const formattedEmail = email ? email.trim().toLowerCase() : null;

        let user = await User.findOne({ email: formattedEmail }).select('+password').session(session);

        if (!user && formattedEmail) {
            //Check if email belong to another existing account
            const emailUser = await User.findOne({ email: formattedEmail }).session(session);
            if (emailUser) {
                await session.abortTransaction();
                session.endSession();
                return res.status(409).json({
                    status: 'error',
                    message: 'Email address is already signed up by another account',
                });
            }
        }

        if (user) {
            //Existing User: Verify password to authorize joining the new class
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                await session.abortTransaction();
                session.endSession();
                return res.status(401).json({
                    status: 'error',
                    message: 'Incorrect password for existing account',
                });
            }

            //Check if user is already in this specific class
            const existingEnrollment = await ClassMember.findOne({
                classId: classDoc._id,
                userId: user._id,
            }).session(session);

            if (existingEnrollment) {
                await session.abortTransaction();
                session.endSession();
                return res.status(409).json({
                    status: 'error',
                    message: 'You are already enrolled in this class',
                });
            }
        } else {
            //New User: Validate fullname and create account
            if (!fullname || !fullname.trim()) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    status: 'error',
                    message: 'fullname is required for new registration',
                });
            }
     
            //Pass session into create() using array syntax
            const [newUser] = await User.create([{
                fullname: fullname.trim(),
                password: password,
                email: email ? email.trim().toLowerCase() : undefined,
                role: role,
                isActive: true,
            }],
            { session });
            user = newUser;
        }

        // 7. Enroll New User in ClassMember
        await ClassMember.create([{
            classId: classDoc._id,
            userId: user._id,
        }],
        { session });

        //Commit changes to the database
        await session.commitTransaction();
        session.endSession();

        // Notify every admin that a new user joined via invite link.
        const admins = await User.find({ role: 'admin' }).select('_id');
        notifyMany(admins.map((a) => a._id), {
            type: 'USER_REGISTERED',
            title: 'New member joined',
            message: `${user.fullname} joined as a ${role} in ${classDoc.name}`,
            context: classDoc.name,
            entityType: 'user',
            entityId: user._id,
            linkTo: `/admin/users`,
        });

        // 8. Generate JWT Tokens upon successful registration
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        const accessCookieOptions = {
            ...baseCookieOptions,
            expires: getDateAfterDuration(JWT_ACCESS_TOKEN_EXPIRES),
        };
        const refreshCookieOptions = {
            ...baseCookieOptions,
            expires: getDateAfterDuration(JWT_REFRESH_TOKEN_EXPIRES),
        };
        

        // 9. Return success response
        return res.status(201)
        .cookie('accessToken', accessToken, accessCookieOptions)
        .cookie('refreshToken', refreshToken, refreshCookieOptions)
        .json({
            status: 'success',
            message: 'Successfully enrolled in class',
            data: {
                user: {
                    id: user._id,
                    fullname: user.fullname,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    classId: classDoc._id,
                    className: classDoc.name
                }
            },
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error(error);

        //Handle MongoDB duplicate key errors (code 11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            return res.status(409).json({
                status: 'error',
                message: `An account with this ${field} already exists`,
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'SERVER SIDE ERROR',
        });
    }
};
/** 
 *  Controller for login 
 *  POST /routes/auth/login
 */ 

exports.loginUser = async (req, res) => {
    try {
        const { email, password, inviteToken } = req.body;
        // validate email and password
        if (!email || !password) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Email and password are required' });
        }
        // check if user exists
        const user = await User.findOne({ email: email.trim() }).select('+password');
        if (!user) {
        return res.status(404).json({ 
            status: 'error', 
            message: 'User does not exist' });
        }
        // check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                status: 'error',
                message: 'User is not active. Please contact administrator'
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'User password is incorrect' });
        }

        // A login started from admin's invitation link also add student or trainer as
        // class member to a class
        if (inviteToken) {
            const classDoc = await Class.findOne({ 
                $or: [
                    { 'studentJoinToken': inviteToken ,
                      'studentJoinTokenExpiresAt': { $gt: new Date()} }, // student invite token must not be expired
                    {
                        'trainerInviteToken': inviteToken,
                        'trainerInviteTokenExpiresAt': { $gt: new Date() } // trainer invite token must not be expired
                    }
                ],
                isActive: true, // class must be active for student and trainer to be able to join
             });

             if (!classDoc) {
                 return res.status(404).json({
                     status: 'error',
                     message: 'Class not found or inactive, invite token is invalid or expired'
                 });
             }

             const inviteType = classDoc.studentJoinToken === inviteToken ? 'student' : 'trainer';

             if (user.role !== inviteType) {
                 return res.status(403).json({
                     status: 'error',
                     message: `User role does not match the invite type: expected ${inviteType}, got ${user.role}`
                 });
             }

            await ClassMember.updateOne(
                { classId: classDoc._id, userId: user._id },
                { $setOnInsert: { classId: classDoc._id, userId: user._id } },
                { upsert: true }
            );
            return loginResponse(res, user);
        }

        return loginResponse(res, user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
    }
};
/** 
 * Controller for logout
 * POST /routes/auth/logout
 */
exports.logoutUser = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized access. Please login to continue' });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    return res.status(200).json({status: 'success', message: 'User logged out successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

/** 
 * Controller for user refresh-token
 * POST /routes/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User does not exist' });
    }
    const refreshToken = req.cookies.refreshToken;
     if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }
    const accessToken = generateAccessToken(user._id);

    const options = {
      ...baseCookieOptions,
      expires: getDateAfterDuration(JWT_ACCESS_TOKEN_EXPIRES),
    };

    res.cookie('accessToken', accessToken, options);
    return res.status(200).json({ status: 'success', message: 'JWT refresh token generated successfully' });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};
/**
 * Controller to get currently authenticated user (dùng khi frontend refresh page)
 * GET /routes/auth/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const { user } = req;
    
    return res.status(200).json({
      status: 'success',
      message: 'Current user retrieved successfully',
      data: {
        user: {
          id: user._id,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};