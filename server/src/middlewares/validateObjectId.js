const mongoose = require('mongoose');

// Middleware factory: validates that req.params[paramName] is a well-formed MongoDB ObjectId
// before it ever reaches a controller/query. Without this, an invalid id (e.g. "abc123")
// causes a Mongoose CastError that falls into the generic catch block and returns a
// confusing 500 instead of a clear 400.
const validateObjectId = (paramName) => (req, res, next) => {
  const value = req.params[paramName];

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ status: 'error', message: `Invalid ${paramName} format` });
  }

  next();
};

module.exports = validateObjectId;
