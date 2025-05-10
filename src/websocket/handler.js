const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Store active connections
const connections = new Map();

// WebSocket message types
const MESSAGE_TYPES = {
    AUTH: 'auth',
    LOTTERY_RESULT: 'lottery_result',
    NOTIFICATION: 'notification',
    ERROR: 'error'
};

// Handle WebSocket connections
const websocketHandler = async (ws, req) => {
    let userId = null;

    // Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case MESSAGE_TYPES.AUTH:
                    await handleAuth(ws, data.token);
                    break;
                    
                // Add more message type handlers as needed
                default:
                    sendError(ws, 'Unknown message type');
            }
        } catch (error) {
            logger.error('WebSocket message error:', error);
            sendError(ws, 'Invalid message format');
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        if (userId) {
            connections.delete(userId);
            logger.info(`Client disconnected: ${userId}`);
        }
    });

    // Handle errors
    ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
    });
};

// Handle authentication
async function handleAuth(ws, token) {
    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return sendError(ws, 'User not found');
        }

        // Store connection
        connections.set(user.id, ws);
        ws.userId = user.id;

        // Send success response
        send(ws, {
            type: MESSAGE_TYPES.AUTH,
            status: 'success',
            message: 'Authentication successful'
        });

        logger.info(`Client authenticated: ${user.id}`);
    } catch (error) {
        logger.error('Authentication error:', error);
        sendError(ws, 'Authentication failed');
    }
}

// Send lottery result to specific users or all users
function broadcastLotteryResult(result, userIds = null) {
    const message = {
        type: MESSAGE_TYPES.LOTTERY_RESULT,
        data: result
    };

    if (userIds) {
        // Send to specific users
        userIds.forEach(userId => {
            const ws = connections.get(userId);
            if (ws) {
                send(ws, message);
            }
        });
    } else {
        // Broadcast to all connected users
        connections.forEach(ws => {
            send(ws, message);
        });
    }
}

// Send notification to specific user
function sendNotification(userId, notification) {
    const ws = connections.get(userId);
    if (ws) {
        send(ws, {
            type: MESSAGE_TYPES.NOTIFICATION,
            data: notification
        });
    }
}

// Helper function to send messages
function send(ws, data) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// Helper function to send errors
function sendError(ws, message) {
    send(ws, {
        type: MESSAGE_TYPES.ERROR,
        message
    });
}

// Export handler and utility functions
module.exports = {
    websocketHandler,
    broadcastLotteryResult,
    sendNotification,
    connections,
    MESSAGE_TYPES
};
