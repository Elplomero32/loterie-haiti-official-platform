const express = require('express');
const router = express.Router();
const { User, Notification } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Get user profile
router.get('/profile', async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
});

// Update user profile
router.patch('/profile', async (req, res, next) => {
    try {
        const {
            firstName,
            lastName,
            phoneNumber,
            preferredLanguage,
            notificationPreferences
        } = req.body;

        const user = await req.user.update({
            firstName,
            lastName,
            phoneNumber,
            preferredLanguage,
            notificationPreferences
        });

        res.status(200).json({
            status: 'success',
            data: { user: user.toJSON() }
        });
    } catch (error) {
        next(error);
    }
});

// Get user notifications
router.get('/notifications', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        const where = { UserId: req.user.id };

        if (status) where.status = status;

        const { count, rows: notifications } = await Notification.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            status: 'success',
            data: {
                notifications,
                pagination: {
                    total: count,
                    pages: Math.ceil(count / limit),
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req, res, next) => {
    try {
        const notification = await Notification.findOne({
            where: {
                id: req.params.id,
                UserId: req.user.id
            }
        });

        if (!notification) {
            throw new ApiError(404, 'Notification not found');
        }

        await notification.markAsRead();

        res.status(200).json({
            status: 'success',
            data: { notification }
        });
    } catch (error) {
        next(error);
    }
});

// Mark all notifications as read
router.post('/notifications/read-all', async (req, res, next) => {
    try {
        await Notification.update(
            {
                status: 'read',
                readAt: new Date()
            },
            {
                where: {
                    UserId: req.user.id,
                    status: 'unread'
                }
            }
        );

        res.status(200).json({
            status: 'success',
            message: 'All notifications marked as read'
        });
    } catch (error) {
        next(error);
    }
});

// Get unread notifications count
router.get('/notifications/unread-count', async (req, res, next) => {
    try {
        const count = await Notification.count({
            where: {
                UserId: req.user.id,
                status: 'unread'
            }
        });

        res.status(200).json({
            status: 'success',
            data: { count }
        });
    } catch (error) {
        next(error);
    }
});

// Update notification preferences
router.patch('/preferences/notifications', async (req, res, next) => {
    try {
        const { email, push, sms } = req.body;

        await req.user.update({
            notificationPreferences: { email, push, sms }
        });

        res.status(200).json({
            status: 'success',
            data: {
                notificationPreferences: req.user.notificationPreferences
            }
        });
    } catch (error) {
        next(error);
    }
});

// Update language preference
router.patch('/preferences/language', async (req, res, next) => {
    try {
        const { language } = req.body;

        if (!['en', 'fr', 'ht'].includes(language)) {
            throw new ApiError(400, 'Invalid language selection');
        }

        await req.user.update({ preferredLanguage: language });

        res.status(200).json({
            status: 'success',
            data: {
                preferredLanguage: req.user.preferredLanguage
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get user activity history
router.get('/activity', async (req, res, next) => {
    try {
        // TODO: Implement user activity history
        res.status(200).json({
            status: 'success',
            message: 'Activity history not implemented yet'
        });
    } catch (error) {
        next(error);
    }
});

// Delete user account
router.delete('/account', async (req, res, next) => {
    try {
        await req.user.update({ status: 'inactive' });

        res.status(200).json({
            status: 'success',
            message: 'Account deactivated successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
