const router = require('express').Router();
const { isAuthenticatedUser, verifyTrainer, verifyTrainerOrAdmin } = require('../middlewares/authMiddleware');
const validateObjectId = require('../middlewares/validateObjectId');
const {
  listProblems,
  getProblemDetail,
  createProblem,
  updateProblem,
  deleteProblem,
} = require('../controllers/problemController');

// routes for problem bank (browse LeetCode-style problems)

router
  .route('/problems')
  .get(isAuthenticatedUser, verifyTrainerOrAdmin, listProblems) // R: trainer or admin
  .post(isAuthenticatedUser, verifyTrainer, createProblem); // C: trainer only

router
  .route('/problems/:problem_id')
  .get(isAuthenticatedUser, verifyTrainerOrAdmin, validateObjectId('problem_id'), getProblemDetail) // R: trainer or admin
  .patch(isAuthenticatedUser, verifyTrainer, validateObjectId('problem_id'), updateProblem) // U: trainer only
  .delete(isAuthenticatedUser, verifyTrainer, validateObjectId('problem_id'), deleteProblem); // D: trainer only

module.exports = router;
