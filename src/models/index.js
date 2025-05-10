const sequelize = require('../config/database');
const logger = require('../utils/logger');

// Import models
const User = require('./user.model')(sequelize);
const LotteryResult = require('./lotteryResult.model')(sequelize);
const LotteryType = require('./lotteryType.model')(sequelize);
const Vendor = require('./vendor.model')(sequelize);
const Notification = require('./notification.model')(sequelize);

// Define associations
User.hasMany(Notification);
Notification.belongsTo(User);

User.hasMany(LotteryResult, { foreignKey: 'createdBy' });
LotteryResult.belongsTo(User, { foreignKey: 'createdBy' });

LotteryType.hasMany(LotteryResult);
LotteryResult.belongsTo(LotteryType);

User.hasOne(Vendor);
Vendor.belongsTo(User);

// Export models and sequelize instance
module.exports = {
    sequelize,
    User,
    LotteryResult,
    LotteryType,
    Vendor,
    Notification
};
