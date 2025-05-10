const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 50]
            }
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 50]
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
                notEmpty: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [6, 100]
            }
        },
        phoneNumber: {
            type: DataTypes.STRING,
            validate: {
                is: /^\+?[\d\s-]+$/
            }
        },
        role: {
            type: DataTypes.ENUM('user', 'vendor', 'admin'),
            defaultValue: 'user',
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'suspended'),
            defaultValue: 'active',
            allowNull: false
        },
        lastLogin: {
            type: DataTypes.DATE
        },
        preferredLanguage: {
            type: DataTypes.ENUM('en', 'fr', 'ht'),
            defaultValue: 'ht'
        },
        notificationPreferences: {
            type: DataTypes.JSONB,
            defaultValue: {
                email: true,
                push: true,
                sms: false
            }
        },
        passwordResetToken: DataTypes.STRING,
        passwordResetExpires: DataTypes.DATE,
        emailVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        emailVerificationToken: DataTypes.STRING
    }, {
        timestamps: true,
        paranoid: true, // Soft deletes
        hooks: {
            beforeSave: async (user) => {
                // Only hash password if it has been modified
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });

    // Instance methods
    User.prototype.validatePassword = async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    };

    User.prototype.toJSON = function() {
        const values = { ...this.get() };
        delete values.password;
        delete values.passwordResetToken;
        delete values.passwordResetExpires;
        delete values.emailVerificationToken;
        return values;
    };

    // Class methods
    User.createPasswordResetToken = async function() {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        const passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        return {
            resetToken,
            passwordResetToken,
            passwordResetExpires
        };
    };

    return User;
};
