const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Vendor = sequelize.define('Vendor', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        businessName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        businessLicenseNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true
            }
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false
        },
        department: {
            type: DataTypes.ENUM(
                'Ouest',
                'Nord',
                'Nord-Est',
                'Nord-Ouest',
                'Sud',
                'Sud-Est',
                'Artibonite',
                'Centre',
                'Grand\'Anse',
                'Nippes'
            ),
            allowNull: false
        },
        location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: false
        },
        contactPhone: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                is: /^\+?[\d\s-]+$/
            }
        },
        contactEmail: {
            type: DataTypes.STRING,
            validate: {
                isEmail: true
            }
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'suspended', 'inactive'),
            defaultValue: 'pending'
        },
        verificationStatus: {
            type: DataTypes.ENUM('unverified', 'pending', 'verified', 'rejected'),
            defaultValue: 'unverified'
        },
        verificationDate: {
            type: DataTypes.DATE
        },
        verifiedBy: {
            type: DataTypes.UUID,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        operatingHours: {
            type: DataTypes.JSONB,
            defaultValue: {
                monday: { open: '08:00', close: '18:00' },
                tuesday: { open: '08:00', close: '18:00' },
                wednesday: { open: '08:00', close: '18:00' },
                thursday: { open: '08:00', close: '18:00' },
                friday: { open: '08:00', close: '18:00' },
                saturday: { open: '08:00', close: '16:00' },
                sunday: { open: null, close: null }
            }
        },
        gamesOffered: {
            type: DataTypes.JSONB,
            defaultValue: [],
            validate: {
                isValidGames(value) {
                    if (!Array.isArray(value)) {
                        throw new Error('Games offered must be an array');
                    }
                }
            }
        },
        rating: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            validate: {
                min: 0,
                max: 5
            }
        },
        totalReviews: {
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
                fields: ['businessLicenseNumber']
            },
            {
                fields: ['status']
            },
            {
                fields: ['department']
            }
        ]
    });

    // Instance methods
    Vendor.prototype.updateRating = async function(newRating) {
        const currentTotal = this.rating * this.totalReviews;
        this.totalReviews += 1;
        this.rating = (currentTotal + newRating) / this.totalReviews;
        await this.save();
    };

    Vendor.prototype.isOpen = function() {
        const now = new Date();
        const day = now.toLocaleLowerCase().slice(0, 3);
        const time = now.toLocaleTimeString('en-US', { hour12: false });

        const hours = this.operatingHours[day];
        if (!hours || !hours.open || !hours.close) return false;

        return time >= hours.open && time <= hours.close;
    };

    // Class methods
    Vendor.findNearby = async function(latitude, longitude, radius = 5000) {
        const point = { type: 'Point', coordinates: [longitude, latitude] };
        return await this.findAll({
            where: {
                status: 'active',
                location: {
                    [sequelize.Op.and]: [
                        sequelize.where(
                            sequelize.fn(
                                'ST_DWithin',
                                sequelize.col('location'),
                                sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', longitude, latitude), 4326),
                                radius
                            ),
                            true
                        )
                    ]
                }
            },
            attributes: {
                include: [
                    [
                        sequelize.fn(
                            'ST_Distance',
                            sequelize.col('location'),
                            sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', longitude, latitude), 4326)
                        ),
                        'distance'
                    ]
                ]
            },
            order: [[sequelize.literal('distance'), 'ASC']]
        });
    };

    return Vendor;
};
