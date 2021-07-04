module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define(
        "User",
        {
            email: {
                type: DataTypes.STRING(45),
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING(200),
            },
            password: {
                type: DataTypes.STRING(200),
            },
            confirmed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            role: {
                type: DataTypes.STRING(45),
                defaultValue: "customer",
            },
        },
        {
            timestamps: false,
        }
    );

    return User;
};
