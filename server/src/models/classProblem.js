const mongoose = require('mongoose');

const ClassProblemSchema = new mongoose.Schema(
  {
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    problem_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
      index: true,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Prevent assigning the same problem to the same class more than once
ClassProblemSchema.index({ class_id: 1, problem_id: 1 }, { unique: true });

module.exports = mongoose.model('ClassProblem', ClassProblemSchema);
