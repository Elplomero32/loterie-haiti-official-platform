const express = require('express');
const router = express.Router();
const { Vendor, User } = require('../models');
const { checkRole, checkVendorStatus } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Get all active vendors
router.get('/', async (req, res, next) => {
    try {
        const { department, city, search } = req.query;
        const where = { status: 'active' };

        if (department) {
            where.department = department;
        }
        if (city) {
            where.city = city;
        }
        if (search) {
            where[Op.or] = [
                { businessName: { [Op.iLike]: `%${search}%` } },
                { address: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const vendors = await Vendor.findAll({
            where,
            include: [{
                model: User,
                attributes: ['firstName', 'lastName', 'email']
            }]
        });

        res.status(200).json({
            status: 'success',
            data: { vendors }
        });
    } catch (error) {
        next(error);
    }
});

// Get nearby vendors
router.get('/nearby', async (req, res, next) => {
    try {
        const { latitude, longitude, radius = 5000 } = req.query;

        if (!latitude || !longitude) {
            throw new ApiError(400, 'Latitude and longitude are required');
        }

        const vendors = await Vendor.findNearby(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(radius)
        );

        res.status(200).json({
            status: 'success',
            data: { vendors }
        });
    } catch (error) {
        next(error);
    }
});

// Get vendor by ID
router.get('/:id', async (req, res, next) => {
    try {
        const vendor = await Vendor.findByPk(req.params.id, {
            include: [{
                model: User,
                attributes: ['firstName', 'lastName', 'email']
            }]
        });

        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }

        res.status(200).json({
            status: 'success',
            data: { vendor }
        });
    } catch (error) {
        next(error);
    }
});

// Register as vendor
router.post('/register', async (req, res, next) => {
    try {
        const {
            businessName,
            businessLicenseNumber,
            address,
            city,
            department,
            location,
            contactPhone,
            contactEmail,
            operatingHours,
            gamesOffered
        } = req.body;

        // Check if user is already a vendor
        const existingVendor = await Vendor.findOne({
            where: {
                [Op.or]: [
                    { UserId: req.user.id },
                    { businessLicenseNumber }
                ]
            }
        });

        if (existingVendor) {
            throw new ApiError(400, 'User is already registered as a vendor or license number is in use');
        }

        // Create vendor profile
        const vendor = await Vendor.create({
            UserId: req.user.id,
            businessName,
            businessLicenseNumber,
            address,
            city,
            department,
            location,
            contactPhone,
            contactEmail,
            operatingHours,
            gamesOffered,
            status: 'pending',
            verificationStatus: 'pending'
        });

        // Update user role
        await req.user.update({ role: 'vendor' });

        res.status(201).json({
            status: 'success',
            data: { vendor }
        });
    } catch (error) {
        next(error);
    }
});

// Update vendor profile (Vendor only)
router.patch('/profile', checkVendorStatus, async (req, res, next) => {
    try {
        const {
            businessName,
            address,
            city,
            location,
            contactPhone,
            contactEmail,
            operatingHours,
            gamesOffered
        } = req.body;

        // Update vendor profile
        const vendor = await req.vendor.update({
            businessName,
            address,
            city,
            location,
            contactPhone,
            contactEmail,
            operatingHours,
            gamesOffered
        });

        res.status(200).json({
            status: 'success',
            data: { vendor }
        });
    } catch (error) {
        next(error);
    }
});

// Update vendor status (Admin only)
router.patch('/:id/status', checkRole('admin'), async (req, res, next) => {
    try {
        const { status, verificationStatus } = req.body;
        const vendor = await Vendor.findByPk(req.params.id);

        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }

        // Update status
        await vendor.update({
            status,
            verificationStatus,
            verificationDate: new Date(),
            verifiedBy: req.user.id
        });

        res.status(200).json({
            status: 'success',
            data: { vendor }
        });
    } catch (error) {
        next(error);
    }
});

// Get vendor statistics (Vendor only)
router.get('/stats/summary', checkVendorStatus, async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        // TODO: Implement vendor statistics
        const stats = {
            totalSales: 0,
            totalCommission: 0,
            totalCustomers: 0,
            popularGames: []
        };

        res.status(200).json({
            status: 'success',
            data: { stats }
        });
    } catch (error) {
        next(error);
    }
});

// Get departments list
router.get('/utils/departments', (req, res) => {
    const departments = [
        'Ouest',
        'Nord',
        'Nord-Est',
        'Nord-Ouest',
        'Sud',
        'Sud-Est',
        'Artibonite',
        'Centre',
        'Grand\'Anse',
        'Nippes'
    ];

    res.status(200).json({
        status: 'success',
        data: { departments }
    });
});

module.exports = router;
