const router = require('express').Router();
const { isAuthenticatedUser, verifyTrainer, verifyTrainerOrAdmin } = require('../middlewares/authMiddleware');
const validateObjectId = require('../middlewares/validateObjectId');
const {
  getDashboard,
  getClasses,
  getClassDetail,
  assignProblemToClass,
  getClassProblems,
  deleteClassProblem,
  reviewSubmission,
  getSubmissions,
  getSubmissionDetail,
} = require('../controllers/trainerController');

// routes for trainer

router.route('/trainer/dashboard').get(isAuthenticatedUser, verifyTrainer, getDashboard);

router.route('/trainer/classes').get(isAuthenticatedUser, verifyTrainerOrAdmin, getClasses); // trainer or admin
router
  .route('/trainer/classes/:class_id')
  .get(isAuthenticatedUser, verifyTrainerOrAdmin, validateObjectId('class_id'), getClassDetail); // trainer or admin

router
  .route('/trainer/classes/:class_id/problems')
  .get(isAuthenticatedUser, verifyTrainer, validateObjectId('class_id'), getClassProblems)
  .post(isAuthenticatedUser, verifyTrainer, validateObjectId('class_id'), assignProblemToClass); // trainer only

router
  .route('/trainer/classes/:class_id/problems/:problem_id')
  .delete(
    isAuthenticatedUser,
    verifyTrainer,
    validateObjectId('class_id'),
    validateObjectId('problem_id'),
    deleteClassProblem
  ); // trainer only

router
  .route('/trainer/review/:submission_id')
  .patch(isAuthenticatedUser, verifyTrainer, validateObjectId('submission_id'), reviewSubmission); // trainer only — PATCH: partial update (feedback/status), not a full replace

router.route('/trainer/submissions').get(isAuthenticatedUser, verifyTrainer, getSubmissions);
router
  .route('/trainer/submissions/:submission_id')
  .get(isAuthenticatedUser, verifyTrainer, validateObjectId('submission_id'), getSubmissionDetail);

module.exports = router;
