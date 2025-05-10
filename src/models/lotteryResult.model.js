const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const LotteryResult = sequelize.define('LotteryResult', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        drawNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        drawDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        numbers: {
            type: DataTypes.JSONB,
            allowNull: false,
            validate: {
                isValidNumbers(value) {
                    if (!Array.isArray(value)) {
                        throw new Error('Numbers must be an array');
                    }
                    if (value.length === 0) {
                        throw new Error('Numbers array cannot be empty');
                    }
                    value.forEach(num => {
                        if (typeof num !== 'number' || num < 0 || num > 9) {
                            throw new Error('Each number must be between 0 and 9');
                        }
                    });
                }
            }
        },
        status: {
            type: DataTypes.ENUM('draft', 'published', 'verified'),
            defaultValue: 'draft',
            allowNull: false
        },
        verifiedBy: {
            type: DataTypes.UUID,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        verifiedAt: {
            type: DataTypes.DATE
        },
        publishedAt: {
            type: DataTypes.DATE
        },
        winners: {
            type: DataTypes.JSONB,
            defaultValue: {
                total: 0,
                categories: []
            }
        },
        prizePayout: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        paranoid: true, // Soft deletes
        indexes: [
            {
                unique: true,
                fields: ['drawNumber']
            },
            {
                fields: ['drawDate']
            },
            {
                fields: ['status']
            }
        ]
    });

    // Instance methods
    LotteryResult.prototype.publish = async function(userId) {
        this.status = 'published';
        this.publishedAt = new Date();
        await this.save();

        // Emit WebSocket event for real-time updates
        // This will be implemented later with the WebSocket handler
        // global.io.emit('newResult', this.toJSON());
    };

    LotteryResult.prototype.verify = async function(userId) {
        this.status = 'verified';
        this.verifiedBy = userId;
        this.verifiedAt = new Date();
        await this.save();
    };

    LotteryResult.prototype.calculateWinners = async function() {
        // This method will be implemented to calculate winners and prize distribution
        // based on the lottery type rules and submitted tickets
    };

    // Class methods
    LotteryResult.findByDrawNumber = async function(drawNumber) {
        return await this.findOne({
            where: { drawNumber },
            include: [
                {
                    model: sequelize.models.LotteryType,
                    attributes: ['name', 'code']
                },
                {
                    model: sequelize.models.User,
                    as: 'creator',
                    attributes: ['id', 'firstName', 'lastName']
                }
            ]
        });
    };

    LotteryResult.getLatestResults = async function(limit = 10) {
        return await this.findAll({
            where: { status: 'published' },
            order: [['drawDate', 'DESC']],
            limit,
            include: [
                {
                    model: sequelize.models.LotteryType,
                    attributes: ['name', 'code']
                }
            ]
        });
    };

    LotteryResult.getResultsByDateRange = async function(startDate, endDate) {
        return await this.findAll({
            where: {
                status: 'published',
                drawDate: {
                    [sequelize.Op.between]: [startDate, endDate]
                }
            },
            order: [['drawDate', 'DESC']],
            include: [
                {
                    model: sequelize.models.LotteryType,
                    attributes: ['name', 'code']
                }
            ]
        });
    };

    return LotteryResult;
};
