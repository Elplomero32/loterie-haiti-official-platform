const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Notification = sequelize.define('Notification', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        type: {
            type: DataTypes.ENUM(
                'result',         // New lottery result
                'winner',         // User won a prize
                'vendor_status',  // Vendor status update
                'system',         // System notifications
                'promotion',      // Promotional messages
                'reminder'        // Draw time reminders
            ),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        priority: {
            type: DataTypes.ENUM('low', 'medium', 'high'),
            defaultValue: 'low'
        },
        status: {
            type: DataTypes.ENUM('unread', 'read', 'archived'),
            defaultValue: 'unread'
        },
        data: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        readAt: {
            type: DataTypes.DATE
        },
        expiresAt: {
            type: DataTypes.DATE
        },
        deliveryStatus: {
            type: DataTypes.JSONB,
            defaultValue: {
                email: null,    // null, 'sent', 'failed'
                push: null,     // null, 'sent', 'failed'
                sms: null       // null, 'sent', 'failed'
            }
        },
        channels: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: ['app'],
            validate: {
                isValidChannels(value) {
                    const validChannels = ['app', 'email', 'push', 'sms'];
                    if (!Array.isArray(value)) {
                        throw new Error('Channels must be an array');
                    }
                    if (!value.every(channel => validChannels.includes(channel))) {
                        throw new Error('Invalid channel specified');
                    }
                }
            }
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        indexes: [
            {
                fields: ['UserId']
            },
            {
                fields: ['type']
            },
            {
                fields: ['status']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    // Instance methods
    Notification.prototype.markAsRead = async function() {
        this.status = 'read';
        this.readAt = new Date();
        await this.save();
    };

    Notification.prototype.archive = async function() {
        this.status = 'archived';
        await this.save();
    };

    Notification.prototype.updateDeliveryStatus = async function(channel, status) {
        this.deliveryStatus[channel] = status;
        await this.save();
    };

    // Class methods
    Notification.createSystemNotification = async function(userId, title, message, options = {}) {
        return await this.create({
            UserId: userId,
            type: 'system',
            title,
            message,
            priority: options.priority || 'medium',
            channels: options.channels || ['app'],
            expiresAt: options.expiresAt,
            data: options.data || {}
        });
    };

    Notification.createResultNotification = async function(userId, lotteryResult, options = {}) {
        return await this.create({
            UserId: userId,
            type: 'result',
            title: 'New Lottery Result Available',
            message: `The results for ${lotteryResult.LotteryType.name} are now available.`,
            data: {
                resultId: lotteryResult.id,
                drawNumber: lotteryResult.drawNumber,
                numbers: lotteryResult.numbers
            },
            priority: 'medium',
            channels: ['app', 'push'],
            ...options
        });
    };

    Notification.createWinnerNotification = async function(userId, winningDetails, options = {}) {
        return await this.create({
            UserId: userId,
            type: 'winner',
            title: 'Congratulations! You Won!',
            message: `You won ${winningDetails.prize} in ${winningDetails.lotteryName}!`,
            data: winningDetails,
            priority: 'high',
            channels: ['app', 'email', 'push', 'sms'],
            ...options
        });
    };

    Notification.getUnreadCount = async function(userId) {
        return await this.count({
            where: {
                UserId: userId,
                status: 'unread'
            }
        });
    };

    Notification.getUserNotifications = async function(userId, options = {}) {
        const { limit = 20, offset = 0, status, type } = options;
        const where = { UserId: userId };
        
        if (status) where.status = status;
        if (type) where.type = type;

        return await this.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
    };

    return Notification;
};
