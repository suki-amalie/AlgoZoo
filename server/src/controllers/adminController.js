const User = require('../models/user');
const Class = require('../models/class');
const ClassMember = require("../models/classMember")
const Submission = require('../models/submission');
const ClassProblem = require('../models/classProblem')
const Problem = require('../models/problem');
const mongoose = require('mongoose');

// TODO: Controller for admin to get all users information
exports.getUser = async (req,res) => {
  try {
    const users = await User.find();

    if (!users.length) {
      return res.status(404).json({
        status: 'error',
        message: 'No users found',
      });
    }
    res.status(200).json(
      {
        status: "success",
        message: "Users information retrieved successfully",
        count: users.length,
        data:
        {
          users
        }
      }
    )
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'SERVER SIDE ERROR',
    });
  }
};

// Controller for getting user info by ID (admin)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User does not exist',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'User information retrieved successfully',
      data: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role || 'student', // Default to 'student' if role is not set
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'SERVER SIDE ERROR',
    });
  }
};

// TODO: Controller for admin to get all users with role 'student' or 'trainer' or 'admin'
exports.getUserWithRole = async (req, res) => {
  try {
    const { role } = req.query;

    if (!role || (role !== 'student' && role !== 'trainer'  && role !== 'admin')) {
      return res.status(400).json({status: 'error', message: 'Invalid role. Please specify either "student" or "trainer" or "admin".' });
    }

    const users = await User.find({ role }).select('-password');
    res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};
// Controller for admin to get all classes (admin)
// GET /api/admin/classes
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find();

    if (!classes.length) {
      return res.status(404).json({
        status: 'error',
        message: 'No classes found',
      });
    }
    res.status(200).json(
      {
        status: "success",
        message: "Classes information retrieved successfully",
        count: classes.length,
        data:
        {
          classes
        }
      }
    )
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'SERVER SIDE ERROR',
    });
  }
};

// Controller for admin to view class detail
// GET /api/admin/classes/:class_id
exports.getClassDetail = async (req, res) => {
    try {
        // Get the class ID from the request parameters
        const class_id = req.params.class_id?.trim();

        // Check whether the provided class ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(class_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid class_id',
            });
        }

        // Find the class by its ID
        const classDoc = await Class.findById(class_id);

        // Return 404 if the class does not exist
        if (!classDoc) {
            return res.status(404).json({
                status: 'error',
                message: 'Class not found',
            });
        }

        // Get all members belonging to this class
        // Populate user information from the User collection
        const members = await ClassMember.find({ classId: class_id })
            .populate('userId', 'fullname email role isActive createdAt');

        // Separate class members into trainers and students
        const trainers = [];
        const students = [];

        members.forEach((m) => {
            // Skip the member if the referenced user no longer exists
            if (!m.userId) return;

            // Create a simplified user object for the API response
            const info = {
                id: m.userId._id,
                fullname: m.userId.fullname,
                email: m.userId.email,
                isActive: m.userId.isActive,

                // Use ClassMember.createdAt as the time the user joined the class
                joinedAt: m.createdAt,
            };

            // Add the user to the trainers list based on their role
            if (m.userId.role === 'trainer') {
                trainers.push(info);

            // Add the user to the students list based on their role
            } else if (m.userId.role === 'student') {
                students.push(info);
            }
        });

        // Return the class details together with its trainers and students
        return res.status(200).json({
            status: 'success',
            message: 'Class detail retrieved successfully',
            data: {
                class_id: classDoc._id,
                name: classDoc.name,
                description: classDoc.description,
                isActive: classDoc.isActive,

                // Return the total number of trainers and students
                trainer_count: trainers.length,
                student_count: students.length,

                // Return detailed information about class members
                trainers,
                students,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 'error',
            message: 'SERVER SIDE ERROR',
        });
    }
};


// Controller for admin to update user's active status
// PATCH /api/admin/users/:user_id
exports.updateUserActive = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid isActive (boolean) value',
      });
    }

    const existingUser = await User.findById(user_id);
    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const user = await User.findByIdAndUpdate(
      user_id,
      { isActive },
      { returnDocument: 'after' }
    ).select('-password');

    return res.status(200).json({
      status: 'success',
      message: 'User active status updated successfully',
      data: { user },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 'error',
      message: 'SERVER SIDE ERROR',
    });
  }
};

// Controller for admin to create a new class
// POST /api/admin/classes
exports.createClass = async (req, res) => {
  try {
    const { name, description = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Class name is required',
      });
    }

    const newClass = await Class.create({
      name: name.trim(),
      description,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Class created successfully',
      data: {
        class_id: newClass._id,
        name: newClass.name,
        description: newClass.description,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 'error',
      message: 'SERVER SIDE ERROR',
    });
  }
};

