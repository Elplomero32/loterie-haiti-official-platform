const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'No token provided');
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const user = await User.findByPk(decoded.id);
            if (!user) {
                throw new ApiError(401, 'User not found');
            }

            // Check if user is active
            if (user.status !== 'active') {
                throw new ApiError(401, 'Account is not active');
            }

            // Update last login
            await user.update({ lastLogin: new Date() });

            // Attach user to request object
            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                throw new ApiError(401, 'Invalid token');
            }
            if (error.name === 'TokenExpiredError') {
                throw new ApiError(401, 'Token expired');
            }
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// Check user role middleware
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Not authenticated'));
        }

        if (!roles.includes(req.user.role)) {
            return next(new ApiError(403, 'Not authorized'));
        }

        next();
    };
};

// Check vendor status middleware
const checkVendorStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError(401, 'Not authenticated');
        }

        if (req.user.role !== 'vendor') {
            throw new ApiError(403, 'Not a vendor');
        }

        const vendor = await req.user.getVendor();
        if (!vendor) {
            throw new ApiError(403, 'Vendor profile not found');
        }

        if (vendor.status !== 'active') {
            throw new ApiError(403, 'Vendor account is not active');
        }

        // Attach vendor to request object
        req.vendor = vendor;
        next();
    } catch (error) {
        next(error);
    }
};

// Rate limiting middleware
const rateLimit = (limit, windowMs) => {
    const requests = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        requests.forEach((timestamp, key) => {
            if (timestamp < windowStart) {
                requests.delete(key);
            }
        });

        // Get requests in window
        const requestsInWindow = Array.from(requests.values())
            .filter(timestamp => timestamp > windowStart)
            .length;

        if (requestsInWindow >= limit) {
            return next(new ApiError(429, 'Too many requests'));
        }

        // Add current request
        requests.set(Math.random(), now);
        next();
    };
};

// API key authentication middleware (for external services)
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return next(new ApiError(401, 'API key is required'));
    }

    // In production, compare with stored API keys in database or environment variables
    if (apiKey !== process.env.API_KEY) {
        return next(new ApiError(401, 'Invalid API key'));
    }

    next();
};

// Validate user session middleware
const validateSession = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError(401, 'Not authenticated');
        }

        // Check if user's session is still valid
        const user = await User.findByPk(req.user.id);
        if (!user) {
            throw new ApiError(401, 'User not found');
        }

        // Check if password hasn't changed since token was issued
        if (user.passwordChangedAt && user.passwordChangedAt > req.user.iat * 1000) {
            throw new ApiError(401, 'Password has been changed. Please login again');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    verifyToken,
    checkRole,
    checkVendorStatus,
    rateLimit,
    apiKeyAuth,
    validateSession
};
