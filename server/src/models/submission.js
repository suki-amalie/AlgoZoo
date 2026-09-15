const mongoose = require('mongoose');

const contentBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "code", "image", "file"],
      required: true,
    },

    content: {
      type: String,
    },

    language: {
      type: String,
    },

    file_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
    },

    filename: {
      type: String,
    },
  },
  { _id: false }
);


const SubmissionSchema = new mongoose.Schema(
  {
    class_problem_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassProblem',
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content_blocks: {
        type: [contentBlockSchema],
        required: true,
    },
    is_late: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'late', 'review'],
      default: 'pending',
    },
    feedback: { type: String, default: '' },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: true }
);
module.exports = mongoose.model('Submission', SubmissionSchema);
