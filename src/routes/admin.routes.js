const express = require('express');
const router = express.Router();
const { User, LotteryType, LotteryResult, Vendor, Notification } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// User Management Routes
router.get('/users', async (req, res, next) => {
    try {
        const { page = 1, limit = 10, role, status, search } = req.query;
        const offset = (page - 1) * limit;
        const where = {};

        if (role) where.role = role;
        if (status) where.status = status;
        if (search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows: users } = await User.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            status: 'success',
            data: {
                users,
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

router.patch('/users/:id', async (req, res, next) => {
    try {
        const { status, role } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        await user.update({ status, role });

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        next(error);
    }
});

// Lottery Management Routes
router.post('/lottery/types', async (req, res, next) => {
    try {
        const {
            name,
            code,
            description,
            rules,
            drawTimes,
            prizeStructure,
            displayOrder
        } = req.body;

        const lotteryType = await LotteryType.create({
            name,
            code,
            description,
            rules,
            drawTimes,
            prizeStructure,
            displayOrder
        });

        res.status(201).json({
            status: 'success',
            data: { lotteryType }
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/lottery/types/:code', async (req, res, next) => {
    try {
        const {
            name,
            description,
            rules,
            drawTimes,
            prizeStructure,
            isActive,
            displayOrder
        } = req.body;

        const lotteryType = await LotteryType.findByCode(req.params.code);
        if (!lotteryType) {
            throw new ApiError(404, 'Lottery type not found');
        }

        await lotteryType.update({
            name,
            description,
            rules,
            drawTimes,
            prizeStructure,
            isActive,
            displayOrder
        });

        res.status(200).json({
            status: 'success',
            data: { lotteryType }
        });
    } catch (error) {
        next(error);
    }
});

// Vendor Management Routes
router.get('/vendors/pending', async (req, res, next) => {
    try {
        const vendors = await Vendor.findAll({
            where: {
                verificationStatus: 'pending'
            },
            include: [{
                model: User,
                attributes: ['firstName', 'lastName', 'email']
            }],
            order: [['createdAt', 'ASC']]
        });

        res.status(200).json({
            status: 'success',
            data: { vendors }
        });
    } catch (error) {
        next(error);
    }
});

// System Statistics Routes
router.get('/stats/summary', async (req, res, next) => {
    try {
        const [
            totalUsers,
            activeVendors,
            todayResults,
            pendingVendors
        ] = await Promise.all([
            User.count(),
            Vendor.count({ where: { status: 'active' } }),
            LotteryResult.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date().setHours(0, 0, 0, 0)
                    }
                }
            }),
            Vendor.count({ where: { verificationStatus: 'pending' } })
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                stats: {
                    totalUsers,
                    activeVendors,
                    todayResults,
                    pendingVendors
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/stats/users', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};

        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const userStats = await User.findAll({
            where,
            attributes: [
                [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'date'],
                [sequelize.fn('count', '*'), 'count']
            ],
            group: [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt'))],
            order: [[sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'ASC']]
        });

        res.status(200).json({
            status: 'success',
            data: { userStats }
        });
    } catch (error) {
        next(error);
    }
});

// Notification Management Routes
router.post('/notifications/broadcast', async (req, res, next) => {
    try {
        const { title, message, type, userRole, data } = req.body;

        // Get users based on role
        const where = { status: 'active' };
        if (userRole) where.role = userRole;

        const users = await User.findAll({ where });

        // Create notifications for each user
        const notifications = await Promise.all(
            users.map(user =>
                Notification.create({
                    UserId: user.id,
                    type,
                    title,
                    message,
                    data,
                    priority: 'high'
                })
            )
        );

        res.status(201).json({
            status: 'success',
            message: `Notification sent to ${notifications.length} users`
        });
    } catch (error) {
        next(error);
    }
});

// System Logs Routes
router.get('/logs', async (req, res, next) => {
    try {
        // TODO: Implement system logs retrieval
        res.status(200).json({
            status: 'success',
            message: 'Logs retrieval not implemented yet'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