// Controller for admin to update class details (name, description)
// PATCH /api/admin/classes/:class_id
exports.updateClassDetails = async (req, res) => {
  try {
    const class_id = req.params.class_id?.trim();

    if (!mongoose.Types.ObjectId.isValid(class_id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid class_id',
      });
    }

    const { name, description } = req.body || {};

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Class name is required',
      });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (description !== undefined) updateFields.description = description;

    const classDoc = await Class.findByIdAndUpdate(
      class_id,
      updateFields,
      { returnDocument: 'after' }
    );

    if (!classDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Class not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Class details updated successfully',
      data: {
        class_id: classDoc._id,
        name: classDoc.name,
        description: classDoc.description,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 'error',
      message: 'SERVER SIDE ERROR',
    });
  }
};

// Controller for admin to update class active status
// PATCH /api/admin/classes/:class_id/active
exports.updateClassActive = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const class_id = req.params.class_id?.trim();

      if (!mongoose.Types.ObjectId.isValid(class_id)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: 'error',
          message: 'Invalid class_id',
        });
      }

      const { isActive } = req.body || {};

      if (typeof isActive !== 'boolean') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: 'error',
          message: 'isActive (boolean) is required',
        });
      }

      // 1. Update class status
      const classDoc = await Class.findByIdAndUpdate(
        class_id,
        { isActive, archivedAt: isActive ? null : new Date() },
        { returnDocument: 'after', session }
      );

      if (!classDoc) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          status: 'error',
          message: 'Class not found',
        });
      }

      // 2. Get all student userIds belonging to this class
      const members = await ClassMember.find({ classId: class_id })
        .select('userId')
        .session(session);
      const memberUserIds = members.map((m) => m.userId);

      let affectedStudents = 0;

      if (memberUserIds.length) {
        const result = await User.updateMany(
          {
            _id: { $in: memberUserIds },
            role: 'student',
            isActive: !isActive,
          },
          { $set: { isActive } },
          { session }
        );
        affectedStudents = result.modifiedCount || 0;
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        status: 'success',
        message: isActive
          ? `Class activated successfully. ${affectedStudents} student(s) were reactivated`
          : `Class deactivated successfully. ${affectedStudents} student(s) were set to inactive`,
        data: {
          affectedStudents,
          class: classDoc,
    
        },
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error(error);
      return res.status(500).json({
        status: 'error',
        message: 'SERVER SIDE ERROR',
      });
    }
  };

// 
/**
 * Controller for admin dashboard overview
 * GET /api/admin/dashboard
 * GET /api/admin/dashboard?class_id -> scopes all metrics to a single class 
 *
 * Formulas:
 * 
 * - Class progress = total submissions in class / (total problems assigned * total students in class)
 * for example Class problemCount:2 , studentCount: 4, submissionCount: 2 → progressPercent = 2 / (2 x 4) × 100 = 25%
 * 
 * - Student progress  = total submissions of that student / total problems assigned to their class
 * for example Student problemCount:5 , submissionCount 4 → progressPercent = 4 / 5 × 100 = 80%
 * 
 * - Subject overview = submissions of type / (problems of type × students in class) × 100
 * for example ProblemType DSA: submissionCount: 2, studentCount: 4  → progressPercent= 2 / 4 × 100= 50%
 */
