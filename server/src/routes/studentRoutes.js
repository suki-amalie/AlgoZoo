const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { isAuthenticatedUser, verifyStudent } = require('../middlewares/authMiddleware');
const { verify } = require('jsonwebtoken');

//Get all assigned problems for a specific class
router.get(
    '/classes/:classId/problems',
    isAuthenticatedUser,
    verifyStudent,
    studentController.getStudentClassProblems
);

//Get specific problem statement & submission detail
router.get(
    '/problems/:classProblemId',
    isAuthenticatedUser,
    verifyStudent,
    studentController.getStudentProblemDetail
);

//Create a submission
router.post(
    '/submissions',
    isAuthenticatedUser,
    verifyStudent,
    studentController.createStudentSubmission
)

module.exports = router;