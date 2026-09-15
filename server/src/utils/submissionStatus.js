

const getDisplayStatus = (submission) => {
    if (!submission) return null;
    if (submission.status === 'review') return 'Reviewed';
    if (submission.is_late || submission.status === 'late') return 'Late';
    return 'Pending';
};

module.exports = {
    getDisplayStatus,
};