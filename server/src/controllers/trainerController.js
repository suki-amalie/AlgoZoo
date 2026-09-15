const mongoose = require('mongoose');
const Class = require('../models/class');
const ClassMember = require('../models/classMember');
const ClassProblem = require('../models/classProblem');
const Problem = require('../models/problem');
const Submission = require('../models/submission');
const { checkTrainerOwnsClass } = require('../utils/classOwnership');

// Helper: class ids a trainer belongs to
const getTrainerClassIds = async (trainerId) => {
  return ClassMember.find({ userId: trainerId }).distinct('classId');
};

// GET /api/trainer/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const trainerId = req.user._id;

    const classIds = await getTrainerClassIds(trainerId);
    const classProblemIds = await ClassProblem.find({ class_id: { $in: classIds } }).distinct('_id');
    const pendingReviewCount = await Submission.countDocuments({
      class_problem_id: { $in: classProblemIds },
      status: { $in: ['pending', 'late'] },
    });

    res.status(200).json({
      status: 'success',
      message: 'Trainer dashboard retrieved successfully',
      data: {
        classCount: classIds.length,
        pendingReviewCount,
        problemCount: classProblemIds.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// GET /api/trainer/classes  (trainer: own classes | admin: all classes)
exports.getClasses = async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'admin') {
      classes = await Class.find();
    } else {
      const classIds = await getTrainerClassIds(req.user._id);
      classes = await Class.find({ _id: { $in: classIds } });
    }

    const classIdList = classes.map((c) => c._id);

    // ClassProblems for all these classes at once, grouped by class, so we can compute
    // pending_review_count per class without an extra query per class.
    const classProblems = await ClassProblem.find({ class_id: { $in: classIdList } }).select('_id class_id');
    const classProblemToClassId = {};
    const allClassProblemIds = classProblems.map((cp) => {
      classProblemToClassId[cp._id.toString()] = cp.class_id.toString();
      return cp._id;
    });

    const pendingSubmissions = await Submission.find({
      class_problem_id: { $in: allClassProblemIds },
      status: { $in: ['pending', 'late'] },
    }).select('class_problem_id');

    const pendingCountByClass = {};
    pendingSubmissions.forEach((s) => {
      const classKey = classProblemToClassId[s.class_problem_id.toString()];
      pendingCountByClass[classKey] = (pendingCountByClass[classKey] || 0) + 1;
    });

    const data = await Promise.all(
      classes.map(async (cls) => {
        const members = await ClassMember.find({ classId: cls._id }).populate('userId', 'role');
        const studentCount = members.filter((m) => m.userId && m.userId.role === 'student').length;
        return {
          class_id: cls._id,
          className: cls.name,
          is_active: cls.isActive,
          student_count: studentCount,
          pending_review_count: pendingCountByClass[cls._id.toString()] || 0,
        };
      })
    );

    res.status(200).json({ status: 'success', message: 'Classes retrieved successfully', total: data.length, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// GET /api/trainer/classes/:class_id  (trainer: must be a member | admin: any class)
exports.getClassDetail = async (req, res) => {
  try {
    const { class_id } = req.params;

    const cls = await Class.findById(class_id);
    if (!cls) {
      return res.status(404).json({ status: 'error', message: 'Class does not exist' });
    }

    if (req.user.role !== 'admin') {
      const owns = await checkTrainerOwnsClass(req.user._id, class_id);
      if (!owns) {
        return res.status(403).json({ status: 'error', message: 'Access denied. You are not a member of this class.' });
      }
    }

    // Always computed live from ClassProblem — reflects new assignments immediately,
    // never a cached/stale count.
    const classProblemIds = await ClassProblem.find({ class_id }).distinct('_id');
    const members = await ClassMember.find({ classId: class_id }).populate('userId', 'fullname role');
    const students = members.filter((m) => m.userId && m.userId.role === 'student');

    const studentData = await Promise.all(
      students.map(async (m) => {
        // Only count submissions the trainer has actually reviewed as "completed" —
        // 'late' just means it arrived after the deadline, not that it's been graded.
        const completedTasks = await Submission.countDocuments({
          student_id: m.userId._id,
          class_problem_id: { $in: classProblemIds },
          status: 'review',
        });
        return {
          user_id: m.userId._id,
          name: m.userId.fullname,
          completed_tasks: completedTasks,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      message: 'Class detail retrieved successfully',
      data: {
        class_id: cls._id,
        className: cls.name,
        description: cls.description,
        total_problems: classProblemIds.length,
        students: studentData,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// POST /api/trainer/classes/:class_id/problems  (trainer only, must own the class)
exports.assignProblemToClass = async (req, res) => {
  try {
    const { class_id } = req.params;
    const { problem_id, deadline } = req.body;

    if (!problem_id) {
      return res.status(400).json({ status: 'error', message: 'problem_id is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(problem_id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid problem_id format' });
    }

    const cls = await Class.findById(class_id);
    if (!cls) {
      return res.status(404).json({ status: 'error', message: 'Class does not exist' });
    }

    const owns = await checkTrainerOwnsClass(req.user._id, class_id);
    if (!owns) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You are not a member of this class.' });
    }

    const problem = await Problem.findById(problem_id);
    if (!problem) {
      return res.status(404).json({ status: 'error', message: 'Problem does not exist' });
    }

    const classProblem = await ClassProblem.create({
      class_id,
      problem_id,
      assigned_by: req.user._id,
      deadline: deadline || null,
    });

    res.status(201).json({
      status: 'success',
      message: 'Problem assigned to class successfully',
      data: {
        assigned_problem: {
          class_problem_id: classProblem._id,
          class_id: classProblem.class_id,
          problem_id: problem._id,
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          problemType: problem.problemType,
          problemUrl: problem.problemUrl,
          assigned_by: classProblem.assigned_by,
          deadline: classProblem.deadline,
          created_at: classProblem.created_at,
        },
      },
    });
  } catch (error) {
    // Duplicate (class_id, problem_id) — blocked by the unique index on ClassProblem
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'This problem is already assigned to this class' });
    }
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// GET /api/trainer/classes/:class_id/problems?search=&status=  (trainer only, must own the class)
exports.getClassProblems = async (req, res) => {
  try {
    const { class_id } = req.params;
    const { search } = req.query;

    const cls = await Class.findById(class_id);
    if (!cls) {
      return res.status(404).json({ status: 'error', message: 'Class does not exist' });
    }

    const owns = await checkTrainerOwnsClass(req.user._id, class_id);
    if (!owns) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You are not a member of this class.' });
    }

    const query = { class_id };
    if (search) {
      const matchingProblemIds = await Problem.find({ title: { $regex: search, $options: 'i' } }).distinct('_id');
      query.problem_id = { $in: matchingProblemIds };
    }
    // NOTE: `status` filter is not applied yet — ClassProblem has no submission-status concept
    // of its own today. Left as a no-op placeholder for now (see chat: "có thể mở rộng sau").

    const classProblems = await ClassProblem.find(query).populate('problem_id', 'title difficulty problemType');
    const classProblemIds = classProblems.map((cp) => cp._id);

    // Total students in this class — same denominator for every row, computed once.
    const members = await ClassMember.find({ classId: class_id }).populate('userId', 'role');
    const totalStudents = members.filter((m) => m.userId && m.userId.role === 'student').length;

    // Distinct submitters per ClassProblem — one query for all rows instead of N+1.
    const submissions = await Submission.find({ class_problem_id: { $in: classProblemIds } }).select(
      'class_problem_id student_id'
    );
    const submittersByClassProblem = {};
    submissions.forEach((s) => {
      const key = s.class_problem_id.toString();
      if (!submittersByClassProblem[key]) submittersByClassProblem[key] = new Set();
      submittersByClassProblem[key].add(s.student_id.toString());
    });

    const data = classProblems.map((cp) => ({
      class_id: cp.class_id,
      class_problem_id: cp._id,
      problem_id: cp.problem_id ? cp.problem_id._id : null,
      title: cp.problem_id ? cp.problem_id.title : null,
      difficulty: cp.problem_id ? cp.problem_id.difficulty : null,
      problemType: cp.problem_id ? cp.problem_id.problemType : null,
      assigned_by: cp.assigned_by,
      deadline: cp.deadline,
      created_at: cp.created_at,
      submitted_count: submittersByClassProblem[cp._id.toString()]
        ? submittersByClassProblem[cp._id.toString()].size
        : 0,
      total_students: totalStudents,
    }));

    res.status(200).json({ status: 'success', message: 'Class problems retrieved successfully', total: data.length, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// DELETE /api/trainer/classes/:class_id/problems/:problem_id  (trainer only, must own the class)
exports.deleteClassProblem = async (req, res) => {
  try {
    const { class_id, problem_id } = req.params;

    const cls = await Class.findById(class_id);
    if (!cls) {
      return res.status(404).json({ status: 'error', message: 'Class does not exist' });
    }

    const owns = await checkTrainerOwnsClass(req.user._id, class_id);
    if (!owns) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You are not a member of this class.' });
    }

    const classProblem = await ClassProblem.findOne({ class_id, problem_id });
    if (!classProblem) {
      return res.status(404).json({ status: 'error', message: 'This problem is not assigned to this class' });
    }

    const hasSubmission = await Submission.exists({ class_problem_id: classProblem._id });
    if (hasSubmission) {
      return res.status(409).json({
        status: 'error',
        message: 'Cannot remove this problem: students have already submitted work for it.',
      });
    }

    await ClassProblem.deleteOne({ _id: classProblem._id });

    res.status(200).json({ status: 'success', message: 'Problem removed from class successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// PUT /api/trainer/review/:submission_id  (trainer only, must own the class the submission belongs to)
exports.reviewSubmission = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { feedback } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ status: 'error', message: 'feedback is required and cannot be empty' });
    }

    const submission = await Submission.findById(submission_id);
    if (!submission) {
      return res.status(404).json({ status: 'error', message: 'Submission does not exist' });
    }

    const classProblem = await ClassProblem.findById(submission.class_problem_id);
    if (!classProblem) {
      return res.status(404).json({ status: 'error', message: 'Related class problem does not exist' });
    }

    const owns = await checkTrainerOwnsClass(req.user._id, classProblem.class_id);
    if (!owns) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You are not a member of this class.' });
    }

    // Reviewing a submission moves it to the 'review' status (pending/late only describe
    // on-time vs late at submit time; 'review' means the trainer has given feedback).
    submission.feedback = feedback.trim();
    submission.status = 'review';
    submission.reviewed_by = req.user._id;
    submission.reviewed_at = Date.now();
    await submission.save();

    res.status(200).json({
      status: 'success',
      message: 'Submission reviewed successfully',
      data: {
        submission_id: submission._id,
        status: submission.status,
        feedback: submission.feedback,
        reviewed_by: { id: req.user._id, name: req.user.fullname },
        reviewed_at: submission.reviewed_at,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// GET /api/trainer/submissions?student=&problem=&status=
exports.getSubmissions = async (req, res) => {
  try {
    const { student, problem, status, problemType } = req.query;

    if (problemType) {
      const validTypes = ['OS', 'DB', 'DSA', 'OTHER'];
      if (!validTypes.includes(problemType)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid problemType. Allowed values: ${validTypes.join(', ')}`,
        });
      }
    }

    const classIds = await getTrainerClassIds(req.user._id);
    const classProblemFilter = { class_id: { $in: classIds } };
    if (problem) {
      classProblemFilter.problem_id = problem;
    }
    if (problemType) {
      const matchingProblemIds = await Problem.find({ problemType }).distinct('_id');
      // If both `problem` and `problemType` were given, intersect them by only keeping
      // problem_id if it also matches problemType — Mongo can't AND two problem_id
      // conditions directly, so fold problemType into the $in list ourselves.
      classProblemFilter.problem_id = problem
        ? { $in: matchingProblemIds.filter((id) => id.toString() === problem) }
        : { $in: matchingProblemIds };
    }
    const classProblemIds = await ClassProblem.find(classProblemFilter).distinct('_id');

    const query = { class_problem_id: { $in: classProblemIds } };
    if (student) query.student_id = student;
    if (status) query.status = status;

    const submissions = await Submission.find(query)
      .populate('student_id', 'fullname')
      .populate({
        path: 'class_problem_id',
        populate: [
          { path: 'problem_id', select: 'title problemType' },
          { path: 'class_id', select: 'name' },
        ],
      });

    const data = submissions.map((s) => ({
      submission_id: s._id,
      student: s.student_id ? { id: s.student_id._id, name: s.student_id.fullname } : null,
      problem: s.class_problem_id && s.class_problem_id.problem_id
        ? {
            id: s.class_problem_id.problem_id._id,
            title: s.class_problem_id.problem_id.title,
            problemType: s.class_problem_id.problem_id.problemType,
          }
        : null,
      class: s.class_problem_id && s.class_problem_id.class_id
        ? { id: s.class_problem_id.class_id._id, className: s.class_problem_id.class_id.name }
        : null,
      status: s.status,
      is_late: s.is_late,
      submitted_at: s.createdAt,
    }));

    res.status(200).json({ status: 'success', message: 'Submissions retrieved successfully', total: data.length, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// GET /api/trainer/submissions/:submission_id
exports.getSubmissionDetail = async (req, res) => {
  try {
    const { submission_id } = req.params;

    const submission = await Submission.findById(submission_id)
      .populate('student_id', 'fullname')
      .populate('reviewed_by', 'fullname')
      .populate({
        path: 'class_problem_id',
        populate: [
          { path: 'problem_id', select: 'title' },
          { path: 'class_id', select: 'name' },
        ],
      });

    if (!submission) {
      return res.status(404).json({ status: 'error', message: 'Submission does not exist' });
    }

    const owns = await checkTrainerOwnsClass(req.user._id, submission.class_problem_id.class_id);
    if (!owns) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You are not a member of this class.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Submission detail retrieved successfully',
      data: {
        submission_id: submission._id,
        content_blocks: submission.content_blocks,
        student: submission.student_id ? { id: submission.student_id._id, name: submission.student_id.fullname } : null,
        problem: submission.class_problem_id && submission.class_problem_id.problem_id
          ? { id: submission.class_problem_id.problem_id._id, title: submission.class_problem_id.problem_id.title }
          : null,
        class: submission.class_problem_id && submission.class_problem_id.class_id
          ? { id: submission.class_problem_id.class_id._id, className: submission.class_problem_id.class_id.name }
          : null,
        status: submission.status,
        is_late: submission.is_late,
        feedback: submission.feedback,
        reviewed_by: submission.reviewed_by
          ? { id: submission.reviewed_by._id, name: submission.reviewed_by.fullname }
          : null,
        reviewed_at: submission.reviewed_at,
        submitted_at: submission.createdAt, // submission has no dedicated submitted_at field; createdAt (from timestamps) serves that purpose
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};
