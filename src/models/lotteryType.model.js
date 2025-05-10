const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const LotteryType = sequelize.define('LotteryType', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true
            }
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true
            }
        },
        description: {
            type: DataTypes.TEXT
        },
        rules: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        drawTimes: {
            type: DataTypes.JSONB,
            defaultValue: [],
            allowNull: false,
            validate: {
                isValidDrawTimes(value) {
                    if (!Array.isArray(value)) {
                        throw new Error('drawTimes must be an array');
                    }
                    value.forEach(time => {
                        if (!time.hour || !time.minute || !time.days) {
                            throw new Error('Each draw time must specify hour, minute, and days');
                        }
                    });
                }
            }
        },
        prizeStructure: {
            type: DataTypes.JSONB,
            defaultValue: {},
            allowNull: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        displayOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0
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
                fields: ['code']
            }
        ]
    });

    // Instance methods
    LotteryType.prototype.getNextDrawTime = function() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Sort draw times by day, hour, and minute
        const sortedDrawTimes = [...this.drawTimes].sort((a, b) => {
            if (a.days[0] !== b.days[0]) return a.days[0] - b.days[0];
            if (a.hour !== b.hour) return a.hour - b.hour;
            return a.minute - b.minute;
        });

        // Find the next draw time
        for (const drawTime of sortedDrawTimes) {
            for (const day of drawTime.days) {
                if (
                    day > currentDay ||
                    (day === currentDay && 
                        (drawTime.hour > currentHour || 
                            (drawTime.hour === currentHour && drawTime.minute > currentMinute)))
                ) {
                    const nextDraw = new Date();
                    nextDraw.setDate(nextDraw.getDate() + (day - currentDay));
                    nextDraw.setHours(drawTime.hour, drawTime.minute, 0, 0);
                    return nextDraw;
                }
            }
        }

        // If no draw time found in current week, get first draw time of next week
        const firstDrawTime = sortedDrawTimes[0];
        const nextDraw = new Date();
        nextDraw.setDate(nextDraw.getDate() + (7 - currentDay) + firstDrawTime.days[0]);
        nextDraw.setHours(firstDrawTime.hour, firstDrawTime.minute, 0, 0);
        return nextDraw;
    };

    // Class methods
    LotteryType.findByCode = async function(code) {
        return await this.findOne({ where: { code } });
    };

    return LotteryType;
};
