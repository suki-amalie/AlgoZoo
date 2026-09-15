const ClassProblem = require('../models/classProblem');
const Submission = require('../models/submission');
const {getDisplayStatus} = require('../utils/submissionStatus');
require('../models/problem')
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

            return {
                classProblemId: cp._id,
                deadline: cp.deadline,
                status: getDisplayStatus(submission),
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

        return res.status(200).json({
            status: 'success',
            data: {
                classProblemId: classProblem._id,
                classId: classProblem.class_id,
                deadline: classProblem.deadline,
                status: getDisplayStatus(submission),
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

/**
 * Create or update student submission
 * POST /api/student/submissions
 */

exports.createStudentSubmission = async (req, res) => {
    try {
        const studentId = req.user._id || req.user.id;
        const {class_problem_id, type, content, language, file_id, filename, content_blocks} = req.body;

        if (!class_problem_id) {
            return res.status(400).json({
                status: 'error',
                message: 'class_problem_id is required',
            });
        }

        //1. Prevent multiple submission
        const existingSubmission = await Submission.findOne({
            student_id: studentId,
            class_problem_id,
        }).lean();

        if (existingSubmission) {
            return res.status(409).json({
                status: 'error',
                message: 'You have already submitted a solution for this problem. Re-submissions are not allowed.',
            });
        }

        //2. Fetch ClassProblem to verify existence and check deadline
        const classProblem = await ClassProblem.findById(class_problem_id)
            .populate('problem_id', 'problemType')    
            .lean();

        if (!classProblem || !classProblem.problem_id) {
            return res.status(404).json({
                status: 'error',
                message: 'Assigned class problem not found'
            });
        }

        //3. Validate payload if sending a single block via submission_type
        const typeLower = type ? type.toLowerCase() : null;

        if (typeLower) {
            if (typeLower === 'code' && !content) {
                return res.status(400).json({
                    status: 'error',
                    message: 'content is required for code submission type'
                });
            }
            if (typeLower === 'text' && !content) {
                return res.status(400).json({
                    status: 'error',
                    message: 'content is required for text submission type'
                });
            }
            if ((typeLower === 'image' || typeLower === 'file') && !file_id) {
                return res.status(400).json({
                    status: 'error',
                    message: 'file_id is required for image/file submission type'
                });
            }
        }

        //4. Construct content_blocks to match contentBlockSchema
        const blocks = content_blocks || [
            {
                type: typeLower,
                content: content || undefined, 
                language: language || undefined,
                file_id: file_id || undefined,
                filename: filename || undefined,
            },
        ];

        if (!blocks.length) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one content block is required'
            });
        }

        //5. Validate block structure based on Problem Type
        const problemType = classProblem.problem_id.problemType;

        if (problemType === 'DSA') {
            const hasCodeOrText = blocks.some(b => b.type === 'code' || b.type === 'text');
            const hasImageOrFile = blocks.some(b => b.type === 'image' || b.type === 'file');

            if (!hasCodeOrText || !hasImageOrFile) {
                return res.status(400).json({
                    status: 'error',
                    message: 'DSA problems require at least one code/text block and one image/file screenshot proof.',
                });
            }
        } else {
            if (blocks.length < 1) {
                return res.status(400).json({
                    status: 'error',
                    message: `${problemType} problems require at least 1 content block.`,
                });
            }
        }

        //6. Evaluate deadline
        const submittedAt = new Date();
        const isLate = classProblem.deadline ? submittedAt > new Date(classProblem.deadline) : false;
        const submissionStatus = isLate ? 'late' : 'pending';

        //7. Save submission
        const submission = await Submission.create(
            {
                student_id: studentId,
                class_problem_id,
                content_blocks: blocks,
                is_late: isLate,
                status: submissionStatus,
            });

        return res.status(201).json({
            status: 'success',
            message: isLate ? 'Assignment submitted late' : 'Assignment submitted successfully',
            data: submission,
        });
    } catch (error) {
        console.error('createStudentSubmission Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'SERVER SIDE ERROR'
        });
    }
};


