const express = require('express');
const router = express.Router();
const { LotteryType, LotteryResult, User } = require('../models');
const { checkRole, checkVendorStatus } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const { broadcastLotteryResult } = require('../websocket/handler');
const logger = require('../utils/logger');

// Get all lottery types
router.get('/types', async (req, res, next) => {
    try {
        const types = await LotteryType.findAll({
            where: { isActive: true },
            order: [['displayOrder', 'ASC']]
        });

        res.status(200).json({
            status: 'success',
            data: { types }
        });
    } catch (error) {
        next(error);
    }
});

// Get lottery type by code
router.get('/types/:code', async (req, res, next) => {
    try {
        const type = await LotteryType.findByCode(req.params.code);
        if (!type) {
            throw new ApiError(404, 'Lottery type not found');
        }

        res.status(200).json({
            status: 'success',
            data: { type }
        });
    } catch (error) {
        next(error);
    }
});

// Get latest results
router.get('/results/latest', async (req, res, next) => {
    try {
        const { limit = 10, type } = req.query;
        const where = { status: 'published' };
        
        if (type) {
            const lotteryType = await LotteryType.findByCode(type);
            if (lotteryType) {
                where.LotteryTypeId = lotteryType.id;
            }
        }

        const results = await LotteryResult.findAll({
            where,
            order: [['drawDate', 'DESC']],
            limit: parseInt(limit),
            include: [{
                model: LotteryType,
                attributes: ['name', 'code']
            }]
        });

        res.status(200).json({
            status: 'success',
            data: { results }
        });
    } catch (error) {
        next(error);
    }
});

// Get results by date range
router.get('/results', async (req, res, next) => {
    try {
        const { startDate, endDate, type } = req.query;
        const where = { status: 'published' };

        if (startDate && endDate) {
            where.drawDate = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        if (type) {
            const lotteryType = await LotteryType.findByCode(type);
            if (lotteryType) {
                where.LotteryTypeId = lotteryType.id;
            }
        }

        const results = await LotteryResult.findAll({
            where,
            order: [['drawDate', 'DESC']],
            include: [{
                model: LotteryType,
                attributes: ['name', 'code']
            }]
        });

        res.status(200).json({
            status: 'success',
            data: { results }
        });
    } catch (error) {
        next(error);
    }
});

// Get result by draw number
router.get('/results/:drawNumber', async (req, res, next) => {
    try {
        const result = await LotteryResult.findByDrawNumber(req.params.drawNumber);
        if (!result) {
            throw new ApiError(404, 'Result not found');
        }

        res.status(200).json({
            status: 'success',
            data: { result }
        });
    } catch (error) {
        next(error);
    }
});

// Create new result (Admin/Vendor only)
router.post('/results', checkRole('admin', 'vendor'), async (req, res, next) => {
    try {
        const { typeCode, numbers, drawDate } = req.body;

        // Validate lottery type
        const lotteryType = await LotteryType.findByCode(typeCode);
        if (!lotteryType) {
            throw new ApiError(404, 'Lottery type not found');
        }

        // Create result
        const result = await LotteryResult.create({
            LotteryTypeId: lotteryType.id,
            drawNumber: `${typeCode}-${Date.now()}`,
            numbers,
            drawDate: new Date(drawDate),
            status: req.user.role === 'admin' ? 'published' : 'draft',
            createdBy: req.user.id
        });

        // If admin created, broadcast result
        if (req.user.role === 'admin') {
            result.publishedAt = new Date();
            await result.save();
            broadcastLotteryResult(result);
        }

        res.status(201).json({
            status: 'success',
            data: { result }
        });
    } catch (error) {
        next(error);
    }
});

// Verify result (Admin only)
router.patch('/results/:drawNumber/verify', checkRole('admin'), async (req, res, next) => {
    try {
        const result = await LotteryResult.findByDrawNumber(req.params.drawNumber);
        if (!result) {
            throw new ApiError(404, 'Result not found');
        }

        await result.verify(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { result }
        });
    } catch (error) {
        next(error);
    }
});

// Publish result (Admin only)
router.patch('/results/:drawNumber/publish', checkRole('admin'), async (req, res, next) => {
    try {
        const result = await LotteryResult.findByDrawNumber(req.params.drawNumber);
        if (!result) {
            throw new ApiError(404, 'Result not found');
        }

        await result.publish(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { result }
        });
    } catch (error) {
        next(error);
    }
});

// Get next draw times
router.get('/next-draws', async (req, res, next) => {
    try {
        const types = await LotteryType.findAll({
            where: { isActive: true }
        });

        const nextDraws = types.map(type => ({
            type: {
                code: type.code,
                name: type.name
            },
            nextDraw: type.getNextDrawTime()
        }));

        res.status(200).json({
            status: 'success',
            data: { nextDraws }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
