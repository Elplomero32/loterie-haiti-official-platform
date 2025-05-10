const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const { verifyToken, checkRole } = require('../middleware/auth');

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date()
    });
});

// Auth routes
router.use('/auth', authRoutes);

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.use('/users', require('./user.routes'));

// Lottery routes
router.use('/lottery', require('./lottery.routes'));

// Vendor routes
router.use('/vendors', require('./vendor.routes'));

// Admin routes - require admin role
router.use('/admin', checkRole('admin'), require('./admin.routes'));

// Handle 404 - Route not found
router.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

module.exports = router;
