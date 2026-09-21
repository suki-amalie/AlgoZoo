const express = require('express');
const router = express.Router();
const executionController = require('../controllers/executionController');
const { isAuthenticatedUser } = require('../middlewares/authMiddleware');

// Run code in a sandboxed runtime (any logged-in user)
router.post(
    '/run',
    isAuthenticatedUser,
    executionController.runCode
);

// Trace Python code line-by-line for the step visualizer (any logged-in user)
router.post(
    '/trace',
    isAuthenticatedUser,
    executionController.traceCode
);

module.exports = router;