exports.getDashboard = async (req, res) => {
  try {
    const { class_id } = req.query;
    let classFilter = {};

    if (class_id) {
      if (!mongoose.Types.ObjectId.isValid(class_id)) {
        return res.status(400).json({ status: 'error', message: 'Invalid class_id' });
      }
      const classExists = await Class.findById(class_id);
      if (!classExists) {
        return res.status(404).json({ status: 'error', message: 'Class not found' });
      }
      classFilter = { _id: new mongoose.Types.ObjectId(class_id) };
    }

    // 1. Classes summary (total / active / inactive)
    const totalClasses = await Class.countDocuments(classFilter);
    const activeClasses = await Class.countDocuments({ ...classFilter, isActive: true });

    // 2. Students summary (total / active / inactive)
    let totalStudents, activeStudents;
    if (class_id) {
      const memberIds = await ClassMember.find({ classId: class_id }).distinct('userId');
      totalStudents = await User.countDocuments({ _id: { $in: memberIds }, role: 'student' });
      activeStudents = await User.countDocuments({ _id: { $in: memberIds }, role: 'student', isActive: true });
    } else {
      totalStudents = await User.countDocuments({ role: 'student' });
      activeStudents = await User.countDocuments({ role: 'student', isActive: true });
    }

    // 3. Class progress
    // Class Progress Percent = totalSubmissions / (problemCount * studentCount) * 100
    const classProgressMatch = class_id
      ? { $match: { class_id: new mongoose.Types.ObjectId(class_id) } }
      : { $match: {} };
    const classProgressRaw = await ClassProblem.aggregate([
      classProgressMatch,
      {
        $group: {
          _id: '$class_id',
          problemIds: { $push: '$_id' },
          problemCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'submissions',
          localField: 'problemIds',
          foreignField: 'class_problem_id',
          as: 'submissions',
        },
      },
      {
        $lookup: {
          from: 'classmembers',
          localField: '_id',
          foreignField: 'classId',
          as: 'members',
        },
      },
      {
        // Get all user 
        $lookup: {
          from: 'users',
          localField: 'members.userId',
          foreignField: '_id',
          as: 'memberUsers',
        },
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      { $unwind: '$classInfo' },
      {
        $addFields: {
          // Only count user with role = student
          studentCount: {
            $size: {
              $filter: {
                input: '$memberUsers',
                as: 'u',
                cond: { $eq: ['$$u.role', 'student'] },
              },
            },
          },
          submissionCount: { $size: '$submissions' },
        },
      },
      {
        $addFields: {
          totalRequiredSubmissions: { $multiply: ['$problemCount', '$studentCount'] },
        },
      },
      {
        $project: {
          _id: 0,
          class_id: '$_id',
          name: '$classInfo.name',
          isActive: '$classInfo.isActive',
          studentCount: 1,
          problemCount: 1,
          submissionCount: 1,
          progressPercent: {
            $cond: [
              { $eq: ['$totalRequiredSubmissions', 0] },
              0,
              {
                $min: [
                  100,
                  {
                    $round: [
                      { $multiply: [{ $divide: ['$submissionCount', '$totalRequiredSubmissions'] }, 100] },
                      0,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ]);
    // 4. Students progress
    const memberMatch = class_id
      ? { $match: { classId: new mongoose.Types.ObjectId(class_id) } }
      : { $match: {} };

    const studentsProgress = await ClassMember.aggregate([
      memberMatch,
      {
        $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' },
      },
      { $unwind: '$user' },
      { $match: { 'user.role': 'student' } },
      {
        $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'class' },
      },
      { $unwind: '$class' },
      {
        $lookup: { from: 'classproblems', localField: 'classId', foreignField: 'class_id', as: 'classProblems' },
      },
      {
        $addFields: {
          problemIds: '$classProblems._id',
          totalProblems: { $size: '$classProblems' },
        },
      },
      {
        $lookup: {
          from: 'submissions',
          let: { studentId: '$userId', problemIds: '$problemIds' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$student_id', '$$studentId'] },
                    { $in: ['$class_problem_id', '$$problemIds'] },
                  ],
                },
              },
            },
          ],
          as: 'submissions',
        },
      },
      {
        $project: {
          _id: 0,
          student_id: '$userId',
          fullname: '$user.fullname',
          email: '$user.email',
          class_id: '$classId',
          className: '$class.name',
          submissionCount: { $size: '$submissions' },
          problemCount: '$totalProblems',
          progressPercent: {
            $cond: [
              { $eq: ['$totalProblems', 0] },
              0,
              {
                $round: [
                  { $multiply: [{ $divide: [{ $size: '$submissions' }, '$totalProblems'] }, 100] },
                  0,
                ],
              },
            ],
          },
        },
      },
    ]);

    // 5. Subject overview: progress per problemType (optionally filtered by class_id)
    const classProblemMatch = class_id
      ? { $match: { class_id: new mongoose.Types.ObjectId(class_id) } }
      : { $match: {} };

    const subjectOverview = await ClassProblem.aggregate([
      classProblemMatch,
      {
        // Join problem to get its type
        $lookup: { from: 'problems', localField: 'problem_id', foreignField: '_id', as: 'problem' },
      },
      { $unwind: '$problem' },
      {
        // Join submissions made for this assigned problem
        $lookup: { from: 'submissions', localField: '_id', foreignField: 'class_problem_id', as: 'submissions' },
      },
      {
        // Join members of the class this problem belongs to
        $lookup: { from: 'classmembers', localField: 'class_id', foreignField: 'classId', as: 'members' },
      },
      {
        // Join users to filter role = student
        $lookup: { from: 'users', localField: 'members.userId', foreignField: '_id', as: 'memberUsers' },
      },
      {
        $addFields: {
          submissionCount: { $size: '$submissions' },
          studentCount: {
            $size: {
              $filter: {
                input: '$memberUsers',
                as: 'u',
                cond: { $eq: ['$$u.role', 'student'] },
              },
            },
          },
        },
      },
      {
        // Group by problem type
        $group: {
          _id: '$problem.problemType',
          submissionCount: { $sum: '$submissionCount' },
          requiredSubmissions: { $sum: '$studentCount' },
        },
      },
      {
        $project: {
          _id: 0,
          problemType: '$_id',
          submissionCount: 1,
          progressPercent: {
            $cond: [
              { $eq: ['$requiredSubmissions', 0] },
              0,
              {
                $min: [
                  100,
                  { $round: [{ $multiply: [{ $divide: ['$submissionCount', '$requiredSubmissions'] }, 100] }, 0] },
                ],
              },
            ],
          },
        },
      },
      { $sort: { problemType: 1 } },
    ]);
    return res.status(200).json({
      status: 'success',
      message: 'Dashboard data retrieved successfully',
      data: {
        filter: { class_id: class_id || null },
        classes: {
          total: totalClasses,
          active: activeClasses,
          inactive: totalClasses - activeClasses,
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: totalStudents - activeStudents,
        },
        classProgress: classProgressRaw,
        studentsProgress,
        subjectOverview,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};