module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define("Category", {
        category: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },

        sub_category: {
            type: DataTypes.STRING(45),
        },
    });

    return Category;
};
