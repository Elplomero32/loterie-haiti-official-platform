const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const { User } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Register new user
router.post('/register', async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, phoneNumber } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new ApiError(400, 'Email already registered');
        }

        // Create new user
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            role: 'user',
            status: 'active'
        });

        // Generate token
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Remove sensitive data
        const userResponse = user.toJSON();

        res.status(201).json({
            status: 'success',
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        next(error);
    }
});

// Login user
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if email and password exist
        if (!email || !password) {
            throw new ApiError(400, 'Please provide email and password');
        }

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user || !(await user.validatePassword(password))) {
            throw new ApiError(401, 'Incorrect email or password');
        }

        // Check if user is active
        if (user.status !== 'active') {
            throw new ApiError(401, 'Your account is not active');
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Update last login
        await user.update({ lastLogin: new Date() });

        // Remove sensitive data
        const userResponse = user.toJSON();

        res.status(200).json({
            status: 'success',
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get current user
router.get('/me', verifyToken, async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (error) {
        next(error);
    }
});

// Update current user
router.patch('/me', verifyToken, async (req, res, next) => {
    try {
        const { firstName, lastName, phoneNumber, notificationPreferences, preferredLanguage } = req.body;

        // Update user
        const user = await req.user.update({
            firstName,
            lastName,
            phoneNumber,
            notificationPreferences,
            preferredLanguage
        });

        res.status(200).json({
            status: 'success',
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        next(error);
    }
});

// Change password
router.patch('/change-password', verifyToken, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Verify current password
        if (!(await req.user.validatePassword(currentPassword))) {
            throw new ApiError(401, 'Current password is incorrect');
        }

        // Update password
        req.user.password = newPassword;
        await req.user.save();

        res.status(200).json({
            status: 'success',
            message: 'Password updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Request password reset
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new ApiError(404, 'No user found with this email');
        }

        // Generate reset token
        const { resetToken, passwordResetToken, passwordResetExpires } = 
            await User.createPasswordResetToken();

        // Update user with reset token
        await user.update({
            passwordResetToken,
            passwordResetExpires
        });

        // TODO: Send reset token via email
        logger.info(`Password reset token for ${email}: ${resetToken}`);

        res.status(200).json({
            status: 'success',
            message: 'Reset token sent to email'
        });
    } catch (error) {
        next(error);
    }
});

// Reset password
router.patch('/reset-password/:token', async (req, res, next) => {
    try {
        const { password } = req.body;
        const { token } = req.params;

        // Hash token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid reset token
        const user = await User.findOne({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            throw new ApiError(400, 'Token is invalid or has expired');
        }

        // Update password
        user.password = password;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Logout (optional - client-side token removal)
router.post('/logout', verifyToken, (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    });
});

module.exports = router;
