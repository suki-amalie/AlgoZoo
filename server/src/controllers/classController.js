const crypto = require('crypto');
const Class = require('../models/class');
const {APP_BASE_URL} = require('../config/env');

/**
 * Generate ir refresh a join/invite link for a class
 * POST /routes/classes/:classId/generate-join-link
 */

exports.generateJoinLink = async (req, res) => {
    try {
        const {classId} = req.params;
        const {role = 'student', expiresInDays = 2} = req.body;

        //1. Validate role type
        if (!['student', 'trainer'].includes(role)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid role specified. Must be either "student" or "trainer"',
            });
        }

        //2. Check if class exists and is active
        const classDoc = await Class.findById(classId);
        if (!classDoc || !classDoc.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Class not found or is currently inactive',
            });
        }

        //3. Generate a secure random token and expiration date
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        //4. Update the correct schema fields based on the role
        if (role === 'student') {
            classDoc.studentJoinToken = token;;
            classDoc.studentJoinTokenExpiresAt = expiresAt;
        } else {
            classDoc.trainerInviteToken = token;;
            classDoc.trainerInviteTokenExpiresAt = expiresAt;
        }

        await classDoc.save();

        //5. Build full invitation URL
        const joinUrl = `${APP_BASE_URL}/register?token=${token}&role=${role}`;

        return res.status(200).json({
            status: 'success',
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} join link generated successfully`,
            data: {
                token, 
                role,
                expiresAt,
                joinUrl,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: ('generateJoinLink Error:', error),
            message: 'SERVER SIDE ERROR',
        });
    }
};