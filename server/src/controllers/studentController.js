const ClassProblem = require('../models/classProblem');
const Submission = require('../models/submission');

/**
 * Get problem list for a specific class
 * GET /routes/student/classes/:classId/problems
 */
exports.getStudentClassProblems = async (req, res) => {
    try {
        const { classId } = req.params;
        const studentId = req.user._id;

        // 1. Fetch ClassProblem documents matching class_id and populate problem_id
        const classProblems = await ClassProblem.find({ class_id: classId })
            .populate('problem_id', 'title problemType difficulty problemUrl')
            .lean();

        if (!classProblems.length) {
            return res.status(200).json({
                status: 'success',
                data: [],
            });
        }

        const classProblemIds = classProblems.map((cp) => cp._id);

        // 2. Fetch student's submissions using snake_case schema field names
        const userSubmissions = await Submission.find({
            student_id: studentId,
            class_problem_id: { $in: classProblemIds },
        }).lean();

        const submissionMap = new Map();
        userSubmissions.forEach((sub) => {
            submissionMap.set(sub.class_problem_id.toString(), sub);
        });

        // 3. Map result array with status tags
        const result = classProblems.map((cp) => {
            const submission = submissionMap.get(cp._id.toString());
            let status = null;

            if (submission) {
                if (submission.status === 'review') {
                    status = 'Reviewed';
                } else if (submission.is_late || submission.status === 'late') {
                    status = 'Late';
                } else {
                    status = 'Pending';
                }
            }

            return {
                classProblemId: cp._id,
                deadline: cp.deadline,
                status,
                problem: cp.problem_id
                    ? {
                        id: cp.problem_id._id,
                        title: cp.problem_id.title,
                        problemType: cp.problem_id.problemType,
                        difficulty: cp.problem_id.difficulty,
                        problemUrl: cp.problem_id.problemUrl,
                    }
                    : null,
            };
        });

        return res.status(200).json({
            status: 'success',
            data: result,
        });
    } catch (error) {
        console.error('getStudentClassProblems Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'SERVER SIDE ERROR',
        });
    }
};

/**
 * Get problem details by classProblemId
 * GET /routes/student/problems/:classProblemId
 */
exports.getStudentProblemDetail = async (req, res) => {
    try {
        const { classProblemId } = req.params;
        const studentId = req.user._id;

        // 1. Query ClassProblem by ID and populate problem_id
        const classProblem = await ClassProblem.findById(classProblemId)
            .populate('problem_id')
            .lean();

        if (!classProblem) {
            return res.status(404).json({
                status: 'error',
                message: 'Assigned problem not found',
            });
        }

        // 2. Fetch existing submission matching student_id & class_problem_id
        const submission = await Submission.findOne({
            student_id: studentId,
            class_problem_id: classProblem._id,
        })
            .populate('content_blocks.file_id')
            .lean();

        let status = null;

        if (submission) {
            if (submission.status === 'review') {
                status = 'Reviewed';
            } else if (submission.is_late || submission.status === 'late') {
                status = 'Late';
            } else {
                status = 'Pending';
            }
        }

        return res.status(200).json({
            status: 'success',
            data: {
                classProblemId: classProblem._id,
                classId: classProblem.class_id,
                deadline: classProblem.deadline,
                status,
                submission: submission
                    ? {
                        id: submission._id,
                        contentBlocks: submission.content_blocks,
                        isLate: submission.is_late,
                        status: submission.status,
                        feedback: submission.feedback,
                        reviewedBy: submission.reviewed_by,
                        reviewedAt: submission.reviewed_at,
                        createdAt: submission.createdAt,
                    }
                    : null,
                problem: classProblem.problem_id
                    ? {
                        id: classProblem.problem_id._id,
                        title: classProblem.problem_id.title,
                        description: classProblem.problem_id.description,
                        problemType: classProblem.problem_id.problemType,
                        difficulty: classProblem.problem_id.difficulty,
                        problemUrl: classProblem.problem_id.problemUrl,
                    }
                    : null,
            },
        });
    } catch (error) {
        console.error('getStudentProblemDetail Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'SERVER SIDE ERROR',
        });
    }
};