const { sequelize } = require('../models');
const { User, LotteryType } = require('../models');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

async function initializeDatabase() {
    try {
        // Sync database
        await sequelize.sync({ force: true });
        logger.info('Database synchronized');

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        await User.create({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@loteriehaiti.com',
            password: adminPassword,
            role: 'admin',
            status: 'active',
            preferredLanguage: 'ht'
        });
        logger.info('Admin user created');

        // Create default lottery types
        const lotteryTypes = [
            {
                name: 'Borlette',
                code: 'BOR',
                description: 'Traditional Haitian lottery game',
                rules: {
                    numberRange: [0, 99],
                    maxNumbers: 3,
                    prizeMultipliers: {
                        '1': 50,
                        '2': 100,
                        '3': 500
                    }
                },
                drawTimes: [
                    {
                        hour: 10,
                        minute: 0,
                        days: [1, 2, 3, 4, 5, 6]
                    },
                    {
                        hour: 13,
                        minute: 0,
                        days: [1, 2, 3, 4, 5, 6]
                    },
                    {
                        hour: 16,
                        minute: 0,
                        days: [1, 2, 3, 4, 5, 6]
                    }
                ],
                prizeStructure: {
                    firstPrize: '80% of pool',
                    secondPrize: '15% of pool',
                    thirdPrize: '5% of pool'
                },
                isActive: true,
                displayOrder: 1
            },
            {
                name: 'Loto 3',
                code: 'L3',
                description: '3-digit lottery game',
                rules: {
                    numberRange: [0, 9],
                    numbersRequired: 3,
                    prizeMultiplier: 500
                },
                drawTimes: [
                    {
                        hour: 20,
                        minute: 0,
                        days: [1, 2, 3, 4, 5, 6]
                    }
                ],
                prizeStructure: {
                    exactMatch: '80% of pool',
                    anyOrder: '20% of pool'
                },
                isActive: true,
                displayOrder: 2
            },
            {
                name: 'Loto 4',
                code: 'L4',
                description: '4-digit lottery game',
                rules: {
                    numberRange: [0, 9],
                    numbersRequired: 4,
                    prizeMultiplier: 5000
                },
                drawTimes: [
                    {
                        hour: 20,
                        minute: 30,
                        days: [1, 2, 3, 4, 5, 6]
                    }
                ],
                prizeStructure: {
                    exactMatch: '90% of pool',
                    anyOrder: '10% of pool'
                },
                isActive: true,
                displayOrder: 3
            }
        ];

        await LotteryType.bulkCreate(lotteryTypes);
        logger.info('Default lottery types created');

        logger.info('Database initialization completed successfully');
    } catch (error) {
        logger.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
