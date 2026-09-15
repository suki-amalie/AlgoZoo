const ClassMember = require('../models/classMember');

// Checks whether the given user (trainer) is enrolled as a member of the given class.
// Used to gate trainer-scoped routes so a trainer can only manage/view classes they belong to.
const checkTrainerOwnsClass = async (trainerId, classId) => {
  const membership = await ClassMember.findOne({ classId: classId, userId: trainerId });
  return !!membership;
};

module.exports = { checkTrainerOwnsClass };
