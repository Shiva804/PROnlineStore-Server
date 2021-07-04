module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define(
        "Product",
        {
            name: {
                type: DataTypes.STRING(45),
                primaryKey: true,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING(200),
            },
            price: {
                type: DataTypes.INTEGER(45),
            },
            category: {
                type: DataTypes.STRING(45),
            },

            image_src: {
                type: DataTypes.STRING(200),
            },
            sub_category: {
                type: DataTypes.STRING(45),
            },
        },
        {
            timestamps: false,
        }
    );

    return Product;
};
