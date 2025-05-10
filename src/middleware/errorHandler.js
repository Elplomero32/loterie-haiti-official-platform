const logger = require('../utils/logger');

// Custom error class for API errors
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
    });

    if (process.env.NODE_ENV === 'development') {
        // Development error response - includes stack trace
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production error response - no sensitive error details
        if (err.isOperational) {
            // Operational, trusted error: send message to client
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            // Programming or other unknown error: don't leak error details
            logger.error('ERROR 💥:', err);
            res.status(500).json({
                status: 'error',
                message: 'Something went wrong!'
            });
        }
    }
};

// Handle specific types of errors
const handleSequelizeValidationError = (err) => {
    const message = err.errors.map(error => error.message).join('. ');
    return new ApiError(400, message);
};

const handleJWTError = () => 
    new ApiError(401, 'Invalid token. Please log in again.');

const handleJWTExpiredError = () => 
    new ApiError(401, 'Your token has expired. Please log in again.');

const handleSequelizeUniqueConstraintError = (err) => {
    const message = `Duplicate field value: ${err.errors[0].value}. Please use another value.`;
    return new ApiError(400, message);
};

// Global error handling
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    logger.error(err);
    process.exit(1);
});

module.exports = {
    ApiError,
    errorHandler,
    handleSequelizeValidationError,
    handleJWTError,
    handleJWTExpiredError,
    handleSequelizeUniqueConstraintError
};
