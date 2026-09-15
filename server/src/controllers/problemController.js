const Problem = require('../models/problem');
const ClassProblem = require('../models/classProblem');
const Submission = require('../models/submission');

const PROBLEM_TYPES = ['OS', 'DB', 'DSA', 'OTHER'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// POST /api/problems  (trainer only)
exports.createProblem = async (req, res) => {
  try {
    const { title, description, problemType, difficulty, problemUrl } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ status: 'error', message: 'title is required' });
    }
    if (!problemType) {
      return res.status(400).json({
        status: 'error',
        message: `problemType is required. Allowed values: ${PROBLEM_TYPES.join(', ')}`,
      });
    }
    if (!PROBLEM_TYPES.includes(problemType)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid problemType. Allowed values: ${PROBLEM_TYPES.join(', ')}`,
      });
    }
    if (difficulty && !DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid difficulty. Allowed values: ${DIFFICULTIES.join(', ')}`,
      });
    }

    const problem = await Problem.create({
      title: title.trim(),
      description,
      problemType,
      difficulty: difficulty || null,
      problemUrl: problemUrl || undefined,
      createdBy: req.user._id,
    });

    res.status(201).json({
      status: 'success',
      message: 'Problem created successfully',
      data: {
        problem_id: problem._id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        problemType: problem.problemType,
        problemUrl: problem.problemUrl,
        created_by: problem.createdBy,
      },
    });
  } catch (error) {
    // Duplicate title or problemUrl (both have a unique index)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({ status: 'error', message: `A problem with this ${field} already exists` });
    }
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// GET /api/problems?search=&difficulty=
exports.listProblems = async (req, res) => {
  try {
    const { search, difficulty } = req.query;

    const query = {};
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (difficulty) {
      if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
        return res.status(400).json({ status: 'error', message: 'Invalid difficulty. Allowed values: Easy, Medium, Hard' });
      }
      query.difficulty = difficulty;
    }

    const problems = await Problem.find(query).select('title difficulty problemType createdBy');

    const data = problems.map((p) => ({
      problem_id: p._id,
      title: p.title,
      difficulty: p.difficulty,
      problemType: p.problemType,
      created_by: p.createdBy,
    }));

    res.status(200).json({ status: 'success', message: 'Problems retrieved successfully', total: data.length, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// GET /api/problems/:problem_id
exports.getProblemDetail = async (req, res) => {
  try {
    const { problem_id } = req.params;

    const problem = await Problem.findById(problem_id);
    if (!problem) {
      return res.status(404).json({ status: 'error', message: 'Problem does not exist' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Problem detail retrieved successfully',
      data: {
        problem_id: problem._id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        problemType: problem.problemType,
        problemUrl: problem.problemUrl,
        created_by: problem.createdBy,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// PATCH /api/problems/:problem_id  (trainer only)
exports.updateProblem = async (req, res) => {
  try {
    const { problem_id } = req.params;
    const { title, description, problemType, difficulty, problemUrl } = req.body;

    const problem = await Problem.findById(problem_id);
    if (!problem) {
      return res.status(404).json({ status: 'error', message: 'Problem does not exist' });
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ status: 'error', message: 'title cannot be empty' });
      }
      problem.title = title.trim();
    }
    if (description !== undefined) problem.description = description;
    if (problemType !== undefined) {
      if (!PROBLEM_TYPES.includes(problemType)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid problemType. Allowed values: ${PROBLEM_TYPES.join(', ')}`,
        });
      }
      problem.problemType = problemType;
    }
    if (difficulty !== undefined) {
      if (difficulty !== null && !DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid difficulty. Allowed values: ${DIFFICULTIES.join(', ')}`,
        });
      }
      problem.difficulty = difficulty;
    }
    if (problemUrl !== undefined) problem.problemUrl = problemUrl;

    await problem.save();

    res.status(200).json({
      status: 'success',
      message: 'Problem updated successfully',
      data: {
        problem_id: problem._id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        problemType: problem.problemType,
        problemUrl: problem.problemUrl,
        created_by: problem.createdBy,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({ status: 'error', message: `A problem with this ${field} already exists` });
    }
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// DELETE /api/problems/:problem_id  (trainer only, blocked if any submission exists for it)
exports.deleteProblem = async (req, res) => {
  try {
    const { problem_id } = req.params;

    const problem = await Problem.findById(problem_id);
    if (!problem) {
      return res.status(404).json({ status: 'error', message: 'Problem does not exist' });
    }

    const classProblemIds = await ClassProblem.find({ problem_id }).distinct('_id');
    const hasSubmission = await Submission.exists({ class_problem_id: { $in: classProblemIds } });
    if (hasSubmission) {
      return res.status(409).json({
        status: 'error',
        message: 'Cannot delete this problem: students have already submitted work for it.',
      });
    }

    await Problem.deleteOne({ _id: problem_id });

    res.status(200).json({ status: 'success', message: 'Problem deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};
